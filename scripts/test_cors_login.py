"""Test CORS and login from frontend perspective."""
import requests

print("=" * 60)
print("CORS AND LOGIN TEST")
print("=" * 60)

# Test with CORS headers (simulating browser request)
print("\n1. Testing login with CORS headers...")
url = "http://localhost:8000/auth/login"
headers = {
    "Content-Type": "application/json",
    "Origin": "http://localhost:5175",  # Frontend origin
    "Access-Control-Request-Method": "POST",
}
data = {"email": "admin@apirental.com", "password": "admin123"}

try:
    # Preflight request (OPTIONS)
    print("\n   a) Testing OPTIONS (preflight)...")
    options_response = requests.options(url, headers=headers)
    print(f"      Status: {options_response.status_code}")
    print(f"      CORS Headers:")
    for header, value in options_response.headers.items():
        if 'access-control' in header.lower():
            print(f"        {header}: {value}")
    
    # Actual POST request
    print("\n   b) Testing POST (actual login)...")
    post_response = requests.post(url, json=data, headers={"Origin": "http://localhost:5175"})
    print(f"      Status: {post_response.status_code}")
    print(f"      CORS Headers:")
    for header, value in post_response.headers.items():
        if 'access-control' in header.lower():
            print(f"        {header}: {value}")
    
    if post_response.status_code == 200:
        print(f"\n   ✅ LOGIN SUCCESSFUL!")
        token_data = post_response.json()
        print(f"      Token: {token_data.get('access_token', 'N/A')[:50]}...")
    else:
        print(f"\n   ❌ LOGIN FAILED!")
        print(f"      Response: {post_response.text}")
        
except Exception as e:
    print(f"   ERROR: {e}")

print("\n" + "=" * 60)
