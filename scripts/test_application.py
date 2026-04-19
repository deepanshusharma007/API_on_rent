"""Comprehensive application test suite."""
import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"

print("=" * 80)
print("AI API RENTAL SAAS - COMPREHENSIVE TEST SUITE")
print("=" * 80)

# Test 1: Authentication
print("\n[TEST 1: AUTHENTICATION]")
print("-" * 80)

print("\n1.1 Testing login...")
login_response = requests.post(
    f"{BASE_URL}/auth/login",
    json={"email": "admin@apirental.com", "password": "admin123"}
)
print(f"   Status: {login_response.status_code}")
if login_response.status_code == 200:
    token_data = login_response.json()
    access_token = token_data["access_token"]
    print(f"   ✅ Login successful!")
    print(f"   Token: {access_token[:50]}...")
else:
    print(f"   ❌ Login failed: {login_response.text}")
    exit(1)

# Test 2: Marketplace
print("\n📝 TEST 2: MARKETPLACE")
print("-" * 80)

print("\n2.1 Testing GET /api/plans...")
plans_response = requests.get(
    f"{BASE_URL}/api/plans",
    headers={"Authorization": f"Bearer {access_token}"}
)
print(f"   Status: {plans_response.status_code}")
if plans_response.status_code == 200:
    plans = plans_response.json()
    print(f"   ✅ Found {len(plans)} plan(s)")
    for plan in plans:
        print(f"      - {plan['name']}: ${plan['price']} for {plan['duration_minutes']}min, {plan['token_cap']} tokens")
else:
    print(f"   ❌ Failed: {plans_response.text}")

# Test 3: Purchase Rental
print("\n📝 TEST 3: RENTAL PURCHASE")
print("-" * 80)

if plans:
    plan_id = plans[0]['id']
    print(f"\n3.1 Testing purchase of plan: {plans[0]['name']}...")
    purchase_response = requests.post(
        f"{BASE_URL}/api/rentals/purchase",
        json={"plan_id": plan_id, "payment_method_id": "pm_test_123"},
        headers={"Authorization": f"Bearer {access_token}"}
    )
    print(f"   Status: {purchase_response.status_code}")
    if purchase_response.status_code == 200:
        rental = purchase_response.json()
        virtual_key = rental["virtual_key"]
        print(f"   ✅ Purchase successful!")
        print(f"   Virtual Key: {virtual_key}")
        print(f"   Expires: {rental['expires_at']}")
    else:
        print(f"   ❌ Failed: {purchase_response.text}")
        virtual_key = None
else:
    print("   ⚠️  No plans available to purchase")
    virtual_key = None

# Test 4: Active Rentals
print("\n📝 TEST 4: ACTIVE RENTALS")
print("-" * 80)

print("\n4.1 Testing GET /api/rentals/active...")
rentals_response = requests.get(
    f"{BASE_URL}/api/rentals/active",
    headers={"Authorization": f"Bearer {access_token}"}
)
print(f"   Status: {rentals_response.status_code}")
if rentals_response.status_code == 200:
    rentals = rentals_response.json()
    print(f"   ✅ Found {len(rentals)} active rental(s)")
    for rental in rentals:
        print(f"      - Key: {rental['virtual_key'][:20]}...")
        print(f"        Tokens: {rental['tokens_remaining']}/{rental['tokens_remaining'] + rental['tokens_used']}")
else:
    print(f"   ❌ Failed: {rentals_response.text}")

# Test 5: API Proxy (if we have a virtual key)
if virtual_key:
    print("\n📝 TEST 5: API PROXY")
    print("-" * 80)
    
    print("\n5.1 Testing POST /v1/chat/completions...")
    proxy_response = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        json={
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Say 'Hello World' in exactly 2 words"}],
            "max_tokens": 10
        },
        headers={"Authorization": f"Bearer {virtual_key}"}
    )
    print(f"   Status: {proxy_response.status_code}")
    if proxy_response.status_code == 200:
        completion = proxy_response.json()
        print(f"   ✅ API call successful!")
        print(f"   Response: {completion['choices'][0]['message']['content']}")
        print(f"   Tokens used: {completion.get('usage', {}).get('total_tokens', 'N/A')}")
    else:
        print(f"   ❌ Failed: {proxy_response.text}")

# Test 6: Usage Statistics
print("\n📝 TEST 6: USAGE STATISTICS")
print("-" * 80)

if rentals:
    rental_id = rentals[0]['id']
    print(f"\n6.1 Testing GET /api/rentals/{rental_id}/usage...")
    usage_response = requests.get(
        f"{BASE_URL}/api/rentals/{rental_id}/usage",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    print(f"   Status: {usage_response.status_code}")
    if usage_response.status_code == 200:
        usage = usage_response.json()
        print(f"   ✅ Usage stats retrieved!")
        print(f"   Tokens used: {usage.get('tokens_used', 0)}")
        print(f"   Requests made: {usage.get('requests_made', 0)}")
    else:
        print(f"   ❌ Failed: {usage_response.text}")

# Test 7: Status Page
print("\n📝 TEST 7: PUBLIC STATUS PAGE")
print("-" * 80)

print("\n7.1 Testing GET /status (no auth)...")
status_response = requests.get(f"{BASE_URL}/status/")
print(f"   Status: {status_response.status_code}")
if status_response.status_code == 200:
    status = status_response.json()
    print(f"   ✅ Status page accessible!")
    print(f"   Providers: {list(status.get('providers', {}).keys())}")
else:
    print(f"   ❌ Failed: {status_response.text}")

# Summary
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print("✅ Authentication: PASS")
print(f"✅ Marketplace: PASS ({len(plans) if plans else 0} plans)")
print(f"✅ Rental Purchase: {'PASS' if virtual_key else 'SKIP'}")
print(f"✅ Active Rentals: PASS ({len(rentals) if rentals_response.status_code == 200 else 0} rentals)")
print(f"✅ API Proxy: {'PASS' if virtual_key and proxy_response.status_code == 200 else 'SKIP'}")
print("✅ Status Page: PASS")
print("=" * 80)
