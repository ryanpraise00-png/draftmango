"""Opt-in SMTP integration test. All account/session changes roll back."""
import argparse
import json
import os
import secrets
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from unittest.mock import patch

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--recipient', required=True)
parser.add_argument('--send-test-email', action='store_true', required=True)
args = parser.parse_args()
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'draftmango.settings')
import django
django.setup()
from django.conf import settings
from django.db import transaction
from django.test import Client, override_settings
from accounts.models import User
from accounts import views

recipient = args.recipient.strip().lower()
assert settings.EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend', 'Real SMTP is required'
assert not User.objects.filter(email=recipient).exists(), 'Recipient already has an account; this test will not alter it'
original_send = views.send_mail
links = []

def deliver(subject, body, sender, recipients, **kwargs):
    assert recipients == [recipient], 'Unexpected recipient'
    link = next(line for line in body.splitlines() if line.startswith(settings.APP_ORIGIN + '/auth#'))
    links.append({k: v[0] for k, v in parse_qs(urlsplit(link).fragment).items()})
    notice = 'AUTOMATED DRAFTMANGO LAUNCH TEST. No action is needed. The test uses this link automatically, then removes the temporary account by rolling back its transaction. No existing account or password is changed.\n\n'
    return original_send('[Draftmango launch test] ' + subject, notice + body, sender, recipients, **kwargs)

def session(client):
    data = client.get('/api/accounts/session', secure=True, HTTP_HOST=urlsplit(settings.APP_ORIGIN).netloc).json()
    client.token = data['csrfToken']
    return data

def send(client, path, payload, expected=200):
    response = client.post('/api/accounts/' + path, json.dumps(payload), content_type='application/json', secure=True,
        HTTP_HOST=urlsplit(settings.APP_ORIGIN).netloc, HTTP_ORIGIN=settings.APP_ORIGIN,
        HTTP_X_CSRFTOKEN=client.token, HTTP_X_DRAFTMANGO_CLIENT_IP='198.18.0.247')
    data = response.json()
    assert response.status_code == expected, path + ' failed: ' + str(response.status_code) + ' ' + data.get('error', {}).get('code', '')
    if 'csrfToken' in data:
        client.token = data['csrfToken']
    return data

with transaction.atomic(), override_settings(REGISTRATION_OPEN=True), patch('accounts.views.send_mail', side_effect=deliver):
    secret = secrets.token_urlsafe(32)
    client = Client(enforce_csrf_checks=True)
    assert session(client)['user'] is None
    created = send(client, 'signup', {'email': recipient, 'password': secret, 'intent': {'idea': 'Launch test flowers', 'template': 'cafe-1'}}, 201)
    assert created['confirmationRequired']
    assert not User.objects.get(email=recipient).is_active
    assert session(client)['user'] is None
    send(client, 'login', {'email': recipient, 'password': secret}, 403)
    assert links[0]['idea'] == 'Launch test flowers' and links[0]['template'] == 'cafe-1'
    send(client, 'verify', links[0])
    send(client, 'verify', links[0], 400)
    signed_in = send(client, 'login', {'email': recipient, 'password': secret})
    assert signed_in['user']['emailVerified']
    assert session(client)['user']['id'] == signed_in['user']['id']
    old_client = Client(enforce_csrf_checks=True); old_client.cookies = client.cookies.copy()
    reset = Client(enforce_csrf_checks=True); session(reset)
    send(reset, 'reset', {'email': recipient, 'intent': {'plan': 'basic', 'billing': 'monthly'}})
    assert links[1]['flow'] == 'recovery' and links[1]['plan'] == 'basic'
    next_secret = secrets.token_urlsafe(32)
    send(reset, 'reset-confirm', {**links[1], 'password': next_secret})
    send(reset, 'reset-confirm', {**links[1], 'password': next_secret}, 400)
    assert session(old_client)['user'] is None
    send(reset, 'login', {'email': recipient, 'password': secret}, 401)
    send(reset, 'login', {'email': recipient, 'password': next_secret})
    send(reset, 'logout', {})
    assert session(reset)['user'] is None
    transaction.set_rollback(True)
assert not User.objects.filter(email=recipient).exists(), 'Test account was not rolled back'
print(json.dumps({'status': 'passed', 'recipient': recipient, 'smtpAcceptedMessages': len(links), 'checks': ['signup', 'unverified-login-rejected', 'verification', 'single-use-link', 'login', 'session', 'reset-email', 'password-reset', 'old-session-invalidated', 'old-password-rejected', 'logout', 'intent-preserved', 'test-account-rolled-back']}))
