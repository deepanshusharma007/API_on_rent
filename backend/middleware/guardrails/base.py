"""Base classes for the guardrail middleware pipeline."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


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
    drain_rate: float = 1.0   # tokens_remaining is in credits (tokens * drain rate)
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


# ---- Message content helpers -------------------------------------------------
# OpenAI `content` is a string, a list of parts ({"type": "text", "text": ...}, images, ...)
# or null (assistant tool-call messages). Guardrails must handle all three.

def message_text(msg) -> str:
    """All text in one message, whatever shape its content has."""
    content = msg.get("content") if isinstance(msg, dict) else None
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            part["text"] for part in content
            if isinstance(part, dict) and isinstance(part.get("text"), str)
        )
    return ""


def map_message_text(msg, fn) -> None:
    """Apply fn to every text segment of a message, in place."""
    if not isinstance(msg, dict):
        return
    content = msg.get("content")
    if isinstance(content, str):
        msg["content"] = fn(content)
    elif isinstance(content, list):
        for part in content:
            if isinstance(part, dict) and isinstance(part.get("text"), str):
                part["text"] = fn(part["text"])
