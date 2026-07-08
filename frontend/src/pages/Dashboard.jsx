import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, History, Key, Settings, HelpCircle,
  Copy, CheckCircle2, AlertTriangle, Zap, Clock, LogOut, X, Terminal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceAPI, invoiceAPI, paymentAPI } from '../api/client';
import CountdownTimer from '../components/CountdownTimer';
import TokenProgressBar from '../components/TokenProgressBar';
import useAuthStore from '../store/authStore';

const EASE = [0.22, 1, 0.36, 1];
const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');

const NAV = [
  { id: 'marketplace', label: 'Marketplace',    icon: ShoppingBag, to: '/marketplace' },
  { id: 'active',      label: 'Active Rentals',  icon: Zap         },
  { id: 'history',     label: 'Usage History',   icon: History     },
  { id: 'keys',        label: 'API Keys',         icon: Key         },
  { id: 'playground',  label: 'Playground',       icon: Terminal,   to: '/playground' },
];

/* ── mini bar chart for latency ── */
const BAR_DATA = [5, 7, 4, 8, 9, 6, 5, 8, 10, 7];
function LatencyChart() {
  const max = Math.max(...BAR_DATA);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '48px', marginTop: '16px' }}>
      {BAR_DATA.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: '3px 3px 0 0',
          height: `${(v / max) * 100}%`,
          background: i === BAR_DATA.length - 1 ? 'var(--secondary)' : 'rgba(78,222,163,0.3)',
        }} />
      ))}
    </div>
  );
}

/* ── config row ── */
function ConfigRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--on-surface-2)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: '#e8edf8' }}>{value}</span>
    </div>
  );
}

/* ── history status badge ── */
function StatusBadge({ status }) {
  const cfg = status === 'active'
    ? { color: 'var(--secondary)', bg: 'rgba(78,222,163,0.1)', dot: 'var(--secondary)', label: 'COMPLETED' }
    : { color: 'var(--on-surface-3)', bg: 'rgba(255,255,255,0.05)', dot: 'rgba(255,255,255,0.3)', label: 'EXPIRED' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '999px', background: cfg.bg, fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: cfg.color }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

export default function Dashboard() {
  const [activeRentals,  setActiveRentals]  = useState([]);
  const [historyRentals, setHistoryRentals] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState(() => {
    const p = new URLSearchParams(window.location.search).get('tab');
    return ['active','history','keys'].includes(p) ? p : 'active';
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [copiedKey,      setCopiedKey]      = useState(null);
  const wsRefs   = useRef({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuthStore();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    if (searchParams.get('payment') === 'success' && orderId) {
      setPaymentSuccess(true);
      toast.success('Payment successful! Your rental will activate shortly.');
      paymentAPI.verifyOrder(orderId).catch(() => {});
    }
    loadRentals();
    const interval = setInterval(loadRentals, 30000);
    return () => {
      clearInterval(interval);
      Object.values(wsRefs.current).forEach(ws => ws.close());
    };
  }, []);

  const connectWebSocket = (rentalId) => {
    if (wsRefs.current[rentalId]) return;
    const token = localStorage.getItem('auth_token');
    const ws = new WebSocket(`${WS_BASE}/ws/usage/${rentalId}?token=${token}`);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'usage_update') {
          setActiveRentals(prev => prev.map(r =>
            r.id === rentalId ? { ...r, tokens_used: data.tokens_used, tokens_remaining: data.tokens_remaining } : r
          ));
        } else if (data.type === 'rental_expired') {
          setActiveRentals(prev => prev.filter(r => r.id !== rentalId));
          loadRentals();
        }
      } catch {}
    };
    ws.onerror = () => ws.close();
    ws.onclose = () => { delete wsRefs.current[rentalId]; };
    wsRefs.current[rentalId] = ws;
  };

  const loadRentals = async () => {
    try {
      const activeRes = await marketplaceAPI.getActiveRentals();
      setActiveRentals(activeRes.data);
      activeRes.data.forEach(r => connectWebSocket(r.id));
      try {
        const token = localStorage.getItem('auth_token');
        const histRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/rentals/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (histRes.ok) setHistoryRentals(await histRes.json());
      } catch { setHistoryRentals([]); }
    } catch {
      toast.error('Failed to load rentals');
    } finally {
      setLoading(false);
    }
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success('Key copied!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleInvoice = async (rentalId) => {
    try {
      const res = await invoiceAPI.getInvoiceHtml(rentalId);
      const blob = new Blob([res.data], { type: 'text/html' });
      window.open(window.URL.createObjectURL(blob), '_blank');
    } catch { toast.error('Failed to load invoice'); }
  };

  const firstActive = activeRentals[0] || null;
  const totalCap = firstActive ? (firstActive.tokens_used + firstActive.tokens_remaining) : 0;
  const usedPct  = totalCap ? Math.round((firstActive.tokens_used / totalCap) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0a0d14', fontFamily: 'var(--font-body)' }}>

      {/* ══ SIDEBAR ══ */}
      <aside style={{
        width: '220px', flexShrink: 0, background: '#0d1017',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1rem', color: '#e8edf8', letterSpacing: '-0.02em', transition: 'color 120ms' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.color = '#e8edf8'}
            >
              Developer<span style={{ color: 'var(--primary)' }}>Console</span>
            </div>
          </Link>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--on-surface-3)', marginTop: '3px', letterSpacing: '0.04em' }}>
            AIRent Infrastructure
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {NAV.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            if (item.to) {
              return (
                <Link key={item.id} to={item.to} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '8px', marginBottom: '2px',
                  textDecoration: 'none',
                  color: 'var(--on-surface-2)',
                  fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                  transition: 'background 120ms, color 120ms',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e8edf8'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--on-surface-2)'; }}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            }
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                padding: '10px 12px', borderRadius: '8px', marginBottom: '2px',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                background: isActive ? 'rgba(192,193,255,0.12)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--on-surface-2)',
                fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: isActive ? 600 : 400,
                transition: 'background 120ms, color 120ms',
              }}>
                <Icon size={15} />
                {item.label}
                {item.id === 'active' && activeRentals.length > 0 && (
                  <span style={{ marginLeft: 'auto', minWidth: '18px', height: '16px', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700 }}>
                    {activeRentals.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: user + actions */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 12px' }}>
          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px', marginBottom: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--on-primary)' }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600, color: '#e8edf8', lineHeight: 1.2 }}>{user?.email?.split('@')[0] || 'User'}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--on-surface-3)', letterSpacing: '0.04em' }}>Developer</div>
            </div>
          </div>

          <button onClick={() => setShowSettings(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-3)', fontFamily: 'var(--font-body)', fontSize: '0.8125rem', borderRadius: '6px', transition: 'color 120ms' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface-2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-3)'}
          >
            <Settings size={13} /> Settings
          </button>
          <Link to="/contact" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-3)', fontFamily: 'var(--font-body)', fontSize: '0.8125rem', borderRadius: '6px', transition: 'color 120ms', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface-2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-3)'}
          >
            <HelpCircle size={13} /> Support
          </Link>
          <button onClick={async () => { await logout(); navigate('/login'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontFamily: 'var(--font-body)', fontSize: '0.8125rem', borderRadius: '6px', transition: 'color 120ms', marginTop: '4px' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fca5a5'}
            onMouseLeave={e => e.currentTarget.style.color = '#f87171'}
          >
            <LogOut size={13} /> Log out
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <div style={{ marginLeft: '220px', flex: 1, minWidth: 0 }}>
        <div style={{ padding: 'clamp(28px,4vw,44px) clamp(24px,4vw,48px)', minHeight: '100vh' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(1.6rem,3vw,2.2rem)', color: '#e8edf8', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                {activeTab === 'active' ? 'Active Rentals' : activeTab === 'history' ? 'Usage History' : 'API Keys'}
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface-2)' }}>
                {activeTab === 'active' ? 'Manage your live high-performance AI instances.' : activeTab === 'history' ? 'Review your past API consumption and costs.' : 'Your virtual API keys.'}
              </p>
            </div>
            {/* System status */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '4px' }}>SYSTEM STATUS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--secondary)', boxShadow: '0 0 6px var(--secondary)' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--secondary)' }}>Operational</span>
              </div>
            </div>
          </div>

          {/* Payment success */}
          <AnimatePresence>
            {paymentSuccess && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(78,222,163,0.08)', border: '1px solid rgba(78,222,163,0.25)' }}>
                <CheckCircle2 size={16} color="var(--secondary)" />
                <div>
                  <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--secondary)' }}>Payment confirmed!</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--on-surface-2)', marginTop: '2px' }}>Your rental is activating — it will appear below in a few seconds.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── ACTIVE RENTALS TAB ── */}
          {activeTab === 'active' && (
            loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>
                <div style={{ background: '#111520', borderRadius: '14px', height: '320px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#111520', borderRadius: '14px', height: '140px', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ background: '#111520', borderRadius: '14px', height: '160px', animation: 'pulse 1.5s infinite' }} />
                </div>
              </div>
            ) : activeRentals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(192,193,255,0.08)', border: '1px solid rgba(192,193,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Zap size={20} color="var(--primary)" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.1rem', color: '#e8edf8', marginBottom: '8px' }}>No active rentals</h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)', marginBottom: '24px' }}>Purchase a plan to get your virtual API key instantly.</p>
                <button onClick={() => navigate('/marketplace')} style={{ padding: '11px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700 }}>
                  Browse Plans
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }} className="dash-main-grid">
                {/* Active rental card */}
                <div style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
                  {/* Card top bar */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '6px', background: 'rgba(78,222,163,0.12)', border: '1px solid rgba(78,222,163,0.25)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--secondary)' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--secondary)', animation: 'pulse-dot 2s infinite' }} />
                      LIVE SESSION
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--primary)' }}>
                      <Key size={11} /> IP Pinned: {firstActive.ip_address || '—'}
                    </span>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '2px' }}>TIME REMAINING</div>
                      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.5rem', color: '#e8edf8', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        <CountdownTimer ttlSeconds={firstActive.ttl_seconds} expiresAt={firstActive.expires_at} onExpire={() => { setActiveRentals(prev => prev.filter(r => r.id !== firstActive.id)); loadRentals(); }} size="lg" />
                      </div>
                    </div>
                  </div>

                  {/* Provider + instance */}
                  <div style={{ padding: '20px 20px 14px' }}>
                    <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.6rem', color: '#e8edf8', letterSpacing: '-0.02em', marginBottom: '4px' }}>
                      {firstActive.provider || firstActive.plan_name || 'Active Session'}
                    </h2>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--on-surface-3)' }}>
                      Instance ID: node_{firstActive.id?.toString().padStart(6, '0') || '000000'}
                    </div>
                  </div>

                  {/* Virtual key */}
                  <div style={{ padding: '0 20px 18px' }}>
                    <div style={{ background: '#0d1117', border: '1px solid rgba(192,193,255,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--primary)' }}>● VIRTUAL KEY</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#f59e0b', letterSpacing: '0.04em' }}>
                          <AlertTriangle size={10} /> Visible Only Once
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px' }}>
                        <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--on-surface-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {firstActive.virtual_key}
                        </div>
                        <button onClick={() => copyKey(firstActive.virtual_key)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.07)', color: '#e8edf8', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap', transition: 'background 120ms' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                        >
                          <Copy size={11} /> {copiedKey === firstActive.virtual_key ? 'COPIED' : 'COPY'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Token usage */}
                  <div style={{ padding: '0 20px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--on-surface-2)' }}>Token Usage Quota</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--on-surface-2)' }}>
                        {firstActive.tokens_used?.toLocaleString()} / {totalCap?.toLocaleString()} tokens used
                      </span>
                    </div>
                    <TokenProgressBar used={firstActive.tokens_used} remaining={firstActive.tokens_remaining} size="md" />
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--on-surface-3)' }}>
                        ⓘ Auto-terminates at 100% or time expiration.
                      </span>
                      <button style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.04em' }}>
                        TERMINATE NOW
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Peak latency */}
                  <div style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '4px' }}>PEAK LATENCY</div>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '2rem', color: 'var(--secondary)', letterSpacing: '-0.03em' }}>24ms</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--on-surface-3)', marginBottom: '4px' }}>Mumbai - AWS Node</div>
                    <LatencyChart />
                  </div>

                  {/* Active config */}
                  <div style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '14px' }}>ACTIVE RENTAL CONFIG</div>
                    <ConfigRow label="Input Window"    value="200k" />
                    <ConfigRow label="Output Quota"    value="4k" />
                    <ConfigRow label="Priority"        value="Ultra-Fast" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--on-surface-2)' }}>Regional Hosting</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: '#e8edf8' }}>IND-West-1</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--on-surface-2)', fontFamily: 'var(--font-body)', fontSize: '0.8125rem', cursor: 'pointer', transition: 'background 120ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                >
                  Download CSV ↓
                </button>
              </div>

              <div style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr 1fr 1fr', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#141820' }}>
                  {['Date', 'Provider', 'Duration', 'Tokens Used', 'Status'].map(h => (
                    <span key={h} style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-3)' }}>{h}</span>
                  ))}
                </div>

                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--on-surface-3)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>Loading...</div>
                ) : historyRentals.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-3)' }}>No rental history yet.</p>
                  </div>
                ) : (
                  historyRentals.map((r, i) => (
                    <div key={r.id} onClick={() => handleInvoice(r.id)} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr 1fr 1fr', padding: '16px 20px', borderBottom: i < historyRentals.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', transition: 'background 120ms', alignItems: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: '#e8edf8' }}>
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, {new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                      <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.875rem', color: '#e8edf8' }}>
                        {r.provider || r.plan_name || '—'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--on-surface-2)' }}>
                        {r.duration_minutes >= 60 ? `${r.duration_minutes / 60}:00` : `${r.duration_minutes}:00`}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--on-surface-2)' }}>
                        {r.tokens_used?.toLocaleString() || '—'}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── API KEYS TAB ── */}
          {activeTab === 'keys' && (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(192,193,255,0.08)', border: '1px solid rgba(192,193,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Key size={20} color="var(--primary)" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.1rem', color: '#e8edf8', marginBottom: '8px' }}>API Keys</h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)' }}>Your active virtual keys are shown in the Active Rentals tab.</p>
            </div>
          )}

        </div>

        {/* Simple footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px clamp(24px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', color: '#e8edf8', marginBottom: '4px' }}>AIRent</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--on-surface-3)' }}>© 2024 AIRent. Built for the Indian Developer Ecosystem.</div>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['Privacy', 'Terms', 'Status', 'GitHub'].map(l => (
              <Link key={l} to={`/${l.toLowerCase()}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--on-surface-3)', textDecoration: 'none', transition: 'color 120ms' }}
                onMouseEnter={e => e.currentTarget.style.color = '#e8edf8'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-3)'}
              >{l}</Link>
            ))}
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
            <motion.div key="settings-panel" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.22, ease: [0.22,1,0.36,1] }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '440px', background: '#111520', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Settings size={16} color="var(--primary)" />
                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: '#e8edf8' }}>Settings</span>
                </div>
                <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-3)', padding: '4px', display: 'flex', alignItems: 'center' }}>
                  <X size={16} />
                </button>
              </div>
              {/* Body */}
              <div style={{ padding: '24px' }}>
                {/* Account info */}
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

                {/* Links */}
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

                {/* Logout */}
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
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @media (max-width: 900px) {
          .dash-main-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 680px) {
          aside { width: 100% !important; position: relative !important; height: auto !important; }
          .dash-main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
