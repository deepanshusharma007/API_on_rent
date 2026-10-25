"""Middleware: detect and optionally redact PII in request messages."""
import re
from backend.middleware.guardrails.base import GuardrailMiddleware, RequestContext, BlockedResponse, message_text, map_message_text
from backend.config import settings

PII_PATTERNS = {
    "ssn":         re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "credit_card": re.compile(r"\b(?:\d[ -]?){13,19}\b"),
    "email":       re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b"),
    "phone":       re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b"),
    "ip_address":  re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b"),
}

REDACT_MAP = {
    "ssn":         "[SSN REDACTED]",
    "credit_card": "[CARD REDACTED]",
    "email":       "[EMAIL REDACTED]",
    "phone":       "[PHONE REDACTED]",
    "ip_address":  "[IP REDACTED]",
}


def _luhn_ok(candidate: str) -> bool:
    """Card numbers pass the Luhn check; timestamps and IDs of the same length mostly don't."""
    digits = [int(c) for c in candidate if c.isdigit()]
    if not 13 <= len(digits) <= 19:
        return False
    total = 0
    for i, d in enumerate(reversed(digits)):
        if i % 2:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def _matches(key: str, pat: re.Pattern, text: str) -> bool:
    if key == "credit_card":
        return any(_luhn_ok(m.group()) for m in pat.finditer(text))
    return bool(pat.search(text))


def _scan_text(text: str) -> list[str]:
    return [k for k, pat in PII_PATTERNS.items() if _matches(k, pat, text)]


def _redact_text(text: str) -> str:
    for key, pat in PII_PATTERNS.items():
        if key == "credit_card":
            text = pat.sub(lambda m: REDACT_MAP[key] if _luhn_ok(m.group()) else m.group(), text)
        else:
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
            detected_types.extend(_scan_text(message_text(msg)))

        if detected_types:
            ctx.pii_detected = True
            if self.redact:
                for msg in ctx.messages:
                    map_message_text(msg, _redact_text)
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
