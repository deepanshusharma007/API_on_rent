"""Semantic caching service with hash-based exact match and vector similarity."""
import hashlib
import json
import math
import logging
from typing import Optional, Dict, Any, List
from backend.database.redis_manager import RedisManager

logger = logging.getLogger(__name__)


def simple_embedding(text: str, dim: int = 64) -> List[float]:
    """Generate a simple deterministic embedding from text using character-level hashing.
    
    This is a lightweight alternative to calling an external embedding API.
    For production, replace with OpenAI/Gemini embeddings for better semantic matching.
    """
    text = text.lower().strip()
    vec = [0.0] * dim

    # Character n-gram approach
    for i, char in enumerate(text):
        idx = ord(char) % dim
        vec[idx] += 1.0 / (1 + i * 0.01)

    # Word-level features
    words = text.split()
    for i, word in enumerate(words):
        h = int(hashlib.md5(word.encode()).hexdigest(), 16)
        idx = h % dim
        vec[idx] += 2.0 / (1 + i * 0.05)

    # Normalize to unit vector
    magnitude = math.sqrt(sum(v * v for v in vec))
    if magnitude > 0:
        vec = [v / magnitude for v in vec]

    return vec


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


class SemanticCache:
    """Cache AI responses with exact hash match + vector similarity fallback."""
    
    def __init__(self, redis_manager: RedisManager, similarity_threshold: float = 0.95):
        self.redis = redis_manager
        self.cache_ttl = 300  # 5 minutes default TTL
        self.similarity_threshold = similarity_threshold
    
    def _hash_prompt(self, prompt: str, model: str) -> str:
        """Generate hash for prompt + model combination."""
        content = f"{model}:{prompt}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    async def get_cached_response(self, prompt: str, model: str) -> Optional[Dict[str, Any]]:
        """
        Get cached response — tries exact match first, then similarity search.
        """
        # 1. Exact hash match
        prompt_hash = self._hash_prompt(prompt, model)
        exact = await self.redis.get_cached_response(prompt_hash)
        if exact:
            logger.debug(f"Cache HIT (exact): {prompt_hash[:12]}")
            return exact
        
        # 2. Vector similarity search
        try:
            prompt_embedding = simple_embedding(prompt)
            
            # Get all stored embeddings for this model
            embedding_key = f"embeddings:{model}"
            stored = await self.redis.redis.hgetall(embedding_key)
            
            best_score = 0.0
            best_hash = None
            
            for stored_hash, stored_data in stored.items():
                stored_vec = json.loads(stored_data)
                score = cosine_similarity(prompt_embedding, stored_vec)
                
                if score > best_score:
                    best_score = score
                    best_hash = stored_hash
            
            if best_score >= self.similarity_threshold and best_hash:
                cached = await self.redis.get_cached_response(best_hash)
                if cached:
                    logger.info(
                        f"Cache HIT (similarity={best_score:.3f}): "
                        f"{best_hash[:12]} for prompt '{prompt[:40]}...'"
                    )
                    return cached
                    
        except Exception as e:
            logger.debug(f"Similarity search failed (non-fatal): {e}")
        
        return None
    
    async def cache_response(self, prompt: str, model: str, response: Dict[str, Any], ttl: Optional[int] = None):
        """Cache AI response with both hash and embedding."""
        prompt_hash = self._hash_prompt(prompt, model)
        cache_ttl = ttl or self.cache_ttl
        
        # Store the response by hash
        await self.redis.set_cached_response(prompt_hash, response, cache_ttl)
        
        # Store the embedding for similarity search
        try:
            embedding = simple_embedding(prompt)
            embedding_key = f"embeddings:{model}"
            await self.redis.redis.hset(embedding_key, prompt_hash, json.dumps(embedding))
            # Set TTL on the embeddings hash (refresh on each write)
            await self.redis.redis.expire(embedding_key, cache_ttl * 2)
        except Exception as e:
            logger.debug(f"Embedding store failed (non-fatal): {e}")
    
    async def invalidate_cache(self, prompt: str, model: str):
        """Invalidate cached response for specific prompt."""
        prompt_hash = self._hash_prompt(prompt, model)
        await self.redis.redis.delete(f"cache:{prompt_hash}")
        
        # Remove embedding
        try:
            embedding_key = f"embeddings:{model}"
            await self.redis.redis.hdel(embedding_key, prompt_hash)
        except Exception:
            pass
    
    async def clear_all_cache(self):
        """Clear all cached responses and embeddings."""
        try:
            # Scan for cache keys
            cursor = 0
            while True:
                cursor, keys = await self.redis.redis.scan(cursor, match="cache:*", count=100)
                if keys:
                    await self.redis.redis.delete(*keys)
                if cursor == 0:
                    break
            
            # Clear embedding hashes
            cursor = 0
            while True:
                cursor, keys = await self.redis.redis.scan(cursor, match="embeddings:*", count=100)
                if keys:
                    await self.redis.redis.delete(*keys)
                if cursor == 0:
                    break
                    
        except Exception as e:
            logger.warning(f"Cache clear failed: {e}")
