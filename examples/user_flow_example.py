"""
Example: How a user calls your API with a virtual key

This demonstrates the complete user flow from purchasing a plan
to making API calls with the virtual key.
"""

import requests
import time

# ============================================================
# STEP 1: User logs in and purchases a plan
# ============================================================

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("USER FLOW DEMONSTRATION")
print("=" * 60)

# Login
print("\n[STEP 1] User logs in...")
login_response = requests.post(
    f"{BASE_URL}/auth/login",
    json={
        "email": "admin@apirental.com",
        "password": "admin123"
    }
)

if login_response.status_code == 200:
    jwt_token = login_response.json()["access_token"]
    print(f"✅ Login successful!")
    print(f"   JWT Token: {jwt_token[:50]}...")
else:
    print(f"❌ Login failed: {login_response.text}")
    exit(1)

# ============================================================
# STEP 2: User browses marketplace and selects a plan
# ============================================================

print("\n[STEP 2] User browses marketplace...")
plans_response = requests.get(
    f"{BASE_URL}/api/plans",
    headers={"Authorization": f"Bearer {jwt_token}"}
)

if plans_response.status_code == 200:
    plans = plans_response.json()
    print(f"✅ Found {len(plans)} available plans:")
    for plan in plans:
        print(f"   - {plan['name']}: ${plan['price']} for {plan['duration_minutes']} min")
    
    # User selects first plan
    selected_plan = plans[0]
    print(f"\n   User selects: {selected_plan['name']}")
else:
    print(f"❌ Failed to get plans: {plans_response.text}")
    exit(1)

# ============================================================
# STEP 3: User purchases the plan
# ============================================================

print("\n[STEP 3] User purchases the plan...")
purchase_response = requests.post(
    f"{BASE_URL}/api/rentals/purchase",
    json={
        "plan_id": selected_plan["id"],
        "payment_method_id": "pm_test_card_visa"  # Mock payment
    },
    headers={"Authorization": f"Bearer {jwt_token}"}
)

if purchase_response.status_code == 200:
    rental = purchase_response.json()
    virtual_key = rental["virtual_key"]
    print(f"✅ Purchase successful!")
    print(f"   Virtual Key: {virtual_key}")
    print(f"   Expires: {rental['expires_at']}")
    print(f"   Tokens: {rental['tokens_remaining']}")
else:
    print(f"❌ Purchase failed: {purchase_response.text}")
    exit(1)

# ============================================================
# STEP 4: User makes API calls with virtual key
# ============================================================

print("\n[STEP 4] User makes API calls with virtual key...")
print("\n" + "=" * 60)
print("THIS IS WHAT THE USER DOES IN THEIR CODE")
print("=" * 60)

# User's code (they copy this from documentation)
print("\n# User's Python code:")
print("""
from openai import OpenAI

client = OpenAI(
    api_key="{virtual_key}",
    base_url="http://localhost:8000/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{{"role": "user", "content": "Hello!"}}]
)
""".format(virtual_key=virtual_key))

# Actual API call (simulated - would work with real provider keys)
print("\n# Making the API call...")
api_response = requests.post(
    f"{BASE_URL}/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {virtual_key}",  # ← Virtual key, NOT real OpenAI key!
        "Content-Type": "application/json"
    },
    json={
        "model": "gpt-4o",
        "messages": [
            {"role": "user", "content": "Say 'Hello World' in exactly 2 words"}
        ],
        "max_tokens": 10
    }
)

print(f"   Response Status: {api_response.status_code}")

if api_response.status_code == 200:
    result = api_response.json()
    print(f"   ✅ API call successful!")
    print(f"   Response: {result.get('choices', [{}])[0].get('message', {}).get('content', 'N/A')}")
    print(f"   Tokens used: {result.get('usage', {}).get('total_tokens', 'N/A')}")
elif api_response.status_code == 503:
    print(f"   ⚠️  No provider API keys configured (expected in development)")
    print(f"   In production, this would return the AI response")
else:
    print(f"   ❌ API call failed: {api_response.text}")

# ============================================================
# STEP 5: User checks their usage
# ============================================================

print("\n[STEP 5] User checks their usage...")
rentals_response = requests.get(
    f"{BASE_URL}/api/rentals/active",
    headers={"Authorization": f"Bearer {jwt_token}"}
)

if rentals_response.status_code == 200:
    rentals = rentals_response.json()
    print(f"✅ Active rentals: {len(rentals)}")
    for rental in rentals:
        print(f"\n   Rental ID: {rental['id']}")
        print(f"   Virtual Key: {rental['virtual_key'][:20]}...")
        print(f"   Tokens Used: {rental['tokens_used']}")
        print(f"   Requests Made: {rental['requests_made']}")
        print(f"   Expires: {rental['expires_at']}")

# ============================================================
# SUMMARY
# ============================================================

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print("""
What the user did:
1. ✅ Logged in to your platform
2. ✅ Browsed available plans
3. ✅ Purchased a plan for $2.99
4. ✅ Received virtual key: {vkey}
5. ✅ Made API calls using the virtual key
6. ✅ Checked their usage

What the user NEVER saw:
❌ Your real OpenAI API key
❌ Your real Anthropic API key
❌ Your real Google API key

The virtual key acts as a proxy:
- User sends request with virtual key
- Your platform validates it
- Your platform forwards to OpenAI with YOUR real key
- OpenAI responds to your platform
- Your platform returns response to user
- Your platform tracks usage and deducts tokens

This is the core value proposition of your SaaS!
""".format(vkey=virtual_key[:30] + "..."))

print("=" * 60)
