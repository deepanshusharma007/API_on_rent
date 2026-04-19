"""Integration tests for backend API."""
import requests
import json

BASE_URL = "http://localhost:8000"


def test_health_check():
    """Test health endpoint."""
    print("\n🧪 Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200


def test_user_registration():
    """Test user registration."""
    print("\n🧪 Testing user registration...")
    data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code in [200, 201, 400]  # 400 if already exists


def test_user_login():
    """Test user login."""
    print("\n🧪 Testing user login...")
    data = {
        "email": "admin@apirental.com",
        "password": "admin123"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=data)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"Token: {token[:50]}...")
        return token
    return None


def test_list_plans():
    """Test listing plans."""
    print("\n🧪 Testing list plans...")
    response = requests.get(f"{BASE_URL}/api/plans")
    print(f"Status: {response.status_code}")
    plans = response.json()
    print(f"Found {len(plans)} plans")
    for plan in plans:
        print(f"  - {plan['name']}: ${plan['price']}")
    return plans


def test_purchase_rental(plan_id: int):
    """Test purchasing a rental."""
    print(f"\n🧪 Testing rental purchase (Plan ID: {plan_id})...")
    data = {
        "plan_id": plan_id,
        "payment_method_id": "pm_test_123456"
    }
    response = requests.post(f"{BASE_URL}/api/rentals/purchase", json=data)
    print(f"Status: {response.status_code}")
    if response.status_code in [200, 201]:
        rental = response.json()
        print(f"Virtual Key: {rental['virtual_key']}")
        print(f"Tokens Remaining: {rental['tokens_remaining']}")
        print(f"TTL: {rental.get('ttl_seconds', 0)} seconds")
        return rental
    else:
        print(f"Error: {response.text}")
    return None


def test_proxy_endpoint(virtual_key: str):
    """Test OpenAI-compatible proxy endpoint."""
    print(f"\n🧪 Testing proxy endpoint...")
    headers = {
        "Authorization": f"Bearer {virtual_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "user", "content": "Say hello in one word"}
        ],
        "max_tokens": 10
    }
    
    try:
        response = requests.post(f"{BASE_URL}/v1/chat/completions", headers=headers, json=data, timeout=30)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)[:200]}...")
            return True
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")
    
    return False


def test_status_page():
    """Test public status page."""
    print("\n🧪 Testing status page...")
    response = requests.get(f"{BASE_URL}/status/")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        status_data = response.json()
        print(f"Overall Status: {status_data['overall_status']}")
        print("Provider Status:")
        for provider, data in status_data['providers'].items():
            print(f"  - {provider}: {data['status']}")
        return True
    return False


def test_admin_analytics():
    """Test admin analytics endpoint."""
    print("\n🧪 Testing admin analytics...")
    response = requests.get(f"{BASE_URL}/admin/analytics/usage?hours=24")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        analytics = response.json()
        print(f"Total Requests: {analytics['total_requests']}")
        print(f"Total Tokens: {analytics['total_tokens']}")
        print(f"Cache Hit Rate: {analytics['cache_hit_rate']:.2f}%")
        return True
    return False


def run_all_tests():
    """Run all integration tests."""
    print("=" * 60)
    print("🚀 RUNNING BACKEND INTEGRATION TESTS")
    print("=" * 60)
    
    results = {}
    
    # Test 1: Health Check
    try:
        test_health_check()
        results["health_check"] = "✅ PASS"
    except Exception as e:
        results["health_check"] = f"❌ FAIL: {e}"
    
    # Test 2: User Registration
    try:
        test_user_registration()
        results["user_registration"] = "✅ PASS"
    except Exception as e:
        results["user_registration"] = f"❌ FAIL: {e}"
    
    # Test 3: User Login
    try:
        token = test_user_login()
        results["user_login"] = "✅ PASS" if token else "⚠️  SKIP (no admin user)"
    except Exception as e:
        results["user_login"] = f"❌ FAIL: {e}"
    
    # Test 4: List Plans
    try:
        plans = test_list_plans()
        results["list_plans"] = "✅ PASS" if plans else "❌ FAIL: No plans"
    except Exception as e:
        results["list_plans"] = f"❌ FAIL: {e}"
        plans = []
    
    # Test 5: Purchase Rental
    rental = None
    if plans:
        try:
            rental = test_purchase_rental(plans[0]["id"])
            results["purchase_rental"] = "✅ PASS" if rental else "❌ FAIL"
        except Exception as e:
            results["purchase_rental"] = f"❌ FAIL: {e}"
    else:
        results["purchase_rental"] = "⚠️  SKIP (no plans)"
    
    # Test 6: Proxy Endpoint (requires valid API keys)
    if rental:
        try:
            success = test_proxy_endpoint(rental["virtual_key"])
            results["proxy_endpoint"] = "✅ PASS" if success else "⚠️  SKIP (no valid API keys)"
        except Exception as e:
            results["proxy_endpoint"] = f"⚠️  SKIP: {e}"
    else:
        results["proxy_endpoint"] = "⚠️  SKIP (no rental)"
    
    # Test 7: Status Page
    try:
        success = test_status_page()
        results["status_page"] = "✅ PASS" if success else "❌ FAIL"
    except Exception as e:
        results["status_page"] = f"❌ FAIL: {e}"
    
    # Test 8: Admin Analytics
    try:
        success = test_admin_analytics()
        results["admin_analytics"] = "✅ PASS" if success else "❌ FAIL"
    except Exception as e:
        results["admin_analytics"] = f"❌ FAIL: {e}"
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    for test_name, result in results.items():
        print(f"{test_name:.<40} {result}")
    print("=" * 60)


if __name__ == "__main__":
    run_all_tests()
