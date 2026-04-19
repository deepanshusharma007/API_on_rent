# User Guide — AIRent

This guide covers everything you need to go from sign-up to making live AI API calls with your virtual key.

---

## Step 1 — Create an Account

1. Go to the app and click **Register**
2. Enter your email and a password
3. Log in — you land on the Dashboard

---

## Step 2 — Buy a Rental

All purchases happen on the **Marketplace** page. No other page has a buy button.

1. **Pick a model** — only models the admin has enabled are shown
2. **Pick a duration** — 15 min / 1 hour / 6 hours / 24 hours
3. **Review** — see token cap, RPM limit, and price
4. Click **Rent Now** → Cashfree payment sheet opens
5. Complete payment → you are redirected to your Dashboard

Your virtual key is delivered two ways:
- **Email** — sent immediately after payment confirmation
- **Dashboard** — visible under "Active Rentals"

---

## Step 3 — Find Your Virtual Key

On the **Dashboard**:
- Active rentals show a countdown timer and token progress bar
- Click the key to copy it — it looks like `vk_a1b2c3d4e5f6...`

---

## Step 4 — Use Your Virtual Key

Your virtual key is a drop-in replacement for a provider API key. Point your client at the AIRent proxy URL instead of the original provider URL.

### Base URL

```
http://localhost:8000/v1
```

(Replace with your deployed domain in production, e.g. `https://api.yourdomain.com/v1`)

---

### cURL

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer vk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 500
  }'
```

---

### Python — OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="vk_your_key_here",        # your virtual key
    base_url="http://localhost:8000/v1" # AIRent proxy
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
    max_tokens=500
)
print(response.choices[0].message.content)
```

**Streaming:**
```python
stream = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Write me a poem"}],
    max_tokens=300,
    stream=True
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

---

### Node.js — OpenAI SDK

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'vk_your_key_here',
  baseURL: 'http://localhost:8000/v1',
});

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }],
  max_tokens: 500,
});

console.log(response.choices[0].message.content);
```

**Streaming:**
```javascript
const stream = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Tell me a joke' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

---

### LangChain (Python)

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-4o-mini",
    openai_api_key="vk_your_key_here",
    openai_api_base="http://localhost:8000/v1",
)

result = llm.invoke("What is the capital of France?")
print(result.content)
```

---

### LlamaIndex (Python)

```python
from llama_index.llms.openai import OpenAI

llm = OpenAI(
    model="gpt-4o-mini",
    api_key="vk_your_key_here",
    api_base="http://localhost:8000/v1",
)

response = llm.complete("Explain quantum computing in simple terms")
print(response.text)
```

---

### Direct HTTP (any language)

The proxy is a standard OpenAI-compatible HTTP endpoint.

**Request:**
```
POST /v1/chat/completions
Authorization: Bearer vk_your_key_here
Content-Type: application/json

{
  "model": "gpt-4o-mini",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "max_tokens": 500,
  "temperature": 0.7,
  "stream": false
}
```

**Response:**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "model": "gpt-4o-mini",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 18,
    "completion_tokens": 9,
    "total_tokens": 27
  }
}
```

---

## Available Models

Models shown in the Marketplace are determined by what the admin has configured — they are not fixed. The table below shows the currently supported model IDs and their relative cost (drain rate).

| Model ID | Provider | Drain Rate | Notes |
|---|---|---|---|
| `gemini-1.5-flash` | Google | 1× | Fastest, cheapest |
| `gpt-4o-mini` | OpenAI | 3× | Best balance of speed + quality |
| `gemini-1.5-pro` | Google | 5× | 1M context window |
| `claude-3-5-sonnet-20241022` | Anthropic | 8× | Best for code and reasoning |
| `gpt-4o` | OpenAI | 10× | Most capable |

**Drain rate** — your token cap is pre-adjusted for the model's cost. A 10× model burns through the same token plan 10× faster than a 1× model. This means fewer total tokens but more powerful responses per call.

Use the exact model ID string in the `model` field of your request.

---

## Monitor Usage

On the **Dashboard**:
- **Countdown timer** — seconds remaining on your rental
- **Token bar** — fills as you use tokens (turns amber at 50%, red at 20%)
- **Request count** — total API calls made

On the **Playground** page you can test your key live in the browser without writing any code — paste the key, pick a model, type a prompt, hit Send.

---

## Error Reference

| Error | HTTP Code | Meaning |
|---|---|---|
| Invalid virtual key | `401` | Key doesn't exist or is malformed |
| Rental expired | `402` | Time window closed or token cap hit |
| IP mismatch | `403` | Key was first used from a different IP |
| Rate limited | `429` | Too many requests per minute for this plan |
| Provider error | `503` | Upstream AI provider returned an error |

**402 is the most common** — it means your rental has ended. Go to Marketplace and buy a new one.

---

## Security Notes

- **IP pinning** — your virtual key locks to the first IP address that uses it. Using the same key from a different machine or VPN will return a 403.
- **PII masking** — emails, phone numbers, SSNs, and card numbers are automatically redacted from your prompts before they reach the AI provider.
- **No rollover** — unused tokens and time do not carry over when a rental expires.

---

## FAQ

**Can I use multiple models with one key?**
Each rental is tied to the model you bought it for. The `model` field in your request must match. If you want to use a different model, buy a separate rental for it.

**What happens when time runs out?**
The key stops working and returns `402 Payment Required`. Your Dashboard shows the rental as expired. Buy a new rental at any time — it activates as a separate key.

**Can I get a refund?**
Rentals are time-limited digital access. Contact support at deepanshu2210sharma@gmail.com for any issues.

**Can I use this with any OpenAI-compatible tool?**
Yes. Any tool that accepts a custom `base_url` and `api_key` works — including LangChain, LlamaIndex, AutoGen, CrewAI, and direct HTTP calls.
