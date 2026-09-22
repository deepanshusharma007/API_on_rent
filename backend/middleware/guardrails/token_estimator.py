"""Middleware: estimate tokens and block if rental cap would be exceeded."""
from backend.middleware.guardrails.base import GuardrailMiddleware, RequestContext, BlockedResponse
from backend.config import settings


class TokenEstimatorMiddleware(GuardrailMiddleware):
    name = "token_estimator"

    def __init__(self):
        self.enabled = getattr(settings, "GUARDRAIL_TOKEN_ESTIMATOR", True)

    async def process_input(self, ctx: RequestContext) -> RequestContext | BlockedResponse:
        if not self.enabled:
            return ctx

        # Rough estimate: 4 chars ≈ 1 token for all messages + 500 token buffer for response
        total_chars = sum(len(m.get("content", "")) for m in ctx.messages)
        estimated = (total_chars // 4) + 500
        ctx.estimated_tokens = estimated

        if estimated > ctx.tokens_remaining:
            return BlockedResponse(
                status_code=402,
                detail=f"Insufficient token balance. Estimated: ~{estimated}, Available: {ctx.tokens_remaining}",
                middleware=self.name,
            )

        ctx.guardrails_log.append({"middleware": self.name, "result": "pass", "estimated_tokens": estimated})
        return ctx
