"""Check if virtual key exists in Redis."""
import asyncio
import sys
sys.path.insert(0, '.')

from backend.database.redis_manager import init_redis, get_redis_manager

async def check_key():
    await init_redis()
    mgr = get_redis_manager()
    
    key = 'vk_pgIMEaVb4gIez8EbfzhkkgfWG6ID01xy'
    data = await mgr.get_virtual_key_data(key)
    
    print(f"Checking key: {key}")
    if data:
        print(f"✅ FOUND in Redis:")
        print(f"   {data}")
    else:
        print(f"❌ NOT FOUND in Redis")

asyncio.run(check_key())
