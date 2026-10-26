"""Pytest test suite for AI API Rental SaaS backend."""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta

# ==================== Unit Tests: Auth ====================

class TestAuthUtils:
    def test_password_hashing(self):
        from backend.services.auth_utils import hash_password, verify_password
        hashed = hash_password("testpassword123")
        assert verify_password("testpassword123", hashed)
        assert not verify_password("wrongpassword", hashed)

    def test_jwt_token(self):
        from backend.services.auth_utils import create_access_token, decode_access_token
        token, _ = create_access_token({"sub": "1", "email": "test@test.com", "role": "user"})
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "1"
        assert payload["email"] == "test@test.com"

    def test_expired_jwt(self):
        from backend.services.auth_utils import create_access_token, decode_access_token
        token, _ = create_access_token(
            {"sub": "1"},
            expires_delta=timedelta(seconds=-1)
        )
        assert decode_access_token(token) is None

    def test_invalid_jwt(self):
        from backend.services.auth_utils import decode_access_token
        assert decode_access_token("invalid.token.here") is None


# ==================== Unit Tests: Drain Rate ====================

class TestDrainRate:
    def test_known_models(self):
        from backend.services.drain_rate import get_drain_rate
        assert get_drain_rate("gpt-4o") == 10.0
        assert get_drain_rate("gpt-4o-mini") == 3.0
        assert get_drain_rate("gemini-1.5-flash") == 1.0
        assert get_drain_rate("claude-3-5-sonnet-20241022") == 8.0
        assert get_drain_rate("claude-sonnet-5-5") == 8.0
        assert get_drain_rate("claude-haiku-5-5") == 5.0
        assert get_drain_rate("claude-opus-4-8") == 10.0

    def test_unknown_model(self):
        from backend.services.drain_rate import get_drain_rate
        assert get_drain_rate("unknown-model-xyz") == 5.0

    def test_partial_match(self):
        from backend.services.drain_rate import get_drain_rate
        # "gpt-4o-2024-05-13" should match "gpt-4o"
        assert get_drain_rate("gpt-4o-2024-05-13") == 10.0


# ==================== Unit Tests: Cost Estimator ====================

class TestCostEstimator:
    def test_known_model_pricing(self):
        from backend.services.cost_estimator import CostEstimator
        estimator = CostEstimator()
        cost = estimator.estimate_cost("gpt-4o", 1000, 500)
        assert cost > 0


# ==================== Unit Tests: Virtual Key Generation ====================

class TestVirtualKey:
    def test_key_format(self):
        from backend.services.virtual_key_service import generate_virtual_key
        key = generate_virtual_key()
        assert key.startswith("vk_")
        assert len(key) == 35  # "vk_" + 32 chars

    def test_key_uniqueness(self):
        from backend.services.virtual_key_service import generate_virtual_key
        keys = [generate_virtual_key() for _ in range(100)]
        assert len(set(keys)) == 100  # All unique


# ==================== Unit Tests: Capacity Manager ====================

class TestCapacityManager:
    @pytest.fixture
    def mock_redis(self):
        redis = AsyncMock()
        redis.get = AsyncMock(return_value=None)
        redis.set = AsyncMock()
        redis.incrby = AsyncMock()
        redis.decrby = AsyncMock()
        redis.incrbyfloat = AsyncMock()
        manager = MagicMock()
        manager.redis = redis
        return manager

    @pytest.mark.asyncio
    async def test_can_sell_when_capacity_available(self, mock_redis):
        from backend.services.capacity_manager import CapacityManager
        cm = CapacityManager(mock_redis)
        result = await cm.can_sell_plan(10000, 10, 5.0)
        assert result["allowed"]

    @pytest.mark.asyncio
    async def test_reserve_capacity(self, mock_redis):
        from backend.services.capacity_manager import CapacityManager
        cm = CapacityManager(mock_redis)
        await cm.reserve_capacity(10000, 10)
        mock_redis.redis.incrby.assert_any_call("capacity:tokens:reserved", 10000)
        mock_redis.redis.incrby.assert_any_call("capacity:rpm:reserved", 10)
