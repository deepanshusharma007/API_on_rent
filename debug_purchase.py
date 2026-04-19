"""Test rental purchase with error handling."""
import requests

print("Testing rental purchase...")
try:
    response = requests.post(
        "http://localhost:8000/api/rentals/purchase",
        json={"plan_id": 1, "payment_method_id": "pm_test"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Text: {response.text}")
    
    if response.status_code == 201:
        print("SUCCESS!")
        print(response.json())
    else:
        print(f"ERROR: {response.text}")
        
except Exception as e:
    print(f"EXCEPTION: {e}")
    import traceback
    traceback.print_exc()
