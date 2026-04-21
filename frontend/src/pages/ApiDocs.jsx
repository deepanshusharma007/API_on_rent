import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Check, BookOpen, Key, Code2, Table2, AlertTriangle, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeIn, staggerContainer, viewport } from '../lib/motion.jsx';

const BASE_URL = 'https://api-on-rent-backend.onrender.com/v1';

const CODE_EXAMPLES = {
  Python: {
    lang: 'python',
    code: `from openai import OpenAI

client = OpenAI(
    api_key="vk_your_key_here",
    base_url="https://api-on-rent-backend.onrender.com/v1"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
    max_tokens=500
)
print(response.choices[0].message.content)`,
  },
  JavaScript: {
    lang: 'javascript',
    code: `const response = await fetch("https://api-on-rent-backend.onrender.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer vk_your_key_here"
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Hello!" }],
    max_tokens: 500
  })
});
const data = await response.json();
console.log(data.choices[0].message.content);`,
  },
  'Node.js': {
    lang: 'javascript',
    code: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "vk_your_key_here",
  baseURL: "https://api-on-rent-backend.onrender.com/v1"
});

const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
  max_tokens: 500
});
console.log(response.choices[0].message.content);`,
  },
  cURL: {
    lang: 'bash',
    code: `curl https://api-on-rent-backend.onrender.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer vk_your_key_here" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 500
  }'`,
  },
  PHP: {
    lang: 'php',
    code: `<?php
$response = file_get_contents('https://api-on-rent-backend.onrender.com/v1/chat/completions', false, stream_context_create([
  'http' => [
    'method' => 'POST',
    'header' => "Content-Type: application/json\\r\\nAuthorization: Bearer vk_your_key_here",
    'content' => json_encode([
      'model' => 'gpt-4o-mini',
      'messages' => [['role' => 'user', 'content' => 'Hello!']],
      'max_tokens' => 500
    ])
  ]
]));
echo json_decode($response)->choices[0]->message->content;`,
  },
};

const MODELS = [
  { model: 'gpt-4o', provider: 'OpenAI', drain: '10×', best: 'Complex reasoning' },
  { model: 'gpt-4o-mini', provider: 'OpenAI', drain: '3×', best: 'Fast & affordable' },
  { model: 'gemini-1.5-flash', provider: 'Google', drain: '1×', best: 'High-volume tasks' },
  { model: 'gemini-1.5-pro', provider: 'Google', drain: '5×', best: 'Multimodal tasks' },
  { model: 'claude-3-5-sonnet-20241022', provider: 'Anthropic', drain: '8×', best: 'Writing & analysis' },
];

const ERRORS = [
  { code: '401', label: 'Unauthorized', desc: 'Invalid or expired virtual key.' },
  { code: '402', label: 'Payment Required', desc: 'Insufficient tokens remaining on your key.' },
  { code: '403', label: 'Forbidden', desc: 'Wrong provider selected for this virtual key.' },
  { code: '429', label: 'Too Many Requests', desc: 'Rate limit exceeded. Slow down your requests.' },
];

function CopyButton({ text, className = '' }) {
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
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1] border border-white/[0.08]'
      } ${className}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
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

export default function ApiDocs() {
  const [activeTab, setActiveTab] = useState('Python');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-5 md:px-8 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/10 rounded-full blur-3xl" />
        </div>
        <motion.div
          variants={staggerContainer(0.12, 0.1)}
          initial="hidden"
          animate="show"
          className="relative max-w-3xl mx-auto"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            Developer Reference
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4">
            API <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Documentation</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg text-gray-400">
            Use your virtual key with any OpenAI-compatible SDK — drop it in and go.
          </motion.p>
        </motion.div>
      </section>

      <div className="max-w-4xl mx-auto px-5 md:px-8 pb-24 space-y-12">

        {/* Base URL & Auth */}
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center border border-violet-500/20">
              <Key className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Base URL &amp; Authentication</h2>
          </div>
          <div className="bg-[#111] border border-white/[0.08] rounded-lg p-6 space-y-5">
            {/* Base URL */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-semibold">Base URL</p>
              <div className="flex items-center gap-3 bg-black/50 border border-white/[0.08] rounded-lg px-4 py-3">
                <code className="flex-1 font-mono text-sm text-violet-300">{BASE_URL}</code>
                <CopyButton text={BASE_URL} />
              </div>
            </div>
            {/* Auth */}
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
              Replace <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">vk_your_key_here</code> with the virtual key you receive after purchase.
            </p>
          </div>
        </motion.section>

        {/* Code Examples */}
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center border border-violet-500/20">
              <Code2 className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Code Examples</h2>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 flex-wrap bg-[#111] border border-white/[0.08] rounded-lg p-1 mb-4">
            {Object.keys(CODE_EXAMPLES).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <CodeBlock code={CODE_EXAMPLES[activeTab].code} />
        </motion.section>

        {/* Supported Models */}
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center border border-violet-500/20">
              <Table2 className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Supported Models</h2>
          </div>
          <div className="bg-[#111] border border-white/[0.08] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold text-xs uppercase tracking-widest">Model</th>
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                        {m.drain}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 hidden md:table-cell">{m.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Drain rate is relative to <code className="text-gray-500">gemini-1.5-flash</code> (baseline 1×). Higher drain = tokens deducted faster.
          </p>
        </motion.section>

        {/* Error Codes */}
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-rose-600/20 flex items-center justify-center border border-rose-500/20">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Error Codes</h2>
          </div>
          <div className="bg-[#111] border border-white/[0.08] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold text-xs uppercase tracking-widest">Status</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold text-xs uppercase tracking-widest">Name</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold text-xs uppercase tracking-widest">Description</th>
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
                    <td className="px-5 py-4 text-gray-300 font-medium">{e.label}</td>
                    <td className="px-5 py-4 text-gray-400">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section variants={fadeIn} initial="hidden" whileInView="show" viewport={viewport}>
          <div className="bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 border border-violet-500/20 rounded-lg p-10 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to start building?</h2>
            <p className="text-gray-400 mb-7 max-w-md mx-auto">
              Purchase a plan on the marketplace, get your virtual key instantly, and start making API calls in minutes.
            </p>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Get your virtual key
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.section>

      </div>

      <Footer />
    </div>
  );
}
