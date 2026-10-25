"""End-to-end test suite for the full application flow.

Run: python -m pytest backend/tests/test_e2e.py -v
Requires: Backend running on localhost:8000
"""
import pytest
import requests
import time

BASE_URL = "http://localhost:8000"


def _signed_in_user(prefix):
    """Register through the legacy endpoint and log in; returns (email, access_token).

    Legacy POST /auth/register has no email check, so it is closed by default
    (REQUIRE_EMAIL_OTP=true). Start the backend with REQUIRE_EMAIL_OTP=false to run the
    tests that need a fresh account; they are skipped otherwise.
    """
    email = f"{prefix}_{int(time.time())}@test.com"
    registered = requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": "testpass1234"})
    if registered.status_code not in (201, 400):
        pytest.skip(f"Legacy /auth/register returned {registered.status_code} (closed by REQUIRE_EMAIL_OTP, "
                    "or rate limited); start the backend with REQUIRE_EMAIL_OTP=false to run this")
    login = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": "testpass1234"})
    assert login.status_code == 200
    return email, login.json()["access_token"]


class TestEndToEndFlow:
    """Full user flow: register → login → browse plans → purchase → use API → check dashboard."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Check backend is running."""
        try:
            r = requests.get(f"{BASE_URL}/health", timeout=3)
            assert r.status_code == 200
        except Exception:
            pytest.skip("Backend not running on localhost:8000")

    def test_01_health_check(self):
        """Health endpoint returns correct structure."""
        r = requests.get(f"{BASE_URL}/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "healthy"
        assert "redis" in data

    def test_02_register_user(self):
        """Register a new test user."""
        r = requests.post(f"{BASE_URL}/auth/register", json={
            "email": f"e2etest_{int(time.time())}@test.com",
            "password": "testpass1234"
        })
        # 201 = new user, 400 = already exists, 403 = legacy registration closed (the default),
        # 429 = rate limited (10 per hour per IP)
        assert r.status_code in [201, 400, 403, 429]

    def test_03_login_user(self):
        """Login and get JWT token."""
        email, _token = _signed_in_user("e2e_login")
        r = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": "testpass1234"
        })
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_04_get_me_requires_auth(self):
        """GET /auth/me without token returns 401."""
        r = requests.get(f"{BASE_URL}/auth/me")
        assert r.status_code in [401, 403]

    def test_05_get_me_with_token(self):
        """GET /auth/me with valid token returns user data."""
        email, token = _signed_in_user("e2e_me")

        r = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == email

    def test_06_list_plans(self):
        """GET /api/plans returns list of plans."""
        r = requests.get(f"{BASE_URL}/api/plans")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_07_direct_purchase_is_admin_only(self):
        """Customers buy through Cashfree checkout; direct rental creation is admin-only."""
        _email, token = _signed_in_user("e2e_buy")
        plans = requests.get(f"{BASE_URL}/api/plans").json()
        if not plans:
            pytest.skip("No plans available")

        r = requests.post(f"{BASE_URL}/api/rentals/purchase", json={
            "plan_id": plans[0]["id"],
            "payment_method_id": "pm_test_e2e"
        }, headers={"Authorization": f"Bearer {token}"})

        assert r.status_code == 403

    def test_08_active_rentals(self):
        """GET /api/rentals/active returns user's rentals."""
        _email, token = _signed_in_user("e2e_active")

        r = requests.get(f"{BASE_URL}/api/rentals/active", headers={
            "Authorization": f"Bearer {token}"
        })
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_09_proxy_without_key(self):
        """Proxy without virtual key returns 401."""
        r = requests.post(f"{BASE_URL}/v1/chat/completions", json={
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": "test"}]
        })
        assert r.status_code in [401, 422]

    def test_10_list_models(self):
        """GET /v1/models returns available models."""
        r = requests.get(f"{BASE_URL}/v1/models")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        model_ids = [m["id"] for m in data["data"]]
        assert "gpt-4o-mini" in model_ids

    def test_11_admin_requires_auth(self):
        """Admin endpoints require admin auth."""
        r = requests.get(f"{BASE_URL}/admin/stats")
        assert r.status_code in [401, 403]

    def test_12_status_endpoint(self):
        """Status endpoint returns provider info."""
        r = requests.get(f"{BASE_URL}/status/")
        assert r.status_code == 200
