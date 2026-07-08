import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Copy, Check, Key, Code2, Table2, AlertTriangle, ArrowRight, Zap, Globe } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion, AnimatePresence } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-40px' };
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });

const BASE_URL = "https://api-on-rent-backend.onrender.com";

const PROVIDERS = [
  { id: "OpenAI",    label: "OpenAI",    models: { fast: "gpt-4o-mini",                power: "gpt-4o" } },
  { id: "Google",    label: "Google",    models: { fast: "gemini-1.5-flash",           power: "gemini-1.5-pro" } },
  { id: "Anthropic", label: "Anthropic", models: { fast: "claude-3-5-sonnet-20241022", power: "claude-3-5-sonnet-20241022" } },
];

const LANGUAGES = ["Python", "JavaScript", "Node.js", "cURL", "PHP"];

function getSnippets(model) {
  return {
    Python: `from openai import OpenAI\n\nclient = OpenAI(\n    api_key="vk_your_key_here",\n    base_url="${BASE_URL}/v1"\n)\n\nresponse = client.chat.completions.create(\n    model="${model}",\n    messages=[{"role": "user", "content": "Hello!"}],\n    max_tokens=500\n)\nprint(response.choices[0].message.content)`,
    JavaScript: `const response = await fetch("${BASE_URL}/v1/chat/completions", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "Authorization": "Bearer vk_your_key_here"\n  },\n  body: JSON.stringify({\n    model: "${model}",\n    messages: [{ role: "user", content: "Hello!" }],\n    max_tokens: 500\n  })\n});\nconst data = await response.json();\nconsole.log(data.choices[0].message.content);`,
    "Node.js": `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  apiKey: "vk_your_key_here",\n  baseURL: "${BASE_URL}/v1"\n});\n\nconst response = await client.chat.completions.create({\n  model: "${model}",\n  messages: [{ role: "user", content: "Hello!" }],\n  max_tokens: 500\n});\nconsole.log(response.choices[0].message.content);`,
    cURL: `curl ${BASE_URL}/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer vk_your_key_here" \\\n  -d '{\n    "model": "${model}",\n    "messages": [{"role": "user", "content": "Hello!"}],\n    "max_tokens": 500\n  }'`,
    PHP: `<?php\n$ch = curl_init('${BASE_URL}/v1/chat/completions');\ncurl_setopt_array($ch, [\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_POST => true,\n  CURLOPT_HTTPHEADER => [\n    'Content-Type: application/json',\n    'Authorization: Bearer vk_your_key_here'\n  ],\n  CURLOPT_POSTFIELDS => json_encode([\n    'model' => '${model}',\n    'messages' => [['role' => 'user', 'content' => 'Hello!']],\n    'max_tokens' => 500\n  ])\n]);\n$response = json_decode(curl_exec($ch), true);\necho $response['choices'][0]['message']['content'];`,
  };
}

const MODELS = [
  { family: "All GPT Models",       provider: "OpenAI",    best: "Reasoning, code, chat"       },
  { family: "All Anthropic Models", provider: "Anthropic", best: "Writing, analysis, safety"   },
  { family: "All Gemini Models",    provider: "Google",    best: "Multimodal, high-volume"     },
];

const ERRORS = [
  { code: "401", meaning: "Invalid or expired virtual key"            },
  { code: "402", meaning: "Insufficient tokens remaining"             },
  { code: "403", meaning: "Key is rented for a different provider"    },
  { code: "429", meaning: "Rate limit exceeded (RPM limit hit)"       },
  { code: "502", meaning: "Upstream provider error"                   },
];

const ENDPOINT_GROUPS = [
  { title: 'AUTH', icon: Key, rows: [
    { method: 'POST', path: '/auth/register', desc: 'Create a new account', detail: [
      { label: 'BODY',     code: `{ "email": "user@example.com", "password": "secret123" }` },
      { label: 'RESPONSE', code: `{ "id": 1, "email": "user@example.com", "role": "USER" }` },
    ]},
    { method: 'POST', path: '/auth/login', desc: 'Get JWT access token', detail: [
      { label: 'BODY',     code: `{ "email": "user@example.com", "password": "secret123" }` },
      { label: 'RESPONSE', code: `{ "access_token": "eyJ...", "token_type": "bearer" }` },
    ]},
    { method: 'GET', path: '/auth/me', desc: 'Get current user â€” auth required', detail: [] },
  ]},
  { title: 'MARKETPLACE', icon: Globe, rows: [
    { method: 'GET', path: '/api/plans', desc: 'List available rental plans', detail: [
      { label: 'RESPONSE', code: `[\n  {\n    "id": 1,\n    "duration_label": "1 Hour",\n    "duration_minutes": 60,\n    "token_cap": 80000,\n    "rpm_limit": 60,\n    "price": 149.0,\n    "is_active": true\n  }\n]` },
    ]},
    { method: 'GET',  path: '/api/active-providers', desc: 'List active AI providers', detail: [] },
    { method: 'GET',  path: '/api/rentals/active',   desc: 'Your active rentals â€” auth required', detail: [
      { label: 'RESPONSE', code: `[\n  {\n    "id": 42,\n    "virtual_key": "vk_abc123...",\n    "provider": "openai",\n    "status": "ACTIVE",\n    "tokens_remaining": 72000,\n    "expires_at": "2025-04-22T15:00:00Z"\n  }\n]` },
    ]},
  ]},
  { title: 'PAYMENT', icon: Zap, rows: [
    { method: 'POST', path: '/api/checkout/session', desc: 'Create payment session â€” auth required', detail: [
      { label: 'BODY',     code: `{\n  "plan_id": 1,\n  "provider": "openai"\n}` },
      { label: 'RESPONSE', code: `{ "payment_session_id": "session_abc123..." }` },
    ]},
  ]},
  { title: 'STATUS', icon: AlertTriangle, rows: [
    { method: 'GET', path: '/health',  desc: 'Health check â€” 200 OK if running', detail: [] },
    { method: 'GET', path: '/status/', desc: 'Full system status with DB and Redis', detail: [] },
  ]},
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', background: copied ? 'rgba(78,222,163,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? 'rgba(78,222,163,0.3)' : 'rgba(255,255,255,0.1)'}`, color: copied ? 'var(--secondary)' : 'var(--on-surface-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', transition: 'all 150ms' }}>
      {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? 'COPIED' : 'COPY'}
    </button>
  );
}

function CodeBlock({ code }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <CopyButton text={code} />
      </div>
      <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--on-surface-2)', padding: '16px', overflowX: 'auto', whiteSpace: 'pre', lineHeight: 1.65, margin: 0 }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }) {
  const isGet = method === 'GET';
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', letterSpacing: '0.06em', background: isGet ? 'rgba(78,222,163,0.1)' : 'rgba(192,193,255,0.1)', border: `1px solid ${isGet ? 'rgba(78,222,163,0.25)' : 'rgba(192,193,255,0.2)'}`, color: isGet ? 'var(--secondary)' : 'var(--primary)' }}>
      {method}
    </span>
  );
}

function EndpointRow({ method, path, desc, detail }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '8px' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: '#111520', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 120ms' }}
        onMouseEnter={e => e.currentTarget.style.background = '#141820'}
        onMouseLeave={e => e.currentTarget.style.background = '#111520'}
      >
        <MethodBadge method={method} />
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#e8edf8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</code>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--on-surface-3)', flexShrink: 0 }}>{desc}</span>
        <span style={{ color: 'var(--on-surface-4)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', marginLeft: '4px', flexShrink: 0 }}>{open ? 'â–²' : 'â–¼'}</span>
      </button>
      {open && detail.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.2)' }}>
          {detail.map(d => (
            <div key={d.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)' }}>{d.label}</span>
              <CodeBlock code={d.code} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApiDocs() {
  const [activeProvider, setActiveProvider] = useState("OpenAI");
  const [activeLang,     setActiveLang]     = useState("Python");

  const providerInfo = PROVIDERS.find(p => p.id === activeProvider);
  const model        = providerInfo.models.fast;
  const snippets     = getSnippets(model);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0d14' }}>
      <Helmet>
        <title>Docs â€” AIRent API Reference</title>
        <meta name="description" content="AIRent API documentation. OpenAI-compatible endpoint for GPT, Claude, and Gemini. Quick start in Python, JavaScript, Node.js, cURL, and PHP." />
      </Helmet>
      <Navbar />

      <main style={{ flex: 1, paddingTop: 'var(--header-h, 60px)' }}>

        {/* Hero */}
        <section style={{ padding: 'clamp(64px,9vw,96px) clamp(20px,5vw,56px) clamp(40px,5vw,56px)', background: '#0d1017' }}>
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            <motion.div initial="hidden" animate="show" variants={fadeUp(0)}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '999px', border: '1px solid rgba(192,193,255,0.2)', background: 'rgba(192,193,255,0.05)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--primary)', marginBottom: '24px' }}>
                <Code2 size={11} /> API REFERENCE
              </div>
            </motion.div>
            <motion.h1 initial="hidden" animate="show" variants={fadeUp(0.06)} style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', color: '#e8edf8', marginBottom: '16px' }}>
              OpenAI-compatible.<br />
              <span style={{ color: 'var(--secondary)' }}>Drop-in replacement.</span>
            </motion.h1>
            <motion.p initial="hidden" animate="show" variants={fadeUp(0.12)} style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', color: 'var(--on-surface-2)', lineHeight: 1.7, maxWidth: '520px' }}>
              Change two lines in your existing code â€” <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: '0.875rem' }}>api_key</code> and <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: '0.875rem' }}>base_url</code>. Everything else stays the same.
            </motion.p>
          </div>
        </section>

        {/* Quick start */}
        <section style={{ padding: 'clamp(40px,5vw,64px) clamp(20px,5vw,56px)', background: '#0a0d14' }}>
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{ marginBottom: '24px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)', marginBottom: '12px' }}>QUICK START</div>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', color: '#e8edf8', letterSpacing: '-0.02em' }}>Start in 30 seconds</h2>
            </motion.div>

            {/* Provider tabs */}
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px' }}>
              {PROVIDERS.map(p => (
                <button key={p.id} onClick={() => setActiveProvider(p.id)} style={{ padding: '14px 22px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: activeProvider === p.id ? '#e8edf8' : 'var(--on-surface-3)', borderBottom: `2px solid ${activeProvider === p.id ? 'var(--primary)' : 'transparent'}`, marginBottom: '-1px', transition: 'color 150ms' }}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Language tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {LANGUAGES.map(lang => (
                <button key={lang} onClick={() => setActiveLang(lang)} style={{ padding: '6px 14px', borderRadius: '7px', border: `1px solid ${activeLang === lang ? 'rgba(192,193,255,0.3)' : 'rgba(255,255,255,0.08)'}`, background: activeLang === lang ? 'rgba(192,193,255,0.08)' : 'transparent', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 600, color: activeLang === lang ? 'var(--primary)' : 'var(--on-surface-3)', transition: 'all 150ms' }}>
                  {lang}
                </button>
              ))}
            </div>

            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0.06)}>
              <CodeBlock code={snippets[activeLang] || snippets.Python} />
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0.1)} style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Link to="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700, background: 'var(--primary)', color: 'var(--on-primary)', transition: 'filter 120ms' }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
              >Get a key <ArrowRight size={13} /></Link>
              <Link to="/playground" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '8px', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface-2)', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', transition: 'border-color 120ms, color 120ms' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#e8edf8'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--on-surface-2)'; }}
              >Test in Playground</Link>
            </motion.div>
          </div>
        </section>

        {/* Models */}
        <section style={{ padding: 'clamp(40px,5vw,64px) clamp(20px,5vw,56px)', background: '#0d1017' }}>
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{ marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)', marginBottom: '12px' }}>SUPPORTED MODELS</div>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', color: '#e8edf8', letterSpacing: '-0.02em' }}>All providers, one endpoint</h2>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0.06)} style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#141820' }}>
                {['MODEL FAMILY', 'PROVIDER', 'BEST FOR'].map(h => <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)' }}>{h}</span>)}
              </div>
              {MODELS.map((m, i) => (
                <div key={m.family} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr', padding: '16px 20px', borderBottom: i < MODELS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9rem', color: '#e8edf8' }}>{m.family}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--primary)' }}>{m.provider}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)' }}>{m.best}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* API Reference */}
        <section style={{ padding: 'clamp(40px,5vw,64px) clamp(20px,5vw,56px)', background: '#0a0d14' }}>
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{ marginBottom: '32px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)', marginBottom: '12px' }}>REST API</div>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', color: '#e8edf8', letterSpacing: '-0.02em' }}>Endpoint reference</h2>
            </motion.div>

            {ENDPOINT_GROUPS.map((group, gi) => {
              const Icon = group.icon;
              return (
                <motion.div key={group.title} initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(gi * 0.05)} style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(192,193,255,0.08)', border: '1px solid rgba(192,193,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={14} color="var(--primary)" />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', color: '#e8edf8', letterSpacing: '0.08em' }}>{group.title}</h3>
                  </div>
                  {group.rows.map(row => <EndpointRow key={row.path} {...row} />)}
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Error codes */}
        <section style={{ padding: '0 clamp(20px,5vw,56px) clamp(56px,7vw,88px)', background: '#0a0d14' }}>
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{ marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)', marginBottom: '12px' }}>ERROR CODES</div>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', color: '#e8edf8', letterSpacing: '-0.02em' }}>HTTP status reference</h2>
            </motion.div>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0.06)} style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
              {ERRORS.map((e, i) => (
                <div key={e.code} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px 20px', borderBottom: i < ERRORS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: e.code === '401' || e.code === '403' ? '#f87171' : e.code === '429' ? '#f59e0b' : e.code === '402' ? 'var(--primary)' : 'var(--on-surface-2)', minWidth: '36px' }}>{e.code}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface-2)' }}>{e.meaning}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
      <style>{`
        @media (max-width: 640px) {
          pre { font-size: 0.72rem !important; }
        }
      `}</style>
    </div>
  );
}

