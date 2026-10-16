"""
Offline tests for scripts/check_auth_setup.py: sender check and Gmail token account check.
Google's token endpoints are an httpx.MockTransport; no network, no email, no credentials.
"""
import importlib.util
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import httpx
import pytest

from backend.services.email_transport import GmailApiTransport, TOKEN_URL

_spec = importlib.util.spec_from_file_location(
    "check_auth_setup", os.path.join(os.path.dirname(__file__), "..", "scripts", "check_auth_setup.py"))
check = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check)

SENDER = "leofi.labs@gmail.com"
SECRET = "test-secret-ZZZ"
REFRESH = "test-refresh-ZZZ"


def _transport(tokeninfo_status=200, tokeninfo=None, token_status=200, token_body=None, sender=SENDER):
    def handler(request):
        if str(request.url) == TOKEN_URL:
            return httpx.Response(token_status, json=token_body or {"access_token": "access-ZZZ", "expires_in": 3600})
        if str(request.url).startswith(check.TOKENINFO_URL):
            return httpx.Response(tokeninfo_status, json=tokeninfo or {})
        return httpx.Response(404)
    return GmailApiTransport("id", SECRET, REFRESH, sender,
                             client_factory=lambda: httpx.Client(transport=httpx.MockTransport(handler)))


def _no_secrets(messages):
    text = " ".join(messages)
    assert SECRET not in text and REFRESH not in text and "access-ZZZ" not in text


def test_matching_account_and_scope():
    t = _transport(tokeninfo={"scope": "https://www.googleapis.com/auth/gmail.send openid https://www.googleapis.com/auth/userinfo.email",
                              "email": "Leofi.Labs@gmail.com"})
    ok, messages = check.verify_gmail_account(t, SENDER)
    assert ok, messages
    assert "[OK] token belongs to leofi.labs@gmail.com" in messages
    _no_secrets(messages)


def test_token_for_another_account_is_rejected():
    t = _transport(tokeninfo={"scope": check.GMAIL_SEND_SCOPE + " email", "email": "someone.else@gmail.com"})
    ok, messages = check.verify_gmail_account(t, SENDER)
    assert not ok
    assert any("belongs to someone.else@gmail.com, expected leofi.labs@gmail.com" in m for m in messages)


def test_sender_setting_must_match_token_account():
    t = _transport(tokeninfo={"scope": check.GMAIL_SEND_SCOPE + " email", "email": SENDER}, sender="other@gmail.com")
    ok, messages = check.verify_gmail_account(t, None)
    assert not ok and any("GMAIL_SENDER (other@gmail.com) differs" in m for m in messages)


def test_missing_send_scope_and_unknown_account():
    t = _transport(tokeninfo={"scope": "https://www.googleapis.com/auth/gmail.readonly"})
    ok, messages = check.verify_gmail_account(t, SENDER)
    assert not ok
    assert "[PROBLEM] token is missing the gmail.send scope" in messages
    assert any("doesn't reveal its account" in m for m in messages)


def test_revoked_refresh_token_explained_without_secrets():
    t = _transport(token_status=400, token_body={"error": "invalid_grant", "error_description": "Bad Request"})
    ok, messages = check.verify_gmail_account(t, SENDER)
    assert not ok and "invalid_grant" in messages[0] and "create a new one" in messages[0]
    _no_secrets(messages)
