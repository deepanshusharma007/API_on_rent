# System Architecture

## High-Level Overview

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite)"]
        MP["Marketplace Page"]
        DASH["Dashboard"]
        PG["API Playground"]
        AP["Admin Panel"]
        LOGIN["Login/Register"]
    end

    subgraph Backend["Backend (FastAPI)"]
        AUTH["Auth API<br/>/auth/*"]
        MARKET["Marketplace API<br/>/api/*"]
        PAYMENT["Payment API<br/>/api/checkout/*"]
        ADMIN["Admin API<br/>/admin/*"]
        PROXY["Proxy API<br/>/v1/*"]
        STATUS["Status API<br/>/status/*"]
    end

    subgraph Middleware["Middleware Layer"]
        LOG["Request Logger"]
        CORS["CORS"]
    end

    subgraph Services["Core Services"]
        VKS["Virtual Key Service"]
        CAP["Capacity Manager"]
        KR["Key Rotation"]
        CB["Circuit Breaker"]
        FC["Fallback Chain"]
        SC["Semantic Cache"]
        DR["Drain Rate"]
        CE["Cost Estimator"]
        PF["Prompt Filter"]
        PII["PII Masker"]
    end

    subgraph Workers["Background Workers"]
        EM["Expiration Monitor"]
        SM["Spending Monitor"]
        CR["Capacity Reconciler"]
        CP["Cost Protection"]
    end

    subgraph Storage["Data Layer"]
        DB["SQLite / PostgreSQL"]
        REDIS["Redis / FakeRedis"]
    end

    subgraph External["External APIs"]
        OAI["OpenAI"]
        ANT["Anthropic"]
        GEM["Google Gemini"]
        STRIPE["Stripe"]
    end

    Frontend --> Middleware --> Backend
    Backend --> Services
    Backend --> Storage
    Services --> Storage
    Workers --> Storage
    PROXY --> External
    PAYMENT --> STRIPE
```

## Request Flow — API Proxy

```mermaid
sequenceDiagram
    participant Client
    participant Proxy as /v1/chat/completions
    participant Redis
    participant Cache as Semantic Cache
    participant Filter as Prompt Filter
    participant Rotation as Key Rotation
    participant Provider as AI Provider

    Client->>Proxy: POST (Bearer vk_xxx)
    Proxy->>Redis: Validate virtual key
    alt Key invalid/expired
        Proxy-->>Client: 402 Payment Required
    end
    Proxy->>Redis: Check rate limit (per-user + global)
    alt Rate limited
        Proxy-->>Client: 429 Too Many Requests
    end
    Proxy->>Filter: Check prompt safety
    alt Unsafe prompt
        Proxy-->>Client: 400 Blocked
    end
    Proxy->>Cache: Check semantic cache
    alt Cache hit
        Cache-->>Proxy: Cached response
        Proxy->>Redis: Deduct tokens
        Proxy-->>Client: 200 (cached)
    end
    Proxy->>Rotation: Get next API key
    Proxy->>Provider: Forward request
    Provider-->>Proxy: Response
    Proxy->>Redis: Deduct tokens
    Proxy->>Cache: Cache response
    Proxy-->>Client: 200 (response)
```

## Data Models

```mermaid
erDiagram
    User ||--o{ Rental : has
    User ||--o{ Transaction : makes
    Plan ||--o{ Rental : purchased_as
    Rental ||--o{ UsageLog : generates
    User ||--o{ SpendingAlert : triggers

    User {
        int id PK
        string email
        string hashed_password
        enum role
        bool is_active
    }

    Plan {
        int id PK
        string name
        float price
        int duration_minutes
        int token_cap
        int rpm_limit
        float drain_rate_multiplier
    }

    Rental {
        int id PK
        int user_id FK
        int plan_id FK
        string virtual_key
        enum status
        int tokens_used
        int tokens_remaining
        datetime expires_at
    }

    Transaction {
        int id PK
        int user_id FK
        float amount
        string stripe_payment_id
    }

    UsageLog {
        int id PK
        int rental_id FK
        string model
        int tokens_used
        float cost_usd
        bool was_cached
    }
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Virtual keys** instead of forwarding real keys | Users never see actual provider keys; we control access, billing, and revocation |
| **Redis for real-time data** | TTLs, rate counters, token balances — all need sub-ms latency |
| **LiteLLM for multi-provider** | Single API interface for OpenAI, Anthropic, Google — simplifies fallback and rotation |
| **Hybrid capacity reservation** | Hard-reserve RPM, soft-reserve tokens with 1.5x overbooking — balances availability vs revenue |
| **Per-model drain rates** | GPT-4o costs 10x more than Gemini Flash — drain tokens proportionally to actual cost |
| **Stripe webhooks for payment** | Rental created ONLY after payment confirmed — prevents free usage |
