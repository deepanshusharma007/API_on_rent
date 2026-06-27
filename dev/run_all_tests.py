"""
Run all AIRent backend test suites and print a combined report.

Usage:
    python dev/run_all_tests.py

    # Against a different server:
    TEST_BASE_URL=https://your-api.onrender.com python dev/run_all_tests.py

    # With a real provider key:
    TEST_OPENAI_KEY=sk-... python dev/run_all_tests.py

Each suite runs as a subprocess so failures in one don't abort the others.
Exit code is 0 only if all suites pass.
"""
import sys
import os
import subprocess
import time

ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEV   = os.path.join(ROOT, "dev")

G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; C = "\033[96m"; B = "\033[1m"; X = "\033[0m"

SUITES = [
    ("Health & Status",  "test_health.py"),
    ("Auth API",         "test_auth.py"),
    ("Marketplace API",  "test_marketplace.py"),
    ("Payment API",      "test_payment.py"),
    ("Proxy API",        "test_proxy.py"),
    ("Admin API",        "test_admin.py"),
]


def run_suite(name, filename):
    path = os.path.join(DEV, filename)
    print(f"\n{B}{C}{'='*60}{X}")
    print(f"{B}  Running: {name}{X}")
    print(f"{B}{'='*60}{X}")
    start = time.time()
    result = subprocess.run(
        [sys.executable, path],
        env={**os.environ},
    )
    elapsed = time.time() - start
    return result.returncode, elapsed


def main():
    base = os.getenv("TEST_BASE_URL", "http://localhost:8000")
    print(f"\n{B}{'#'*60}")
    print(f"  AIRent -- Full Backend Test Suite")
    print(f"  Target: {base}")
    print(f"{'#'*60}{X}\n")

    results = []
    total_time = 0.0

    for name, filename in SUITES:
        code, elapsed = run_suite(name, filename)
        total_time += elapsed
        results.append((name, code, elapsed))

    # Final summary table
    print(f"\n{B}{'='*60}")
    print(f"  FINAL RESULTS")
    print(f"{'='*60}{X}")

    all_passed = True
    for name, code, elapsed in results:
        icon  = f"{G}PASS{X}" if code == 0 else f"{R}FAIL{X}"
        color = G if code == 0 else R
        print(f"  [{icon}]  {color}{name:<25}{X}  ({elapsed:.1f}s)")
        if code != 0:
            all_passed = False

    print(f"\n  Total time: {total_time:.1f}s")
    if all_passed:
        print(f"\n  {G}{B}All suites passed.{X}\n")
    else:
        print(f"\n  {R}{B}Some suites failed. See output above.{X}\n")

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
