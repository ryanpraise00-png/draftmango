import json
import hashlib
from functools import wraps
from urllib.parse import urlencode
from uuid import UUID
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator, default_token_generator
from django.core.cache import cache
from django.core.exceptions import ValidationError, RequestDataTooBig
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.db.models import F
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from .models import User, Project

class APIError(Exception):
    def __init__(self, status, code, message):
        self.status, self.code, self.message = status, code, message

def error(status, code, message):
    return JsonResponse({'error': {'code': code, 'message': message}}, status=status)

def csrf_failure(request, reason=''):
    return error(403, 'csrf', 'Your session needs refreshing. Reload the page and try again.')

def api(methods):
    def decorate(view):
        @wraps(view)
        def wrapped(request, *args, **kwargs):
            if request.method not in methods:
                return error(405, 'method', 'This action does not support that request method.')
            try:
                response = view(request, *args, **kwargs)
            except APIError as exc:
                response = error(exc.status, exc.code, exc.message)
            except RequestDataTooBig:
                response = error(413, 'too_large', 'This project is too large to sync. Your device copy is unchanged.')
            response['Cache-Control'] = 'no-store'
            return response
        return wrapped
    return decorate

def body(request, limit=16384):
    if request.content_type != 'application/json':
        raise APIError(415, 'content_type', 'Send a JSON request.')
    if len(request.body) > limit:
        raise APIError(413, 'too_large', 'This request is too large. Your device copy is unchanged.')
    try:
        value = json.loads(request.body)
        if not isinstance(value, dict):
            raise ValueError()
        return value
    except (ValueError, UnicodeError):
        raise APIError(400, 'invalid_json', 'This request could not be read.')

def throttle(request, action, identity='', limit=15, seconds=300):
    # Production uses a shared Redis cache across all Gunicorn workers.
    for target in [request.META.get('REMOTE_ADDR', ''), identity.lower()] if identity else [request.META.get('REMOTE_ADDR', '')]:
        key = 'auth:' + hashlib.sha256((action + ':' + target).encode()).hexdigest()
        if cache.add(key, 1, seconds):
            continue
        try:
            count = cache.incr(key)
        except ValueError:
            cache.set(key, 1, seconds)
            count = 1
        if count > limit:
            raise APIError(429, 'rate_limit', 'Please wait a little before trying again.')

def address(data):
    email = data.get('email', '')
    if not isinstance(email, str) or len(email) > 254:
        raise APIError(400, 'email', 'Enter a valid email address.')
    email = email.strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        raise APIError(400, 'email', 'Enter a valid email address.')
    return email

def password(data, user=None, validate=True):
    value = data.get('password', '')
    if not isinstance(value, str) or not 1 <= len(value) <= 128:
        raise APIError(400, 'password', 'Enter a password of up to 128 characters.')
    if validate:
        try:
            validate_password(value, user=user)
        except ValidationError as exc:
            raise APIError(400, 'weak_password', ' '.join(exc.messages))
    return value

def user_json(user):
    return {'id': str(user.id), 'email': user.email, 'emailVerified': user.email_verified, 'name': user.first_name, 'joinedAt': user.date_joined.isoformat()} if user.is_authenticated else None

def session_json(request):
    return {'configured': True, 'provider': 'django', 'providers': ['google'] if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET else [],'user': user_json(request.user), 'csrfToken': get_token(request), 'emailDelivery': 'smtp' if settings.EMAIL_HOST else 'local', 'emailVerificationRequired': settings.REQUIRE_EMAIL_VERIFICATION}

@api(['GET'])
def session(request):
    return JsonResponse(session_json(request))

class VerificationToken(PasswordResetTokenGenerator):
    key_salt = 'draftmango.email.verify'
    def _make_hash_value(self, user, timestamp):
        return f'{user.pk}{user.password}{user.email}{user.email_verified}{timestamp}'
verification_token = VerificationToken()

def send_link(user, flow, generator):
    url = settings.APP_ORIGIN + '/auth.html#' + urlencode({'flow': flow, 'uid': str(user.pk), 'token': generator.make_token(user)})
    subject = 'Reset your Draftmango password' if flow == 'recovery' else 'Confirm your Draftmango email'
    try:
        send_mail(subject, f'{subject}\n\n{url}\n\nThis link expires in one hour. If you did not request it, ignore this email.', settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
    except Exception:
        raise APIError(503, 'email_delivery', 'The email could not be sent. Please try again shortly.')

@api(['POST'])
def signup(request):
    if not settings.REGISTRATION_OPEN:
        raise APIError(503, 'registration_closed', 'Signups will open soon. Please check back later.')
    data = body(request); email = address(data)
    throttle(request, 'signup', email, limit=8, seconds=3600)
    candidate = User(email=email); secret = password(data, candidate)
    try:
        user = User.objects.create_user(email, secret, is_active=not settings.REQUIRE_EMAIL_VERIFICATION)
    except IntegrityError:
        raise APIError(409, 'account_exists', 'An account already uses this email. Sign in or reset your password.')
    if settings.REQUIRE_EMAIL_VERIFICATION:
        send_link(user, 'verify', verification_token)
        return JsonResponse({'confirmationRequired': True, 'emailDelivery': 'smtp' if settings.EMAIL_HOST else 'local'}, status=201)
    login(request, user)
    request.session['workspace_device'] = request.META.get('HTTP_USER_AGENT', '')[:300]
    request.session['workspace_signed_in'] = timezone.now().isoformat()
    return JsonResponse(session_json(request), status=201)

@api(['POST'])
def signin(request):
    data = body(request); email = address(data)
    throttle(request, 'login', email)
    secret = password(data, validate=False)
    user = authenticate(request, email=email, password=secret)
    if user is None:
        pending = User.objects.filter(email=email, is_active=False).first()
        if pending and pending.check_password(secret):
            raise APIError(403, 'email_not_confirmed', 'Confirm your email before signing in. You can request a new link below.')
        raise APIError(401, 'invalid_credentials', 'That email and password did not match. Please try again.')
    login(request, user)
    request.session['workspace_device'] = request.META.get('HTTP_USER_AGENT', '')[:300]
    request.session['workspace_signed_in'] = timezone.now().isoformat()
    return JsonResponse(session_json(request))

@api(['POST'])
def signout(request):
    logout(request)
    return JsonResponse(session_json(request))

@api(['POST'])
def reset_request(request):
    email = address(body(request)); throttle(request, 'reset', email, limit=5, seconds=3600)
    user = User.objects.filter(email=email, is_active=True).first()
    if user:
        send_link(user, 'recovery', default_token_generator)
    return JsonResponse({'sent': True, 'emailDelivery': 'smtp' if settings.EMAIL_HOST else 'local'})

def token_user(data, generator):
    uid, token = data.get('uid'), data.get('token')
    try:
        if not isinstance(uid, str) or not isinstance(token, str) or len(token) > 100:
            raise ValueError()
        user = User.objects.get(pk=UUID(uid))
    except (ValueError, User.DoesNotExist):
        raise APIError(400, 'expired_link', 'This link has expired or is invalid. Request a new one.')
    if not generator.check_token(user, token):
        raise APIError(400, 'expired_link', 'This link has expired or is invalid. Request a new one.')
    return user

@api(['POST'])
def reset_confirm(request):
    throttle(request, 'reset-confirm', limit=15)
    data = body(request); user = token_user(data, default_token_generator)
    if not user.is_active:
        raise APIError(400, 'expired_link', 'This reset link is not available. Confirm your email first.')
    previous_hash = user.password
    user.set_password(password(data, user))
    if not User.objects.filter(pk=user.pk, password=previous_hash).update(password=user.password):
        raise APIError(400, 'expired_link', 'This link has already been used. Request a new one.')
    # Changing the password invalidates every older session. The owner signs in again.
    logout(request)
    return JsonResponse({'updated': True, 'csrfToken': get_token(request)})

@api(['POST'])
def verify(request):
    throttle(request, 'verify', limit=15)
    user = token_user(body(request), verification_token)
    if not User.objects.filter(pk=user.pk, email_verified=False, password=user.password).update(is_active=True, email_verified=True):
        raise APIError(400, 'expired_link', 'This link has already been used. Sign in to continue.')
    return JsonResponse({'verified': True})

@api(['POST'])
def resend_verification(request):
    email = address(body(request)); throttle(request, 'resend', email, limit=5, seconds=3600)
    user = User.objects.filter(email=email, is_active=False, email_verified=False).first()
    if user:
        send_link(user, 'verify', verification_token)
    return JsonResponse({'sent': True, 'emailDelivery': 'smtp' if settings.EMAIL_HOST else 'local'})

def validate_project(data):
    project_id, document, version = data.get('project_id'), data.get('project_document'), data.get('expected_version')
    if not isinstance(project_id, str) or not 1 <= len(project_id) <= 80 or not isinstance(document, dict) or document.get('id') != project_id:
        raise APIError(400, 'project', 'This project could not be read. Your device draft is unchanged.')
    if type(version) is not int or not 0 <= version < 2 ** 53:
        raise APIError(400, 'version', 'This project version could not be read.')
    if not isinstance(document.get('history'), list) or not document['history'] or not isinstance(document.get('title'), str):
        raise APIError(400, 'project', 'Project history and a title are required.')
    if len(json.dumps(document).encode()) > 8 * 1024 * 1024:
        raise APIError(413, 'too_large', 'This project is too large to sync. Export a copy from the builder.')
    return project_id, document, version

PROJECT_SUMMARY_PAGE = 500
PROJECT_FETCH_LIMIT = 20

@api(['GET', 'PUT'])
def projects(request):
    if not request.user.is_authenticated:
        raise APIError(401, 'sign_in', 'Sign in to open your projects.')
    if request.headers.get('X-Draftmango-Account') != str(request.user.pk):
        raise APIError(401, 'session_changed', 'Your account changed. Reload the page before continuing.')
    if request.method == 'GET':
        owned = Project.objects.filter(owner=request.user)
        ids = request.GET.getlist('id')
        if ids:
            # Full documents only for the projects this device is missing or has stale.
            if len(ids) > PROJECT_FETCH_LIMIT or any(not 1 <= len(value) <= 80 for value in ids):
                raise APIError(400, 'project_ids', 'Request up to %d valid project ids at a time.' % PROJECT_FETCH_LIMIT)
            rows = owned.filter(project_id__in=set(ids)).order_by('project_id')
            return JsonResponse({'projects': [{'id': row.project_id, 'document': row.document, 'version': row.version} for row in rows]})
        try:
            offset = max(0, min(int(request.GET.get('offset', '0')), 100000))
        except ValueError:
            raise APIError(400, 'offset', 'Invalid project page.')
        if request.GET.get('summary') == '1':
            # Lightweight listing: ids and versions only, never the stored documents.
            rows = owned.order_by('project_id').values_list('project_id', 'version')[offset:offset + PROJECT_SUMMARY_PAGE]
            return JsonResponse({'projects': [{'id': project_id, 'version': version} for project_id, version in rows], 'pageSize': PROJECT_SUMMARY_PAGE})
        # Original full listing, kept for browser tabs opened before this change.
        rows = owned.order_by('project_id')[offset:offset + 50]
        return JsonResponse({'projects': [{'id': row.project_id, 'document': row.document, 'version': row.version} for row in rows]})
    project_id, document, version = validate_project(body(request, 9 * 1024 * 1024))
    if version == 0:
        try:
            with transaction.atomic():
                Project.objects.create(owner=request.user, project_id=project_id, document=document)
        except IntegrityError:
            raise APIError(409, 'conflict', 'This project changed on another device. Keep both versions before continuing.')
        return JsonResponse({'version': 1}, status=201)
    with transaction.atomic():
        changed = Project.objects.filter(owner=request.user, project_id=project_id, version=version).update(document=document, version=F('version') + 1, updated_at=timezone.now())
        if not changed:
            raise APIError(409, 'conflict', 'This project changed on another device. Keep both versions before continuing.')
        if isinstance(document.get('workspace'),dict) and document['workspace'].get('deleted'):
            from .models import PublishedSite
            PublishedSite.objects.filter(owner=request.user,project__project_id=project_id,active_release__isnull=False).update(active_release=None,revision=F('revision')+1,updated_at=timezone.now())
    return JsonResponse({'version': version + 1})
