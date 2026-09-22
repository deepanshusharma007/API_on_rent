"""Base classes for the guardrail middleware pipeline."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Any


@dataclass
class RequestContext:
    """Carries the request through the input middleware chain."""
    messages: list
    model: str
    rental_id: int
    user_id: int
    tokens_remaining: int
    body: dict
    # Annotations set by middleware
    estimated_tokens: int = 0
    pii_detected: bool = False
    pii_redacted: bool = False
    injection_detected: bool = False
    ai_scan_triggered: bool = False
    guardrails_log: list = field(default_factory=list)


@dataclass
class ResponseContext:
    """Carries the response through the output middleware chain."""
    response: Any           # LiteLLM response object or dict
    model: str
    rental_id: int
    was_cached: bool = False
    # Annotations
    pii_scrubbed: bool = False
    toxicity_flagged: bool = False
    guardrails_log: list = field(default_factory=list)


@dataclass
class BlockedResponse:
    """Returned by a middleware to abort the request."""
    status_code: int
    detail: str
    middleware: str


class GuardrailMiddleware(ABC):
    """Base class for all guardrail middleware."""

    name: str = "base"
    enabled: bool = True

    @abstractmethod
    async def process_input(self, ctx: RequestContext) -> RequestContext | BlockedResponse:
        """Process the request before it reaches the provider."""
        ...

    async def process_output(self, ctx: ResponseContext) -> ResponseContext:
        """Process the response after it returns from the provider. Override if needed."""
        return ctx
