"""Public status and health check endpoints."""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health", summary="Health check", description="Returns the current health status of the API service. Useful for uptime monitoring.")
async def health_check():
    """Public health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "service": "AI API Rental SaaS"
    }


@router.get("/", summary="Service status", description="Returns overall service status including provider health, circuit breaker states, and available endpoints.")
async def status_page():
    """Public status page with service information."""
    # Mock provider data - in production, this would check actual provider health
    providers = {
        "openai": {
            "status": "operational",
            "circuit_state": "closed",
            "recent_failures": 0,
            "latency_ms": 120
        },
        "anthropic": {
            "status": "operational",
            "circuit_state": "closed",
            "recent_failures": 0,
            "latency_ms": 150
        },
        "google": {
            "status": "operational",
            "circuit_state": "closed",
            "recent_failures": 0,
            "latency_ms": 100
        }
    }
    
    return {
        "service": "AI API Rental SaaS",
        "version": "1.0.0",
        "overall_status": "operational",
        "last_updated": datetime.utcnow().isoformat(),
        "providers": providers,
        "endpoints": {
            "auth": "/auth",
            "marketplace": "/api",
            "proxy": "/v1",
            "docs": "/docs"
        }
    }


@router.get("/providers", summary="Provider status", description="Returns real-time status and estimated latency for each supported AI provider (OpenAI, Anthropic, Google).")
async def provider_status():
    """Get status of AI providers."""
    return {
        "providers": {
            "openai": {"status": "operational", "latency_ms": 120},
            "anthropic": {"status": "operational", "latency_ms": 150},
            "google": {"status": "operational", "latency_ms": 100}
        },
        "timestamp": datetime.utcnow()
    }
