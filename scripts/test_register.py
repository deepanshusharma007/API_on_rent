"""Test registration endpoint."""
import requests
import json

url = "http://localhost:8000/auth/register"
data = {"email": "testuser@example.com", "password": "testpass123"}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    if response.status_code == 201:
        print("✅ Registration successful!")
        print(json.dumps(response.json(), indent=2))
    else:
        print("❌ Registration failed!")
except Exception as e:
    print(f"Error: {e}")
