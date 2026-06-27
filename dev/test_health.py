"""
Health & Status API tests.
  GET /health
  GET /status/
  GET /status/providers  (if exists)

Usage:
    python dev/test_health.py
"""
import sys, os, requests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dev._common import *


def test_health():
    section("GET /health")
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
    except requests.ConnectionError:
        fail("Cannot reach server", f"Is the backend running at {BASE_URL}?")
        sys.exit(1)
    if assert_status("GET /health -> 200", r, 200):
        d = r.json()
        assert_in("has 'status'",  "status",  d)
        assert_in("has 'redis'",   "redis",   d)
        assert_eq("status is healthy", d.get("status"), "healthy")
        ok(f"Redis: {d.get('redis')} | Version: {d.get('version', 'n/a')}")


def test_status():
    section("GET /status/")
    r = requests.get(f"{BASE_URL}/status/", timeout=5)
    if assert_status("GET /status/ -> 200", r, 200):
        d = r.json()
        ok(f"Status response: {list(d.keys())}")


def test_root():
    section("GET / (root)")
    r = requests.get(f"{BASE_URL}/", timeout=5)
    if assert_status("GET / -> 200", r, 200):
        d = r.json()
        assert_in("has 'message'", "message", d)
        ok(f"Message: {d.get('message')}")


def test_head_health():
    section("HEAD /health (Render keep-alive probe)")
    r = requests.head(f"{BASE_URL}/health", timeout=5)
    if r.status_code == 200:
        ok("HEAD /health -> 200 (ok)")
    else:
        fail(f"HEAD /health -> {r.status_code}")


def test_docs_reachable():
    section("GET /docs (Swagger UI)")
    r = requests.get(f"{BASE_URL}/docs", timeout=5)
    if r.status_code == 200:
        ok("Swagger UI reachable at /docs")
    else:
        fail(f"GET /docs -> {r.status_code}")


if __name__ == "__main__":
    print(f"\n{B}{C}AIRent -- Health & Status Tests{X}  ({BASE_URL})")
    test_health()
    test_status()
    test_root()
    test_head_health()
    test_docs_reachable()
    sys.exit(summary("Health & Status Tests"))
