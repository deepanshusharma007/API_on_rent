"""
Offline tests: email transport selection and the Gmail API (HTTPS) transport.

Covers:
  - EMAIL_TRANSPORT defaults to smtp; SMTP behaviour is unchanged
  - Gmail API is used only when selected AND fully configured
  - Access tokens are cached, refreshed when expired, refreshed+retried once on 401
  - Failures: _send returns False, the contact form still raises (502 path)
  - Contact-form Reply-To survives the Gmail transport
  - Logs never contain credentials, tokens or message bodies

Fully offline: Google endpoints are an httpx.MockTransport, SMTP is patched.
No network, no real email, no credentials.

Run:
    python -m pytest tests/test_email_transport.py -v
"""

import os
import sys
import json
import time
import base64
import logging
import threading
from email import message_from_bytes
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import httpx
import pytest

from backend.services import email_service as email_module
from backend.services.email_transport import (
    REQUEST_TIMEOUT_SECONDS, SEND_URL, TOKEN_URL, GmailApiError, GmailApiTransport,
)

CLIENT_SECRET = "test-client-secret-ZZZ"
REFRESH_TOKEN = "test-refresh-token-ZZZ"
ACCESS_PREFIX = "test-access-token-"
SENDER = "airent.sender@gmail.com"
BODY_MARKER = "BODY-MARKER-7f3a"

GMAIL_ENV = {
    "GMAIL_API_CLIENT_ID": "test-client-id.apps.googleusercontent.com",
    "GMAIL_API_CLIENT_SECRET": CLIENT_SECRET,
    "GMAIL_API_REFRESH_TOKEN": REFRESH_TOKEN,
    "GMAIL_SENDER": SENDER,
}
SMTP_ENV = ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL")


# -- Fake Google endpoints -----------------------------------------------------

class FakeGoogle:
    """httpx.MockTransport handler for the token and send endpoints."""

    def __init__(self, send_statuses=(200,), token_status=200, token_body=None,
                 send_exc=None, token_delay=0.0):
        self.send_statuses = list(send_statuses)
        self.token_status = token_status
        self.token_body = token_body
        self.send_exc = send_exc
        self.token_delay = token_delay
        self.token_calls = 0
        self.send_requests = []
        self._lock = threading.Lock()

    def __call__(self, request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url == TOKEN_URL:
            with self._lock:
                self.token_calls += 1
                n = self.token_calls
            if self.token_delay:
                time.sleep(self.token_delay)
            body = self.token_body or {"access_token": f"{ACCESS_PREFIX}{n}", "expires_in": 3600, "token_type": "Bearer"}
            return httpx.Response(self.token_status, json=body)
        if url == SEND_URL:
            with self._lock:
                self.send_requests.append(request)
                i = len(self.send_requests) - 1
            if self.send_exc:
                raise self.send_exc
            status = self.send_statuses[min(i, len(self.send_statuses) - 1)]
            if 200 <= status < 300:
                return httpx.Response(status, json={"id": "msg-1"})
            return httpx.Response(status, json={"error": {"code": status, "status": "UNAUTHENTICATED"}})
        return httpx.Response(404)


def _factory(fake):
    return lambda: httpx.Client(transport=httpx.MockTransport(fake), timeout=REQUEST_TIMEOUT_SECONDS)


def _transport(fake, **overrides):
    kwargs = dict(client_id=GMAIL_ENV["GMAIL_API_CLIENT_ID"], client_secret=CLIENT_SECRET,
                  refresh_token=REFRESH_TOKEN, sender=SENDER)
    kwargs.update(overrides)
    return GmailApiTransport(client_factory=_factory(fake), **kwargs)


@pytest.fixture
def clean_env(monkeypatch):
    for name in ("EMAIL_TRANSPORT", *SMTP_ENV, *GMAIL_ENV):
        monkeypatch.delenv(name, raising=False)
    try:  # values from a developer's .env must not leak into these tests either
        from backend.config import settings
        for name in ("EMAIL_TRANSPORT", *SMTP_ENV, *GMAIL_ENV):
            if hasattr(settings, name):
                monkeypatch.setattr(settings, name, 587 if name == "SMTP_PORT" else "")
    except Exception:
        pass
    return monkeypatch


def _gmail_service(clean_env, fake, **env_overrides):
    clean_env.setenv("EMAIL_TRANSPORT", "gmail_api")
    for name, value in {**GMAIL_ENV, **env_overrides}.items():
        clean_env.setenv(name, value)
    svc = email_module.EmailService()
    svc.gmail._client_factory = _factory(fake)
    return svc


def _decoded(request: httpx.Request):
    raw = json.loads(request.content)["raw"]
    return message_from_bytes(base64.urlsafe_b64decode(raw))


def _no_network():
    def fail(*a, **kw):
        raise AssertionError("no HTTP call expected")
    return fail


def _assert_no_secrets(text: str):
    for secret in (CLIENT_SECRET, REFRESH_TOKEN, ACCESS_PREFIX, BODY_MARKER):
        assert secret not in text


# -- Transport selection -------------------------------------------------------

def test_default_transport_is_smtp_and_unchanged(clean_env):
    svc = email_module.EmailService()
    assert svc.transport == "smtp"
    svc.host, svc.port, svc.user, svc.password, svc.enabled = "smtp.test.local", 587, "u", "p", True
    svc.gmail._client_factory = _no_network()

    with patch.object(email_module.smtplib, "SMTP") as smtp:
        assert svc._send("a@test.local", "Subject", "<p>hi</p>") is True

    smtp.assert_called_once_with("smtp.test.local", 587, timeout=10)
    server = smtp.return_value.__enter__.return_value
    server.starttls.assert_called_once()
    server.login.assert_called_once_with("u", "p")
    assert server.sendmail.call_args.args[:2] == (svc.from_email, "a@test.local")


def test_settings_from_dotenv_are_used_when_not_in_environment(clean_env):
    """Values only in .env (loaded into settings, not os.environ) must configure email."""
    from backend.config import settings
    clean_env.setattr(settings, "EMAIL_TRANSPORT", "gmail_api")
    for name, value in GMAIL_ENV.items():
        clean_env.setattr(settings, name, value)
    svc = email_module.EmailService()
    assert svc.transport == "gmail_api" and svc.enabled is True and svc.from_email == SENDER
    status = svc.status()
    assert status == {"transport": "gmail_api", "enabled": True, "missing": [], "sender": SENDER}
    assert CLIENT_SECRET not in str(status) and REFRESH_TOKEN not in str(status)

    clean_env.setenv("EMAIL_TRANSPORT", "smtp")  # a real environment variable still wins
    assert email_module.EmailService().transport == "smtp"


def test_status_lists_missing_settings_without_values(clean_env):
    clean_env.setenv("SMTP_HOST", "smtp.gmail.com")
    status = email_module.EmailService().status()
    assert status == {"transport": "smtp", "enabled": False, "missing": ["SMTP_USER", "SMTP_PASSWORD"], "sender": None}


def test_unknown_transport_falls_back_to_smtp(clean_env, caplog):
    clean_env.setenv("EMAIL_TRANSPORT", "carrier-pigeon")
    with caplog.at_level(logging.WARNING):
        svc = email_module.EmailService()
    assert svc.transport == "smtp"
    assert "Unknown EMAIL_TRANSPORT" in caplog.text
    assert "carrier-pigeon" not in caplog.text


def test_smtp_transport_ignores_gmail_settings(clean_env):
    for name, value in GMAIL_ENV.items():
        clean_env.setenv(name, value)
    svc = email_module.EmailService()
    assert svc.transport == "smtp"
    assert svc.enabled is False  # SMTP not configured; Gmail settings alone never enable sending
    svc.gmail._client_factory = _no_network()
    with patch.object(email_module.smtplib, "SMTP") as smtp:
        assert svc._send("a@test.local", "S", "<p>x</p>") is False
    smtp.assert_not_called()


@pytest.mark.parametrize("missing", list(GMAIL_ENV))
def test_incomplete_gmail_config_is_not_enabled(clean_env, caplog, missing):
    fake = FakeGoogle()
    with caplog.at_level(logging.WARNING):
        svc = _gmail_service(clean_env, fake, **{missing: ""})
    assert svc.enabled is False
    assert "Gmail API settings are incomplete" in caplog.text
    with patch.object(email_module.smtplib, "SMTP") as smtp:
        assert svc._send("a@test.local", "S", "<p>x</p>") is False
    smtp.assert_not_called()  # never falls back to SMTP
    assert fake.token_calls == 0 and fake.send_requests == []


# -- Gmail API sending ---------------------------------------------------------

def test_gmail_send_success(clean_env):
    fake = FakeGoogle()
    svc = _gmail_service(clean_env, fake)
    assert svc.enabled is True and svc.from_email == SENDER

    with patch.object(email_module.smtplib, "SMTP") as smtp:
        assert svc._send("user@example.com", "Your rental", f"<p>{BODY_MARKER}</p>") is True
    smtp.assert_not_called()

    assert fake.token_calls == 1 and len(fake.send_requests) == 1
    request = fake.send_requests[0]
    assert request.method == "POST"
    assert request.headers["Authorization"] == f"Bearer {ACCESS_PREFIX}1"
    msg = _decoded(request)
    assert msg["To"] == "user@example.com"
    assert msg["From"] == SENDER
    assert msg["Subject"] == "Your rental"
    html = msg.get_payload()[0].get_payload(decode=True).decode()
    assert BODY_MARKER in html


def test_token_is_cached_between_sends():
    fake = FakeGoogle()
    t = _transport(fake)
    msg = email_module.MIMEMultipart()
    msg["To"] = "a@example.com"
    t.send(msg)
    t.send(msg)
    assert fake.token_calls == 1 and len(fake.send_requests) == 2
    assert all(r.headers["Authorization"] == f"Bearer {ACCESS_PREFIX}1" for r in fake.send_requests)


def test_expired_token_is_refreshed():
    fake = FakeGoogle(token_body={"access_token": "short-lived", "expires_in": 0})
    t = _transport(fake)
    msg = email_module.MIMEMultipart()
    t.send(msg)
    t.send(msg)
    assert fake.token_calls == 2


def test_401_refreshes_and_retries_once():
    fake = FakeGoogle(send_statuses=(401, 200))
    t = _transport(fake)
    t.send(email_module.MIMEMultipart())
    assert fake.token_calls == 2 and len(fake.send_requests) == 2
    assert fake.send_requests[1].headers["Authorization"] == f"Bearer {ACCESS_PREFIX}2"


def test_repeated_401_gives_up_after_one_retry(clean_env, caplog):
    fake = FakeGoogle(send_statuses=(401,))
    t = _transport(fake)
    with pytest.raises(GmailApiError, match=r"HTTP 401 \(UNAUTHENTICATED\)"):
        t.send(email_module.MIMEMultipart())
    assert fake.token_calls == 2 and len(fake.send_requests) == 2

    svc = _gmail_service(clean_env, FakeGoogle(send_statuses=(401,)))
    with caplog.at_level(logging.DEBUG):
        assert svc._send("a@example.com", "S", f"<p>{BODY_MARKER}</p>") is False
    _assert_no_secrets(caplog.text)


@pytest.mark.parametrize("status", [301, 302, 304, 307])
def test_redirect_response_is_not_success(clean_env, caplog, status):
    fake = FakeGoogle(send_statuses=(status,))
    with pytest.raises(GmailApiError) as exc:
        _transport(fake).send(email_module.MIMEMultipart())
    assert str(exc.value).startswith(f"Gmail API send failed with HTTP {status}")
    assert len(fake.send_requests) == 1  # not retried; only a 401 triggers refresh + retry

    svc = _gmail_service(clean_env, FakeGoogle(send_statuses=(status,)))
    with caplog.at_level(logging.DEBUG):
        assert svc._send("a@example.com", "S", f"<p>{BODY_MARKER}</p>") is False
    _assert_no_secrets(caplog.text)


def test_invalid_grant_fails_safely(clean_env, caplog):
    fake = FakeGoogle(token_status=400, token_body={
        "error": "invalid_grant", "error_description": "Token has been expired or revoked."})
    svc = _gmail_service(clean_env, fake)
    with caplog.at_level(logging.DEBUG):
        assert svc._send("a@example.com", "S", f"<p>{BODY_MARKER}</p>") is False
    assert "token refresh failed with HTTP 400 (invalid_grant)" in caplog.text
    assert fake.send_requests == []
    _assert_no_secrets(caplog.text)


def test_unsafe_error_reason_is_not_echoed():
    fake = FakeGoogle(token_status=400, token_body={"error": f"weird value {REFRESH_TOKEN}\nline2"})
    with pytest.raises(GmailApiError) as exc:
        _transport(fake).send(email_module.MIMEMultipart())
    assert str(exc.value) == "Gmail API token refresh failed with HTTP 400"


def test_unexpected_token_response_fails_safely():
    fake = FakeGoogle(token_body={"token_type": "Bearer"})  # no access_token
    with pytest.raises(GmailApiError, match="unexpected response"):
        _transport(fake).send(email_module.MIMEMultipart())


def test_network_error_send_returns_false_contact_form_raises(clean_env, caplog):
    fake = FakeGoogle(send_exc=httpx.ConnectError("unreachable"))
    svc = _gmail_service(clean_env, fake)
    with caplog.at_level(logging.DEBUG):
        assert svc._send("a@example.com", "S", f"<p>{BODY_MARKER}</p>") is False
        svc.send_rental_activated("a@example.com", "10 min", "vk_test", "2026-01-01 00:10 UTC", 20000)  # never raises
        with pytest.raises(GmailApiError, match="send request failed: ConnectError"):
            svc.send_contact_form("Name", "visitor@example.com", "Subj", BODY_MARKER, "owner@example.com")
    _assert_no_secrets(caplog.text)


def test_contact_form_keeps_reply_to(clean_env):
    fake = FakeGoogle()
    svc = _gmail_service(clean_env, fake)
    svc.send_contact_form("Name", "visitor@example.com", "Subj", "Hello", "owner@example.com")
    msg = _decoded(fake.send_requests[0])
    assert msg["To"] == "owner@example.com"
    assert msg["Reply-To"] == "visitor@example.com"
    assert msg["From"] == SENDER


def test_default_client_uses_finite_timeout():
    t = GmailApiTransport("id", "secret", "refresh", SENDER)
    with t._client_factory() as client:
        assert client.timeout.read == REQUEST_TIMEOUT_SECONDS == 10.0


def test_concurrent_sends_share_one_refresh():
    fake = FakeGoogle(token_delay=0.05)
    t = _transport(fake)
    errors = []

    def worker():
        try:
            t.send(email_module.MIMEMultipart())
        except Exception as e:  # pragma: no cover - surfaced below
            errors.append(e)

    threads = [threading.Thread(target=worker) for _ in range(5)]
    for th in threads:
        th.start()
    for th in threads:
        th.join()
    assert errors == []
    assert fake.token_calls == 1 and len(fake.send_requests) == 5
