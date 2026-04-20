import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Copy, Code2, Loader2, Terminal, Zap, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { providersAPI, marketplaceAPI } from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeLeft, fadeRight, staggerContainer } from '../lib/motion';
import { buildDynamicCatalogue, getProviderMeta } from '../lib/providerMeta.jsx';

const inputClass = 'w-full px-3 py-2.5 rounded-lg bg-[#111] border border-white/[0.10] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-all text-sm font-mono';

export default function Playground() {
  const [virtualKey, setVirtualKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [prompt, setPrompt] = useState('Hello! Can you tell me a short joke?');
  const [maxTokens, setMaxTokens] = useState(500);
  const [streaming, setStreaming] = useState(false);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [allModels, setAllModels] = useState([]);

  useEffect(() => {
    Promise.all([marketplaceAPI.getPlans(), providersAPI.getActiveProviders()])
      .then(([plansRes, providersRes]) => {
        const catalogue = buildDynamicCatalogue(plansRes.data, providersRes.data.providers);
        setAllModels(catalogue);
        if (catalogue.length > 0 && !catalogue.find(m => m.id === model)) {
          setModel(catalogue[0].id);
        }
      })
      .catch(() => setAllModels([]));
  }, []);

  const MODELS = allModels;
  const selectedModel = MODELS.find(m => m.id === model) || MODELS[0];

  const sendRequest = async () => {
    if (!virtualKey.trim()) { toast.error('Please enter your Virtual API Key'); return; }
    setLoading(true);
    setResponse(null);
    setResponseTime(null);
    const startTime = Date.now();
    const requestBody = { model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens, stream: streaming };
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      if (streaming) {
        const res = await fetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${virtualKey}` },
          body: JSON.stringify(requestBody),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.detail || `HTTP ${res.status}`); }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const data = line.replace('data: ', '');
            if (data === '[DONE]') continue;
            try { fullContent += JSON.parse(data).choices?.[0]?.delta?.content || ''; setResponse({ content: fullContent, streaming: true }); } catch {}
          }
        }
        setResponseTime(Date.now() - startTime);
        setResponse({ content: fullContent, streaming: false });
      } else {
        const res = await fetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${virtualKey}` },
          body: JSON.stringify(requestBody),
        });
        const data = await res.json();
        setResponseTime(Date.now() - startTime);
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
        setResponse({ content: data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2), usage: data.usage, model: data.model });
      }
    } catch (error) {
      toast.error(error.message);
      setResponse({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const generateCurl = () => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const curl = `curl -X POST ${base}/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${virtualKey || 'YOUR_VIRTUAL_KEY'}" \\\n  -d '${JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }, null, 2)}'`;
    navigator.clipboard.writeText(curl);
    toast.success('cURL copied!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-8 px-5">
        <motion.div
          variants={staggerContainer(0.1)} initial="hidden" animate="show"
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={fadeUp} className="mb-6">
            <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-2">API Playground</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Test your <span className="text-violet-400">Virtual Key</span>
            </h1>
            <p className="text-gray-500 text-sm">Send live requests across all AI models and inspect responses in real time.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* Main grid */}
      <section className="px-5 pb-16 flex-1">
        <motion.div
          variants={staggerContainer(0.12)} initial="hidden" animate="show"
          className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {/* ── LEFT: Request Panel ── */}
          <motion.div variants={fadeLeft} className="space-y-4">
            {/* API Key */}
            <div className="bg-[#111] border border-white/[0.08] rounded-lg p-5">
              <label className="block text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Virtual API Key</label>
              <input
                type="text"
                value={virtualKey}
                onChange={e => setVirtualKey(e.target.value)}
                placeholder="vk_xxxxxxxxxxxxxxxx"
                className={inputClass}
              />
            </div>

            {/* Model Selector */}
            <div className="bg-[#111] border border-white/[0.08] rounded-lg p-5">
              <label className="block text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">Model</label>
              <div className="space-y-1.5">
                {MODELS.length === 0 && (
                  <p className="text-gray-600 text-sm py-4 text-center">No models available — admin hasn't added any provider keys yet.</p>
                )}
                {MODELS.map(m => {
                  const provMeta = getProviderMeta(m.providerKey);
                  return (
                    <button
                      key={m.id}
                      onClick={() => setModel(m.id)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all ${
                        model === m.id
                          ? `${provMeta.bg} ${provMeta.border}`
                          : 'bg-[#1a1a1a] border-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="text-left">
                        <div className={`font-medium text-sm ${model === m.id ? m.color : 'text-gray-300'}`}>{m.label}</div>
                        <div className="text-gray-600 text-xs">{provMeta.name || m.providerKey}</div>
                      </div>
                      <span className="text-lg">{m.emoji}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt */}
            <div className="bg-[#111] border border-white/[0.08] rounded-lg p-5">
              <label className="block text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Prompt</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                className={inputClass + ' resize-none font-sans'}
                placeholder="Enter your prompt..."
              />
              <div className="flex items-center gap-4 mt-4">
                <div className="flex-1">
                  <label className="text-xs text-gray-600 mb-1 block">Max Tokens</label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={e => setMaxTokens(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-5">
                  <div
                    onClick={() => setStreaming(v => !v)}
                    className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${streaming ? 'bg-violet-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${streaming ? 'left-5' : 'left-0.5'}`} />
                  </div>
                  <span className="text-sm text-gray-400">Stream</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <motion.button
                onClick={sendRequest}
                disabled={loading}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-4 h-4" />}
                {loading ? 'Sending...' : 'Send Request'}
              </motion.button>
              <motion.button
                onClick={generateCurl}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                title="Copy as cURL"
                className="px-4 py-3 bg-[#111] border border-white/[0.08] hover:border-white/[0.14] text-gray-400 hover:text-white rounded-lg transition-all"
              >
                <Code2 className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>

          {/* ── RIGHT: Response Panel ── */}
          <motion.div variants={fadeRight} className="bg-[#111] border border-white/[0.08] rounded-lg p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Response</h3>
                {response?.streaming && (
                  <span className="flex items-center gap-1 text-xs text-violet-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />streaming
                  </span>
                )}
              </div>
              {responseTime && (
                <span className="text-xs text-gray-600">{responseTime}ms</span>
              )}
            </div>

            <div className="flex-1 min-h-[300px]">
              <AnimatePresence mode="wait">
                {!response && !loading && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center py-12">
                    <Zap className="w-8 h-8 text-gray-800 mb-3" />
                    <p className="text-gray-600 text-sm">Send a request to see the response</p>
                  </motion.div>
                )}

                {loading && !response && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                  </motion.div>
                )}

                {response?.error && (
                  <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-red-300 text-sm font-mono">{response.error}</p>
                  </motion.div>
                )}

                {response?.content && (
                  <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="space-y-4">
                    <div className="p-4 rounded-lg bg-black/40 border border-white/[0.06] max-h-[360px] overflow-y-auto">
                      <pre className="text-emerald-400 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                        {response.content}
                        {response.streaming && <span className="animate-pulse text-violet-400">▌</span>}
                      </pre>
                    </div>

                    {response.usage && (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Input',  val: response.usage.prompt_tokens },
                          { label: 'Output', val: response.usage.completion_tokens },
                          { label: 'Total',  val: response.usage.total_tokens },
                        ].map(({ label, val }) => (
                          <div key={label} className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <div className="text-xs text-gray-600 mb-1">{label}</div>
                            <div className="text-white font-bold text-sm">{val}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {response.model && (
                      <p className="text-xs text-gray-700">Model: <span className="text-gray-500 font-mono">{response.model}</span></p>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { navigator.clipboard.writeText(response.content); toast.success('Copied!'); }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-white/[0.08] hover:border-white/[0.14] text-gray-400 hover:text-white rounded-lg text-sm transition-all"
                    >
                      <Copy className="w-4 h-4" />Copy Response
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
