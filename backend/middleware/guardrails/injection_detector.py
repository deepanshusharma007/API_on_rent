"""Middleware: detect prompt injection and jailbreak attempts."""
import re
from backend.middleware.guardrails.base import GuardrailMiddleware, RequestContext, BlockedResponse
from backend.config import settings

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?", re.I),
    re.compile(r"disregard\s+(all\s+)?(previous|prior|above)\s+instructions?", re.I),
    re.compile(r"forget\s+(all\s+)?(previous|prior|above)\s+instructions?", re.I),
    re.compile(r"(show|reveal|display|print|output)\s+(your|the)\s+system\s+prompt", re.I),
    re.compile(r"what\s+(is|are)\s+your\s+(initial|original|system)\s+(instructions?|prompt)", re.I),
    re.compile(r"\b(DAN|STAN|DUDE)\s+mode\b", re.I),
    re.compile(r"act\s+as\s+(if\s+)?you\s+(are|were)\s+(not\s+)?bound\s+by", re.I),
    re.compile(r"pretend\s+you\s+(are|have)\s+no\s+(rules|restrictions|limitations)", re.I),
    re.compile(r"roleplay\s+as\s+an?\s+unrestricted", re.I),
    re.compile(r"<\|im_start\|>|<\|im_end\|>"),
    re.compile(r"\[SYSTEM\]|\[/SYSTEM\]"),
    re.compile(r"repeat\s+after\s+me", re.I),
]


def _detect(text: str) -> tuple[bool, str | None]:
    for i, pat in enumerate(INJECTION_PATTERNS):
        if pat.search(text):
            return True, f"pattern_{i+1}"
    # Heuristic: excessive special chars
    ratio = sum(1 for c in text if not c.isalnum() and not c.isspace()) / max(len(text), 1)
    if ratio > 0.35:
        return True, "excessive_special_chars"
    if len(text) > 50000:
        return True, "prompt_too_long"
    return False, None


class InjectionDetectorMiddleware(GuardrailMiddleware):
    name = "injection_detector"

    def __init__(self):
        self.enabled = getattr(settings, "GUARDRAIL_INJECTION_BLOCK", True)

    async def process_input(self, ctx: RequestContext) -> RequestContext | BlockedResponse:
        if not self.enabled:
            return ctx

        for msg in ctx.messages:
            content = msg.get("content", "")
            if isinstance(content, str):
                detected, reason = _detect(content)
                if detected:
                    ctx.injection_detected = True
                    ctx.guardrails_log.append({
                        "middleware": self.name,
                        "result": "blocked",
                        "reason": reason,
                    })
                    return BlockedResponse(
                        status_code=400,
                        detail="Request blocked: potential prompt injection detected.",
                        middleware=self.name,
                    )

        ctx.guardrails_log.append({"middleware": self.name, "result": "pass"})
        return ctx
