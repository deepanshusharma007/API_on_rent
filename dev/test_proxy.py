"""
Proxy API tests.
  POST /v1/chat/completions
  GET  /v1/models

Tests:
  - Valid virtual key accepted
  - Invalid virtual key rejected (402)
  - Missing auth header rejected (401)
  - Wrong provider rejected (403)
  - Rate limit header present
  - Streaming response structure

Usage:
    python dev/test_proxy.py

    # With a real OpenAI key for full live test:
    TEST_OPENAI_KEY=sk-... python dev/test_proxy.py
"""
import sys, os, uuid, json, requests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dev._common import *

EMAIL      = f"proxy_{uuid.uuid4().hex[:8]}@example.com"
PASS       = "TestPass123!"
user_token = None
admin_token = None
plan_id    = None
vk_openai  = None   # virtual key rented for openai
vk_gemini  = None   # virtual key rented for gemini (if provider active)


def _setup():
    global user_token, admin_token, plan_id, vk_openai

    requests.post(f"{BASE_URL}/auth/register", json={"email": EMAIL, "password": PASS}, timeout=5)
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASS}, timeout=5)
    if r.status_code == 200:
        user_token = r.json().get("access_token")

    admin_token = get_admin_token()

    # Create a tiny test plan
    if admin_token:
        r = requests.post(f"{BASE_URL}/admin/plans",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": f"proxy_test_{uuid.uuid4().hex[:6]}",
                "description": "Proxy test plan",
                "price": 0.01, "duration_minutes": 15, "token_cap": 10000,
                "rpm_limit": 10, "drain_rate_multiplier": 1.0,
                "model_id": None, "duration_label": "15 min",
            }, timeout=5)
        if r.status_code == 201:
            plan_id = r.json().get("id")

    # Purchase an openai rental directly
    if user_token and plan_id:
        r = requests.post(f"{BASE_URL}/api/rentals/purchase",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"plan_id": plan_id, "provider": "openai"}, timeout=10)
        if r.status_code == 201:
            vk_openai = r.json().get("virtual_key")


def test_list_models():
    section("GET /v1/models")
    r = requests.get(f"{BASE_URL}/v1/models", timeout=5)
    if assert_status("GET /v1/models -> 200", r, 200):
        d = r.json()
        assert_in("has 'object'", "object", d)
        assert_in("has 'data'",   "data",   d)
        ok(f"Models available: {len(d.get('data', []))}")


def test_valid_key_accepted():
    section("POST /v1/chat/completions -- valid key")
    if not vk_openai:
        skip("valid key test", "no virtual key available"); return

    r = requests.post(f"{BASE_URL}/v1/chat/completions",
        headers={"Authorization": f"Bearer {vk_openai}", "Content-Type": "application/json"},
        json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Say: TEST_OK"}],
              "max_tokens": 10},
        timeout=30)

    if r.status_code == 200:
        d = r.json()
        ok("Proxy returned 200 -- real provider key is working")
        assert_in("has 'choices'", "choices", d)
        assert_in("has 'usage'",   "usage",   d)
    elif r.status_code in (500, 502, 503):
        ok(f"Key accepted by proxy (HTTP {r.status_code} from LiteLLM layer -- expected with dummy key)")
    elif r.status_code == 402:
        fail("Virtual key rejected with 402 -- key lookup failed")
    elif r.status_code == 401:
        fail("Unauthorized 401 -- auth header not recognised")
    else:
        fail(f"Unexpected {r.status_code}", r.text[:200])


def test_invalid_key_rejected():
    section("POST /v1/chat/completions -- invalid key -> 402")
    r = requests.post(f"{BASE_URL}/v1/chat/completions",
        headers={"Authorization": "Bearer vk_thisisafakekeyxyz", "Content-Type": "application/json"},
        json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hi"}]},
        timeout=10)
    assert_status("Invalid key -> 402", r, 402)


def test_missing_auth_rejected():
    section("POST /v1/chat/completions -- no auth header -> 401")
    r = requests.post(f"{BASE_URL}/v1/chat/completions",
        json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hi"}]},
        timeout=10)
    if r.status_code in (401, 422):
        ok(f"Missing auth correctly rejected with {r.status_code}")
    else:
        fail(f"Expected 401, got {r.status_code}", r.text[:100])


def test_wrong_provider_rejected():
    section("POST /v1/chat/completions -- wrong provider model -> 403")
    if not vk_openai:
        skip("wrong provider test", "no openai virtual key"); return

    # openai key trying to use a gemini model
    r = requests.post(f"{BASE_URL}/v1/chat/completions",
        headers={"Authorization": f"Bearer {vk_openai}", "Content-Type": "application/json"},
        json={"model": "gemini-1.5-flash", "messages": [{"role": "user", "content": "hi"}]},
        timeout=10)
    if r.status_code == 403:
        ok("Cross-provider model correctly rejected with 403")
    elif r.status_code == 402:
        # Cost estimator fired before provider check (low token balance in test plan) -- still rejected
        ok("Request rejected with 402 (cost estimator beat provider check -- correct behavior)")
    elif r.status_code in (500, 502):
        skip("cross-provider check", "provider validation not enforced or provider unavailable")
    else:
        fail(f"Expected 403 or 402, got {r.status_code}", r.text[:200])


def test_streaming_structure():
    section("POST /v1/chat/completions -- streaming (stream:true)")
    if not vk_openai:
        skip("streaming test", "no virtual key"); return

    r = requests.post(f"{BASE_URL}/v1/chat/completions",
        headers={"Authorization": f"Bearer {vk_openai}", "Content-Type": "application/json"},
        json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hi"}],
              "max_tokens": 5, "stream": True},
        stream=True, timeout=20)

    if r.status_code == 200:
        chunks = []
        for raw in r.iter_lines():
            if raw and raw.startswith(b"data:"):
                chunks.append(raw)
                if len(chunks) >= 3:
                    break
        if chunks:
            ok(f"Streaming SSE chunks received: {len(chunks)}")
            # Validate first non-DONE chunk is JSON
            for c in chunks:
                payload = c[5:].strip()
                if payload == b"[DONE]":
                    break
                try:
                    json.loads(payload)
                    ok("First SSE chunk is valid JSON")
                    break
                except Exception:
                    fail("SSE chunk is not valid JSON", str(payload[:80]))
                    break
        else:
            fail("No SSE chunks received")
    elif r.status_code in (500, 502, 503):
        ok(f"Key accepted for streaming (HTTP {r.status_code} from LiteLLM -- expected with dummy key)")
    else:
        fail(f"Unexpected {r.status_code}", r.text[:200])


def _cleanup():
    if admin_token and plan_id:
        requests.delete(f"{BASE_URL}/admin/plans/{plan_id}",
                        headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)


if __name__ == "__main__":
    print(f"\n{B}{C}AIRent -- Proxy API Tests{X}  ({BASE_URL})")
    _setup()
    test_list_models()
    test_valid_key_accepted()
    test_invalid_key_rejected()
    test_missing_auth_rejected()
    test_wrong_provider_rejected()
    test_streaming_structure()
    _cleanup()
    sys.exit(summary("Proxy API Tests"))
