"""Middleware: detect and optionally redact PII in request messages."""
import re
from backend.middleware.guardrails.base import GuardrailMiddleware, RequestContext, BlockedResponse
from backend.config import settings

PII_PATTERNS = {
    "ssn":         re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "credit_card": re.compile(r"\b(?:\d[ -]?){13,16}\b"),
    "email":       re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b"),
    "phone":       re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b"),
    "ip_address":  re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
}

REDACT_MAP = {
    "ssn":         "[SSN REDACTED]",
    "credit_card": "[CARD REDACTED]",
    "email":       "[EMAIL REDACTED]",
    "phone":       "[PHONE REDACTED]",
    "ip_address":  "[IP REDACTED]",
}


def _scan_text(text: str) -> list[str]:
    return [k for k, pat in PII_PATTERNS.items() if pat.search(text)]


def _redact_text(text: str) -> str:
    for key, pat in PII_PATTERNS.items():
        text = pat.sub(REDACT_MAP[key], text)
    return text


class PIIDetectorMiddleware(GuardrailMiddleware):
    name = "pii_detector"

    def __init__(self):
        self.enabled = getattr(settings, "GUARDRAIL_PII_BLOCK", True)
        self.redact = getattr(settings, "GUARDRAIL_PII_REDACT", True)   # redact instead of block

    async def process_input(self, ctx: RequestContext) -> RequestContext | BlockedResponse:
        if not self.enabled:
            return ctx

        detected_types = []
        for msg in ctx.messages:
            content = msg.get("content", "")
            if isinstance(content, str):
                found = _scan_text(content)
                detected_types.extend(found)

        if detected_types:
            ctx.pii_detected = True
            if self.redact:
                for msg in ctx.messages:
                    if isinstance(msg.get("content"), str):
                        msg["content"] = _redact_text(msg["content"])
                ctx.pii_redacted = True
                ctx.guardrails_log.append({
                    "middleware": self.name,
                    "result": "redacted",
                    "types": list(set(detected_types)),
                })
            else:
                return BlockedResponse(
                    status_code=400,
                    detail=f"Request blocked: PII detected ({', '.join(set(detected_types))}). Please remove sensitive data.",
                    middleware=self.name,
                )
        else:
            ctx.guardrails_log.append({"middleware": self.name, "result": "pass"})

        return ctx
