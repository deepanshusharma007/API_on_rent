"""Check rental expiration times."""
import requests
from datetime import datetime

# Purchase a new rental
print("Purchasing new rental...")
rental = requests.post(
    "http://localhost:8000/api/rentals/purchase",
    json={"plan_id": 1, "payment_method_id": "pm_test"}
).json()

print(f"\nRental ID: {rental['id']}")
print(f"Created at: {rental['started_at']}")
print(f"Expires at: {rental['expires_at']}")

# Calculate time remaining
from dateutil import parser
expires_at = parser.parse(rental['expires_at'])
now = datetime.utcnow()

# Make timezone-aware if needed
if expires_at.tzinfo is not None:
    from datetime import timezone
    now = datetime.now(timezone.utc)

time_remaining = expires_at - now
print(f"\nCurrent time: {now}")
print(f"Time remaining: {time_remaining}")
print(f"Seconds remaining: {time_remaining.total_seconds()}")

if time_remaining.total_seconds() > 0:
    print("\n✅ Rental is ACTIVE")
else:
    print("\n❌ Rental is EXPIRED")
