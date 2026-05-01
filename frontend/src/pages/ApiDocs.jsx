import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, BookOpen, Key, Code2, Table2, AlertTriangle, ArrowRight, Zap, Globe } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const BASE_URL = "https://api-on-rent-backend.onrender.com";

const PROVIDERS = [
  { id: "OpenAI",           label: "OpenAI",           models: { fast: "gpt-4o-mini",                 powerful: "gpt-4o" } },
  { id: "Google Gemini",    label: "Google Gemini",    models: { fast: "gemini-1.5-flash",            powerful: "gemini-1.5-pro" } },
  { id: "Anthropic Claude", label: "Anthropic Claude", models: { fast: "claude-3-5-sonnet-20241022",  powerful: "claude-3-5-sonnet-20241022" } },
];

const LANGUAGES = ["Python", "JavaScript", "Node.js", "cURL", "PHP"];

function getSnippets(model) {
  return {
    Python: `from openai import OpenAI

client = OpenAI(
    api_key="vk_your_key_here",
    base_url="${BASE_URL}/v1"
)

response = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Hello!"}],
    max_tokens=500
)
print(response.choices[0].message.content)`,

    JavaScript: `const response = await fetch("${BASE_URL}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer vk_your_key_here"
  },
  body: JSON.stringify({
    model: "${model}",
    messages: [{ role: "user", content: "Hello!" }],
    max_tokens: 500
  })
});
const data = await response.json();
console.log(data.choices[0].message.content);`,

    "Node.js": `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "vk_your_key_here",
  baseURL: "${BASE_URL}/v1"
});

const response = await client.chat.completions.create({
  model: "${model}",
  messages: [{ role: "user", content: "Hello!" }],
  max_tokens: 500
});
console.log(response.choices[0].message.content);`,

    cURL: `curl ${BASE_URL}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer vk_your_key_here" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 500
  }'`,

    PHP: `<?php
$ch = curl_init('${BASE_URL}/v1/chat/completions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    'Content-Type: application/json',
    'Authorization: Bearer vk_your_key_here'
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'model' => '${model}',
    'messages' => [['role' => 'user', 'content' => 'Hello!']],
    'max_tokens' => 500
  ])
]);
$response = json_decode(curl_exec($ch), true);
echo $response['choices'][0]['message']['content'];`,
  };
}

const MODELS = [
  { model: "gpt-4o-mini",                provider: "OpenAI",    drain: "3x",  best: "Fast & affordable" },
  { model: "gpt-4o",                     provider: "OpenAI",    drain: "10x", best: "Complex reasoning" },
  { model: "gemini-1.5-flash",           provider: "Google",    drain: "1x",  best: "High-volume tasks" },
  { model: "gemini-1.5-pro",             provider: "Google",    drain: "5x",  best: "Multimodal tasks" },
  { model: "claude-3-5-sonnet-20241022", provider: "Anthropic", drain: "8x",  best: "Writing & analysis" },
];

const ERRORS = [
  { code: "401", meaning: "Invalid or expired virtual key" },
  { code: "402", meaning: "Insufficient tokens remaining" },
  { code: "403", meaning: "This key is rented for a different provider" },
  { code: "429", meaning: "Rate limit exceeded (RPM limit hit)" },
  { code: "502", meaning: "Upstream provider error" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <button onClick={handleCopy}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
        background: copied ? 'var(--c-accent-bg)' : 'var(--c-raised)',
        border: `1px solid ${copied ? 'var(--c-accent-border)' : 'var(--c-border)'}`,
        color: copied ? 'var(--c-accent-hi)' : 'var(--c-text-3)',
        transition: 'all 150ms',
      }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code }) {
  return (
    <div style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', borderBottom: '1px solid var(--c-border)' }}>
        <CopyButton text={code} />
      </div>
      <pre style={{ fontFamily: 'monospace', fontSize: '0.825rem', color: 'var(--c-text-2)', padding: '16px', overflowX: 'auto', whiteSpace: 'pre', lineHeight: 1.6, margin: 0 }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }) {
  const isGet = method === "GET";
  return (
    <span style={{
      fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
      background: isGet ? 'var(--c-accent-bg)' : 'rgba(56,189,248,0.08)',
      border: `1px solid ${isGet ? 'var(--c-accent-border)' : 'rgba(56,189,248,0.25)'}`,
      color: isGet ? 'var(--c-accent-hi)' : '#7dd3fc',
    }}>
      {method}
    </span>
  );
}

function EndpointRow({ method, path, description, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--c-raised)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <MethodBadge method={method} />
        <code style={{ fontFamily: 'monospace', fontSize: '0.825rem', color: 'var(--c-text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</code>
        <span style={{ color: 'var(--c-text-3)', fontSize: '0.8rem', flexShrink: 0, display: 'none' }} className="sm:block">{description}</span>
        <span style={{ color: 'var(--c-text-3)', fontSize: '0.7rem', marginLeft: '8px', flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--c-border)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--c-bg)' }}>
          <p style={{ fontSize: '0.825rem', color: 'var(--c-text-3)' }}>{description}</p>
          {children}
        </div>
      )}
    </div>
  );
}

function EndpointDetail({ label, code }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <p style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</p>
      <CodeBlock code={code} />
    </div>
  );
}

function SectionIcon({ icon: Icon, danger }) {
  return (
    <div style={{
      width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: danger ? 'rgba(251,113,133,0.08)' : 'var(--c-accent-bg)',
      border: `1px solid ${danger ? 'rgba(251,113,133,0.25)' : 'var(--c-accent-border)'}`,
    }}>
      <Icon size={16} style={{ color: danger ? '#fb7185' : 'var(--c-accent)' }} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ApiDocs() {
  const [activeProvider, setActiveProvider] = useState("OpenAI");
  const [activeLang,     setActiveLang]     = useState("Python");

  const providerInfo = PROVIDERS.find(p => p.id === activeProvider);
  const model        = providerInfo.models.fast;
  const snippets     = getSnippets(model);

  const thStyle = { textAlign: 'left', padding: '10px 20px', fontSize: '0.7rem', color: 'var(--c-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--c-border)' };
  const tdStyle = { padding: '14px 20px', fontSize: '0.875rem', borderBottom: '1px solid var(--c-border)' };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ paddingTop: '120px', paddingBottom: '64px', paddingLeft: '20px', paddingRight: '20px', textAlign: 'center' }}>
        <div className="max-w-3xl mx-auto">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '8px', marginBottom: '24px',
            background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-border)',
            color: 'var(--c-accent)', fontSize: '0.875rem', fontWeight: 500,
          }}>
            <BookOpen size={14} /> Developer Reference
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem,6vw,4rem)', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--c-text)', marginBottom: '16px', lineHeight: 1.05 }}>
            API Reference
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--c-text-2)', lineHeight: 1.7 }}>
            OpenAI-compatible endpoint. Drop in your virtual key and start building.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto" style={{ padding: '0 20px 96px', display: 'flex', flexDirection: 'column', gap: '56px' }}>

        {/* Authentication */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <SectionIcon icon={Key} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--c-text)' }}>Authentication</h2>
          </div>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '8px' }}>Base URL</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--c-raised)', border: '1px solid var(--c-border)', borderRadius: '8px', padding: '12px 16px' }}>
                <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--c-accent-hi)' }}>{BASE_URL}/v1</code>
                <CopyButton text={`${BASE_URL}/v1`} />
              </div>
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '8px' }}>Authorization Header</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--c-raised)', border: '1px solid var(--c-border)', borderRadius: '8px', padding: '12px 16px' }}>
                <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--c-text-2)' }}>
                  Authorization: <span style={{ color: 'var(--c-accent)' }}>Bearer vk_your_key_here</span>
                </code>
                <CopyButton text="Authorization: Bearer vk_your_key_here" />
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--c-text-3)', lineHeight: 1.6 }}>
              Replace{" "}
              <code style={{ color: 'var(--c-accent)', background: 'var(--c-accent-bg)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>vk_your_key_here</code>
              {" "}with the virtual key you receive after purchase. Find it in your{" "}
              <Link to="/dashboard" style={{ color: 'var(--c-accent)', textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>.
            </p>
          </div>
        </section>

        {/* Chat Completions */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <SectionIcon icon={Code2} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--c-text)' }}>Chat Completions</h2>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--c-raised)', border: '1px solid var(--c-border)', borderRadius: '8px', padding: '10px 16px', marginBottom: '20px' }}>
            <MethodBadge method="POST" />
            <code style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--c-text)' }}>/v1/chat/completions</code>
          </div>

          <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem', marginBottom: '20px', lineHeight: 1.65 }}>
            Fully OpenAI-compatible. Works with the official OpenAI SDK — just change{" "}
            <code style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--c-raised)', padding: '1px 5px', borderRadius: '3px', color: 'var(--c-text-2)' }}>base_url</code> and{" "}
            <code style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--c-raised)', padding: '1px 5px', borderRadius: '3px', color: 'var(--c-text-2)' }}>api_key</code>.
          </p>

          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Provider tabs */}
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '12px' }}>Provider</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PROVIDERS.map(p => (
                  <button key={p.id}
                    onClick={() => { setActiveProvider(p.id); setActiveLang("Python"); }}
                    style={{
                      padding: '7px 16px', borderRadius: '7px', fontSize: '0.825rem', fontWeight: 500, cursor: 'pointer',
                      background: activeProvider === p.id ? 'var(--c-accent-bg)' : 'var(--c-raised)',
                      border: `1px solid ${activeProvider === p.id ? 'var(--c-accent-border)' : 'var(--c-border)'}`,
                      color: activeProvider === p.id ? 'var(--c-accent-hi)' : 'var(--c-text-3)',
                      transition: 'all 150ms',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: 'var(--c-raised)', border: '1px solid var(--c-border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.825rem', color: 'var(--c-text-3)' }}>
              <Zap size={14} style={{ color: 'var(--c-accent)', flexShrink: 0 }} />
              <span>Model used in examples:</span>
              <code style={{ fontFamily: 'monospace', color: 'var(--c-accent-hi)', background: 'var(--c-accent-bg)', padding: '1px 7px', borderRadius: '4px', fontSize: '0.775rem' }}>
                {model}
              </code>
              {providerInfo.models.fast !== providerInfo.models.powerful && (
                <>
                  <span style={{ color: 'var(--c-border-hi)' }}>or</span>
                  <code style={{ fontFamily: 'monospace', color: 'var(--c-accent-hi)', background: 'var(--c-accent-bg)', padding: '1px 7px', borderRadius: '4px', fontSize: '0.775rem' }}>
                    {providerInfo.models.powerful}
                  </code>
                </>
              )}
            </div>

            {/* Language tabs */}
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '12px' }}>Language</p>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', background: 'var(--c-raised)', border: '1px solid var(--c-border)', borderRadius: '8px', padding: '4px' }}>
                {LANGUAGES.map(lang => (
                  <button key={lang} onClick={() => setActiveLang(lang)}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', fontSize: '0.825rem', fontWeight: 500, cursor: 'pointer',
                      background: activeLang === lang ? 'var(--c-accent-bg)' : 'transparent',
                      border: `1px solid ${activeLang === lang ? 'var(--c-accent-border)' : 'transparent'}`,
                      color: activeLang === lang ? 'var(--c-accent-hi)' : 'var(--c-text-3)',
                      transition: 'all 150ms',
                    }}>
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <CodeBlock code={snippets[activeLang]} />
          </div>
        </section>

        {/* REST Endpoints */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <SectionIcon icon={Globe} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--c-text)' }}>REST Endpoints</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {[
              { title: 'Auth', rows: [
                { method: 'POST', path: '/auth/register', desc: 'Create a new account',
                  detail: [{ label: 'Body', code: `{ "email": "user@example.com", "password": "secret123" }` }, { label: 'Response', code: `{ "id": 1, "email": "user@example.com", "role": "USER" }` }] },
                { method: 'POST', path: '/auth/login', desc: 'Get JWT access token',
                  detail: [{ label: 'Body', code: `{ "email": "user@example.com", "password": "secret123" }` }, { label: 'Response', code: `{ "access_token": "eyJ...", "token_type": "bearer" }` }] },
                { method: 'GET',  path: '/auth/me', desc: 'Get current user info — auth required', detail: [] },
              ]},
              { title: 'Marketplace', rows: [
                { method: 'GET', path: '/api/plans', desc: 'List available rental plans',
                  detail: [{ label: 'Response (example)', code: `[\n  {\n    "id": 1,\n    "duration_label": "1 Hour",\n    "duration_minutes": 60,\n    "token_cap": 80000,\n    "rpm_limit": 60,\n    "price": 49.0,\n    "is_active": true\n  }\n]` }] },
                { method: 'GET', path: '/api/active-providers', desc: 'List active AI providers available for rental', detail: [] },
                { method: 'GET', path: '/api/rentals/active', desc: 'List your active rentals — auth required',
                  detail: [{ label: 'Response (example)', code: `[\n  {\n    "id": 42,\n    "virtual_key": "vk_abc123...",\n    "provider": "openai",\n    "status": "ACTIVE",\n    "tokens_remaining": 72000,\n    "expires_at": "2025-04-22T15:00:00Z"\n  }\n]` }] },
              ]},
              { title: 'Payment', rows: [
                { method: 'POST', path: '/api/checkout/session', desc: 'Create payment session — auth required',
                  detail: [{ label: 'Body', code: `{\n  "plan_id": 1,\n  "provider": "openai",\n  "customer_phone": "9876543210"\n}` }, { label: 'Response', code: `{ "payment_session_id": "session_abc123..." }` }] },
              ]},
              { title: 'Status', rows: [
                { method: 'GET', path: '/health',  desc: 'Health check — returns 200 OK if API is running', detail: [] },
                { method: 'GET', path: '/status/', desc: 'Full system status including database and Redis', detail: [] },
              ]},
            ].map(group => (
              <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingLeft: '4px' }}>{group.title}</h3>
                {group.rows.map(row => (
                  <EndpointRow key={row.path} method={row.method} path={row.path} description={row.desc}>
                    {row.detail.map(d => <EndpointDetail key={d.label} label={d.label} code={d.code} />)}
                  </EndpointRow>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Supported Models */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <SectionIcon icon={Table2} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--c-text)' }}>Supported Models</h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--c-text-3)', marginBottom: '16px', lineHeight: 1.65 }}>
            <span style={{ color: 'var(--c-accent)', fontWeight: 500 }}>Drain rate</span> — higher drain rate = tokens consumed faster. A 10x model uses 10x tokens per request compared to a 1x model.
          </p>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  {['Model ID', 'Provider', 'Drain Rate', 'Best For'].map((h, i) => (
                    <th key={h} style={{ ...thStyle, display: i === 3 ? undefined : undefined }} className={i === 3 ? 'hidden md:table-cell' : ''}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODELS.map(m => (
                  <tr key={m.model} style={{ transition: 'background 100ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--c-raised)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>
                      <code style={{ fontFamily: 'monospace', color: 'var(--c-accent-hi)', fontSize: '0.775rem' }}>{m.model}</code>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--c-text-2)' }}>{m.provider}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '10px',
                        fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace',
                        background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)',
                      }}>
                        {m.drain}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--c-text-3)' }} className="hidden md:table-cell">{m.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Error Reference */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <SectionIcon icon={AlertTriangle} danger />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--c-text)' }}>Error Reference</h2>
          </div>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Code</th>
                  <th style={thStyle}>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {ERRORS.map(e => (
                  <tr key={e.code} style={{ transition: 'background 100ms' }}
                    onMouseEnter={el => el.currentTarget.style.background = 'var(--c-raised)'}
                    onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '6px',
                        fontSize: '0.775rem', fontWeight: 700, fontFamily: 'monospace',
                        background: 'rgba(251,113,133,0.08)', color: '#fb7185', border: '1px solid rgba(251,113,133,0.25)',
                      }}>
                        {e.code}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--c-text-2)' }}>{e.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-accent-border)', borderRadius: '10px', padding: '40px 32px', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '1.3rem', marginBottom: '12px' }}>Ready to build?</h2>
            <p style={{ color: 'var(--c-text-3)', marginBottom: '28px', maxWidth: '400px', margin: '0 auto 28px', lineHeight: 1.65, fontSize: '0.9rem' }}>
              Purchase a plan on the marketplace, get your virtual key instantly, and start making API calls in minutes.
            </p>
            <Link to="/marketplace" className="btn btn-primary" style={{ display: 'inline-flex', padding: '11px 24px' }}>
              Browse Plans <ArrowRight size={14} />
            </Link>
          </div>
        </section>

      </div>

      <Footer />
    </div>
  );
}
