"""Request/response logging middleware for observability."""
import time
import logging
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("api.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs every request with method, path, status, and latency."""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()

        # Extract useful info
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")[:80]

        # Add request ID to state for downstream use
        request.state.request_id = request_id

        try:
            response: Response = await call_next(request)

            duration_ms = (time.time() - start_time) * 1000
            status_code = response.status_code

            # Determine log level based on status
            if status_code >= 500:
                log_fn = logger.error
            elif status_code >= 400:
                log_fn = logger.warning
            else:
                log_fn = logger.info

            log_fn(
                f"[{request_id}] {method} {path} -> {status_code} "
                f"({duration_ms:.0f}ms) client={client_ip}"
            )

            # Add headers for tracing
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{duration_ms:.0f}ms"

            return response

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"[{request_id}] {method} {path} -> EXCEPTION "
                f"({duration_ms:.0f}ms) {type(e).__name__}: {e}"
            )
            raise
