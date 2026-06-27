"""Shared helpers for all dev/ test scripts."""
import os
import sys
import requests

# Force UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL    = os.getenv("TEST_BASE_URL",    "http://localhost:8000")
ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@apirental.com")
ADMIN_PASS  = os.getenv("TEST_ADMIN_PASS",  "admin123")

G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; C = "\033[96m"; B = "\033[1m"; X = "\033[0m"

_passed = _failed = _skipped = 0

def ok(label):
    global _passed; _passed += 1
    print(f"  {G}[PASS]{X}  {label}")

def fail(label, detail=""):
    global _failed; _failed += 1
    print(f"  {R}[FAIL]{X}  {label}" + (f"\n         {R}{detail}{X}" if detail else ""))

def skip(label, reason=""):
    global _skipped; _skipped += 1
    print(f"  {Y}[SKIP]{X}  {label}  ({reason})")

def section(title):
    print(f"\n{B}{C}-- {title} {'-'*(52-len(title))}{X}")

def assert_status(label, resp, code):
    if resp.status_code == code:
        ok(label)
        return True
    fail(label, f"HTTP {resp.status_code} -- {resp.text[:200]}")
    return False

def assert_in(label, key, obj):
    if key in obj:
        ok(label)
        return True
    fail(label, f"key {key!r} missing; got: {list(obj.keys())}")
    return False

def assert_eq(label, got, expected):
    if got == expected:
        ok(label)
        return True
    fail(label, f"expected {expected!r}, got {got!r}")
    return False

def get_admin_token():
    r = requests.post(f"{BASE_URL}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=5)
    if r.status_code == 200:
        return r.json().get("access_token")
    return None

def summary(suite_name):
    total = _passed + _failed + _skipped
    print(f"\n{B}{'='*56}")
    print(f"  {suite_name}")
    print(f"  {total} tests  |  {G}{_passed} passed{X}  {R}{_failed} failed{X}  {Y}{_skipped} skipped{X}")
    print(f"{'='*56}{X}\n")
    return _failed
