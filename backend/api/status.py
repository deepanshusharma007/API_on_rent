"""Public status and health check endpoints."""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health")
async def health_check():
    """Public health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "service": "AI API Rental SaaS"
    }


@router.get("/")
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


@router.get("/providers")
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
