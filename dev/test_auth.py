"""
Auth API tests.
  POST /auth/register
  POST /auth/login
  GET  /auth/me

Usage:
    python dev/test_auth.py
"""
import sys, os, uuid, requests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dev._common import *

EMAIL = f"auth_test_{uuid.uuid4().hex[:8]}@example.com"
PASS  = "TestPass123!"
token = None


def test_register_new_user():
    section("Register new user")
    r = requests.post(f"{BASE_URL}/auth/register",
                      json={"email": EMAIL, "password": PASS}, timeout=5)
    if assert_status("POST /auth/register -> 201", r, 201):
        d = r.json()
        assert_in("has 'id'",    "id",    d)
        assert_in("has 'email'", "email", d)
        assert_eq("email matches", d["email"], EMAIL)


def test_register_duplicate():
    section("Register duplicate email -> 400")
    r = requests.post(f"{BASE_URL}/auth/register",
                      json={"email": EMAIL, "password": PASS}, timeout=5)
    assert_status("POST /auth/register (duplicate) -> 400", r, 400)


def test_login_valid():
    global token
    section("Login with valid credentials")
    r = requests.post(f"{BASE_URL}/auth/login",
                      json={"email": EMAIL, "password": PASS}, timeout=5)
    if assert_status("POST /auth/login -> 200", r, 200):
        d = r.json()
        assert_in("has 'access_token'", "access_token", d)
        assert_in("has 'token_type'",   "token_type",   d)
        assert_eq("token_type is bearer", d["token_type"].lower(), "bearer")
        token = d["access_token"]
        ok("JWT token received")


def test_login_wrong_password():
    section("Login with wrong password -> 401")
    r = requests.post(f"{BASE_URL}/auth/login",
                      json={"email": EMAIL, "password": "wrongpassword"}, timeout=5)
    assert_status("POST /auth/login (bad pass) -> 401", r, 401)


def test_login_unknown_email():
    section("Login with unknown email -> 401")
    r = requests.post(f"{BASE_URL}/auth/login",
                      json={"email": "nobody@nowhere.com", "password": PASS}, timeout=5)
    assert_status("POST /auth/login (unknown email) -> 401", r, 401)


def test_get_me_authenticated():
    section("GET /auth/me with valid JWT")
    if not token:
        skip("/auth/me", "no token"); return
    r = requests.get(f"{BASE_URL}/auth/me",
                     headers={"Authorization": f"Bearer {token}"}, timeout=5)
    if assert_status("GET /auth/me -> 200", r, 200):
        d = r.json()
        assert_in("has 'email'", "email", d)
        assert_in("has 'role'",  "role",  d)
        assert_eq("correct email", d["email"], EMAIL)
        assert_eq("role is user", d["role"].lower(), "user")


def test_get_me_no_token():
    section("GET /auth/me without token -> 401/403")
    r = requests.get(f"{BASE_URL}/auth/me", timeout=5)
    if r.status_code in (401, 403):
        ok(f"Correctly rejected with {r.status_code}")
    else:
        fail(f"Expected 401/403, got {r.status_code}")


def test_get_me_bad_token():
    section("GET /auth/me with garbage token -> 401/403")
    r = requests.get(f"{BASE_URL}/auth/me",
                     headers={"Authorization": "Bearer thisisgarbage"}, timeout=5)
    if r.status_code in (401, 403):
        ok(f"Correctly rejected with {r.status_code}")
    else:
        fail(f"Expected 401/403, got {r.status_code}")


if __name__ == "__main__":
    print(f"\n{B}{C}AIRent -- Auth API Tests{X}  ({BASE_URL})")
    test_register_new_user()
    test_register_duplicate()
    test_login_valid()
    test_login_wrong_password()
    test_login_unknown_email()
    test_get_me_authenticated()
    test_get_me_no_token()
    test_get_me_bad_token()
    sys.exit(summary("Auth API Tests"))
