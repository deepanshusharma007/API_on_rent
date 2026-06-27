"""
Admin API tests.
  GET/POST/PUT/DELETE /admin/provider-keys
  GET/POST/PUT/DELETE /admin/plans
  GET                 /admin/users
  GET                 /admin/stats
  GET                 /admin/rentals

Usage:
    python dev/test_admin.py
"""
import sys, os, uuid, requests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dev._common import *

admin_token  = None
user_token   = None
key_id       = None
plan_id      = None
test_key_val = f"sk-test-{uuid.uuid4().hex}"

EMAIL = f"admin_test_{uuid.uuid4().hex[:8]}@example.com"
PASS  = "TestPass123!"


def _setup():
    global admin_token, user_token
    admin_token = get_admin_token()
    requests.post(f"{BASE_URL}/auth/register", json={"email": EMAIL, "password": PASS}, timeout=5)
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASS}, timeout=5)
    if r.status_code == 200:
        user_token = r.json().get("access_token")


def _ah():
    return {"Authorization": f"Bearer {admin_token}"}


# ---- Provider Keys ----------------------------------------------------------

def test_add_provider_key():
    global key_id
    section("POST /admin/provider-keys -- add key")
    if not admin_token:
        skip("add provider key", "no admin token"); return
    r = requests.post(f"{BASE_URL}/admin/provider-keys",
        headers=_ah(),
        json={"provider": "openai", "api_key": test_key_val, "model_name": "gpt-4o-mini"},
        timeout=5)
    if r.status_code == 201:
        d = r.json()
        key_id = d.get("id")
        assert_in("has 'id'",       "id",       d)
        assert_in("has 'provider'", "provider", d)
        assert_in("has 'is_active'","is_active", d)
        ok(f"Provider key created: ID={key_id}")
    elif r.status_code == 400 and "already" in r.text:
        skip("add provider key", "key already exists")
    else:
        fail(f"POST /admin/provider-keys -> {r.status_code}", r.text[:200])


def test_list_provider_keys():
    section("GET /admin/provider-keys -- list all keys")
    if not admin_token:
        skip("list provider keys", "no admin token"); return
    r = requests.get(f"{BASE_URL}/admin/provider-keys", headers=_ah(), timeout=5)
    if assert_status("GET /admin/provider-keys -> 200", r, 200):
        d = r.json()
        keys = d.get("keys", d) if isinstance(d, dict) else d
        ok(f"Provider keys in DB: {len(keys) if isinstance(keys, list) else '?'}")


def test_edit_provider_key():
    section("PUT /admin/provider-keys/{id} -- toggle active + set budget")
    if not admin_token or not key_id:
        skip("edit provider key", "no key_id"); return
    r = requests.put(f"{BASE_URL}/admin/provider-keys/{key_id}",
        headers=_ah(),
        json={"is_active": True, "token_budget": 1000000},
        timeout=5)
    if assert_status("PUT /admin/provider-keys/{id} -> 200", r, 200):
        d = r.json()
        assert_eq("is_active = True",         d.get("is_active"),    True)
        assert_eq("token_budget = 1000000",   d.get("token_budget"), 1000000)
        ok("Token budget and is_active updated")


def test_non_admin_cannot_access_keys():
    section("GET /admin/provider-keys -- non-admin -> 403")
    if not user_token:
        skip("non-admin key access", "no user token"); return
    r = requests.get(f"{BASE_URL}/admin/provider-keys",
                     headers={"Authorization": f"Bearer {user_token}"}, timeout=5)
    if r.status_code in (401, 403):
        ok(f"Non-admin correctly blocked ({r.status_code})")
    else:
        fail(f"Expected 403, got {r.status_code}")


# ---- Plans ------------------------------------------------------------------

def test_create_plan():
    global plan_id
    section("POST /admin/plans -- create plan")
    if not admin_token:
        skip("create plan", "no admin token"); return
    r = requests.post(f"{BASE_URL}/admin/plans",
        headers=_ah(),
        json={
            "name": f"admin_test_plan_{uuid.uuid4().hex[:6]}",
            "description": "Admin test plan",
            "price": 1.99,
            "duration_minutes": 30,
            "token_cap": 10000,
            "rpm_limit": 15,
            "drain_rate_multiplier": 1.0,
            "model_id": None,
            "duration_label": "30 min",
        }, timeout=5)
    if assert_status("POST /admin/plans -> 201", r, 201):
        d = r.json()
        plan_id = d.get("id")
        assert_in("has 'id'",         "id",         d)
        assert_in("has 'token_cap'",  "token_cap",  d)
        assert_in("has 'rpm_limit'",  "rpm_limit",  d)
        ok(f"Plan created: ID={plan_id}")


def test_list_plans_admin():
    section("GET /admin/plans -- admin list (includes inactive)")
    if not admin_token:
        skip("admin plan list", "no admin token"); return
    r = requests.get(f"{BASE_URL}/admin/plans", headers=_ah(), timeout=5)
    if assert_status("GET /admin/plans -> 200", r, 200):
        plans = r.json()
        ok(f"Total plans (incl. inactive): {len(plans) if isinstance(plans, list) else '?'}")


def test_edit_plan():
    section("PUT /admin/plans/{id} -- update price")
    if not admin_token or not plan_id:
        skip("edit plan", "no plan_id"); return
    r = requests.put(f"{BASE_URL}/admin/plans/{plan_id}",
        headers=_ah(),
        json={"price": 2.49, "is_active": True},
        timeout=5)
    if assert_status("PUT /admin/plans/{id} -> 200", r, 200):
        d = r.json()
        assert_eq("price updated", round(d.get("price", 0), 2), 2.49)
        ok("Plan price updated successfully")


# ---- Users & Stats ----------------------------------------------------------

def test_list_users():
    section("GET /admin/users")
    if not admin_token:
        skip("list users", "no admin token"); return
    r = requests.get(f"{BASE_URL}/admin/users", headers=_ah(), timeout=5)
    if assert_status("GET /admin/users -> 200", r, 200):
        users = r.json()
        ok(f"Total users: {len(users) if isinstance(users, list) else '?'}")
        if isinstance(users, list) and users:
            u = users[0]
            assert_in("user has 'id'",    "id",    u)
            assert_in("user has 'email'", "email", u)
            assert_in("user has 'role'",  "role",  u)


def test_platform_stats():
    section("GET /admin/stats")
    if not admin_token:
        skip("admin stats", "no admin token"); return
    r = requests.get(f"{BASE_URL}/admin/stats", headers=_ah(), timeout=5)
    if assert_status("GET /admin/stats -> 200", r, 200):
        d = r.json()
        for field in ["total_users", "active_rentals", "total_rentals", "total_revenue"]:
            assert_in(f"has '{field}'", field, d)
        ok(f"Users: {d.get('total_users')} | Active rentals: {d.get('active_rentals')} | Revenue: {d.get('total_revenue')}")


def test_list_rentals_admin():
    section("GET /admin/rentals")
    if not admin_token:
        skip("admin rentals", "no admin token"); return
    r = requests.get(f"{BASE_URL}/admin/rentals", headers=_ah(), timeout=5)
    if assert_status("GET /admin/rentals -> 200", r, 200):
        rentals = r.json()
        ok(f"Total rentals visible to admin: {len(rentals) if isinstance(rentals, list) else '?'}")


# ---- Cleanup ----------------------------------------------------------------

def _cleanup():
    if admin_token:
        if plan_id:
            requests.delete(f"{BASE_URL}/admin/plans/{plan_id}", headers=_ah(), timeout=5)
        if key_id:
            requests.delete(f"{BASE_URL}/admin/provider-keys/{key_id}", headers=_ah(), timeout=5)


if __name__ == "__main__":
    print(f"\n{B}{C}AIRent -- Admin API Tests{X}  ({BASE_URL})")
    _setup()
    test_add_provider_key()
    test_list_provider_keys()
    test_edit_provider_key()
    test_non_admin_cannot_access_keys()
    test_create_plan()
    test_list_plans_admin()
    test_edit_plan()
    test_list_users()
    test_platform_stats()
    test_list_rentals_admin()
    _cleanup()
    sys.exit(summary("Admin API Tests"))
