import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Copy, Check, BookOpen, Key, Code2, Table2, AlertTriangle, ArrowRight, Zap, Globe } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { fadeUp, fadeIn, staggerContainer, viewport } from "../lib/motion.jsx";

const BASE_URL = "https://api-on-rent-backend.onrender.com";

// ── Provider model config ─────────────────────────────────────────────────────
const PROVIDERS = [
  { id: "OpenAI", label: "OpenAI", models: { fast: "gpt-4o-mini", powerful: "gpt-4o" } },
  { id: "Google Gemini", label: "Google Gemini", models: { fast: "gemini-1.5-flash", powerful: "gemini-1.5-pro" } },
  { id: "Anthropic Claude", label: "Anthropic Claude", models: { fast: "claude-3-5-sonnet-20241022", powerful: "claude-3-5-sonnet-20241022" } },
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
  { model: "gpt-4o-mini", provider: "OpenAI", drain: "3x", best: "Fast & affordable" },
  { model: "gpt-4o", provider: "OpenAI", drain: "10x", best: "Complex reasoning" },
  { model: "gemini-1.5-flash", provider: "Google", drain: "1x", best: "High-volume tasks" },
  { model: "gemini-1.5-pro", provider: "Google", drain: "5x", best: "Multimodal tasks" },
  { model: "claude-3-5-sonnet-20241022", provider: "Anthropic", drain: "8x", best: "Writing & analysis" },
];

const ERRORS = [
  { code: "401", meaning: "Invalid or expired virtual key" },
  { code: "402", meaning: "Insufficient tokens remaining" },
  { code: "403", meaning: "This key is rented for a different provider" },
  { code: "429", meaning: "Rate limit exceeded (RPM limit hit)" },
  { code: "502", meaning: "Upstream provider error" },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function CopyButton({ text, className = "" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        copied
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          : "bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1] border border-white/[0.08]"
      } ${className}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code }) {
  return (
    <div className="relative bg-black/60 border border-white/[0.08] rounded-lg overflow-hidden">
      <div className="flex justify-end px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <CopyButton text={code} />
      </div>
      <pre className="font-mono text-sm text-gray-300 p-4 overflow-x-auto whitespace-pre leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }) {
  const styles =
    method === "GET"
      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
      : "bg-violet-500/10 border border-violet-500/20 text-violet-400";
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${styles}`}>
      {method}
    </span>
  );
}

function EndpointRow({ method, path, description, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#111] border border-white/[0.08] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        <MethodBadge method={method} />
        <code className="font-mono text-sm text-gray-200 flex-1 min-w-0 truncate">{path}</code>
        <span className="text-gray-500 text-sm hidden sm:block flex-shrink-0">{description}</span>
        <span className="text-gray-600 text-xs ml-2 flex-shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 space-y-3 bg-[#0f0f0f]">
          <p className="text-sm text-gray-400 sm:hidden">{description}</p>
          {children}
        </div>
      )}
    </div>
  );
}

function EndpointDetail({ label, code }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
      <CodeBlock code={code} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ApiDocs() {
  const [activeProvider, setActiveProvider] = useState("OpenAI");
  const [activeLang, setActiveLang] = useState("Python");

  const providerInfo = PROVIDERS.find((p) => p.id === activeProvider);
  const model = providerInfo.models.fast;
  const snippets = getSnippets(model);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      {/* Section 1: Hero */}
      <section className="pt-32 pb-16 px-5 md:px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/10 rounded-full blur-3xl" />
        </div>
        <motion.div
          variants={staggerContainer(0.12, 0.1)}
          initial="hidden"
          animate="show"
          className="relative max-w-3xl mx-auto"
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-sm font-medium mb-6"
          >
            <BookOpen className="w-4 h-4" />
            Developer Reference
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4"
          >
            API{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Reference
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg text-gray-400">
            OpenAI-compatible endpoint. Drop in your virtual key and start building.
          </motion.p>
        </motion.div>
      </section>

      <div className="max-w-4xl mx-auto px-5 md:px-8 pb-24 space-y-14">

        {/* Section 2: Authentication */}
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center border border-violet-500/20">
              <Key className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Authentication</h2>
          </div>
          <div className="bg-[#111] border border-white/[0.08] rounded-lg p-6 space-y-5">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-semibold">Base URL</p>
              <div className="flex items-center gap-3 bg-black/50 border border-white/[0.08] rounded-lg px-4 py-3">
                <code className="flex-1 font-mono text-sm text-violet-300">{BASE_URL}/v1</code>
                <CopyButton text={`${BASE_URL}/v1`} />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-semibold">Authorization Header</p>
              <div className="flex items-center gap-3 bg-black/50 border border-white/[0.08] rounded-lg px-4 py-3">
                <code className="flex-1 font-mono text-sm text-gray-300">
                  Authorization: <span className="text-emerald-400">Bearer vk_your_key_here</span>
                </code>
                <CopyButton text="Authorization: Bearer vk_your_key_here" />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Replace{" "}
              <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">vk_your_key_here</code>{" "}
              with the virtual key you receive after purchase. Find it in your{" "}
              <Link to="/dashboard" className="text-violet-400 hover:underline">Dashboard</Link>.
            </p>
          </div>
        </motion.section>

        {/* Section 3: Chat Completions */}
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center border border-violet-500/20">
              <Code2 className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Chat Completions</h2>
          </div>

          <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-4 py-3 mb-5 w-fit">
            <MethodBadge method="POST" />
            <code className="font-mono text-sm text-gray-200">/v1/chat/completions</code>
          </div>

          <p className="text-gray-400 text-sm mb-5">
            Fully OpenAI-compatible. Works with the official OpenAI SDK — just change{" "}
            <code className="font-mono text-xs bg-white/5 px-1 rounded">base_url</code> and{" "}
            <code className="font-mono text-xs bg-white/5 px-1 rounded">api_key</code>.
          </p>

          <div className="bg-[#111] border border-white/[0.08] rounded-lg p-5 space-y-5">
            {/* Provider tabs */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">Provider</p>
              <div className="flex gap-1 flex-wrap">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setActiveProvider(p.id); setActiveLang("Python"); }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeProvider === p.id
                        ? "bg-violet-600 text-white"
                        : "bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.1]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model info */}
            <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-lg px-4 py-3 flex items-center gap-2 flex-wrap text-sm text-gray-400">
              <Zap className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <span>Model used in examples:</span>
              <code className="font-mono text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded text-xs">
                {model}
              </code>
              {providerInfo.models.fast !== providerInfo.models.powerful && (
                <>
                  <span className="text-gray-600">or</span>
                  <code className="font-mono text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded text-xs">
                    {providerInfo.models.powerful}
                  </code>
                </>
              )}
            </div>

            {/* Language tabs */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">Language</p>
              <div className="flex gap-1 flex-wrap bg-black/30 border border-white/[0.06] rounded-lg p-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeLang === lang
                        ? "bg-violet-600 text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <CodeBlock code={snippets[activeLang]} />
          </div>
        </motion.section>

        {/* Section 4: REST Endpoints */}
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center border border-violet-500/20">
              <Globe className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">REST Endpoints</h2>
          </div>

          <div className="space-y-6">
            {/* Auth */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1">Auth</h3>
              <EndpointRow method="POST" path="/auth/register" description="Create a new account">
                <EndpointDetail label="Body" code={`{ "email": "user@example.com", "password": "secret123" }`} />
                <EndpointDetail label="Response" code={`{ "id": 1, "email": "user@example.com", "role": "USER" }`} />
              </EndpointRow>
              <EndpointRow method="POST" path="/auth/login" description="Get JWT access token">
                <EndpointDetail label="Body" code={`{ "email": "user@example.com", "password": "secret123" }`} />
                <EndpointDetail label="Response" code={`{ "access_token": "eyJ...", "token_type": "bearer" }`} />
              </EndpointRow>
              <EndpointRow method="GET" path="/auth/me" description="Get current user info — auth required" />
            </div>

            {/* Marketplace */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1">Marketplace</h3>
              <EndpointRow method="GET" path="/api/plans" description="List available rental plans">
                <EndpointDetail
                  label="Response (example)"
                  code={`[
  {
    "id": 1,
    "duration_label": "1 Hour",
    "duration_minutes": 60,
    "token_cap": 80000,
    "rpm_limit": 60,
    "price": 49.0,
    "is_active": true
  }
]`}
                />
              </EndpointRow>
              <EndpointRow method="GET" path="/api/active-providers" description="List active AI providers available for rental" />
              <EndpointRow method="GET" path="/api/rentals/active" description="List your active rentals — auth required">
                <EndpointDetail
                  label="Response (example)"
                  code={`[
  {
    "id": 42,
    "virtual_key": "vk_abc123...",
    "provider": "openai",
    "status": "ACTIVE",
    "tokens_remaining": 72000,
    "expires_at": "2025-04-22T15:00:00Z"
  }
]`}
                />
              </EndpointRow>
            </div>

            {/* Payment */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1">Payment</h3>
              <EndpointRow method="POST" path="/api/checkout/session" description="Create payment session — auth required">
                <EndpointDetail
                  label="Body"
                  code={`{
  "plan_id": 1,
  "provider": "openai",
  "customer_phone": "9876543210"
}`}
                />
                <EndpointDetail
                  label="Response"
                  code={`{ "payment_session_id": "session_abc123..." }`}
                />
              </EndpointRow>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1">Status</h3>
              <EndpointRow method="GET" path="/health" description="Health check — returns 200 OK if API is running" />
              <EndpointRow method="GET" path="/status/" description="Full system status including database and Redis" />
            </div>
          </div>
        </motion.section>

        {/* Section 5: Supported Models */}
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center border border-violet-500/20">
              <Table2 className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Supported Models</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            <span className="text-violet-400 font-medium">Drain rate</span> — higher drain rate = tokens consumed faster.
            A 10x model uses 10x tokens per request compared to a 1x model.
          </p>
          <div className="bg-[#111] border border-white/[0.08] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold text-xs uppercase tracking-widest">Model ID</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold text-xs uppercase tracking-widest">Provider</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold text-xs uppercase tracking-widest">Drain Rate</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold text-xs uppercase tracking-widest hidden md:table-cell">Best For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {MODELS.map((m) => (
                  <tr key={m.model} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <code className="font-mono text-violet-300 text-xs">{m.model}</code>
                    </td>
                    <td className="px-5 py-4 text-gray-300">{m.provider}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 font-mono">
                        {m.drain}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 hidden md:table-cell">{m.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Section 6: Error Reference */}
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-rose-600/20 flex items-center justify-center border border-rose-500/20">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Error Reference</h2>
          </div>
          <div className="bg-[#111] border border-white/[0.08] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold text-xs uppercase tracking-widest">Code</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold text-xs uppercase tracking-widest">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {ERRORS.map((e) => (
                  <tr key={e.code} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                        {e.code}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-300">{e.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Section 7: CTA */}
        <motion.section variants={fadeIn} initial="hidden" whileInView="show" viewport={viewport}>
          <div className="bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 border border-violet-500/20 rounded-lg p-10 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to build?</h2>
            <p className="text-gray-400 mb-7 max-w-md mx-auto">
              Purchase a plan on the marketplace, get your virtual key instantly, and start making API calls in minutes.
            </p>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Browse Plans
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.section>

      </div>

      <Footer />
    </div>
  );
}
