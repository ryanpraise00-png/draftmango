"""Account-owned static releases. This module never executes customer code."""
import base64
import hashlib
import hmac
import json
import re
from pathlib import PurePosixPath
from urllib.parse import urlsplit
from django.conf import settings
from django.db import transaction, IntegrityError
from django.http import JsonResponse, HttpResponse
from .models import User, Project, BillingAccount, PublishedAddress, PublishedSite, PublishedRelease
from .workspace_views import owner
from .views import api, body, APIError, throttle
from .billing import entitlements

RESERVED = set('www app api admin accounts auth login signup dashboard workspace mail email smtp imap pop ftp sftp ssh ns ns1 ns2 dns cdn assets static media files images billing payments checkout support help docs status staging stage test dev localhost preview publish publishing sites internal legal terms privacy blog careers careers2 _acme-challenge autodiscover autoconfig webmail mx mta dmarc'.split())
TYPES = {'.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.txt':'text/plain; charset=utf-8', '.webmanifest':'application/manifest+json'}
EXCLUDED = {'package.json','package-lock.json','tsconfig.json','jsconfig.json','credentials.json','secrets.json','README.txt'}
MAX_BYTES = 4 * 1024 * 1024
MAX_RELEASES = 20

def deleted(document):
    workspace=document.get('workspace')
    return isinstance(workspace,dict) and bool(workspace.get('deleted'))

def enabled():
    return bool(settings.PUBLISHING_ENABLED and len(settings.PUBLISHING_TOKEN) >= 32)

def domain():
    return settings.PUBLISHING_BASE_DOMAIN.lower()

def site_url(slug):
    suffix = '' if settings.PRODUCTION else ':' + str(settings.PUBLISHING_PORT)
    return ('https' if settings.PRODUCTION else 'http') + '://' + slug + '.' + domain() + suffix + '/'

def allowances(user):
    # Sandbox subscriptions can never grant capacity on the public deployment.
    mode = 'live' if settings.PRODUCTION else settings.BILLING_MODE
    account = BillingAccount.objects.filter(owner=user, mode=mode).first()
    return entitlements(account)

def slug_value(value):
    if not isinstance(value,str) or not re.fullmatch(r'[a-z][a-z0-9-]{1,46}[a-z0-9]',value) or value in RESERVED or value.startswith('xn--'):
        raise APIError(400,'site_address','Use 3–48 lowercase letters, numbers or hyphens. Start with a letter and end with a letter or number. This address may be reserved.')
    return value

def valid_path(name):
    return isinstance(name,str) and len(name)<=180 and re.fullmatch(r'[A-Za-z0-9_/-][A-Za-z0-9_./-]*',name) and not name.startswith('/') and all(p and not p.startswith('.') and p not in ('.','..') for p in name.split('/'))

def public_files(document):
    source = document.get('files')
    if not isinstance(source,dict) or not isinstance(source.get('index.html'),str) or not source['index.html'].strip():
        raise APIError(400,'site_source','Save your HTML source in the editor before publishing. An index.html file is required.')
    if len(source)>100: raise APIError(413,'site_size','Publish at most 100 source files.')
    output={}
    for name,text in source.items():
        if not valid_path(name) or not isinstance(text,str): raise APIError(400,'site_path','The project contains an invalid source path or file.')
        ext=PurePosixPath(name).suffix.lower()
        if ext not in TYPES or PurePosixPath(name).name in EXCLUDED or '.test.' in name or '.spec.' in name: continue
        try: encoded=text.encode('utf-8')
        except UnicodeEncodeError: raise APIError(400,'site_encoding','Save source files as valid UTF-8 text before publishing.')
        if len(encoded)>512*1024: raise APIError(413,'site_size','Each published source file must be below 512 KB.')
        output[name]={'body':text,'type':TYPES[ext],'binary':False}
    # Include only the shipped sample assets actually referenced by the source.
    combined='\n'.join(x['body'] for x in output.values())
    for asset in ('coffee.jpg','ceramics.jpg'):
        name='assets/'+asset
        if name in combined and name not in output:
            path=settings.BASE_DIR/'dist'/'assets'/asset
            if path.is_file(): output[name]={'body':base64.b64encode(path.read_bytes()).decode(),'type':'image/jpeg','binary':True}
    size=sum(len(base64.b64decode(f['body'])) if f['binary'] else len(f['body'].encode('utf-8')) for f in output.values())
    if size>MAX_BYTES: raise APIError(413,'site_size','This static website exceeds the 4 MB publishing limit.')
    digest=hashlib.sha256(json.dumps(output,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    return output,size,digest

def serialize(site):
    if not site:return None
    releases=list(site.releases.order_by('-number').only('id','number','created_at','byte_size','project_version'))
    return {'id':str(site.pk),'slug':site.address_id,'url':site_url(site.address_id),'revision':site.revision,
            'published':bool(site.active_release_id),'activeRelease':str(site.active_release_id) if site.active_release_id else None,
            'releases':[{'id':str(r.pk),'number':r.number,'createdAt':r.created_at.isoformat(),'bytes':r.byte_size,'projectVersion':r.project_version} for r in releases]}

def project_for(user,value,lock=False):
    if not isinstance(value,str) or not 1<=len(value)<=80:raise APIError(400,'project','Choose a saved project.')
    queryset=Project.objects.select_for_update() if lock else Project.objects
    row=queryset.filter(owner=user,project_id=value).first()
    if not row or deleted(row.document):raise APIError(404,'project','This saved project is not available for your account.')
    return row

@api(['GET','POST'])
def sites(request):
    user=owner(request)
    if request.method=='GET':
        project=project_for(user,request.GET.get('projectId'))
        site=PublishedSite.objects.filter(owner=user,project=project).first()
        return JsonResponse({'enabled':enabled(),'baseDomain':domain(),'site':serialize(site),'limits':allowances(user),'maxReleases':MAX_RELEASES})
    data=body(request)
    action=data.get('action')
    if action not in ('publish','rollback','unpublish'):raise APIError(400,'site_action','Choose publish, rollback or unpublish.')
    if action!='unpublish' and not enabled():raise APIError(503,'publishing_setup','Public publishing is being prepared. Your draft is unchanged.')
    if action!='unpublish' and settings.REQUIRE_EMAIL_VERIFICATION and not user.email_verified:raise APIError(403,'verify_email','Verify your email before publishing.')
    if data.get('confirmed') is not True:raise APIError(400,'confirm_publish','Confirm this public website change first.')
    throttle(request,'publish',str(user.pk),limit=40,seconds=3600)
    try:
        with transaction.atomic():
            # Serialize quota checks across all projects owned by an account.
            user=User.objects.select_for_update().get(pk=user.pk)
            project=project_for(user,data.get('projectId'),lock=True)
            site=PublishedSite.objects.select_for_update().filter(owner=user,project=project).first()
            revision=data.get('expectedRevision')
            if type(revision) is not int or revision!=(site.revision if site else 0):raise APIError(409,'site_changed','The published website changed. Refresh this panel before continuing.')
            if action=='unpublish':
                if site and site.active_release_id:
                    site.active_release=None;site.revision+=1;site.save(update_fields=['active_release','revision','updated_at'])
                return JsonResponse({'site':serialize(site)})
            limits=allowances(user)
            if (not site or not site.active_release_id) and PublishedSite.objects.filter(owner=user,active_release__isnull=False).count()>=limits['sites']:
                raise APIError(403,'site_limit',f"Your plan allows {limits['sites']} published website(s). Unpublish another website before publishing this one.")
            if action=='rollback':
                if not site:raise APIError(404,'site_release','This release is not available.')
                value=data.get('releaseId','')
                if not isinstance(value,str) or not re.fullmatch(r'[0-9a-f-]{36}',value):raise APIError(400,'site_release','Choose an available release.')
                release=site.releases.filter(pk=value).first()
                if not release:raise APIError(404,'site_release','This release is not available.')
            else:
                version=data.get('expectedProjectVersion')
                if type(version) is not int or version!=project.version:raise APIError(409,'project_changed','Sync the latest project changes before publishing.')
                files,size,digest=public_files(project.document)
                if not site:
                    if PublishedSite.objects.filter(owner=user).count()>=10:raise APIError(403,'site_limit','This account has reached its 10 saved website addresses.')
                    slug=slug_value(data.get('slug'))
                    if PublishedAddress.objects.filter(pk=slug).exists():raise APIError(409,'site_address_taken','That address is unavailable. Choose another name.')
                    address=PublishedAddress.objects.create(slug=slug)
                    site=PublishedSite.objects.create(owner=user,project=project,address=address)
                elif data.get('slug',site.address_id)!=site.address_id:raise APIError(400,'site_address_fixed','A website address cannot be renamed. This protects links and browser data.')
                if site.active_release_id and site.active_release.digest==digest:
                    return JsonResponse({'site':serialize(site),'unchanged':True})
                release=PublishedRelease.objects.create(site=site,number=site.revision+1,files=files,digest=digest,byte_size=size,project_version=project.version)
            site.active_release=release;site.revision+=1;site.save(update_fields=['active_release','revision','updated_at'])
            # Keep the current release even when rolling back to an older snapshot.
            keep=list(site.releases.order_by('-number').values_list('pk',flat=True)[:MAX_RELEASES])
            if release.pk not in keep:keep[-1]=release.pk
            site.releases.exclude(pk__in=keep).delete()
            return JsonResponse({'site':serialize(site)})
    except IntegrityError:
        raise APIError(409,'site_address_taken','That address was just reserved. Refresh and choose another name.')

@api(['GET','HEAD'])
def public_file(request):
    # Reachable only on the private backend network, never proxied by the app.
    supplied=request.headers.get('X-Publishing-Token','')
    if len(settings.PUBLISHING_TOKEN)<32 or not hmac.compare_digest(supplied,settings.PUBLISHING_TOKEN):
        return HttpResponse('Not found',status=404,content_type='text/plain')
    if not enabled():return HttpResponse('Publishing is unavailable',status=503,content_type='text/plain')
    host=request.GET.get('host','').lower();suffix='.'+domain()
    if not host.endswith(suffix):return HttpResponse('Website not found',status=404,content_type='text/plain')
    slug=host[:-len(suffix)]
    if not re.fullmatch(r'[a-z][a-z0-9-]{1,46}[a-z0-9]',slug) or slug in RESERVED:return HttpResponse('Website not found',status=404,content_type='text/plain')
    site=PublishedSite.objects.select_related('active_release','owner','project').filter(address_id=slug,active_release__isnull=False,owner__is_active=True).first()
    if not site or deleted(site.project.document):return HttpResponse('Website not found',status=404,content_type='text/plain')
    name=request.GET.get('path','')
    name=(name+'index.html') if not name or name.endswith('/') else name
    if not valid_path(name):return HttpResponse('Not found',status=404,content_type='text/plain')
    files=site.active_release.files;file=files.get(name)
    if not file:return HttpResponse('Page not found',status=404,content_type='text/plain')
    contents=base64.b64decode(file['body']) if file['binary'] else file['body'].encode('utf-8')
    response=HttpResponse(b'' if request.method=='HEAD' else contents,content_type=file['type'])
    response['Content-Length']=str(len(contents));response['X-Content-Type-Options']='nosniff'
    return response
