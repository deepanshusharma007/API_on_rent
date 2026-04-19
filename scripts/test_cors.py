"""Test CORS preflight and actual request."""
import requests

print("Testing CORS from frontend origin...")
print("=" * 60)

origin = "http://localhost:5173"
url = "http://localhost:8000/auth/login"

# Test 1: OPTIONS preflight
print("\n1. Testing OPTIONS (preflight)...")
try:
    response = requests.options(
        url,
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        }
    )
    print(f"   Status: {response.status_code}")
    print(f"   CORS Headers:")
    for key, value in response.headers.items():
        if 'access-control' in key.lower():
            print(f"      {key}: {value}")
except Exception as e:
    print(f"   ERROR: {e}")

# Test 2: Actual POST request
print("\n2. Testing POST (login)...")
try:
    response = requests.post(
        url,
        json={"email": "admin@apirental.com", "password": "admin123"},
        headers={"Origin": origin}
    )
    print(f"   Status: {response.status_code}")
    print(f"   CORS Headers:")
    for key, value in response.headers.items():
        if 'access-control' in key.lower():
            print(f"      {key}: {value}")
    
    if response.status_code == 200:
        print(f"\n   ✅ LOGIN SUCCESSFUL!")
        data = response.json()
        print(f"   Token: {data.get('access_token', 'N/A')[:50]}...")
    else:
        print(f"\n   ❌ LOGIN FAILED")
        print(f"   Response: {response.text}")
except Exception as e:
    print(f"   ERROR: {e}")

print("\n" + "=" * 60)
