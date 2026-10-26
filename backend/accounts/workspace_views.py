"""Account-owned workspace preferences, activity, session controls and exports."""
import hashlib
import json
import re
import base64
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from django.contrib.auth import logout, update_session_auth_hash
from django.contrib.sessions.models import Session
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from .models import User, Project, WorkspaceActivity, BillingAccount
from .views import api, body, APIError, user_json, password, throttle

def owner(request):
    if not request.user.is_authenticated:
        raise APIError(401, 'sign_in', 'Sign in to continue.')
    if request.headers.get('X-Draftmango-Account') != str(request.user.pk):
        raise APIError(401, 'session_changed', 'Your account changed. Reload before continuing.')
    return request.user

def preferences(value):
    result = {}
    choices = {'theme': ['light', 'dark', 'system'], 'device': ['auto', 'responsive', 'desktop', 'tablet', 'mobile'], 'buildLevel': ['standard'], 'starter': ['auto', 'cafe', 'store', 'portfolio', 'custom'], 'color': ['auto', 'warm', 'citrus', 'sage', 'rose', 'ink']}
    for key, allowed in choices.items():
        if key in value:
            if value[key] not in allowed:
                raise APIError(400, 'preferences', 'Invalid ' + key + ' preference.')
            result[key] = value[key]
    for key in ['sound', 'wordWrap', 'lineNumbers', 'reduceMotion', 'autoRefresh']:
        if key in value:
            if type(value[key]) is not bool:
                raise APIError(400, 'preferences', 'Invalid ' + key + ' preference.')
            result[key] = value[key]
    for key, allowed in {'fontSize': [12, 13, 14, 15, 16, 18, 20], 'indent': [2, 4, 8]}.items():
        if key in value:
            if type(value[key]) is not int or value[key] not in allowed:
                raise APIError(400, 'preferences', 'Invalid editor preference.')
            result[key] = value[key]
    return result

@api(['GET', 'PATCH'])
def profile(request):
    user = owner(request)
    if request.method == 'PATCH':
        data = body(request)
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            if 'name' in data:
                if not isinstance(data['name'], str) or len(data['name']) > 60:
                    raise APIError(400, 'name', 'Use a display name of up to 60 characters.')
                user.first_name = data['name'].strip()
            if 'preferences' in data:
                if not isinstance(data['preferences'], dict):
                    raise APIError(400, 'preferences', 'Invalid preferences.')
                user.workspace_preferences = {**user.workspace_preferences, **preferences(data['preferences'])}
            user.save(update_fields=['first_name', 'workspace_preferences'])
    return JsonResponse({'user': user_json(user), 'preferences': user.workspace_preferences})

def sessions_for(user):
    for item in Session.objects.filter(expire_date__gt=timezone.now()).iterator():
        data = item.get_decoded()
        if data.get('_auth_user_id') == str(user.pk):
            yield item, data

def session_id(key):
    # Opaque control identifier, never expose the session cookie itself.
    return hashlib.sha256(('workspace-session:' + key).encode()).hexdigest()

@api(['GET', 'POST'])
def sessions(request):
    user = owner(request)
    if request.method == 'POST':
        data = body(request)
        if data.get('action') not in ['revoke', 'others']:
            raise APIError(400, 'action', 'Choose a session action.')
        for item, _ in sessions_for(user):
            if item.session_key == request.session.session_key:
                continue
            if data['action'] == 'others' or session_id(item.session_key) == data.get('id'):
                item.delete()
    rows = []
    for item, data in sessions_for(user):
        current = item.session_key == request.session.session_key
        ua = data.get('workspace_device', request.META.get('HTTP_USER_AGENT', '') if current else '')
        browser = 'Edge' if 'Edg/' in ua else 'Chrome' if 'Chrome/' in ua else 'Firefox' if 'Firefox/' in ua else 'Safari' if 'Safari/' in ua else 'Browser'
        system = 'Windows' if 'Windows' in ua else 'Android' if 'Android' in ua else 'iOS' if 'iPhone' in ua else 'macOS' if 'Macintosh' in ua else 'Linux' if 'Linux' in ua else ''
        rows.append({'id': session_id(item.session_key), 'device': browser + (' on ' + system if system else ''), 'current': current, 'signedIn': data.get('workspace_signed_in'), 'expiresAt': item.expire_date.isoformat()})
    return JsonResponse({'sessions': sorted(rows, key=lambda row: not row['current'])})

@api(['POST'])
def change_password(request):
    user = owner(request); data = body(request)
    throttle(request, 'change-password', str(user.pk), limit=8)
    if not isinstance(data.get('currentPassword'), str) or not user.check_password(data['currentPassword']):
        raise APIError(400, 'password', 'Your current password did not match.')
    user.set_password(password(data, user)); user.save(update_fields=['password']); update_session_auth_hash(request, user)
    return JsonResponse({'updated': True})

@api(['GET', 'POST'])
def activity(request):
    user = owner(request)
    if request.method == 'POST':
        data = body(request)
        if data.get('kind') not in ['build', 'test', 'project', 'ai'] or not isinstance(data.get('id'), str) or not 1 <= len(data['id']) <= 80:
            raise APIError(400, 'activity', 'Invalid activity record.')
        project_id = data.get('projectId', '')
        if not isinstance(project_id, str) or len(project_id) > 80:
            raise APIError(400, 'activity', 'Invalid project.')
        WorkspaceActivity.objects.get_or_create(owner=user, event_id=data['id'], defaults={'kind': data['kind'], 'project_id': project_id, 'success': data.get('success') is not False})
    rows = WorkspaceActivity.objects.filter(owner=user).order_by('-created_at')[:2000]
    return JsonResponse({'activity': [{'id': row.event_id, 'projectId': row.project_id, 'kind': row.kind, 'success': row.success, 'at': row.created_at.isoformat()} for row in rows]})

@api(['GET'])
def export(request):
    user = owner(request)
    return JsonResponse({'exportedAt': timezone.now().isoformat(), 'profile': user_json(user), 'preferences': user.workspace_preferences, 'projects': [row.document for row in Project.objects.filter(owner=user)]})

@api(['POST'])
def delete_account(request):
    user = owner(request); data = body(request)
    throttle(request, 'delete-account', str(user.pk), limit=5)
    if data.get('confirmation') != 'DELETE MY ACCOUNT' or not isinstance(data.get('password'), str) or not user.check_password(data['password']):
        raise APIError(400, 'confirmation', 'Enter your password and type DELETE MY ACCOUNT to confirm.')
    with transaction.atomic():
        for account in BillingAccount.objects.select_for_update().filter(owner=user):
            if (account.subscription_id and account.status not in ('canceled', 'incomplete_expired')) or (account.checkout_expires and account.checkout_expires > timezone.now()) or (account.busy_until and account.busy_until > timezone.now()):
                raise APIError(409, 'billing_active', 'Cancel your subscription and any pending checkout in Billing before deleting your account. Scheduled cancellation must finish first.')
        for item, _ in sessions_for(user):
            item.delete()
        user.delete()
    logout(request)
    return JsonResponse({'deleted': True})

@api(['POST'])
def import_github(request):
    user = owner(request)
    throttle(request, 'github-import', str(user.pk), limit=5)
    url = body(request).get('url', '')
    match = re.fullmatch(r'https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?', url) if isinstance(url, str) else None
    if not match:
        raise APIError(400, 'repository', 'Enter a public repository URL, such as https://github.com/owner/repository.')
    repo_owner, repo_name = match.groups()
    def get(path):
        try:
            req = Request('https://api.github.com/' + path, headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'Draftmango-local-import'})
            with urlopen(req, timeout=10) as response:
                data = response.read(4 * 1024 * 1024 + 1)
                if len(data) > 4 * 1024 * 1024:
                    raise APIError(413, 'repository_size', 'This repository is too large. Import selected files instead.')
                return json.loads(data)
        except HTTPError as exc:
            raise APIError(400, 'repository', 'GitHub could not provide this public repository. Check its URL and public access, or try again after the rate limit resets.') from exc
        except (URLError, TimeoutError, ValueError) as exc:
            raise APIError(502, 'github', 'GitHub could not be reached. Try again shortly.') from exc
    info = get(f'repos/{repo_owner}/{repo_name}')
    # Resolve HEAD through GitHub rather than accepting arbitrary URLs or refs from the browser.
    tree = get(f'repos/{repo_owner}/{repo_name}/git/trees/HEAD?recursive=1')
    if tree.get('truncated'):
        raise APIError(413, 'repository_size', 'This repository is too large. Upload the files you need instead.')
    entries = [item for item in tree.get('tree', []) if item.get('type') == 'blob' and re.search(r'\.(html?|css|[cm]?js|jsx|tsx?|json|md|txt|csv|svg|xml)$', item.get('path', ''), re.I) and not any(part.startswith('.') or part in ['node_modules', 'vendor'] for part in item['path'].split('/'))]
    if len(entries) > 60 or sum(item.get('size', 0) for item in entries) > 3 * 1024 * 1024 or any(item.get('size', 0) > 500000 for item in entries):
        raise APIError(413, 'repository_size', 'Import up to 60 source files, 500 KB each and 3 MB total. Upload selected files for this repository.')
    def fetch_source(item):
        if not re.fullmatch(r'[a-zA-Z0-9_@() ./-]{1,179}', item['path']) or any(part in ['', '.', '..'] for part in item['path'].split('/')):
            return None
        if not re.fullmatch(r'[a-f0-9]{40}', item.get('sha', '')):
            return None
        blob = get(f'repos/{repo_owner}/{repo_name}/git/blobs/{item["sha"]}')
        try:
            content = base64.b64decode(blob.get('content', ''))
            if len(content) > 500000:
                raise APIError(413, 'repository_size', 'A source file exceeds 500 KB.')
            return item['path'], content.decode('utf-8')
        except (ValueError, UnicodeError):
            return None
    with ThreadPoolExecutor(max_workers=6) as pool:
        files = dict(row for row in pool.map(fetch_source, entries) if row is not None)
    if not files:
        raise APIError(400, 'repository_files', 'No supported source files were found.')
    files.setdefault('index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Imported project</title></head><body><p>This repository has no root index.html. Open Code to explore its source. Framework projects need their own local build environment.</p></body></html>')
    files.setdefault('styles.css', '')
    files.setdefault('app.js', '')
    return JsonResponse({'name': info.get('name', repo_name), 'files': files})
