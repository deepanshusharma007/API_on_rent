"""Output middleware: scrub PII from provider responses."""
import re
from backend.middleware.guardrails.base import GuardrailMiddleware, RequestContext, ResponseContext
from backend.config import settings

PII_PATTERNS = {
    "ssn":         (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),                      "[SSN REDACTED]"),
    "credit_card": (re.compile(r"\b(?:\d[ -]?){13,16}\b"),                     "[CARD REDACTED]"),
    "email":       (re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b"), "[EMAIL REDACTED]"),
    "phone":       (re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b"), "[PHONE REDACTED]"),
}


def _scrub(text: str) -> tuple[str, bool]:
    changed = False
    for pat, replacement in PII_PATTERNS.values():
        new_text = pat.sub(replacement, text)
        if new_text != text:
            changed = True
            text = new_text
    return text, changed


class PIIScrubberMiddleware(GuardrailMiddleware):
    name = "pii_scrubber"

    def __init__(self):
        self.enabled = getattr(settings, "GUARDRAIL_OUTPUT_SCRUB", False)

    async def process_input(self, ctx: RequestContext) -> RequestContext:
        return ctx

    async def process_output(self, ctx: ResponseContext) -> ResponseContext:
        if not self.enabled:
            return ctx
        try:
            # Works for both dict and LiteLLM ModelResponse
            resp = ctx.response
            if isinstance(resp, dict):
                for choice in resp.get("choices", []):
                    msg = choice.get("message", {})
                    if isinstance(msg.get("content"), str):
                        cleaned, changed = _scrub(msg["content"])
                        if changed:
                            msg["content"] = cleaned
                            ctx.pii_scrubbed = True
            else:
                for choice in getattr(resp, "choices", []):
                    msg = getattr(choice, "message", None)
                    if msg and isinstance(getattr(msg, "content", None), str):
                        cleaned, changed = _scrub(msg.content)
                        if changed:
                            msg.content = cleaned
                            ctx.pii_scrubbed = True
            ctx.guardrails_log.append({"middleware": self.name, "result": "scrubbed" if ctx.pii_scrubbed else "pass"})
        except Exception:
            ctx.guardrails_log.append({"middleware": self.name, "result": "error_skipped"})
        return ctx
