"""
Payment API tests.
  POST /api/checkout/session     (duplicate-order guard)
  GET  /api/checkout/verify/{id}
  GET  /api/invoice/{rental_id}
  GET  /api/invoice/{rental_id}/html

Note: Actual Cashfree payment flow cannot be tested without real credentials.
      These tests verify the API contract and guard logic.

Usage:
    python dev/test_payment.py
"""
import sys, os, uuid, requests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dev._common import *

EMAIL      = f"pay_{uuid.uuid4().hex[:8]}@example.com"
PASS       = "TestPass123!"
user_token = None
admin_token = None
plan_id    = None
rental_id  = None


def _setup():
    global user_token, admin_token, plan_id, rental_id

    requests.post(f"{BASE_URL}/auth/register", json={"email": EMAIL, "password": PASS}, timeout=5)
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASS}, timeout=5)
    if r.status_code == 200:
        user_token = r.json().get("access_token")

    admin_token = get_admin_token()

    if admin_token:
        r = requests.post(f"{BASE_URL}/admin/plans",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": f"pay_test_{uuid.uuid4().hex[:6]}",
                "description": "Payment test plan",
                "price": 0.01, "duration_minutes": 15, "token_cap": 200,
                "rpm_limit": 5, "drain_rate_multiplier": 1.0,
                "model_id": None, "duration_label": "15 min",
            }, timeout=5)
        if r.status_code == 201:
            plan_id = r.json().get("id")

    # Create a rental directly so we can test invoice endpoint
    if user_token and plan_id:
        r = requests.post(f"{BASE_URL}/api/rentals/purchase",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"plan_id": plan_id}, timeout=10)
        if r.status_code == 201:
            rental_id = r.json().get("id")


def test_checkout_requires_auth():
    section("POST /api/checkout/session -- no auth -> 401/403")
    if not plan_id:
        skip("checkout auth check", "no plan_id"); return
    r = requests.post(f"{BASE_URL}/api/checkout/session",
        json={"plan_id": plan_id, "provider": "openai"}, timeout=5)
    if r.status_code in (401, 403, 422):
        ok(f"Correctly rejected without auth ({r.status_code})")
    else:
        fail(f"Expected 401/403, got {r.status_code}")


def test_checkout_invalid_plan():
    section("POST /api/checkout/session -- non-existent plan -> 404")
    if not user_token:
        skip("checkout invalid plan", "no user token"); return
    r = requests.post(f"{BASE_URL}/api/checkout/session",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"plan_id": 999999, "provider": "openai"}, timeout=5)
    assert_status("POST /api/checkout/session (bad plan) -> 404", r, 404)


def test_checkout_duplicate_guard():
    """
    Call /checkout/session twice in rapid succession for same plan+provider.
    Second call should be blocked by the Redis SET NX lock (429).
    The first call may fail at Cashfree level (502) if no real credentials are set,
    but the second call must return 429 if the first got far enough to set the lock.
    """
    section("POST /api/checkout/session -- duplicate order guard (429 on 2nd)")
    if not user_token or not plan_id:
        skip("duplicate guard test", "no user token or plan_id"); return

    provider = "openai"
    r1 = requests.post(f"{BASE_URL}/api/checkout/session",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"plan_id": plan_id, "provider": provider}, timeout=10)
    r2 = requests.post(f"{BASE_URL}/api/checkout/session",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"plan_id": plan_id, "provider": provider}, timeout=10)

    ok(f"First call status: {r1.status_code}")
    ok(f"Second call status: {r2.status_code}")

    if r1.status_code in (200, 201, 502):
        # First call reached Cashfree layer (or succeeded) -- lock was set
        if r2.status_code == 429:
            ok("Duplicate guard working: second call correctly returned 429")
        else:
            fail(f"Expected 429 on second call, got {r2.status_code}", r2.text[:200])
    elif r1.status_code == 429:
        # Already locked from a previous test run -- acceptable
        ok("Lock already held from previous run (expected in repeated test runs)")
    else:
        skip("duplicate guard", f"unexpected first call status {r1.status_code}")


def test_verify_order_unknown():
    section("GET /api/checkout/verify/{order_id} -- unknown order -> 200 or 502")
    if not user_token:
        skip("verify order", "no user token"); return
    r = requests.get(f"{BASE_URL}/api/checkout/verify/order_0_0_openai_0",
                     headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
    # Either Cashfree says "not found" (502) or returns a status object (200) -- both are valid
    if r.status_code in (200, 404, 502):
        ok(f"Verify endpoint responded with {r.status_code} (expected)")
    else:
        fail(f"Unexpected {r.status_code}", r.text[:100])


def test_invoice_json():
    section("GET /api/invoice/{rental_id} -- JSON invoice")
    if not user_token or not rental_id:
        skip("JSON invoice", "no active rental"); return
    r = requests.get(f"{BASE_URL}/api/invoice/{rental_id}",
                     headers={"Authorization": f"Bearer {user_token}"}, timeout=5)
    if assert_status(f"GET /api/invoice/{rental_id} -> 200", r, 200):
        d = r.json()
        for field in ["invoice_number", "customer_email", "plan_name",
                      "amount_inr", "tokens_included", "rental_id"]:
            assert_in(f"has '{field}'", field, d)
        assert_eq("correct rental_id", d["rental_id"], rental_id)
        ok(f"Invoice: {d['invoice_number']} | Amount: {d['amount_inr']} INR")


def test_invoice_html():
    section("GET /api/invoice/{rental_id}/html -- HTML receipt")
    if not user_token or not rental_id:
        skip("HTML invoice", "no active rental"); return
    r = requests.get(f"{BASE_URL}/api/invoice/{rental_id}/html",
                     headers={"Authorization": f"Bearer {user_token}"}, timeout=5)
    if assert_status(f"GET /api/invoice/{rental_id}/html -> 200", r, 200):
        if "text/html" in r.headers.get("content-type", ""):
            ok("Content-Type is text/html")
        if "<html>" in r.text.lower():
            ok("Response contains HTML markup")
        if "invoice" in r.text.lower():
            ok("Response contains invoice content")


def test_invoice_other_user():
    section("GET /api/invoice/{rental_id} -- other user cannot access -> 404")
    if not rental_id:
        skip("invoice ownership", "no rental_id"); return
    # Register a second user
    email2 = f"pay2_{uuid.uuid4().hex[:6]}@example.com"
    requests.post(f"{BASE_URL}/auth/register", json={"email": email2, "password": PASS}, timeout=5)
    r2 = requests.post(f"{BASE_URL}/auth/login", json={"email": email2, "password": PASS}, timeout=5)
    if r2.status_code != 200:
        skip("invoice ownership", "could not create second user"); return
    token2 = r2.json().get("access_token")
    r = requests.get(f"{BASE_URL}/api/invoice/{rental_id}",
                     headers={"Authorization": f"Bearer {token2}"}, timeout=5)
    assert_status("Other user's invoice -> 404", r, 404)


def _cleanup():
    if admin_token and plan_id:
        requests.delete(f"{BASE_URL}/admin/plans/{plan_id}",
                        headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)


if __name__ == "__main__":
    print(f"\n{B}{C}AIRent -- Payment API Tests{X}  ({BASE_URL})")
    _setup()
    test_checkout_requires_auth()
    test_checkout_invalid_plan()
    test_checkout_duplicate_guard()
    test_verify_order_unknown()
    test_invoice_json()
    test_invoice_html()
    test_invoice_other_user()
    _cleanup()
    sys.exit(summary("Payment API Tests"))
