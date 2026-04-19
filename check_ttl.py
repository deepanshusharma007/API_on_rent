"""Check active rentals response for ttl_seconds."""
import requests
import time
import sys
from datetime import datetime

print("=" * 60)
print("CHECKING ACTIVE RENTALS RESPONSE")
print("=" * 60)
sys.stdout.flush()

# Get active rentals
print("\nGetting active rentals...")
sys.stdout.flush()

try:
    response = requests.get("http://localhost:8000/api/rentals/active")
    if response.status_code == 200:
        rentals = response.json()
        print(f"Found {len(rentals)} active rentals")
        sys.stdout.flush()
        
        for r in rentals:
            print(f"\nRental ID: {r['id']}")
            print(f"Status: {r['status']}")
            print(f"Expires: {r['expires_at']}")
            
            # Check for ttl_seconds
            if 'ttl_seconds' in r:
                ttl = r['ttl_seconds']
                print(f"ttl_seconds: {ttl}")
                
                if ttl > 0:
                    minutes = ttl / 60
                    print(f"   Time remaining: {minutes:.1f} minutes")
                else:
                    print(f"   Expired (ttl=0)")
            else:
                print(f"ttl_seconds MISSING")
            sys.stdout.flush()
                
    else:
        print(f"ERROR: {response.status_code}")
        print(response.text)
        sys.stdout.flush()
        
except Exception as e:
    print(f"EXCEPTION: {e}")
    sys.stdout.flush()

print("\n" + "=" * 60)
sys.stdout.flush()
