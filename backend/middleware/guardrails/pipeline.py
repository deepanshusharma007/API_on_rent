"""Guardrail pipeline — runs all input and output middleware in order."""
from backend.middleware.guardrails.base import RequestContext, ResponseContext, BlockedResponse
from backend.middleware.guardrails.token_estimator import TokenEstimatorMiddleware
from backend.middleware.guardrails.pii_detector import PIIDetectorMiddleware
from backend.middleware.guardrails.injection_detector import InjectionDetectorMiddleware
from backend.middleware.guardrails.content_moderator import ContentModeratorMiddleware
from backend.middleware.guardrails.output.pii_scrubber import PIIScrubberMiddleware
from backend.middleware.guardrails.output.toxicity_filter import ToxicityFilterMiddleware

# Input pipeline — order matters
INPUT_PIPELINE = [
    TokenEstimatorMiddleware(),
    PIIDetectorMiddleware(),
    InjectionDetectorMiddleware(),
    ContentModeratorMiddleware(),
]

# Output pipeline
OUTPUT_PIPELINE = [
    PIIScrubberMiddleware(),
    ToxicityFilterMiddleware(),
]


async def run_input_pipeline(ctx: RequestContext) -> RequestContext | BlockedResponse:
    """Run all input middleware. Returns BlockedResponse on first block."""
    for mw in INPUT_PIPELINE:
        result = await mw.process_input(ctx)
        if isinstance(result, BlockedResponse):
            return result
        ctx = result
    return ctx


async def run_output_pipeline(ctx: ResponseContext) -> ResponseContext:
    """Run all output middleware. Non-blocking unless toxicity block enabled."""
    for mw in OUTPUT_PIPELINE:
        ctx = await mw.process_output(ctx)
    return ctx
