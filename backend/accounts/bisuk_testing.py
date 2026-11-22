import csv, io, json, re
from collections import Counter
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlsplit
from django.conf import settings
from django.core.mail import send_mail
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import JsonResponse, HttpResponse
from django.utils import timezone
from uuid import UUID
from .models import BisukReport, BisukScreenshot
from .views import api, body, APIError, throttle

PROGRAM=json.loads(Path(__file__).with_name('bisuk-program.json').read_text(encoding='utf-8'))
ASSIGNMENTS={f'T{i+1:02d}':{**PROGRAM['assignments'][i%8],'testerId':f'T{i+1:02d}'} for i in range(32)}
for tester,title in {"T01":"Storefront","T02":"SaaS dashboard","T03":"Restaurant","T04":"Hotel booking","T05":"Learning dashboard","T06":"Event tickets","T07":"Job marketplace","T08":"Finance dashboard"}.items(): ASSIGNMENTS[tester]['title']=title
PROGRAM['assignments']=[ASSIGNMENTS[f'T{i+1:02d}'] for i in range(8)]
STAGES={x['id'] for x in PROGRAM['stages']}
STATUSES={'successful','partial','failed','blocked','not_started'}
CATEGORIES={'code','navigation','missing_functionality','generation','api_timeout','tool','modification','context','hallucination','responsive','design','accessibility','crash','security','other'}
SOURCES={'model','agent','inference_api','application','unknown'}
RATINGS=['design','instructionFollowing','functionalCorrectness','performance']
def owner(request):
    u=request.user
    if not u.is_authenticated:raise APIError(401,'sign_in','Sign in to save your testing report.')
    if request.headers.get('X-Draftmango-Account')!=str(u.pk):raise APIError(409,'account_changed','Your account changed. Reload this page.')
    return u
def is_admin(user):
    allowed={x.strip().lower() for x in settings.BISUK_TESTING_ADMIN_EMAILS.split(',') if x.strip()}
    return user.is_authenticated and user.email_verified and (user.is_staff or user.email.lower() in allowed)
def admin_user(request):
    u=owner(request)
    if not is_admin(u):raise APIError(403,'forbidden','Administrator access is required.')
    return u
def clean_text(v,n=6000):
    if not isinstance(v,str) or len(v)>n:raise APIError(400,'validation','A feedback field is invalid or too long.')
    return v.strip()
def safe_url(v):
    v=clean_text(v,2000)
    if not v:return ''
    try:p=urlsplit(v)
    except ValueError:raise APIError(400,'validation','Use a valid HTTPS evidence link.')
    if p.scheme!='https' or not p.hostname or p.username or p.password:raise APIError(400,'validation','Use an HTTPS link without credentials.')
    return v
def validate_payload(data,final=False,report=None):
    if not isinstance(data,dict):raise APIError(400,'validation','Report data must be an object.')
    stages=data.get('stages',{})
    if not isinstance(stages,dict) or set(stages)-STAGES:raise APIError(400,'validation','Unknown testing stage.')
    out={'stages':{},'observedModel':clean_text(data.get('observedModel',''),300),'overall':data.get('overall','not_started'),'observations':clean_text(data.get('observations',''),12000)}
    if out['overall'] not in STATUSES:raise APIError(400,'validation','Choose a completion status.')
    if final and out['overall']=='not_started':raise APIError(400,'validation','Choose an overall completion status.')
    count=0
    for sid in STAGES:
        s=stages.get(sid,{})
        if not isinstance(s,dict):raise APIError(400,'validation','Invalid stage.')
        status=s.get('status','not_started')
        if status not in STATUSES or (final and status=='not_started'):raise APIError(400,'validation','Record a result for all five stages. Use blocked when you could not proceed.')
        row={'status':status}
        for key in ['prompts','expected','actual','observations','requestIds']:
            row[key]=clean_text(s.get(key,''),24000 if key=='prompts' else 6000)
        row['url']=safe_url(s.get('url',''))
        met=s.get('requirementsMet','not_checked')
        if met not in ['all','some','none','not_checked']:raise APIError(400,'validation','Choose a requirements result.')
        row['requirementsMet']=met
        row['ratings']={}
        scores=s.get('ratings',{})
        if not isinstance(scores,dict):raise APIError(400,'validation','Invalid ratings.')
        for name in RATINGS:
            v=scores.get(name)
            if v is not None and (type(v) is not int or not 1<=v<=5):raise APIError(400,'validation','Ratings must be 1–5 or Not assessed.')
            row['ratings'][name]=v
        issues=s.get('issues',[])
        if not isinstance(issues,list):raise APIError(400,'validation','Invalid issue entries.')
        count+=len(issues)
        if count>200:raise APIError(400,'validation','Use up to 200 issues per report. Combine repeated occurrences.')
        row['issues']=[]
        for issue in issues:
            if not isinstance(issue,dict):raise APIError(400,'validation','Invalid issue.')
            if issue.get('category') not in CATEGORIES or issue.get('severity') not in ['critical','high','medium','low'] or issue.get('source','unknown') not in SOURCES:raise APIError(400,'validation','Invalid issue category, severity or source.')
            clean={k:clean_text(issue.get(k,''),6000) for k in ['steps','expected','actual','error','evidenceNotes']}
            if final and (not clean['steps'] or not clean['actual']):raise APIError(400,'validation','Every issue needs reproduction steps and the actual behavior.')
            clean.update(category=issue['category'],severity=issue['severity'],source=issue.get('source','unknown'),repeated=issue.get('repeated') is True,evidenceUrl=safe_url(issue.get('evidenceUrl','')))
            clean['screenshots']=clean_screenshots(issue.get('screenshots',[]),report)
            row['issues'].append(clean)
        if final and (not row['expected'] or not row['actual']):raise APIError(400,'validation','Record expected and actual outcomes for every stage.')
        out['stages'][sid]=row
    return out
def document(r):
    return {'id':str(r.pk),'testerId':r.tester_id,'taskId':r.task_id,'program':r.program,'applicationVersion':PROGRAM['applicationVersion'],'targetModel':PROGRAM['targetModel'],'modelRevision':PROGRAM['modelRevision'],'version':r.version,'payload':r.payload,'submittedAt':r.submitted_at.isoformat() if r.submitted_at else None,'updatedAt':r.updated_at.isoformat(),'emailStatus':r.email_status,'emailAttempts':r.email_attempts}
@api(['GET'])
def program(request):
    u=owner(request)
    claimed=list(BisukReport.objects.filter(program=PROGRAM['id']).exclude(owner=u).values_list('tester_id',flat=True))
    return JsonResponse({**PROGRAM,'assignments':list(ASSIGNMENTS.values()),'assignmentTypes':8,'claimed':claimed,'admin':is_admin(u)})
@api(['GET','POST'])
def report(request):
    u=owner(request)
    if request.method=='GET':
        r=BisukReport.objects.filter(program=PROGRAM['id'],owner=u).first()
        return JsonResponse({'report':document(r) if r else None})
    throttle(request,'bisuk-save',str(u.pk),limit=500,seconds=3600)
    data=body(request,512*1024);action=data.get('action')
    if action=='claim':
        tester=data.get('testerId')
        if tester not in ASSIGNMENTS:raise APIError(400,'assignment','Choose your assigned tester ID.')
        try:
            with transaction.atomic():
                r,created=BisukReport.objects.get_or_create(program=PROGRAM['id'],owner=u,defaults={'tester_id':tester,'task_id':ASSIGNMENTS[tester]['id']})
                if r.tester_id!=tester:raise APIError(409,'assignment','This account already has an assignment.')
        except IntegrityError:raise APIError(409,'assignment','This tester ID is already assigned. Choose your own ID.')
        return JsonResponse({'report':document(r)})
    if action not in ['save','submit']:raise APIError(400,'action','Unknown report action.')
    with transaction.atomic():
        r=BisukReport.objects.select_for_update().filter(program=PROGRAM['id'],owner=u).first()
        if not r:raise APIError(404,'report','Choose an assignment first.')
        if r.submitted_at:return JsonResponse({'report':document(r),'duplicate':True})
        if data.get('version')!=r.version:raise APIError(409,'version','A newer draft exists. Reload before saving again.')
        r.payload=validate_payload(data.get('payload'),action=='submit',r)
        r.version+=1
        if action=='submit':r.submitted_at=timezone.now();r.email_status='pending'
        r.save()
    if action=='submit':
        deliver(r.pk);r.refresh_from_db()
    return JsonResponse({'report':document(r)})
def redact(text):
    text=re.sub(r'(?i)\bBearer\s+[A-Za-z0-9._~-]+','Bearer [redacted]',text)
    text=re.sub(r'\bsk-[A-Za-z0-9_-]{16,}','[redacted]',text)
    text=re.sub(r'(?i)(api[_ -]?key|password|secret|token)\s*[:=]\s*["\x27]?[^\s,"\x27]{8,}',r'\1=[redacted]',text)
    return text
def deliver(report_id):
    now=timezone.now()
    with transaction.atomic():
        r=BisukReport.objects.select_for_update().get(pk=report_id)
        if not r.submitted_at or r.email_status=='sent' or (r.email_lease_until and r.email_lease_until>now):return False
        r.email_status='sending';r.email_lease_until=now+timedelta(minutes=2);r.email_attempts+=1;r.save(update_fields=['email_status','email_lease_until','email_attempts'])
    try:
        recipient=settings.BISUK_TESTING_RECIPIENT
        if not recipient:raise RuntimeError('Recipient not configured')
        issues=[i for s in r.payload.get('stages',{}).values() for i in s.get('issues',[])]
        detail={'testerId':r.tester_id,'submittedAt':r.submitted_at.isoformat(),'assignedProject':ASSIGNMENTS[r.tester_id]['title'],'overall':r.payload.get('overall'),'issueCount':len(issues),'severityBreakdown':dict(Counter(i['severity'] for i in issues)),'report':settings.APP_ORIGIN+'/bisuk-testing/admin?report='+str(r.pk),'evaluation':r.payload}
        message=redact(json.dumps(detail,indent=2,ensure_ascii=False))
        sent=send_mail('BISUK testing report — '+r.tester_id+' — '+ASSIGNMENTS[r.tester_id]['title'],message,settings.DEFAULT_FROM_EMAIL,[recipient],fail_silently=False)
        if sent!=1:raise RuntimeError('SMTP did not confirm acceptance')
        BisukReport.objects.filter(pk=r.pk).update(email_status='sent',email_sent_at=timezone.now(),email_lease_until=None,email_error='')
        return True
    except Exception:
        BisukReport.objects.filter(pk=r.pk).update(email_status='failed',email_lease_until=None,email_error='Email delivery failed; saved report retained for retry.')
        return False
def report_stats(rows):
    issues=[i for r in rows for s in r.payload.get('stages',{}).values() for i in s.get('issues',[])]
    stage_summary={}
    for sid in STAGES:
        results=[r.payload.get('stages',{}).get(sid,{}) for r in rows if r.submitted_at]
        successful=sum(s.get('status')=='successful' for s in results)
        stage_summary[sid]={'completedReports':len(results),'successful':successful,'successRate':successful/len(results) if results else None,'failedOrBlocked':sum(s.get('status') in ['failed','blocked'] for s in results)}
    averages={}
    for name in RATINGS:
        values=[s.get('ratings',{}).get(name) for r in rows if r.submitted_at for s in r.payload.get('stages',{}).values()]
        values=[v for v in values if isinstance(v,int)]
        averages[name]={'mean':sum(values)/len(values) if values else None,'n':len(values)}
    return {'assigned':len(rows),'assignmentTypes':8,'availableTesterSlots':32,'submitted':sum(bool(r.submitted_at) for r in rows),'categories':dict(Counter(i['category'] for i in issues)),'severity':dict(Counter(i['severity'] for i in issues)),'scores':averages,'stages':stage_summary}
@api(['GET','POST'])
def admin(request):
    admin_user(request)
    if request.method=='POST':
        throttle(request,'bisuk-email-retry',str(request.user.pk),limit=30,seconds=3600)
        data=body(request)
        try:r=BisukReport.objects.get(pk=data.get('id'),program=PROGRAM['id'],submitted_at__isnull=False)
        except (BisukReport.DoesNotExist,ValueError,TypeError,ValidationError):raise APIError(404,'report','Submitted report not found.')
        deliver(r.pk)
    rows=list(BisukReport.objects.filter(program=PROGRAM['id']).order_by('tester_id'))
    return JsonResponse({'summary':report_stats(rows),'reports':[document(r) for r in rows]})
@api(['GET'])
def export(request):
    admin_user(request)
    rows=list(BisukReport.objects.filter(program=PROGRAM['id']).order_by('tester_id'))
    if request.GET.get('format')=='csv':
        stream=io.StringIO();writer=csv.writer(stream)
        writer.writerow(['tester_id','task_id','submitted_at','overall','stage','status','design','instruction_following','functional_correctness','performance','issues','expected','actual'])
        def cell(v):
            v='' if v is None else str(v)
            return "'"+v if v.lstrip().startswith(('=','+','-','@')) else v
        for r in rows:
            for sid,s in r.payload.get('stages',{}).items():
                writer.writerow([cell(v) for v in [r.tester_id,r.task_id,r.submitted_at,r.payload.get('overall'),sid,s.get('status'),*[s.get('ratings',{}).get(k) for k in RATINGS],len(s.get('issues',[])),s.get('expected'),s.get('actual')]])
        response=HttpResponse(stream.getvalue(),content_type='text/csv; charset=utf-8');response['Content-Disposition']='attachment; filename="bisuk-testing.csv"';return response
    return JsonResponse({'program':PROGRAM,'summary':report_stats(rows),'reports':[document(r) for r in rows]})

def screenshot_info(image):
    return {'id':str(image.pk),'url':'/api/bisuk-testing/screenshots/'+str(image.pk),'width':image.width,'height':image.height,'size':image.byte_size}

def clean_screenshots(value, report):
    if not isinstance(value,list) or len(value)>3 or any(not isinstance(v,str) for v in value):
        raise APIError(400,'validation','Use up to three screenshots per issue.')
    try:ids=[str(UUID(v)) for v in value]
    except (ValueError,TypeError):raise APIError(400,'validation','Invalid screenshot reference.')
    if len(set(ids))!=len(ids):raise APIError(400,'validation','A screenshot was repeated.')
    if ids and (report is None or BisukScreenshot.objects.filter(report=report,pk__in=ids).count()!=len(ids)):
        raise APIError(400,'validation','A screenshot is unavailable for this report.')
    return ids

@api(['POST'])
def upload_screenshot(request):
    u=owner(request)
    throttle(request,'bisuk-screenshot',str(u.pk),limit=60,network_limit=600,seconds=3600)
    if request.content_type!='multipart/form-data':raise APIError(415,'content_type','Choose an image file.')
    image=request.FILES.get('image')
    if not image or len(request.FILES)!=1:raise APIError(400,'image','Choose one PNG, JPEG or WebP screenshot.')
    if image.size>5*1024*1024:raise APIError(413,'image_size','Each screenshot must be 5 MB or smaller.')
    from PIL import Image, ImageOps, UnidentifiedImageError
    import warnings
    try:
        raw=image.read()
        with warnings.catch_warnings():
            warnings.simplefilter('error',Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw),formats=['PNG','JPEG','WEBP']) as check:
                if check.width*check.height>16_000_000 or getattr(check,'n_frames',1)!=1:
                    raise ValueError('dimensions or animation')
                check.verify()
            with Image.open(io.BytesIO(raw),formats=['PNG','JPEG','WEBP']) as source:
                source=ImageOps.exif_transpose(source)
                source.thumbnail((3000,3000))
                if source.mode in ('RGBA','LA') or 'transparency' in source.info:
                    rgba=source.convert('RGBA');normal=Image.new('RGB',rgba.size,'white');normal.paste(rgba,mask=rgba.getchannel('A'))
                else:normal=source.convert('RGB')
                output=io.BytesIO();normal.save(output,format='PNG')
                mime='image/png'
                if output.tell()>3*1024*1024:
                    output=io.BytesIO();normal.save(output,format='JPEG',quality=90);mime='image/jpeg'
                content=output.getvalue();width,height=normal.size
                if len(content)>3*1024*1024:raise ValueError('normalized size')
    except (UnidentifiedImageError,OSError,ValueError,Image.DecompressionBombError,Image.DecompressionBombWarning):
        raise APIError(400,'image','Use a valid, non-animated PNG, JPEG or WebP screenshot, up to 16 megapixels.')
    with transaction.atomic():
        r=BisukReport.objects.select_for_update().filter(program=PROGRAM['id'],owner=u).first()
        if not r:raise APIError(404,'report','Choose your tester ID first.')
        if r.submitted_at:raise APIError(409,'submitted','This report has already been submitted.')
        if r.screenshots.count()>=40:raise APIError(400,'image_limit','This report has reached its 40-upload limit.')
        saved=BisukScreenshot.objects.create(report=r,content=content,content_type=mime,byte_size=len(content),width=width,height=height)
    return JsonResponse({'screenshot':screenshot_info(saved)},status=201)

@api(['GET'])
def screenshot(request,image_id):
    # Images use cookie authentication because browser img requests cannot set the account header.
    if not request.user.is_authenticated:raise APIError(401,'sign_in','Sign in to view this screenshot.')
    image=BisukScreenshot.objects.select_related('report').filter(pk=image_id,report__program=PROGRAM['id']).first()
    if not image or (image.report.owner_id!=request.user.pk and not is_admin(request.user)):
        raise APIError(404,'image','Screenshot not found.')
    response=HttpResponse(bytes(image.content),content_type=image.content_type)
    response['X-Content-Type-Options']='nosniff'
    response['Content-Disposition']='inline; filename="screenshot.'+('png' if image.content_type=='image/png' else 'jpg')+'"'
    response['Content-Security-Policy']="default-src 'none'; sandbox"
    return response
