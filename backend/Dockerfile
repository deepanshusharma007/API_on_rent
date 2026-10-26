# Build from the repository root: docker build -f backend/Dockerfile .
# (the code imports itself as the `backend` package, so it is copied as /app/backend)
FROM python:3.11-slim

WORKDIR /app

# Build tools for any dependency without a wheel
RUN apt-get update && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

# Dependencies first, so code changes don't reinstall them
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend backend

# Don't run as root
RUN useradd --create-home --uid 10001 app && chown -R app:app /app
USER app

EXPOSE 8000

# --proxy-headers: behind a load balancer the client IP (used for rate limiting and key
# IP-pinning) is in X-Forwarded-For. Only run this behind a proxy you control.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
