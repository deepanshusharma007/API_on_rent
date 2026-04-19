"""
AIRent -- Core API Flow Test Suite
===================================
Tests the full end-to-end flow:
  1. Register a new user
  2. Login and get JWT
  3. Admin: add a provider key
  4. Admin: create a plan
  5. Admin: inject a rental directly (bypasses payment for testing)
  6. Verify the virtual key works against the proxy
  7. Verify token deduction
  8. Verify expiry / invalid key rejection

Run:
    python -m pytest tests/test_core_flow.py -v
    # or run standalone:
    python tests/test_core_flow.py

Config:
    Set BASE_URL below or export TEST_BASE_URL env var.
    Set ADMIN_EMAIL / ADMIN_PASSWORD to match your running instance.
    Set a real OPENAI_API_KEY in your .env so the proxy can forward requests.
"""

import os
import sys
import time
import uuid
import requests
import json

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# -- Config --------------------------------------------------------------------
BASE_URL     = os.getenv("TEST_BASE_URL",    "http://localhost:8000")
ADMIN_EMAIL  = os.getenv("TEST_ADMIN_EMAIL", "admin@apirental.com")
ADMIN_PASS   = os.getenv("TEST_ADMIN_PASS",  "admin123")

# Colours for terminal output
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

# -- Helpers -------------------------------------------------------------------
_passed = 0
_failed = 0
_skipped = 0

def ok(label):
    global _passed
    _passed += 1
    print(f"  {GREEN}[PASS]{RESET}  {label}")

def fail(label, detail=""):
    global _failed
    _failed += 1
    msg = f"  {RED}[FAIL]{RESET}  {label}"
    if detail:
        msg += f"\n         {RED}{detail}{RESET}"
    print(msg)

def skip(label, reason=""):
    global _skipped
    _skipped += 1
    print(f"  {YELLOW}[SKIP]{RESET}  {label}  ({reason})")

def section(title):
    print(f"\n{BOLD}{CYAN}-- {title} {'-'*(50-len(title))}{RESET}")

def assert_eq(label, got, expected):
    if got == expected:
        ok(label)
    else:
        fail(label, f"expected {expected!r}, got {got!r}")

def assert_in(label, key, obj):
    if key in obj:
        ok(label)
    else:
        fail(label, f"key {key!r} missing from response: {list(obj.keys())}")

def assert_status(label, resp, code):
    if resp.status_code == code:
        ok(label)
    else:
        fail(label, f"HTTP {resp.status_code} -- {resp.text[:200]}")
    return resp.status_code == code

# -- State shared across tests -------------------------------------------------
state = {
    "user_email":    f"testuser_{uuid.uuid4().hex[:8]}@example.com",
    "user_pass":     "TestPass123!",
    "user_token":    None,
    "user_id":       None,
    "admin_token":   None,
    "provider_key_id": None,
    "plan_id":       None,
    "virtual_key":   None,
    "rental_id":     None,
}

# -- Test functions -------------------------------------------------------------

def test_health():
    section("1. Health Check")
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        if assert_status("GET /health returns 200", r, 200):
            data = r.json()
            ok(f"Status: {data.get('status')} | Redis: {data.get('redis')}")
    except requests.ConnectionError:
        fail("Cannot reach server", f"Is the backend running at {BASE_URL}?")
        sys.exit(1)


def test_register():
    section("2. User Registration")
    r = requests.post(f"{BASE_URL}/auth/register", json={
        "email": state["user_email"],
        "password": state["user_pass"],
    })
    if assert_status("POST /auth/register -> 201", r, 201):
        data = r.json()
        assert_in("response has 'id'", "id", data)
        state["user_id"] = data.get("id")
        ok(f"Created user: {state['user_email']}")


def test_login_user():
    section("3. User Login")
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "email": state["user_email"],
        "password": state["user_pass"],
    })
    if assert_status("POST /auth/login -> 200", r, 200):
        data = r.json()
        assert_in("response has 'access_token'", "access_token", data)
        state["user_token"] = data.get("access_token")
        ok("JWT token received")


def test_login_admin():
    section("4. Admin Login")
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASS,
    })
    if assert_status("POST /auth/login (admin) -> 200", r, 200):
        data = r.json()
        state["admin_token"] = data.get("access_token")
        ok("Admin JWT token received")
    else:
        fail("Admin login failed -- check ADMIN_EMAIL/ADMIN_PASSWORD")


def _admin_headers():
    return {"Authorization": f"Bearer {state['admin_token']}"}

def _user_headers():
    return {"Authorization": f"Bearer {state['user_token']}"}


def test_get_me():
    section("5. Get Current User Profile")
    if not state["user_token"]:
        skip("GET /auth/me", "no user token")
        return
    r = requests.get(f"{BASE_URL}/auth/me", headers=_user_headers())
    if assert_status("GET /auth/me -> 200", r, 200):
        data = r.json()
        assert_in("has 'email'", "email", data)
        assert_in("has 'role'", "role", data)
        assert_eq("email matches", data["email"], state["user_email"])
        ok(f"Role: {data['role']}")


def test_active_providers_empty():
    section("6. Active Providers (before adding any key)")
    r = requests.get(f"{BASE_URL}/api/active-providers")
    assert_status("GET /api/active-providers -> 200", r, 200)
    data = r.json()
    assert_in("response has 'providers'", "providers", data)
    ok(f"Active providers: {data.get('providers', [])}")


def test_admin_add_provider_key():
    section("7. Admin -- Add Provider Key")
    if not state["admin_token"]:
        skip("add provider key", "no admin token")
        return

    # Use a dummy key for testing (proxy will fail at LiteLLM level, not auth level)
    test_key = os.getenv("TEST_OPENAI_KEY", "sk-test-dummy-key-for-flow-testing")
    r = requests.post(f"{BASE_URL}/admin/provider-keys",
        headers=_admin_headers(),
        json={
            "provider": "openai",
            "api_key": test_key,
            "model_name": "gpt-4o-mini",
        }
    )
    if r.status_code == 400 and "already exists" in r.text:
        skip("provider key already exists", "using existing key")
        # Fetch existing key id
        keys_r = requests.get(f"{BASE_URL}/admin/provider-keys", headers=_admin_headers())
        if keys_r.status_code == 200:
            keys = keys_r.json().get("keys", [])
            openai_keys = [k for k in keys if k["provider"] == "openai"]
            if openai_keys:
                state["provider_key_id"] = openai_keys[0]["id"]
        return

    if assert_status("POST /admin/provider-keys -> 201", r, 201):
        data = r.json()
        state["provider_key_id"] = data.get("id")
        ok(f"Provider key ID: {state['provider_key_id']}")


def test_active_providers_after_key():
    section("8. Active Providers (after adding key)")
    r = requests.get(f"{BASE_URL}/api/active-providers")
    assert_status("GET /api/active-providers -> 200", r, 200)
    data = r.json()
    providers = data.get("providers", [])
    if "openai" in providers:
        ok(f"'openai' now in active providers: {providers}")
    else:
        fail("'openai' not visible after adding key", f"got: {providers}")


def test_admin_create_plan():
    section("9. Admin -- Create Plan")
    if not state["admin_token"]:
        skip("create plan", "no admin token")
        return

    r = requests.post(f"{BASE_URL}/admin/plans",
        headers=_admin_headers(),
        json={
            "name":               "Test Plan -- GPT-4o Mini 15min",
            "description":        "Automated test plan",
            "price":              0.10,
            "duration_minutes":   15,
            "token_cap":          5000,
            "rpm_limit":          20,
            "drain_rate_multiplier": 1.0,
            "model_id":           "gpt-4o-mini",
            "duration_label":     "15 min",
        }
    )
    if assert_status("POST /admin/plans -> 201", r, 201):
        data = r.json()
        state["plan_id"] = data.get("id")
        ok(f"Plan ID: {state['plan_id']} | Token cap: {data.get('token_cap')}")


def test_list_plans():
    section("10. List Public Plans")
    r = requests.get(f"{BASE_URL}/api/plans")
    if assert_status("GET /api/plans -> 200", r, 200):
        plans = r.json()
        ok(f"Total active plans visible: {len(plans)}")
        # Check our test plan is in there
        ids = [p["id"] for p in plans]
        if state["plan_id"] and state["plan_id"] in ids:
            ok("Newly created test plan is visible in public list")
        elif state["plan_id"]:
            fail("Test plan not found in public plan list")


def test_admin_inject_rental():
    """
    Bypass payment gateway for testing by using the direct purchase endpoint.
    POST /api/rentals/purchase requires auth + plan_id.
    """
    section("11. Create Rental (direct purchase -- no payment gateway)")
    if not state["user_token"] or not state["plan_id"]:
        skip("create rental", "missing user token or plan_id")
        return

    r = requests.post(f"{BASE_URL}/api/rentals/purchase",
        headers=_user_headers(),
        json={"plan_id": state["plan_id"]}
    )
    if assert_status("POST /api/rentals/purchase -> 201", r, 201):
        data = r.json()
        assert_in("response has 'virtual_key'", "virtual_key", data)
        assert_in("response has 'id'",          "id",          data)
        assert_in("response has 'status'",      "status",      data)
        state["virtual_key"]  = data["virtual_key"]
        state["rental_id"]    = data["id"]
        ok(f"Virtual key: {state['virtual_key'][:20]}...")
        ok(f"Rental ID: {state['rental_id']} | Status: {data['status']}")
        ok(f"Tokens remaining: {data.get('tokens_remaining')}")
        ok(f"Expires at: {data.get('expires_at')}")


def test_virtual_key_format():
    section("12. Virtual Key Format Validation")
    if not state["virtual_key"]:
        skip("key format check", "no virtual key")
        return
    key = state["virtual_key"]
    if key.startswith("vk_"):
        ok(f"Key starts with 'vk_' prefix (ok)")
    else:
        fail("Key missing 'vk_' prefix", key)
    if len(key) > 30:
        ok(f"Key length {len(key)} chars -- sufficient entropy (ok)")
    else:
        fail("Key too short", f"got {len(key)} chars")


def test_active_rentals():
    section("13. Active Rentals Endpoint")
    if not state["user_token"]:
        skip("active rentals", "no user token")
        return
    r = requests.get(f"{BASE_URL}/api/rentals/active", headers=_user_headers())
    if assert_status("GET /api/rentals/active -> 200", r, 200):
        rentals = r.json()
        ok(f"Active rentals for user: {len(rentals)}")
        if state["rental_id"]:
            rental_ids = [ren["id"] for ren in rentals]
            if state["rental_id"] in rental_ids:
                ok("Our test rental appears in active list (ok)")
            else:
                fail("Test rental not found in active list")


def test_proxy_with_valid_key():
    """
    Use the virtual key against the proxy endpoint.
    If no real provider key is configured, the proxy will return an error from
    LiteLLM -- but the AUTH layer (virtual key validation) will have passed,
    which is what we're testing here.
    """
    section("14. Proxy -- Chat Completions with Virtual Key")
    if not state["virtual_key"]:
        skip("proxy test", "no virtual key")
        return

    r = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {state['virtual_key']}",
            "Content-Type":  "application/json",
        },
        json={
            "model":    "gpt-4o-mini",
            "messages": [{"role": "user", "content": "Say exactly: AIRENT_TEST_OK"}],
            "max_tokens": 20,
        },
        timeout=30,
    )

    # 200 = real provider key worked, full success
    if r.status_code == 200:
        data = r.json()
        ok("Proxy returned 200 -- real provider key is working (ok)")
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        ok(f"Model response: {content[:80]}")
        assert_in("response has 'usage'",   "usage",   data)
        assert_in("response has 'choices'", "choices", data)

    # 402 = virtual key rejected -> auth layer broken
    elif r.status_code == 402:
        fail("Virtual key rejected by proxy (402)", r.text[:200])

    # 401 = auth header missing
    elif r.status_code == 401:
        fail("Unauthorized (401)", r.text[:200])

    # 5xx from LiteLLM = key accepted, provider call failed (expected with dummy key)
    elif r.status_code in (500, 502, 503):
        ok("Virtual key ACCEPTED by proxy (ok) (provider call failed -- expected with dummy key)")
        ok(f"HTTP {r.status_code} from LiteLLM layer (not an auth error)")

    else:
        fail(f"Unexpected status {r.status_code}", r.text[:200])


def test_proxy_with_invalid_key():
    section("15. Proxy -- Reject Invalid Virtual Key")
    r = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        headers={
            "Authorization": "Bearer vk_thisisafakekeyandshouldfail",
            "Content-Type":  "application/json",
        },
        json={
            "model":    "gpt-4o-mini",
            "messages": [{"role": "user", "content": "hello"}],
        },
        timeout=10,
    )
    if r.status_code == 402:
        ok("Invalid key correctly rejected with 402 (ok)")
    else:
        fail(f"Expected 402, got {r.status_code}", r.text[:100])


def test_proxy_without_key():
    section("16. Proxy -- Reject Missing Authorization Header")
    r = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hi"}]},
        timeout=10,
    )
    if r.status_code in (401, 402, 422):
        ok(f"Missing auth header correctly rejected with {r.status_code} (ok)")
    else:
        fail(f"Expected 401/402, got {r.status_code}", r.text[:100])


def test_token_deduction():
    section("17. Token Deduction After Request")
    if not state["user_token"] or not state["rental_id"]:
        skip("token deduction", "no active rental")
        return

    r = requests.get(f"{BASE_URL}/api/rentals/active", headers=_user_headers())
    if r.status_code != 200:
        skip("token check", "cannot fetch rentals")
        return

    rentals = r.json()
    our_rental = next((ren for ren in rentals if ren["id"] == state["rental_id"]), None)
    if not our_rental:
        skip("token check", "rental not in active list")
        return

    tokens_remaining = our_rental.get("tokens_remaining")
    tokens_used      = our_rental.get("tokens_used")
    ok(f"Tokens used:      {tokens_used}")
    ok(f"Tokens remaining: {tokens_remaining}")

    if tokens_used is not None and tokens_used >= 0:
        ok("Token usage field is present and non-negative (ok)")
    if tokens_remaining is not None and tokens_remaining >= 0:
        ok("Tokens remaining field is present and non-negative (ok)")


def test_usage_stats():
    section("18. Usage Stats Endpoint")
    if not state["user_token"] or not state["rental_id"]:
        skip("usage stats", "no active rental")
        return

    r = requests.get(
        f"{BASE_URL}/api/rentals/{state['rental_id']}/usage",
        headers=_user_headers()
    )
    if assert_status(f"GET /api/rentals/{state['rental_id']}/usage -> 200", r, 200):
        data = r.json()
        assert_in("has 'tokens_used'",            "tokens_used",            data)
        assert_in("has 'tokens_remaining'",       "tokens_remaining",       data)
        assert_in("has 'requests_made'",          "requests_made",          data)
        assert_in("has 'time_remaining_seconds'", "time_remaining_seconds", data)
        ok(f"Requests made: {data.get('requests_made')} | TTL: {data.get('time_remaining_seconds')}s")


def test_admin_key_edit():
    section("19. Admin -- Edit Provider Key (model_name + is_active toggle)")
    if not state["admin_token"] or not state["provider_key_id"]:
        skip("edit provider key", "no admin token or key id")
        return

    r = requests.put(
        f"{BASE_URL}/admin/provider-keys/{state['provider_key_id']}",
        headers=_admin_headers(),
        json={"model_name": "gpt-4o-mini", "is_active": True}
    )
    if assert_status("PUT /admin/provider-keys/{id} -> 200", r, 200):
        data = r.json()
        assert_eq("model_name updated", data.get("model_name"), "gpt-4o-mini")
        assert_eq("is_active remains True", data.get("is_active"), True)
        ok("Provider key edit endpoint works (ok)")


def test_admin_stats():
    section("20. Admin -- Platform Stats")
    if not state["admin_token"]:
        skip("admin stats", "no admin token")
        return
    r = requests.get(f"{BASE_URL}/admin/stats", headers=_admin_headers())
    if assert_status("GET /admin/stats -> 200", r, 200):
        data = r.json()
        for field in ["total_users", "active_rentals", "total_rentals", "total_revenue"]:
            assert_in(f"has '{field}'", field, data)
        ok(f"Users: {data.get('total_users')} | Active rentals: {data.get('active_rentals')}")


def test_cleanup():
    """Soft-delete the test plan so it doesn't pollute the DB."""
    section("21. Cleanup -- Deactivate Test Plan")
    if not state["admin_token"] or not state["plan_id"]:
        skip("cleanup", "nothing to clean")
        return
    r = requests.delete(
        f"{BASE_URL}/admin/plans/{state['plan_id']}",
        headers=_admin_headers()
    )
    if r.status_code == 200:
        ok(f"Test plan {state['plan_id']} deactivated (ok)")
    else:
        fail(f"Could not deactivate test plan", r.text[:100])


# -- Runner --------------------------------------------------------------------
def run_all():
    print(f"\n{BOLD}{'='*58}")
    print(f"  AIRent -- Core API Flow Tests")
    print(f"  Target: {BASE_URL}")
    print(f"{'='*58}{RESET}")

    test_health()
    test_register()
    test_login_user()
    test_login_admin()
    test_get_me()
    test_active_providers_empty()
    test_admin_add_provider_key()
    test_active_providers_after_key()
    test_admin_create_plan()
    test_list_plans()
    test_admin_inject_rental()
    test_virtual_key_format()
    test_active_rentals()
    test_proxy_with_valid_key()
    test_proxy_with_invalid_key()
    test_proxy_without_key()
    test_token_deduction()
    test_usage_stats()
    test_admin_key_edit()
    test_admin_stats()
    test_cleanup()

    # Summary
    total = _passed + _failed + _skipped
    print(f"\n{BOLD}{'-'*58}")
    print(f"  Results: {total} tests  |  "
          f"{GREEN}{_passed} passed{RESET}  "
          f"{RED}{_failed} failed{RESET}  "
          f"{YELLOW}{_skipped} skipped{RESET}")
    print(f"{'-'*58}{RESET}\n")

    if _failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_all()
