import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Copy, Code2, Loader2, Terminal, Zap, ChevronDown, ShoppingBag, History, Key, Settings, HelpCircle, LogOut, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { providersAPI, marketplaceAPI } from '../api/client';
import { buildDynamicCatalogue, getProviderMeta } from '../lib/providerMeta.jsx';
import useAuthStore from '../store/authStore';

const EASE = [0.22, 1, 0.36, 1];

const SIDEBAR_NAV = [
  { id: 'marketplace', label: 'Marketplace',   icon: ShoppingBag, to: '/marketplace' },
  { id: 'active',      label: 'Active Rentals', icon: Zap,         to: '/dashboard?tab=active'  },
  { id: 'history',     label: 'Usage History',  icon: History,     to: '/dashboard?tab=history' },
  { id: 'keys',        label: 'API Keys',        icon: Key,         to: '/dashboard?tab=keys'   },
  { id: 'playground',  label: 'Playground',      icon: Terminal,    to: '/playground' },
];

export default function Playground() {
  const [virtualKey,   setVirtualKey]   = useState('');
  const [model,        setModel]        = useState('');
  const [prompt,       setPrompt]       = useState('Hello! Can you tell me a short joke?');
  const [maxTokens,    setMaxTokens]    = useState(500);
  const [streaming,    setStreaming]    = useState(false);
  const [response,     setResponse]     = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [allModels,    setAllModels]    = useState([]);
  const [modelOpen,    setModelOpen]    = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    Promise.all([marketplaceAPI.getPlans(), providersAPI.getActiveProviders()])
      .then(([plansRes, providersRes]) => {
        const catalogue = buildDynamicCatalogue(plansRes.data, providersRes.data.providers);
        setAllModels(catalogue);
        if (catalogue.length > 0) setModel(catalogue[0].id);
      })
      .catch(() => setAllModels([]));
  }, []);

  const selectedModel = allModels.find(m => m.id === model);

  const sendRequest = async () => {
    if (!virtualKey.trim()) { toast.error('Enter your Virtual API Key'); return; }
    setLoading(true); setResponse(null); setResponseTime(null);
    const t0 = Date.now();
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const body = { model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens, stream: streaming };
    try {
      if (streaming) {
        const res = await fetch(`${base}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${virtualKey}` }, body: JSON.stringify(body) });
        if (!res.ok) { const err = await res.json(); throw new Error(err.detail || `HTTP ${res.status}`); }
        const reader = res.body.getReader(); const decoder = new TextDecoder(); let full = '';
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
            const d = line.replace('data: ', '');
            if (d === '[DONE]') continue;
            try { full += JSON.parse(d).choices?.[0]?.delta?.content || ''; setResponse({ content: full, streaming: true }); } catch {}
          }
        }
        setResponseTime(Date.now() - t0); setResponse({ content: full, streaming: false });
      } else {
        const res = await fetch(`${base}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${virtualKey}` }, body: JSON.stringify(body) });
        const data = await res.json(); setResponseTime(Date.now() - t0);
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
        setResponse({ content: data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2), usage: data.usage, model: data.model });
      }
    } catch (err) { toast.error(err.message); setResponse({ error: err.message }); }
    finally { setLoading(false); }
  };

  const generateCurl = () => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    navigator.clipboard.writeText(`curl -X POST ${base}/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${virtualKey || 'YOUR_VIRTUAL_KEY'}" \\\n  -d '${JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }, null, 2)}'`);
    toast.success('cURL copied!');
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', outline: 'none',
    fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: '#e8edf8',
    boxSizing: 'border-box', transition: 'border-color 150ms',
  };

  const monoLabel = {
    display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
    fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(192,193,255,0.5)', marginBottom: '8px',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0a0d14', fontFamily: 'var(--font-body)' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: '220px', flexShrink: 0, background: '#0d1017', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, overflowY: 'auto' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--on-primary)' }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <Link to="/" style={{ textDecoration: 'none' }}><div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.875rem', color: '#e8edf8', transition: 'color 120ms' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = '#e8edf8'}>API Playground</div></Link>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--on-surface-3)', letterSpacing: '0.04em' }}>AIRent Infrastructure</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {SIDEBAR_NAV.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.id} to={item.to} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', marginBottom: '2px', textDecoration: 'none', background: 'transparent', color: 'var(--on-surface-2)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', transition: 'background 120ms, color 120ms' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e8edf8'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--on-surface-2)'; }}
              ><Icon size={15} />{item.label}</Link>
            );
          })}
        </nav>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 12px' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-3)', fontFamily: 'var(--font-body)', fontSize: '0.8125rem', borderRadius: '6px' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface-2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-3)'}
          onClick={() => setShowSettings(true)}><Settings size={13} /> Settings</button>
          <Link to="/contact" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-3)', fontFamily: 'var(--font-body)', fontSize: '0.8125rem', borderRadius: '6px', textDecoration: 'none', transition: 'color 120ms' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface-2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-3)'}
          ><HelpCircle size={13} /> Support</Link>
          <button onClick={async () => { await logout(); navigate('/login'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontFamily: 'var(--font-body)', fontSize: '0.8125rem', borderRadius: '6px', transition: 'color 120ms', marginTop: '4px' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fca5a5'}
            onMouseLeave={e => e.currentTarget.style.color = '#f87171'}
          ><LogOut size={13} /> Log out</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ marginLeft: '220px', flex: 1, minWidth: 0 }}>
        <div style={{ padding: 'clamp(28px,4vw,44px) clamp(24px,4vw,48px)', minHeight: '100vh' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(1.6rem,3vw,2.2rem)', color: '#e8edf8', letterSpacing: '-0.02em', marginBottom: '6px' }}>API Playground</h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface-2)' }}>Test your virtual key live — real requests, real responses.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--secondary)', boxShadow: '0 0 6px var(--secondary)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--secondary)' }}>LIVE</span>
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }} className="pg-grid">

            {/* LEFT — Request */}
            <div style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
              {/* Panel header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#141820', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={13} color="var(--primary)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--on-surface-2)' }}>REQUEST</span>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Virtual key */}
                <div>
                  <label style={monoLabel}>VIRTUAL API KEY</label>
                  <input type="text" value={virtualKey} onChange={e => setVirtualKey(e.target.value)} placeholder="vk_xxxxxxxxxxxxxxxx"
                    style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(192,193,255,0.35)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                {/* Model selector */}
                <div style={{ position: 'relative' }}>
                  <label style={monoLabel}>MODEL</label>
                  <button onClick={() => setModelOpen(o => !o)} style={{
                    width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${modelOpen ? 'rgba(192,193,255,0.35)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: '#e8edf8', textAlign: 'left',
                  }}>
                    <span>{selectedModel ? `${selectedModel.label} · ${getProviderMeta(selectedModel.providerKey).name}` : 'Select a model'}</span>
                    <ChevronDown size={14} color="var(--on-surface-3)" style={{ transform: modelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
                  </button>
                  <AnimatePresence>
                    {modelOpen && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                        style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#141820', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', zIndex: 20 }}>
                        {allModels.length === 0
                          ? <div style={{ padding: '16px', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--on-surface-3)', textAlign: 'center' }}>No models available</div>
                          : allModels.map(m => (
                            <button key={m.id} onClick={() => { setModel(m.id); setModelOpen(false); }} style={{
                              width: '100%', padding: '11px 16px', background: model === m.id ? 'rgba(192,193,255,0.08)' : 'transparent',
                              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: model === m.id ? 'var(--primary)' : '#e8edf8',
                              textAlign: 'left', transition: 'background 120ms',
                            }}
                              onMouseEnter={e => { if (model !== m.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                              onMouseLeave={e => { if (model !== m.id) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <span>{m.label}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--on-surface-3)' }}>{getProviderMeta(m.providerKey).name}</span>
                            </button>
                          ))
                        }
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Prompt */}
                <div>
                  <label style={monoLabel}>PROMPT</label>
                  <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5} placeholder="Enter your prompt..."
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    onFocus={e => e.target.style.borderColor = 'rgba(192,193,255,0.35)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                {/* Max tokens + stream */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={monoLabel}>MAX TOKENS</label>
                    <input type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(192,193,255,0.35)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '12px', cursor: 'pointer' }} onClick={() => setStreaming(v => !v)}>
                    <div style={{ width: '38px', height: '20px', borderRadius: '10px', position: 'relative', background: streaming ? 'var(--secondary)' : 'rgba(255,255,255,0.08)', border: `1px solid ${streaming ? 'rgba(78,222,163,0.4)' : 'rgba(255,255,255,0.12)'}`, transition: 'all 200ms', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: '3px', width: '12px', height: '12px', borderRadius: '50%', background: streaming ? '#003824' : 'rgba(255,255,255,0.3)', left: streaming ? '22px' : '3px', transition: 'left 200ms' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, color: streaming ? 'var(--secondary)' : 'var(--on-surface-3)', letterSpacing: '0.08em', userSelect: 'none' }}>STREAM</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={sendRequest} disabled={loading} style={{
                    flex: 1, padding: '13px', borderRadius: '10px', border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    background: loading ? 'rgba(192,193,255,0.15)' : 'linear-gradient(135deg, #8083ff 0%, #c0c1ff 100%)',
                    color: loading ? 'rgba(255,255,255,0.4)' : '#0b0066',
                    fontFamily: 'var(--font-head)', fontSize: '0.9rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    opacity: loading ? 0.7 : 1, transition: 'filter 150ms',
                    boxShadow: loading ? 'none' : '0 4px 20px -6px rgba(192,193,255,0.3)',
                  }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.07)'; }}
                    onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
                  >
                    {loading ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Play size={14} />}
                    {loading ? 'Sending...' : 'Send Request'}
                  </button>
                  <button onClick={generateCurl} title="Copy as cURL" style={{
                    padding: '13px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)', cursor: 'pointer', color: 'var(--on-surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 120ms',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  ><Code2 size={15} /></button>
                </div>
              </div>
            </div>

            {/* RIGHT — Response */}
            <div style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '420px' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#141820', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={13} color="var(--secondary)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--on-surface-2)' }}>RESPONSE</span>
                  {response?.streaming && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--secondary)' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--secondary)', animation: 'pulse-dot 1s infinite' }} /> STREAMING
                    </span>
                  )}
                </div>
                {responseTime && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--on-surface-3)' }}>{responseTime}ms</span>}
              </div>

              <div style={{ flex: 1, padding: '20px' }}>
                <AnimatePresence mode="wait">
                  {!response && !loading && (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100%', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(192,193,255,0.06)', border: '1px solid rgba(192,193,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={18} color="var(--on-surface-4)" />
                      </div>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.08em', color: 'var(--on-surface-4)' }}>AWAITING REQUEST</p>
                    </motion.div>
                  )}
                  {loading && !response && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Loader2 size={28} color="var(--primary)" style={{ animation: 'spin 0.7s linear infinite' }} />
                    </motion.div>
                  )}
                  {response?.error && (
                    <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '16px', borderRadius: '10px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: '#f87171', marginBottom: '8px' }}>ERROR</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.6 }}>{response.error}</p>
                    </motion.div>
                  )}
                  {response?.content && (
                    <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', maxHeight: '320px', overflowY: 'auto' }}>
                        <pre style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: '#e8edf8', whiteSpace: 'pre-wrap', lineHeight: 1.75, margin: 0 }}>
                          {response.content}
                          {response.streaming && <span style={{ color: 'var(--secondary)', animation: 'pulse-dot 0.8s infinite' }}>▌</span>}
                        </pre>
                      </div>
                      {response.usage && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                          {[{ label: 'INPUT', val: response.usage.prompt_tokens }, { label: 'OUTPUT', val: response.usage.completion_tokens }, { label: 'TOTAL', val: response.usage.total_tokens }].map(({ label, val }) => (
                            <div key={label} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '4px' }}>{label}</div>
                              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: '#e8edf8' }}>{val}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {response.model && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--on-surface-3)' }}>MODEL: <span style={{ color: 'var(--on-surface-2)' }}>{response.model}</span></span>}
                      <button onClick={() => { navigator.clipboard.writeText(response.content); toast.success('Copied!'); }} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--on-surface-2)', transition: 'background 120ms' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      ><Copy size={12} /> Copy response</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Settings modal ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div key="settings-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
            <motion.div key="settings-panel" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.22, ease: EASE }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '440px', background: '#111520', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Settings size={16} color="var(--primary)" />
                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: '#e8edf8' }}>Settings</span>
                </div>
                <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-3)', padding: '4px', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '12px' }}>ACCOUNT</div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: '#0b0066' }}>
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', color: '#e8edf8' }}>{user?.email?.split('@')[0]}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--on-surface-3)' }}>{user?.email}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--primary)', marginTop: '2px', letterSpacing: '0.04em' }}>{user?.role || 'USER'}</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '12px' }}>QUICK LINKS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
                  {[
                    { label: 'Privacy Policy',   to: '/privacy-policy' },
                    { label: 'Terms of Service', to: '/terms' },
                    { label: 'Refund Policy',    to: '/refund-policy' },
                    { label: 'Contact Support',  to: '/contact' },
                  ].map(l => (
                    <Link key={l.to} to={l.to} onClick={() => setShowSettings(false)} style={{ padding: '9px 12px', borderRadius: '8px', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)', transition: 'background 120ms, color 120ms', display: 'block' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e8edf8'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--on-surface-2)'; }}
                    >{l.label}</Link>
                  ))}
                </div>
                <button onClick={async () => { setShowSettings(false); await logout(); navigate('/login'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.06)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: '#f87171', transition: 'background 120ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.06)'}
                >
                  <LogOut size={14} /> Sign out of account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @media (max-width: 860px) { .pg-grid { grid-template-columns: 1fr !important; } }
        textarea::placeholder, input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
