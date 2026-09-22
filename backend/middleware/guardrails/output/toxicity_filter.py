"""Output middleware: flag toxic/harmful content in responses (log-only by default)."""
import re
import logging
from backend.middleware.guardrails.base import GuardrailMiddleware, RequestContext, ResponseContext
from backend.config import settings

logger = logging.getLogger(__name__)

TOXIC_PATTERNS = [
    re.compile(r"\b(kill|murder|rape|torture)\s+(yourself|himself|herself|themselves)\b", re.I),
    re.compile(r"\b(bomb|explosive|weapon)\s+(instructions?|how.to|recipe|make)\b", re.I),
    re.compile(r"\b(child|minor|underage).{0,20}(sex|nude|explicit)\b", re.I),
]


def _is_toxic(text: str) -> bool:
    return any(p.search(text) for p in TOXIC_PATTERNS)


class ToxicityFilterMiddleware(GuardrailMiddleware):
    name = "toxicity_filter"

    def __init__(self):
        self.enabled = getattr(settings, "GUARDRAIL_TOXICITY_LOG", True)
        self.block = getattr(settings, "GUARDRAIL_TOXICITY_BLOCK", False)  # log-only by default

    async def process_input(self, ctx: RequestContext) -> RequestContext:
        return ctx

    async def process_output(self, ctx: ResponseContext) -> ResponseContext:
        if not self.enabled:
            return ctx
        try:
            resp = ctx.response
            content = ""
            if isinstance(resp, dict):
                content = resp.get("choices", [{}])[0].get("message", {}).get("content", "")
            else:
                choices = getattr(resp, "choices", [])
                if choices:
                    content = getattr(getattr(choices[0], "message", None), "content", "") or ""

            if _is_toxic(content):
                ctx.toxicity_flagged = True
                logger.warning(f"[ToxicityFilter] Flagged response for rental_id={ctx.rental_id} model={ctx.model}")
                ctx.guardrails_log.append({"middleware": self.name, "result": "flagged"})
                if self.block:
                    from fastapi import HTTPException
                    raise HTTPException(status_code=400, detail="Response blocked: potentially harmful content detected.")
            else:
                ctx.guardrails_log.append({"middleware": self.name, "result": "pass"})
        except Exception as e:
            if "Response blocked" in str(e):
                raise
            ctx.guardrails_log.append({"middleware": self.name, "result": "error_skipped"})
        return ctx
