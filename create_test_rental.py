"""Create a fresh test rental for API testing."""
import asyncio
import sys
sys.path.insert(0, '.')

from backend.database.connection import SessionLocal
from backend.database.models import Plan
from backend.database.redis_manager import init_redis, get_redis_manager
from backend.services.virtual_key_service import create_rental

async def create_test_rental():
    """Create a fresh rental for testing."""
    # Initialize Redis
    await init_redis()
    redis_mgr = get_redis_manager()
    
    # Get a plan
    db = SessionLocal()
    plan = db.query(Plan).filter(Plan.is_active == True).first()
    
    if not plan:
        print("❌ No active plans found")
        return
    
    print(f"📦 Creating rental for plan: {plan.name}")
    print(f"   Duration: {plan.duration_minutes} minutes")
    print(f"   Tokens: {plan.token_cap}")
    
    # Create rental (user_id = 1 for admin)
    rental = await create_rental(
        user_id=1,
        plan_id=plan.id,
        db=db,
        redis_manager=redis_mgr
    )
    
    print(f"\n✅ Rental created successfully!")
    print(f"   Rental ID: {rental.id}")
    print(f"   Virtual Key: {rental.virtual_key}")
    print(f"   Status: {rental.status}")
    print(f"   Expires: {rental.expires_at}")
    
    # Verify it's in Redis
    rental_data = await redis_mgr.get_virtual_key_data(rental.virtual_key)
    if rental_data:
        print(f"\n✅ Virtual key verified in Redis!")
        print(f"   Rental ID: {rental_data.get('rental_id')}")
        print(f"   Token Cap: {rental_data.get('token_cap')}")
    else:
        print(f"\n❌ ERROR: Virtual key not in Redis!")
    
    print(f"\n🚀 You can now test with this virtual key:")
    print(f"   {rental.virtual_key}")
    
    db.close()

if __name__ == "__main__":
    asyncio.run(create_test_rental())
