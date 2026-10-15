"""
Offline tests: email-code signup, login (Remember Me), forgot/reset password, Google Sign-In.

Self-contained: in-memory SQLite, isolated fakeredis per test, outgoing email captured
from the real templates (EmailService._deliver is replaced), Google keys served by an
httpx.MockTransport and tokens signed with a locally generated RSA key.
No network, no real email, no real credentials.

Run:
    python -m pytest tests/test_auth_flows.py -v
"""

import os
import re
import sys
import time
import asyncio
import logging
from types import SimpleNamespace

# Isolated test config -- set before any backend import so no real DB/secrets are used.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"
os.environ["USE_FAKE_REDIS"] = "false"
os.environ["JWT_SECRET"] = "test-jwt-secret"
os.environ["ADMIN_EMAIL"] = "admin@test.local"
os.environ["ADMIN_PASSWORD"] = "test-admin-pass"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import httpx
import pytest
import fakeredis
import fakeredis.aioredis
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI
from jose import jwk, jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.api import auth as auth_module
from backend.config import settings
from backend.database.connection import Base, get_db
from backend.database.models import User, UserRole
from backend.database.redis_manager import RedisManager, get_redis_manager
from backend.services.auth_utils import decode_access_token, hash_password
from backend.services.email_service import email_service
from backend.services.google_auth import GOOGLE_CERTS_URL, GoogleIdTokenVerifier

GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com"
CODE_RE = re.compile(r"letter-spacing: 8px[^>]*>(\d{6})<")
RESET_RE = re.compile(r"/reset-password#token=([A-Za-z0-9_\-]+)")
STRONG = "Str0ngPassw0rd"


# -- Harness -------------------------------------------------------------------

@pytest.fixture
def env(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    def _db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    redis_manager = RedisManager(fakeredis.aioredis.FakeRedis(server=fakeredis.FakeServer(), decode_responses=True))
    app = FastAPI()
    app.include_router(auth_module.router, prefix="/auth")
    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_redis_manager] = lambda: redis_manager

    outbox = []
    monkeypatch.setattr(email_service, "enabled", True)
    monkeypatch.setattr(email_service, "_deliver", lambda msg, to: outbox.append(msg))
    monkeypatch.setattr(settings, "ADMIN_NOTIFICATION_EMAIL", "")
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://airent.example")
    monkeypatch.setattr(settings, "REQUIRE_EMAIL_OTP", False)
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")
    return SimpleNamespace(app=app, redis=redis_manager, db=session_factory, outbox=outbox)


def run(env, scenario):
    """Run one async scenario with a client; everything shares one event loop."""
    async def main():
        transport = httpx.ASGITransport(app=env.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await scenario(client)
    return asyncio.run(main())


def _html(msg) -> str:
    return msg.get_payload()[0].get_payload(decode=True).decode()


def mails_to(env, address):
    return [m for m in env.outbox if m["To"] == address]


def last_code(env, address) -> str:
    return CODE_RE.search(_html(mails_to(env, address)[-1])).group(1)


def add_user(env, email, password=STRONG, role=UserRole.USER, active=True) -> int:
    db = env.db()
    user = User(email=email, hashed_password=hash_password(password), role=role, is_active=active)
    db.add(user)
    db.commit()
    uid = user.id
    db.close()
    return uid


def users(env):
    db = env.db()
    rows = [(u.email, u.role) for u in db.query(User).order_by(User.id).all()]
    db.close()
    return rows


async def request_code(c, email):
    return await c.post("/auth/signup/request-otp", json={"email": email})


async def verify(c, email, otp):
    return await c.post("/auth/signup/verify-otp", json={"email": email, "otp": otp})


# -- Email signup --------------------------------------------------------------

def test_email_signup_happy_path(env):
    async def scenario(c):
        r = await request_code(c, "New.User@Gmail.com")
        assert r.status_code == 202
        assert r.json() == {
            "message": "If this email can be used for a new account, we've sent a 6-digit code to it.",
            "expires_in": 600, "resend_after": 60,
        }
        mail = mails_to(env, "new.user@gmail.com")[-1]
        assert mail["Subject"] == "Your AIRent verification code"
        code = last_code(env, "new.user@gmail.com")
        assert code not in mail["Subject"]

        r = await verify(c, "new.user@gmail.com", code)
        assert r.status_code == 200 and r.json()["expires_in"] == 900
        r = await c.post("/auth/signup/complete", json={"signup_token": r.json()["signup_token"], "password": STRONG})
        assert r.status_code == 201
        token = r.json()["access_token"]

        me = await c.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200 and me.json()["email"] == "new.user@gmail.com" and me.json()["role"] == "user"
        login = await c.post("/auth/login", json={"email": "new.user@gmail.com", "password": STRONG})
        assert login.status_code == 200
    run(env, scenario)
    assert users(env) == [("new.user@gmail.com", UserRole.USER)]


def test_existing_account_gets_same_response_and_no_code(env):
    add_user(env, "taken@example.com")

    async def scenario(c):
        r = await request_code(c, "TAKEN@example.com")
        assert r.status_code == 202
        assert r.json()["message"].startswith("If this email can be used")
        mail = mails_to(env, "taken@example.com")[-1]
        assert mail["Subject"] == "You already have an AIRent account"
        assert not CODE_RE.search(_html(mail))
        assert "https://airent.example/forgot-password" in _html(mail)
        r = await verify(c, "taken@example.com", "123456")
        assert r.status_code == 400 and "expired" in r.json()["detail"]
    run(env, scenario)


def test_wrong_code_then_lockout(env, monkeypatch):
    async def scenario(c):
        await request_code(c, "a@example.com")
        code = last_code(env, "a@example.com")
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(4):
            r = await verify(c, "a@example.com", wrong)
            assert r.status_code == 400 and r.json()["detail"].startswith("Incorrect code")
        r = await verify(c, "a@example.com", wrong)
        assert r.status_code == 429 and "Too many incorrect attempts" in r.json()["detail"]
        r = await verify(c, "a@example.com", code)  # the real code was voided too
        assert r.status_code == 400 and "expired" in r.json()["detail"]
    run(env, scenario)


def test_code_is_single_use(env):
    async def scenario(c):
        await request_code(c, "a@example.com")
        code = last_code(env, "a@example.com")
        assert (await verify(c, "a@example.com", code)).status_code == 200
        r = await verify(c, "a@example.com", code)
        assert r.status_code == 400 and "already used" in r.json()["detail"]
    run(env, scenario)


def test_code_expires(env, monkeypatch):
    monkeypatch.setattr(settings, "OTP_TTL_SECONDS", 1)

    async def scenario(c):
        await request_code(c, "a@example.com")
        code = last_code(env, "a@example.com")
        await asyncio.sleep(1.2)
        r = await verify(c, "a@example.com", code)
        assert r.status_code == 400 and "expired" in r.json()["detail"]
    run(env, scenario)


def test_resend_cooldown_and_hourly_cap(env, monkeypatch):
    monkeypatch.setattr(settings, "OTP_MAX_SENDS_PER_HOUR", 2)

    async def scenario(c):
        assert (await request_code(c, "a@example.com")).status_code == 202
        first = last_code(env, "a@example.com")
        r = await request_code(c, "a@example.com")
        assert r.status_code == 429 and r.headers["Retry-After"] == "60"
        assert "Please wait 60 seconds" in r.json()["detail"]

        for key in await env.redis.redis.keys("auth:signup:cooldown:*"):  # skip the 60 s wait
            await env.redis.redis.delete(key)
        assert (await request_code(c, "a@example.com")).status_code == 202
        second = last_code(env, "a@example.com")
        if second != first:  # a resend replaces the earlier code
            assert (await verify(c, "a@example.com", first)).status_code == 400
        assert (await verify(c, "a@example.com", second)).status_code == 200

        for key in await env.redis.redis.keys("auth:signup:cooldown:*"):
            await env.redis.redis.delete(key)
        r = await request_code(c, "a@example.com")  # third send within the hour
        assert r.status_code == 429 and int(r.headers["Retry-After"]) > 60
    run(env, scenario)


def test_email_not_configured_is_clear(env, monkeypatch):
    monkeypatch.setattr(email_service, "enabled", False)

    async def scenario(c):
        for path, body in (("/auth/signup/request-otp", {"email": "a@example.com"}),
                           ("/auth/password/forgot", {"email": "a@example.com"})):
            r = await c.post(path, json=body)
            assert r.status_code == 503
            assert r.json()["detail"] == "Email delivery is not configured on this server. Please contact support."
    run(env, scenario)
    assert env.outbox == []


def test_send_failure_releases_cooldown(env, monkeypatch):
    calls = []

    def flaky(msg, to):
        calls.append(msg)
        if len(calls) == 1:
            raise OSError("network unreachable")
        env.outbox.append(msg)

    monkeypatch.setattr(email_service, "_deliver", flaky)

    async def scenario(c):
        r = await request_code(c, "a@example.com")
        assert r.status_code == 503 and "couldn't send" in r.json()["detail"]
        r = await request_code(c, "a@example.com")  # immediate retry allowed
        assert r.status_code == 202
        assert (await verify(c, "a@example.com", last_code(env, "a@example.com"))).status_code == 200
    run(env, scenario)


def test_disposable_and_malformed_input(env):
    async def scenario(c):
        r = await request_code(c, "x@mailinator.com")
        assert r.status_code == 400 and "Disposable" in r.json()["detail"]
        assert (await verify(c, "a@example.com", "12345")).status_code == 422
        assert (await verify(c, "a@example.com", "12345a")).status_code == 422
    run(env, scenario)


@pytest.mark.parametrize("password,message", [
    ("short1", "at least 8 characters"),
    ("onlyletters", "at least one letter and one number"),
    ("12345678", "at least one letter and one number"),
    ("a1" + "é" * 40, "too long"),
])
def test_weak_password_rejected_without_burning_token(env, password, message):
    async def scenario(c):
        await request_code(c, "a@example.com")
        token = (await verify(c, "a@example.com", last_code(env, "a@example.com"))).json()["signup_token"]
        r = await c.post("/auth/signup/complete", json={"signup_token": token, "password": password})
        assert r.status_code == 400 and message in r.json()["detail"]
        r = await c.post("/auth/signup/complete", json={"signup_token": token, "password": STRONG})
        assert r.status_code == 201
    run(env, scenario)


def test_signup_token_single_use_and_invalid(env):
    async def scenario(c):
        await request_code(c, "a@example.com")
        token = (await verify(c, "a@example.com", last_code(env, "a@example.com"))).json()["signup_token"]
        assert (await c.post("/auth/signup/complete", json={"signup_token": token, "password": STRONG})).status_code == 201
        r = await c.post("/auth/signup/complete", json={"signup_token": token, "password": STRONG})
        assert r.status_code == 400 and "verification has expired" in r.json()["detail"]
        r = await c.post("/auth/signup/complete", json={"signup_token": "x" * 43, "password": STRONG})
        assert r.status_code == 400
    run(env, scenario)
    assert len(users(env)) == 1


def test_signup_complete_conflict_when_account_appears(env):
    async def scenario(c):
        await request_code(c, "a@example.com")
        token = (await verify(c, "a@example.com", last_code(env, "a@example.com"))).json()["signup_token"]
        add_user(env, "A@example.com")  # e.g. created through the legacy endpoint meanwhile
        r = await c.post("/auth/signup/complete", json={"signup_token": token, "password": STRONG})
        assert r.status_code == 409 and "already exists" in r.json()["detail"]
    run(env, scenario)


def test_codes_never_logged(env, caplog):
    async def scenario(c):
        with caplog.at_level(logging.DEBUG):
            await request_code(c, "a@example.com")
        return last_code(env, "a@example.com")
    code = run(env, scenario)
    assert code not in caplog.text


# -- Login ---------------------------------------------------------------------

def _lifetime(token: str) -> float:
    return decode_access_token(token)["exp"] - time.time()


def test_login_default_and_remember_me_lifetimes(env):
    uid = add_user(env, "a@example.com")

    async def scenario(c):
        r = await c.post("/auth/login", json={"email": "a@example.com", "password": STRONG})
        assert r.status_code == 200
        assert 23.9 * 3600 < _lifetime(r.json()["access_token"]) <= 24 * 3600
        assert 23.9 * 3600 < await env.redis.redis.ttl(f"session:{uid}") <= 24 * 3600

        r = await c.post("/auth/login", json={"email": "a@example.com", "password": STRONG, "remember_me": True})
        assert r.status_code == 200
        assert 29.9 * 86400 < _lifetime(r.json()["access_token"]) <= 30 * 86400
        assert 29.9 * 86400 < await env.redis.redis.ttl(f"session:{uid}") <= 30 * 86400
    run(env, scenario)


def test_login_errors_unchanged(env):
    add_user(env, "a@example.com")
    add_user(env, "off@example.com", active=False)

    async def scenario(c):
        for body in ({"email": "a@example.com", "password": "wrong-pass-1"},
                     {"email": "nobody@example.com", "password": STRONG}):
            r = await c.post("/auth/login", json=body)
            assert r.status_code == 401 and r.json() == {"detail": "Incorrect email or password"}
        r = await c.post("/auth/login", json={"email": "off@example.com", "password": STRONG})
        assert r.status_code == 403 and r.json() == {"detail": "User account is inactive"}
    run(env, scenario)


def test_login_case_insensitive_fallback(env):
    add_user(env, "Mixed.Case@example.com")

    async def scenario(c):
        r = await c.post("/auth/login", json={"email": "mixed.case@example.com", "password": STRONG})
        assert r.status_code == 200
    run(env, scenario)


def test_ambiguous_case_variants_are_not_merged(env):
    add_user(env, "Aa@example.com")
    add_user(env, "aA@example.com")
    db = env.db()
    try:
        assert auth_module._find_user_by_email(db, "Aa@example.com").email == "Aa@example.com"  # exact wins
        assert auth_module._find_user_by_email(db, "aa@example.com") is None                   # ambiguous
    finally:
        db.close()


def test_legacy_register_open_by_default_and_closable(env, monkeypatch):
    async def scenario(c):
        r = await c.post("/auth/register", json={"email": "legacy@example.com", "password": "anything8"})
        assert r.status_code == 201
        monkeypatch.setattr(settings, "REQUIRE_EMAIL_OTP", True)
        r = await c.post("/auth/register", json={"email": "legacy2@example.com", "password": "anything8"})
        assert r.status_code == 403 and "verification is required" in r.json()["detail"]
    run(env, scenario)


# -- Forgot / reset password ---------------------------------------------------

async def forgot(c, email):
    return await c.post("/auth/password/forgot", json={"email": email})


def reset_token(env, address) -> str:
    return RESET_RE.search(_html(mails_to(env, address)[-1])).group(1)


GENERIC_RESET = {"message": "If an account exists for this email, we've sent a password reset link."}


def test_reset_password_happy_path(env):
    uid = add_user(env, "a@example.com", password="OldPassw0rd")

    async def scenario(c):
        await env.redis.set_user_session(uid, "old-session")
        r = await forgot(c, "A@Example.com")
        assert r.status_code == 202 and r.json() == GENERIC_RESET
        mail = mails_to(env, "a@example.com")[-1]
        assert mail["Subject"] == "Reset your AIRent password"
        assert "https://airent.example/reset-password#token=" in _html(mail)

        token = reset_token(env, "a@example.com")
        r = await c.post("/auth/password/reset", json={"token": token, "password": "NewPassw0rd"})
        assert r.status_code == 200 and "updated" in r.json()["message"]
        assert await env.redis.get_user_session(uid) is None  # other sessions signed out

        assert (await c.post("/auth/login", json={"email": "a@example.com", "password": "OldPassw0rd"})).status_code == 401
        assert (await c.post("/auth/login", json={"email": "a@example.com", "password": "NewPassw0rd"})).status_code == 200

        r = await c.post("/auth/password/reset", json={"token": token, "password": "Another1pass"})
        assert r.status_code == 400 and "invalid or has expired" in r.json()["detail"]
    run(env, scenario)


def test_reset_unknown_admin_and_inactive_get_generic_response_and_no_email(env):
    add_user(env, "admin@example.com", role=UserRole.ADMIN)
    add_user(env, "off@example.com", active=False)

    async def scenario(c):
        for email in ("nobody@example.com", "admin@example.com", "off@example.com"):
            r = await forgot(c, email)
            assert r.status_code == 202 and r.json() == GENERIC_RESET
    run(env, scenario)
    assert env.outbox == []


def test_reset_rate_limited(env):
    add_user(env, "a@example.com")

    async def scenario(c):
        assert (await forgot(c, "a@example.com")).status_code == 202
        r = await forgot(c, "a@example.com")
        assert r.status_code == 429 and "reset email" in r.json()["detail"]
        r = await forgot(c, "nobody@example.com")  # unknown emails are limited the same way
        assert r.status_code == 202
        assert (await forgot(c, "nobody@example.com")).status_code == 429
    run(env, scenario)


def test_newer_reset_link_revokes_older(env):
    add_user(env, "a@example.com")

    async def scenario(c):
        await forgot(c, "a@example.com")
        first = reset_token(env, "a@example.com")
        for key in await env.redis.redis.keys("auth:reset:cooldown:*"):
            await env.redis.redis.delete(key)
        await forgot(c, "a@example.com")
        second = reset_token(env, "a@example.com")
        assert (await c.post("/auth/password/reset", json={"token": first, "password": "NewPassw0rd"})).status_code == 400
        assert (await c.post("/auth/password/reset", json={"token": second, "password": "NewPassw0rd"})).status_code == 200
    run(env, scenario)


def test_reset_link_expires(env, monkeypatch):
    add_user(env, "a@example.com")
    monkeypatch.setattr(settings, "PASSWORD_RESET_TTL_SECONDS", 1)

    async def scenario(c):
        await forgot(c, "a@example.com")
        token = reset_token(env, "a@example.com")
        await asyncio.sleep(1.2)
        r = await c.post("/auth/password/reset", json={"token": token, "password": "NewPassw0rd"})
        assert r.status_code == 400
    run(env, scenario)


def test_reset_weak_password_keeps_link_usable(env):
    add_user(env, "a@example.com")

    async def scenario(c):
        await forgot(c, "a@example.com")
        token = reset_token(env, "a@example.com")
        r = await c.post("/auth/password/reset", json={"token": token, "password": "weak"})
        assert r.status_code == 400
        assert (await c.post("/auth/password/reset", json={"token": token, "password": "NewPassw0rd"})).status_code == 200
    run(env, scenario)


# -- Google Sign-In ------------------------------------------------------------

@pytest.fixture
def google(env, monkeypatch):
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = private.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                serialization.NoEncryption())
    public_pem = private.public_key().public_bytes(serialization.Encoding.PEM,
                                                   serialization.PublicFormat.SubjectPublicKeyInfo)
    public_jwk = jwk.construct(public_pem, "RS256").to_dict()
    public_jwk.update({"kid": "test-kid", "use": "sig", "alg": "RS256"})
    for k, v in list(public_jwk.items()):
        if isinstance(v, bytes):
            public_jwk[k] = v.decode()

    state = SimpleNamespace(cert_requests=0, cert_status=200)

    def handler(request):
        assert str(request.url) == GOOGLE_CERTS_URL
        state.cert_requests += 1
        if state.cert_status != 200:
            return httpx.Response(state.cert_status)
        return httpx.Response(200, json={"keys": [public_jwk]}, headers={"Cache-Control": "public, max-age=3600"})

    verifier = GoogleIdTokenVerifier(client_factory=lambda: httpx.Client(transport=httpx.MockTransport(handler)))
    monkeypatch.setattr(auth_module, "google_verifier", verifier)
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID)

    def token(kid="test-kid", key=pem, **overrides):
        now = int(time.time())
        claims = {"iss": "https://accounts.google.com", "aud": GOOGLE_CLIENT_ID, "sub": "1098765",
                  "email": "g.user@gmail.com", "email_verified": True, "iat": now, "exp": now + 3600}
        claims.update(overrides)
        return jwt.encode(claims, key, algorithm="RS256", headers={"kid": kid})

    state.token = token
    return state


async def google_login(c, credential, remember_me=False):
    return await c.post("/auth/google", json={"credential": credential, "remember_me": remember_me})


def test_google_not_configured(env):
    async def scenario(c):
        r = await google_login(c, "x" * 40)
        assert r.status_code == 503 and r.json()["detail"] == "Google sign-in is not configured on this server."
    run(env, scenario)


def test_google_creates_account_once_and_signs_in(env, google):
    async def scenario(c):
        r = await google_login(c, google.token())
        assert r.status_code == 200
        me = await c.get("/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
        assert me.json()["email"] == "g.user@gmail.com"
        assert 23.9 * 3600 < _lifetime(r.json()["access_token"]) <= 24 * 3600
        r = await google_login(c, google.token(), remember_me=True)
        assert r.status_code == 200 and _lifetime(r.json()["access_token"]) > 29 * 86400
    run(env, scenario)
    assert users(env) == [("g.user@gmail.com", UserRole.USER)]
    assert google.cert_requests == 1  # keys cached


def test_google_links_existing_account_by_verified_email(env, google):
    uid = add_user(env, "G.User@gmail.com")

    async def scenario(c):
        r = await google_login(c, google.token())
        assert r.status_code == 200
        assert decode_access_token(r.json()["access_token"])["sub"] == str(uid)
    run(env, scenario)
    assert len(users(env)) == 1


def test_google_user_password_is_unusable_until_reset(env, google):
    async def scenario(c):
        await google_login(c, google.token())
        r = await c.post("/auth/login", json={"email": "g.user@gmail.com", "password": STRONG})
        assert r.status_code == 401
    run(env, scenario)


def test_google_refuses_admin_and_inactive(env, google):
    add_user(env, "g.user@gmail.com", role=UserRole.ADMIN)
    add_user(env, "off@gmail.com", active=False)

    async def scenario(c):
        r = await google_login(c, google.token())
        assert r.status_code == 403 and "Admin accounts" in r.json()["detail"]
        r = await google_login(c, google.token(email="off@gmail.com"))
        assert r.status_code == 403
    run(env, scenario)


@pytest.mark.parametrize("overrides,fragment", [
    ({"aud": "someone-else.apps.googleusercontent.com"}, "could not be verified"),
    ({"exp": int(time.time()) - 60}, "has expired"),
    ({"iss": "https://evil.example"}, "invalid issuer"),
    ({"email_verified": False}, "not verified"),
    ({"email": ""}, "missing the account email"),
])
def test_google_rejects_bad_tokens(env, google, overrides, fragment):
    async def scenario(c):
        r = await google_login(c, google.token(**overrides))
        assert r.status_code == 401 and fragment in r.json()["detail"]
    run(env, scenario)
    assert users(env) == []


def test_google_rejects_foreign_signature_unknown_key_and_garbage(env, google):
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048).private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())

    async def scenario(c):
        r = await google_login(c, google.token(key=other))
        assert r.status_code == 401 and "could not be verified" in r.json()["detail"]
        r = await google_login(c, google.token(kid="rotated-away"))
        assert r.status_code == 401 and "unknown key" in r.json()["detail"]
        r = await google_login(c, "not-a-jwt-" + "x" * 30)
        assert r.status_code == 401 and "malformed" in r.json()["detail"]
    run(env, scenario)
    assert users(env) == []


def test_google_keys_unavailable(env, google):
    google.cert_status = 500

    async def scenario(c):
        r = await google_login(c, google.token())
        assert r.status_code == 503 and "temporarily unavailable" in r.json()["detail"]
    run(env, scenario)


# -- Setup status --------------------------------------------------------------

def test_auth_config_reports_options_without_secrets(env, monkeypatch):
    async def scenario(c):
        r = await c.get("/auth/config")
        assert r.status_code == 200 and r.json() == {"email_enabled": True, "google_client_id": None}
        monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID)
        monkeypatch.setattr(email_service, "enabled", False)
        r = await c.get("/auth/config")
        assert r.json() == {"email_enabled": False, "google_client_id": GOOGLE_CLIENT_ID}
    run(env, scenario)


def test_startup_status_names_missing_settings_only(env, monkeypatch, caplog):
    monkeypatch.setattr(email_service, "enabled", False)
    monkeypatch.setattr(email_service, "status", lambda: {
        "transport": "gmail_api", "enabled": False, "missing": ["GMAIL_API_REFRESH_TOKEN"], "sender": None})
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "FRONTEND_URL", "http://localhost:5173")
    with caplog.at_level(logging.INFO):
        auth_module.log_auth_setup_status()
    assert "Auth email NOT configured (EMAIL_TRANSPORT=gmail_api; missing: GMAIL_API_REFRESH_TOKEN)" in caplog.text
    assert "Google Sign-In disabled: GOOGLE_CLIENT_ID is not set" in caplog.text
    assert "FRONTEND_URL points to localhost in production" in caplog.text
