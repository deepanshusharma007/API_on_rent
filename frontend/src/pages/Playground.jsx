import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Copy, Code2, Loader2, Terminal, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { providersAPI, marketplaceAPI } from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { buildDynamicCatalogue, getProviderMeta } from '../lib/providerMeta.jsx';

const EASE = [0.22, 1, 0.36, 1];
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });

const monoLabel = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6375rem',
  color: 'var(--nb-text-3)',
  letterSpacing: '0.08em',
  marginBottom: '8px',
};

export default function Playground() {
  const [virtualKey,   setVirtualKey]   = useState('');
  const [model,        setModel]        = useState('gpt-4o-mini');
  const [prompt,       setPrompt]       = useState('Hello! Can you tell me a short joke?');
  const [maxTokens,    setMaxTokens]    = useState(500);
  const [streaming,    setStreaming]    = useState(false);
  const [response,     setResponse]     = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [allModels,    setAllModels]    = useState([]);

  useEffect(() => {
    Promise.all([marketplaceAPI.getPlans(), providersAPI.getActiveProviders()])
      .then(([plansRes, providersRes]) => {
        const catalogue = buildDynamicCatalogue(plansRes.data, providersRes.data.providers);
        setAllModels(catalogue);
        if (catalogue.length > 0 && !catalogue.find(m => m.id === model)) setModel(catalogue[0].id);
      })
      .catch(() => setAllModels([]));
  }, []);

  const sendRequest = async () => {
    if (!virtualKey.trim()) { toast.error('Please enter your Virtual API Key'); return; }
    setLoading(true);
    setResponse(null);
    setResponseTime(null);
    const startTime   = Date.now();
    const requestBody = { model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens, stream: streaming };
    const base        = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      if (streaming) {
        const res = await fetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${virtualKey}` },
          body: JSON.stringify(requestBody),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.detail || `HTTP ${res.status}`); }
        const reader  = res.body.getReader();
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
        const res  = await fetch(`${base}/v1/chat/completions`, {
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nb-bg)' }}>
      <Navbar />

      {/* ── Hero ── */}
      <section
        className="nb-grid-hero"
        style={{
          paddingTop: 'clamp(120px,16vw,180px)',
          paddingBottom: 'clamp(32px,4vw,48px)',
          paddingLeft: 'clamp(20px,5vw,72px)',
          paddingRight: 'clamp(20px,5vw,72px)',
          borderBottom: '1px solid var(--nb-border)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to bottom, transparent, var(--nb-bg))', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1120px', margin: '0 auto', position: 'relative' }}>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
              <span style={{ width: '18px', height: '1px', background: 'var(--nb-green)', display: 'inline-block' }} />
              API PLAYGROUND
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp(0.06)} initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2.2rem,5vw,3.4rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--nb-text)', lineHeight: 0.98, marginBottom: '16px' }}
          >
            Test your key live.
          </motion.h1>
          <motion.p variants={fadeUp(0.12)} initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', color: 'var(--nb-text-2)', lineHeight: 1.75 }}
          >
            Send real requests across all AI models and inspect responses instantly.
          </motion.p>
        </div>
      </section>

      {/* ── Main grid ── */}
      <section style={{ flex: 1, padding: 'clamp(32px,5vw,56px) clamp(20px,5vw,72px) clamp(64px,9vw,104px)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }} className="pg-grid">

          {/* ── LEFT: Request Panel ── */}
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--nb-grid)', border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}>

            {/* API Key */}
            <div style={{ padding: '20px', background: 'var(--nb-surface)' }}>
              <label style={monoLabel}>VIRTUAL API KEY</label>
              <input
                type="text" value={virtualKey} onChange={e => setVirtualKey(e.target.value)}
                placeholder="vk_xxxxxxxxxxxxxxxx"
                className="field" style={{ borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
              />
            </div>

            {/* Model Selector */}
            <div style={{ padding: '20px', background: 'var(--nb-surface)' }}>
              <label style={monoLabel}>MODEL</label>
              {allModels.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--nb-text-3)', padding: '12px 0' }}>No models available — admin needs to add provider keys.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {allModels.map(m => {
                    const provMeta  = getProviderMeta(m.providerKey);
                    const isSelected = model === m.id;
                    return (
                      <button key={m.id} onClick={() => setModel(m.id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: '2px',
                          background: isSelected ? 'var(--nb-green-bg)' : 'var(--nb-raised)',
                          border: `1px solid ${isSelected ? 'var(--nb-green-border)' : 'var(--nb-border)'}`,
                          cursor: 'pointer', transition: 'all 120ms', textAlign: 'left',
                        }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.85rem', color: isSelected ? 'var(--nb-green)' : 'var(--nb-text)', letterSpacing: '-0.01em' }}>{m.label}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--nb-text-3)', letterSpacing: '0.03em', marginTop: '2px' }}>{provMeta.name || m.providerKey}</div>
                        </div>
                        <span style={{ fontSize: '1rem' }}>{m.emoji}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Prompt */}
            <div style={{ padding: '20px', background: 'var(--nb-surface)' }}>
              <label style={monoLabel}>PROMPT</label>
              <textarea
                value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
                placeholder="Enter your prompt..."
                className="field" style={{ fontFamily: 'var(--font-body)', resize: 'vertical', borderRadius: '4px' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...monoLabel, marginBottom: '6px' }}>MAX TOKENS</label>
                  <input
                    type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))}
                    className="field" style={{ borderRadius: '4px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px', cursor: 'pointer' }}
                  onClick={() => setStreaming(v => !v)}>
                  <div style={{
                    width: '36px', height: '18px', borderRadius: '9px', position: 'relative',
                    background: streaming ? 'var(--nb-green)' : 'var(--nb-raised)',
                    border: `1px solid ${streaming ? 'var(--nb-green-border)' : 'var(--nb-border)'}`,
                    transition: 'all 200ms',
                  }}>
                    <div style={{
                      position: 'absolute', top: '2px', width: '12px', height: '12px', borderRadius: '50%',
                      background: streaming ? 'oklch(12% 0.028 255)' : 'var(--nb-border-hi)',
                      left: streaming ? '20px' : '2px',
                      transition: 'left 200ms',
                    }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--nb-text-2)', letterSpacing: '0.04em', userSelect: 'none' }}>STREAM</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '16px 20px', background: 'var(--nb-surface)', display: 'flex', gap: '8px' }}>
              <button
                onClick={sendRequest} disabled={loading}
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '10px', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Play size={13} />}
                {loading ? 'Sending...' : 'Send request'}
              </button>
              <button onClick={generateCurl} className="btn btn-secondary" style={{ padding: '10px 14px' }} title="Copy as cURL">
                <Code2 size={14} />
              </button>
            </div>
          </motion.div>

          {/* ── RIGHT: Response Panel ── */}
          <motion.div variants={fadeUp(0.08)} initial="hidden" animate="show"
            style={{ border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden', background: 'var(--nb-surface)', display: 'flex', flexDirection: 'column', minHeight: '400px' }}
          >
            {/* Response header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-raised)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={13} style={{ color: 'var(--nb-green)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--nb-text-2)', letterSpacing: '0.04em' }}>RESPONSE</span>
                {response?.streaming && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--nb-green)' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--nb-green)', animation: 'nb-pulse 1s infinite', display: 'inline-block' }} />
                    STREAMING
                  </span>
                )}
              </div>
              {responseTime && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--nb-text-3)', letterSpacing: '0.04em' }}>{responseTime}ms</span>
              )}
            </div>

            <div style={{ flex: 1, padding: '20px' }}>
              <AnimatePresence mode="wait">
                {!response && !loading && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ height: '100%', minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '2px', background: 'var(--nb-raised)', border: '1px solid var(--nb-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <Zap size={16} style={{ color: 'var(--nb-text-4)' }} />
                    </div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--nb-text-4)', letterSpacing: '0.06em' }}>AWAITING REQUEST</p>
                  </motion.div>
                )}

                {loading && !response && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={24} style={{ color: 'var(--nb-green)', animation: 'spin 0.7s linear infinite' }} />
                  </motion.div>
                )}

                {response?.error && (
                  <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ padding: '16px', borderRadius: '4px', background: 'oklch(18% 0.05 15)', border: '1px solid oklch(28% 0.1 15)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'oklch(68% 0.2 15)', letterSpacing: '0.04em' }}>ERROR</span>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'oklch(78% 0.15 15)', marginTop: '8px', lineHeight: 1.6 }}>{response.error}</p>
                  </motion.div>
                )}

                {response?.content && (
                  <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '16px', borderRadius: '4px', background: 'var(--nb-bg)', border: '1px solid var(--nb-border)', maxHeight: '360px', overflowY: 'auto' }}>
                      <pre style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--nb-text)', whiteSpace: 'pre-wrap', lineHeight: 1.75, margin: 0 }}>
                        {response.content}
                        {response.streaming && <span style={{ color: 'var(--nb-green)', animation: 'nb-pulse 0.8s infinite' }}>▌</span>}
                      </pre>
                    </div>

                    {response.usage && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--nb-grid)', border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}>
                        {[
                          { label: 'INPUT',  val: response.usage.prompt_tokens },
                          { label: 'OUTPUT', val: response.usage.completion_tokens },
                          { label: 'TOTAL',  val: response.usage.total_tokens },
                        ].map(({ label, val }) => (
                          <div key={label} style={{ padding: '12px', background: 'var(--nb-surface)', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--nb-text-3)', letterSpacing: '0.08em', marginBottom: '6px' }}>{label}</div>
                            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--nb-text)' }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {response.model && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--nb-text-3)', letterSpacing: '0.04em' }}>
                        MODEL: <span style={{ color: 'var(--nb-text-2)' }}>{response.model}</span>
                      </span>
                    )}

                    <button
                      onClick={() => { navigator.clipboard.writeText(response.content); toast.success('Copied!'); }}
                      className="btn btn-secondary"
                      style={{ alignSelf: 'flex-start', fontSize: '0.8rem' }}
                    >
                      <Copy size={12} /> Copy response
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes nb-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media (max-width: 860px) { .pg-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
