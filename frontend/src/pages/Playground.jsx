import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Copy, Code2, Loader2, Terminal, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { providersAPI, marketplaceAPI } from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeLeft, fadeRight, staggerContainer } from '../lib/motion';
import { buildDynamicCatalogue, getProviderMeta } from '../lib/providerMeta.jsx';

export default function Playground() {
  const [virtualKey,    setVirtualKey]    = useState('');
  const [model,         setModel]         = useState('gpt-4o-mini');
  const [prompt,        setPrompt]        = useState('Hello! Can you tell me a short joke?');
  const [maxTokens,     setMaxTokens]     = useState(500);
  const [streaming,     setStreaming]     = useState(false);
  const [response,      setResponse]      = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [responseTime,  setResponseTime]  = useState(null);
  const [allModels,     setAllModels]     = useState([]);

  useEffect(() => {
    Promise.all([marketplaceAPI.getPlans(), providersAPI.getActiveProviders()])
      .then(([plansRes, providersRes]) => {
        const catalogue = buildDynamicCatalogue(plansRes.data, providersRes.data.providers);
        setAllModels(catalogue);
        if (catalogue.length > 0 && !catalogue.find(m => m.id === model)) setModel(catalogue[0].id);
      })
      .catch(() => setAllModels([]));
  }, []);

  const MODELS = allModels;

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

  const fieldStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '7px',
    background: 'var(--c-raised)', border: '1px solid var(--c-border)',
    color: 'var(--c-text)', fontSize: '0.875rem', fontFamily: 'monospace',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 150ms',
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ paddingTop: '120px', paddingBottom: '32px', paddingLeft: '20px', paddingRight: '20px' }}>
        <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show" className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp}>
            <p className="eyebrow mb-3">API Playground</p>
            <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', marginBottom: '6px' }}>
              Test your Virtual Key
            </h1>
            <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem' }}>
              Send live requests across all AI models and inspect responses in real time.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Main grid */}
      <section style={{ padding: '0 20px 80px', flex: 1 }}>
        <motion.div
          variants={staggerContainer(0.12)} initial="hidden" animate="show"
          className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {/* LEFT: Request Panel */}
          <motion.div variants={fadeLeft} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* API Key */}
            <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '20px' }}>
              <label style={{ display: 'block', color: 'var(--c-text-3)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Virtual API Key
              </label>
              <input
                type="text" value={virtualKey} onChange={e => setVirtualKey(e.target.value)}
                placeholder="vk_xxxxxxxxxxxxxxxx"
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--c-accent)'}
                onBlur={e  => e.target.style.borderColor = 'var(--c-border)'}
              />
            </div>

            {/* Model Selector */}
            <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '20px' }}>
              <label style={{ display: 'block', color: 'var(--c-text-3)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                Model
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {MODELS.length === 0 && (
                  <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem', padding: '16px 0', textAlign: 'center' }}>
                    No models available — admin hasn't added any provider keys yet.
                  </p>
                )}
                {MODELS.map(m => {
                  const provMeta = getProviderMeta(m.providerKey);
                  const isSelected = model === m.id;
                  return (
                    <button key={m.id} onClick={() => setModel(m.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: '8px',
                        background: isSelected ? 'var(--c-accent-bg)' : 'var(--c-raised)',
                        border: `1px solid ${isSelected ? 'var(--c-accent-border)' : 'var(--c-border)'}`,
                        cursor: 'pointer', transition: 'all 150ms', textAlign: 'left',
                      }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? 'var(--c-accent-hi)' : 'var(--c-text)' }}>{m.label}</div>
                        <div style={{ color: 'var(--c-text-3)', fontSize: '0.75rem' }}>{provMeta.name || m.providerKey}</div>
                      </div>
                      <span style={{ fontSize: '1.1rem' }}>{m.emoji}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt */}
            <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '20px' }}>
              <label style={{ display: 'block', color: 'var(--c-text-3)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Prompt
              </label>
              <textarea
                value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
                placeholder="Enter your prompt..."
                style={{ ...fieldStyle, fontFamily: 'inherit', resize: 'none' }}
                onFocus={e => e.target.style.borderColor = 'var(--c-accent)'}
                onBlur={e  => e.target.style.borderColor = 'var(--c-border)'}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: 'var(--c-text-3)', fontSize: '0.75rem', marginBottom: '4px' }}>Max Tokens</label>
                  <input
                    type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))}
                    style={fieldStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--c-accent)'}
                    onBlur={e  => e.target.style.borderColor = 'var(--c-border)'}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px', cursor: 'pointer' }}
                  onClick={() => setStreaming(v => !v)}>
                  <div style={{
                    width: '38px', height: '20px', borderRadius: '10px', position: 'relative',
                    background: streaming ? 'var(--c-accent)' : 'var(--c-raised)',
                    border: `1px solid ${streaming ? 'var(--c-accent-border)' : 'var(--c-border)'}`,
                    transition: 'all 200ms',
                  }}>
                    <div style={{
                      position: 'absolute', top: '2px', width: '14px', height: '14px', borderRadius: '50%',
                      background: streaming ? '#022c22' : 'var(--c-border-hi)',
                      left: streaming ? '21px' : '2px',
                      transition: 'left 200ms',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.825rem', color: 'var(--c-text-2)', userSelect: 'none' }}>Stream</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={sendRequest} disabled={loading}
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '11px', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Play size={14} />}
                {loading ? 'Sending…' : 'Send Request'}
              </button>
              <button
                onClick={generateCurl}
                className="btn btn-secondary"
                style={{ padding: '11px 14px' }}
                title="Copy as cURL"
              >
                <Code2 size={16} />
              </button>
            </div>
          </motion.div>

          {/* RIGHT: Response Panel */}
          <motion.div variants={fadeRight} style={{
            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
            borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={14} style={{ color: 'var(--c-accent)' }} />
                <h3 style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.875rem' }}>Response</h3>
                {response?.streaming && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--c-accent)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--c-accent)', animation: 'pulse 1s infinite' }} />
                    streaming
                  </span>
                )}
              </div>
              {responseTime && (
                <span style={{ fontSize: '0.75rem', color: 'var(--c-text-3)' }}>{responseTime}ms</span>
              )}
            </div>

            <div style={{ flex: 1, minHeight: '300px' }}>
              <AnimatePresence mode="wait">
                {!response && !loading && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 0' }}>
                    <Zap size={28} style={{ color: 'var(--c-text-3)', marginBottom: '12px' }} />
                    <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem' }}>Send a request to see the response</p>
                  </motion.div>
                )}

                {loading && !response && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={28} style={{ color: 'var(--c-accent)', animation: 'spin 0.7s linear infinite' }} />
                  </motion.div>
                )}

                {response?.error && (
                  <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ padding: '16px', borderRadius: '8px', background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)' }}>
                    <p style={{ color: 'var(--c-danger)', fontSize: '0.875rem', fontFamily: 'monospace' }}>{response.error}</p>
                  </motion.div>
                )}

                {response?.content && (
                  <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                      padding: '16px', borderRadius: '8px',
                      background: 'var(--c-raised)', border: '1px solid var(--c-border)',
                      maxHeight: '360px', overflowY: 'auto',
                    }}>
                      <pre style={{ color: 'var(--c-text)', fontSize: '0.825rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.7, margin: 0 }}>
                        {response.content}
                        {response.streaming && <span style={{ animation: 'pulse 0.8s infinite', color: 'var(--c-accent-hi)' }}>▌</span>}
                      </pre>
                    </div>

                    {response.usage && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {[
                          { label: 'Input',  val: response.usage.prompt_tokens },
                          { label: 'Output', val: response.usage.completion_tokens },
                          { label: 'Total',  val: response.usage.total_tokens },
                        ].map(({ label, val }) => (
                          <div key={label} style={{ textAlign: 'center', padding: '12px', borderRadius: '8px', background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                            <div style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '0.875rem' }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {response.model && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--c-text-3)' }}>
                        Model: <span style={{ color: 'var(--c-text-2)', fontFamily: 'monospace' }}>{response.model}</span>
                      </p>
                    )}

                    <button
                      onClick={() => { navigator.clipboard.writeText(response.content); toast.success('Copied!'); }}
                      className="btn btn-secondary"
                      style={{ alignSelf: 'flex-start', fontSize: '0.8rem' }}
                    >
                      <Copy size={13} /> Copy Response
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <Footer />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
