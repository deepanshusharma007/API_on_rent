"""
Marketplace API tests.
  GET  /api/plans
  GET  /api/active-providers
  POST /api/rentals/purchase   (direct, no payment gateway)
  GET  /api/rentals/active
  GET  /api/rentals/history

Usage:
    python dev/test_marketplace.py
"""
import sys, os, uuid, requests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dev._common import *

# Create a fresh user for this suite
EMAIL = f"mkt_{uuid.uuid4().hex[:8]}@example.com"
PASS  = "TestPass123!"
user_token  = None
admin_token = None
plan_id     = None
rental_id   = None
virtual_key = None


def _setup():
    global user_token, admin_token, plan_id
    # Register + login user
    requests.post(f"{BASE_URL}/auth/register", json={"email": EMAIL, "password": PASS}, timeout=5)
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASS}, timeout=5)
    if r.status_code == 200:
        user_token = r.json().get("access_token")

    admin_token = get_admin_token()

    # Ensure at least one plan exists
    if admin_token:
        r = requests.post(f"{BASE_URL}/admin/plans",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": f"mkt_test_plan_{uuid.uuid4().hex[:6]}",
                "description": "Marketplace test plan",
                "price": 0.01,
                "duration_minutes": 15,
                "token_cap": 500,
                "rpm_limit": 5,
                "drain_rate_multiplier": 1.0,
                "model_id": None,
                "duration_label": "15 min",
            }, timeout=5)
        if r.status_code == 201:
            plan_id = r.json().get("id")


def test_list_plans_public():
    section("GET /api/plans (public, no auth)")
    r = requests.get(f"{BASE_URL}/api/plans", timeout=5)
    if assert_status("GET /api/plans -> 200", r, 200):
        plans = r.json()
        ok(f"Active plans returned: {len(plans)}")
        if plans:
            p = plans[0]
            for field in ["id", "name", "price", "duration_minutes", "token_cap", "rpm_limit"]:
                assert_in(f"plan has '{field}'", field, p)


def test_active_providers_public():
    section("GET /api/active-providers (public, no auth)")
    r = requests.get(f"{BASE_URL}/api/active-providers", timeout=5)
    if assert_status("GET /api/active-providers -> 200", r, 200):
        d = r.json()
        assert_in("has 'providers'", "providers", d)
        ok(f"Active providers: {d.get('providers', [])}")


def test_purchase_rental_direct():
    global rental_id, virtual_key
    section("POST /api/rentals/purchase (direct, bypasses payment)")
    if not user_token or not plan_id:
        skip("purchase rental", "no user token or plan_id"); return

    r = requests.post(f"{BASE_URL}/api/rentals/purchase",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"plan_id": plan_id}, timeout=10)
    if assert_status("POST /api/rentals/purchase -> 201", r, 201):
        d = r.json()
        assert_in("has 'virtual_key'",      "virtual_key",      d)
        assert_in("has 'id'",               "id",               d)
        assert_in("has 'status'",           "status",           d)
        assert_in("has 'tokens_remaining'", "tokens_remaining", d)
        assert_in("has 'expires_at'",       "expires_at",       d)
        assert_eq("status is ACTIVE", d["status"].upper(), "ACTIVE")
        virtual_key = d["virtual_key"]
        rental_id   = d["id"]
        ok(f"Virtual key: {virtual_key[:20]}...  |  Rental ID: {rental_id}")
        if virtual_key.startswith("vk_"):
            ok("Key has correct 'vk_' prefix")
        else:
            fail("Key missing 'vk_' prefix", virtual_key)


def test_purchase_invalid_plan():
    section("POST /api/rentals/purchase with non-existent plan -> 404")
    if not user_token:
        skip("invalid plan purchase", "no user token"); return
    r = requests.post(f"{BASE_URL}/api/rentals/purchase",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"plan_id": 999999}, timeout=5)
    assert_status("POST /api/rentals/purchase (bad plan) -> 404", r, 404)


def test_purchase_unauthenticated():
    section("POST /api/rentals/purchase without auth -> 401/403")
    if not plan_id:
        skip("unauthenticated purchase", "no plan_id"); return
    r = requests.post(f"{BASE_URL}/api/rentals/purchase",
        json={"plan_id": plan_id}, timeout=5)
    if r.status_code in (401, 403, 422):
        ok(f"Correctly rejected with {r.status_code}")
    else:
        fail(f"Expected 401/403, got {r.status_code}")


def test_active_rentals():
    section("GET /api/rentals/active")
    if not user_token:
        skip("active rentals", "no user token"); return
    r = requests.get(f"{BASE_URL}/api/rentals/active",
                     headers={"Authorization": f"Bearer {user_token}"}, timeout=5)
    if assert_status("GET /api/rentals/active -> 200", r, 200):
        rentals = r.json()
        ok(f"Active rentals for user: {len(rentals)}")
        if rental_id:
            ids = [ren["id"] for ren in rentals]
            if rental_id in ids:
                ok("New rental appears in active list")
            else:
                fail("New rental not in active list")


def test_rental_history():
    section("GET /api/rentals/history")
    if not user_token:
        skip("rental history", "no user token"); return
    r = requests.get(f"{BASE_URL}/api/rentals/history",
                     headers={"Authorization": f"Bearer {user_token}"}, timeout=5)
    assert_status("GET /api/rentals/history -> 200", r, 200)


def _cleanup():
    if admin_token and plan_id:
        requests.delete(f"{BASE_URL}/admin/plans/{plan_id}",
                        headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)


if __name__ == "__main__":
    print(f"\n{B}{C}AIRent -- Marketplace API Tests{X}  ({BASE_URL})")
    _setup()
    test_list_plans_public()
    test_active_providers_public()
    test_purchase_rental_direct()
    test_purchase_invalid_plan()
    test_purchase_unauthenticated()
    test_active_rentals()
    test_rental_history()
    _cleanup()
    sys.exit(summary("Marketplace API Tests"))
