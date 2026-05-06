import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Copy, Check, Key, Code2, Table2, AlertTriangle, ArrowRight, Zap, Globe } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-40px' };
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });
const SP = { padding: 'clamp(64px,9vw,104px) clamp(20px,5vw,72px)' };
const MAX = { maxWidth: '880px', margin: '0 auto' };

const BASE_URL = "https://api-on-rent-backend.onrender.com";

const PROVIDERS = [
  { id: "OpenAI",           label: "OpenAI",           models: { fast: "gpt-4o-mini",                power: "gpt-4o" } },
  { id: "Google Gemini",    label: "Google Gemini",    models: { fast: "gemini-1.5-flash",           power: "gemini-1.5-pro" } },
  { id: "Anthropic Claude", label: "Anthropic Claude", models: { fast: "claude-3-5-sonnet-20241022", power: "claude-3-5-sonnet-20241022" } },
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
  { family: "All GPT Models",       provider: "OpenAI",    best: "Reasoning, code, chat" },
  { family: "All Anthropic Models", provider: "Anthropic", best: "Writing, analysis, safety" },
  { family: "All Gemini Models",    provider: "Google",    best: "Multimodal, high-volume" },
];

const ERRORS = [
  { code: "401", meaning: "Invalid or expired virtual key" },
  { code: "402", meaning: "Insufficient tokens remaining" },
  { code: "403", meaning: "Key is rented for a different provider" },
  { code: "429", meaning: "Rate limit exceeded (RPM limit hit)" },
  { code: "502", meaning: "Upstream provider error" },
];

const ENDPOINT_GROUPS = [
  { title: 'AUTH', rows: [
    { method: 'POST', path: '/auth/register', desc: 'Create a new account', detail: [
      { label: 'BODY', code: `{ "email": "user@example.com", "password": "secret123" }` },
      { label: 'RESPONSE', code: `{ "id": 1, "email": "user@example.com", "role": "USER" }` },
    ]},
    { method: 'POST', path: '/auth/login', desc: 'Get JWT access token', detail: [
      { label: 'BODY', code: `{ "email": "user@example.com", "password": "secret123" }` },
      { label: 'RESPONSE', code: `{ "access_token": "eyJ...", "token_type": "bearer" }` },
    ]},
    { method: 'GET', path: '/auth/me', desc: 'Get current user — auth required', detail: [] },
  ]},
  { title: 'MARKETPLACE', rows: [
    { method: 'GET', path: '/api/plans', desc: 'List available rental plans', detail: [
      { label: 'RESPONSE', code: `[\n  {\n    "id": 1,\n    "duration_label": "1 Hour",\n    "duration_minutes": 60,\n    "token_cap": 80000,\n    "rpm_limit": 60,\n    "price": 49.0,\n    "is_active": true\n  }\n]` },
    ]},
    { method: 'GET', path: '/api/active-providers', desc: 'List active AI providers', detail: [] },
    { method: 'GET', path: '/api/rentals/active', desc: 'List your active rentals — auth required', detail: [
      { label: 'RESPONSE', code: `[\n  {\n    "id": 42,\n    "virtual_key": "vk_abc123...",\n    "provider": "openai",\n    "status": "ACTIVE",\n    "tokens_remaining": 72000,\n    "expires_at": "2025-04-22T15:00:00Z"\n  }\n]` },
    ]},
  ]},
  { title: 'PAYMENT', rows: [
    { method: 'POST', path: '/api/checkout/session', desc: 'Create payment session — auth required', detail: [
      { label: 'BODY', code: `{\n  "plan_id": 1,\n  "provider": "openai",\n  "customer_phone": "9876543210"\n}` },
      { label: 'RESPONSE', code: `{ "payment_session_id": "session_abc123..." }` },
    ]},
  ]},
  { title: 'STATUS', rows: [
    { method: 'GET', path: '/health',  desc: 'Health check — 200 OK if running', detail: [] },
    { method: 'GET', path: '/status/', desc: 'Full system status with DB and Redis', detail: [] },
  ]},
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <button onClick={handleCopy}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '4px 10px', borderRadius: '2px', fontSize: '0.68rem', fontWeight: 500, cursor: 'pointer',
        background: copied ? 'var(--nb-green-bg)' : 'var(--nb-raised)',
        border: `1px solid ${copied ? 'var(--nb-green-border)' : 'var(--nb-border)'}`,
        color: copied ? 'var(--nb-green)' : 'var(--nb-text-3)',
        fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
        transition: 'all 150ms',
      }}>
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}

function CodeBlock({ code }) {
  return (
    <div style={{ background: 'var(--nb-bg)', border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 10px', borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-raised)' }}>
        <CopyButton text={code} />
      </div>
      <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--nb-text-2)', padding: '16px', overflowX: 'auto', whiteSpace: 'pre', lineHeight: 1.65, margin: 0 }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }) {
  const isGet = method === "GET";
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: '2px', letterSpacing: '0.06em',
      background: isGet ? 'var(--nb-green-bg)' : 'oklch(18% 0.04 230)',
      border: `1px solid ${isGet ? 'var(--nb-green-border)' : 'oklch(28% 0.08 230)'}`,
      color: isGet ? 'var(--nb-green)' : 'oklch(72% 0.14 230)',
    }}>
      {method}
    </span>
  );
}

function EndpointRow({ method, path, desc, detail }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid var(--nb-border)', borderRadius: '2px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', background: 'var(--nb-surface)', border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 120ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--nb-raised)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--nb-surface)'}
      >
        <MethodBadge method={method} />
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--nb-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</code>
        <span style={{ color: 'var(--nb-text-3)', fontFamily: 'var(--font-body)', fontSize: '0.78rem', flexShrink: 0 }}>{desc}</span>
        <span style={{ color: 'var(--nb-text-4)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', marginLeft: '8px', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && detail.length > 0 && (
        <div style={{ borderTop: '1px solid var(--nb-border)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--nb-bg)' }}>
          {detail.map(d => (
            <div key={d.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--nb-text-3)', letterSpacing: '0.08em' }}>{d.label}</span>
              <CodeBlock code={d.code} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, label, index }) {
  return (
    <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
      style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--nb-border)' }}
    >
      <div style={{ width: '32px', height: '32px', borderRadius: '2px', background: 'var(--nb-green-bg)', border: '1px solid var(--nb-green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={14} style={{ color: 'var(--nb-green)' }} />
      </div>
      <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--nb-text)', letterSpacing: '-0.02em' }}>{label}</h2>
    </motion.div>
  );
}

export default function ApiDocs() {
  const [activeProvider, setActiveProvider] = useState("OpenAI");
  const [activeLang,     setActiveLang]     = useState("Python");

  const providerInfo = PROVIDERS.find(p => p.id === activeProvider);
  const model        = providerInfo.models.fast;
  const snippets     = getSnippets(model);

  const monoLabel = { fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: 'var(--nb-text-3)', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' };
  const thStyle   = { textAlign: 'left', padding: '10px 20px', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--nb-text-3)', fontWeight: 600, letterSpacing: '0.08em', borderBottom: '1px solid var(--nb-border)' };
  const tdStyle   = { padding: '14px 20px', fontFamily: 'var(--font-body)', fontSize: '0.875rem', borderBottom: '1px solid var(--nb-border)' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nb-bg)' }}>
      <Helmet>
        <title>API Docs — AIRent | OpenAI-Compatible AI Proxy</title>
        <meta name="description" content="AIRent is 100% OpenAI-compatible. Swap your API key and base URL. Full reference for GPT, Claude, and Gemini." />
        <link rel="canonical" href="https://airent.dev/docs" />
      </Helmet>
      <Navbar />

      {/* ── Hero ── */}
      <section
        className="nb-grid-hero"
        style={{
          paddingTop: 'clamp(120px,16vw,180px)',
          paddingBottom: 'clamp(48px,6vw,72px)',
          paddingLeft: 'clamp(20px,5vw,72px)',
          paddingRight: 'clamp(20px,5vw,72px)',
          borderBottom: '1px solid var(--nb-border)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to bottom, transparent, var(--nb-bg))', pointerEvents: 'none' }} />
        <div style={{ ...MAX, position: 'relative' }}>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
              <span style={{ width: '18px', height: '1px', background: 'var(--nb-green)', display: 'inline-block' }} />
              DEVELOPER REFERENCE
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp(0.06)} initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2.4rem,6vw,4rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--nb-text)', lineHeight: 0.98, marginBottom: '20px' }}
          >
            API Reference
          </motion.h1>
          <motion.p variants={fadeUp(0.12)} initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', lineHeight: 1.75, color: 'var(--nb-text-2)', maxWidth: '44ch' }}
          >
            OpenAI-compatible endpoint. Swap your key and base URL. That's it.
          </motion.p>
        </div>
      </section>

      <div style={{ ...SP }}>
        <div style={{ ...MAX, display: 'flex', flexDirection: 'column', gap: '64px' }}>

          {/* Authentication */}
          <section>
            <SectionHeader icon={Key} label="Authentication" />
            <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
              style={{ border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-surface)' }}>
                <span style={monoLabel}>BASE URL</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--nb-raised)', border: '1px solid var(--nb-border)', borderRadius: '4px', padding: '10px 14px' }}>
                  <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--nb-green)' }}>{BASE_URL}/v1</code>
                  <CopyButton text={`${BASE_URL}/v1`} />
                </div>
              </div>
              <div style={{ padding: '20px 24px', background: 'var(--nb-surface)' }}>
                <span style={monoLabel}>AUTHORIZATION HEADER</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--nb-raised)', border: '1px solid var(--nb-border)', borderRadius: '4px', padding: '10px 14px' }}>
                  <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--nb-text-2)' }}>
                    Authorization: <span style={{ color: 'var(--nb-green)' }}>Bearer vk_your_key_here</span>
                  </code>
                  <CopyButton text="Authorization: Bearer vk_your_key_here" />
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--nb-text-3)', lineHeight: 1.7, marginTop: '14px' }}>
                  Replace <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--nb-green)', fontSize: '0.78rem' }}>vk_your_key_here</code> with the key from your{' '}
                  <Link to="/dashboard" style={{ color: 'var(--nb-text-2)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Dashboard</Link>.
                </p>
              </div>
            </motion.div>
          </section>

          {/* Chat Completions */}
          <section>
            <SectionHeader icon={Code2} label="Chat Completions" />
            <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
              style={{ border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}
            >
              {/* Endpoint badge */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-surface)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <MethodBadge method="POST" />
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--nb-text)' }}>/v1/chat/completions</code>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--nb-text-3)', marginLeft: 'auto' }}>OpenAI-compatible — no code changes needed</span>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--nb-bg)' }}>
                {/* Provider tabs */}
                <div>
                  <span style={monoLabel}>PROVIDER</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {PROVIDERS.map(p => (
                      <button key={p.id}
                        onClick={() => { setActiveProvider(p.id); setActiveLang("Python"); }}
                        style={{
                          padding: '6px 14px', borderRadius: '2px', fontFamily: 'var(--font-body)', fontSize: '0.825rem', fontWeight: 500, cursor: 'pointer',
                          background: activeProvider === p.id ? 'var(--nb-green-bg)' : 'var(--nb-surface)',
                          border: `1px solid ${activeProvider === p.id ? 'var(--nb-green-border)' : 'var(--nb-border)'}`,
                          color: activeProvider === p.id ? 'var(--nb-green)' : 'var(--nb-text-3)',
                          transition: 'all 120ms',
                        }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '10px 14px', border: '1px solid var(--nb-border)', borderRadius: '4px', background: 'var(--nb-surface)' }}>
                  <Zap size={13} style={{ color: 'var(--nb-green)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--nb-text-3)' }}>Model in examples:</span>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--nb-green)', background: 'var(--nb-green-bg)', padding: '1px 7px', borderRadius: '2px' }}>{model}</code>
                  {providerInfo.models.fast !== providerInfo.models.power && (
                    <>
                      <span style={{ color: 'var(--nb-text-4)' }}>or</span>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--nb-green)', background: 'var(--nb-green-bg)', padding: '1px 7px', borderRadius: '2px' }}>{providerInfo.models.power}</code>
                    </>
                  )}
                </div>

                {/* Language tabs */}
                <div>
                  <span style={monoLabel}>LANGUAGE</span>
                  <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', background: 'var(--nb-surface)', border: '1px solid var(--nb-border)', borderRadius: '4px', padding: '4px' }}>
                    {LANGUAGES.map(lang => (
                      <button key={lang} onClick={() => setActiveLang(lang)}
                        style={{
                          padding: '5px 12px', borderRadius: '2px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.02em', cursor: 'pointer',
                          background: activeLang === lang ? 'var(--nb-green-bg)' : 'transparent',
                          border: `1px solid ${activeLang === lang ? 'var(--nb-green-border)' : 'transparent'}`,
                          color: activeLang === lang ? 'var(--nb-green)' : 'var(--nb-text-3)',
                          transition: 'all 120ms',
                        }}>
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <CodeBlock code={snippets[activeLang]} />
              </div>
            </motion.div>
          </section>

          {/* REST Endpoints */}
          <section>
            <SectionHeader icon={Globe} label="REST Endpoints" />
            <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              {ENDPOINT_GROUPS.map(group => (
                <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', marginBottom: '6px', display: 'block' }}>{group.title}</span>
                  {group.rows.map(row => (
                    <EndpointRow key={row.path} method={row.method} path={row.path} desc={row.desc} detail={row.detail} />
                  ))}
                </div>
              ))}
            </motion.div>
          </section>

          {/* Supported Models */}
          <section>
            <SectionHeader icon={Table2} label="Supported Models" />
            <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
              style={{ border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--nb-surface)' }}>
                    {['Model Family', 'Provider', 'Best For'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {MODELS.map((m, i) => (
                    <tr key={m.family}
                      style={{ background: i % 2 === 0 ? 'var(--nb-bg)' : 'var(--nb-surface)', transition: 'background 100ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--nb-raised)'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--nb-bg)' : 'var(--nb-surface)'}
                    >
                      <td style={{ ...tdStyle, color: 'var(--nb-green)', fontFamily: 'var(--font-head)', fontWeight: 600 }}>{m.family}</td>
                      <td style={{ ...tdStyle, color: 'var(--nb-text-2)' }}>{m.provider}</td>
                      <td style={{ ...tdStyle, color: 'var(--nb-text-3)' }}>{m.best}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </section>

          {/* Error Reference */}
          <section>
            <SectionHeader icon={AlertTriangle} label="Error Reference" />
            <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
              style={{ border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--nb-surface)' }}>
                    <th style={thStyle}>CODE</th>
                    <th style={thStyle}>MEANING</th>
                  </tr>
                </thead>
                <tbody>
                  {ERRORS.map((e, i) => (
                    <tr key={e.code}
                      style={{ background: i % 2 === 0 ? 'var(--nb-bg)' : 'var(--nb-surface)' }}
                      onMouseEnter={el => el.currentTarget.style.background = 'var(--nb-raised)'}
                      onMouseLeave={el => el.currentTarget.style.background = i % 2 === 0 ? 'var(--nb-bg)' : 'var(--nb-surface)'}
                    >
                      <td style={{ ...tdStyle, width: '100px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '2px',
                          fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
                          background: 'oklch(18% 0.05 15)', color: 'oklch(68% 0.2 15)', border: '1px solid oklch(28% 0.1 15)',
                        }}>
                          {e.code}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--nb-text-2)' }}>{e.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </section>

          {/* CTA */}
          <motion.section variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px', padding: '40px', border: '1px solid var(--nb-border)', borderRadius: '4px', background: 'var(--nb-surface)' }}
          >
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '12px' }}>READY TO BUILD</span>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--nb-text)', lineHeight: 1.1 }}>
                Your first key is 30 seconds away.
              </h2>
            </div>
            <Link to="/marketplace" className="btn btn-primary" style={{ padding: '11px 24px', flexShrink: 0 }}>
              Browse plans <ArrowRight size={14} />
            </Link>
          </motion.section>

        </div>
      </div>

      <Footer />
    </div>
  );
}
