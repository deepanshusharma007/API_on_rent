"""Purchase a rental through the backend API."""
import requests
import json

print("=" * 60)
print("PURCHASING RENTAL THROUGH API")
print("=" * 60)

# Purchase a rental
response = requests.post(
    "http://localhost:8000/api/rentals/purchase",
    json={
        "plan_id": 1,
        "payment_method_id": "pm_test_123"
    }
)

print(f"\nStatus Code: {response.status_code}")

if response.status_code == 201:
    print("✅ Rental created successfully!")
    rental = response.json()
    print(f"\nRental Details:")
    print(f"  ID: {rental['id']}")
    print(f"  Virtual Key: {rental['virtual_key']}")
    print(f"  Status: {rental['status']}")
    print(f"  Tokens Remaining: {rental['tokens_remaining']}")
    print(f"  Expires: {rental['expires_at']}")
    
    # Save the virtual key to a file for the test script
    with open('virtual_key.txt', 'w') as f:
        f.write(rental['virtual_key'])
    
    print(f"\n✅ Virtual key saved to virtual_key.txt")
    print(f"\nYou can now use this key for API calls!")
else:
    print(f"❌ Failed to create rental")
    print(f"Response: {response.text}")

print("=" * 60)
