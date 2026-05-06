import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Clock, Zap, TrendingUp, Copy, Activity, History,
  FileText, CheckCircle2, ShoppingBag, FlaskConical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceAPI, invoiceAPI, paymentAPI } from '../api/client';
import CountdownTimer from '../components/CountdownTimer';
import TokenProgressBar from '../components/TokenProgressBar';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-40px' };
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');

const TABS = [
  { id: 'active',  label: 'Active Rentals', icon: Activity },
  { id: 'history', label: 'Rental History',  icon: History },
];

function StatCell({ icon: Icon, label, value, green }) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--nb-bg)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--nb-text-3)', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Icon size={10} /> {label}
      </span>
      <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', color: green ? 'var(--nb-green)' : 'var(--nb-text)' }}>{value}</span>
    </div>
  );
}

function RentalCard({ rental, isHistory, onExpire, onCopy, onInvoice }) {
  const isActive = rental.status === 'active' || !isHistory;

  return (
    <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}>
      <div style={{
        border: `1px solid ${isActive && !isHistory ? 'var(--nb-green-border)' : 'var(--nb-border)'}`,
        borderRadius: '4px', overflow: 'hidden',
        background: isActive && !isHistory ? 'var(--nb-green-bg)' : 'var(--nb-surface)',
        opacity: isHistory ? 0.85 : 1,
      }}>
        {/* Card header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-raised)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive && !isHistory ? 'var(--nb-green)' : 'var(--nb-text-4)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em', color: isActive && !isHistory ? 'var(--nb-green)' : 'var(--nb-text-3)' }}>
              {(rental.status || 'ACTIVE').toUpperCase()}
            </span>
          </div>
          {rental.plan_name && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--nb-text-3)', letterSpacing: '0.04em', border: '1px solid var(--nb-border)', padding: '2px 8px', borderRadius: '2px' }}>
              {rental.plan_name}
            </span>
          )}
        </div>

        {/* Virtual Key row */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-surface)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: 'var(--nb-text-3)', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>VIRTUAL API KEY</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, padding: '8px 12px', borderRadius: '2px', background: 'var(--nb-raised)', border: '1px solid var(--nb-border)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--nb-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rental.virtual_key}
            </div>
            <button
              onClick={() => !isHistory && onCopy(rental.virtual_key)}
              disabled={isHistory}
              style={{ padding: '8px', borderRadius: '2px', background: 'var(--nb-raised)', border: '1px solid var(--nb-border)', color: isHistory ? 'var(--nb-text-4)' : 'var(--nb-green)', cursor: isHistory ? 'not-allowed' : 'pointer', opacity: isHistory ? 0.4 : 1 }}
            >
              <Copy size={13} />
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: 'var(--nb-grid)', borderBottom: '1px solid var(--nb-border)' }}>
          {isHistory ? (
            <StatCell icon={Clock} label="EXPIRED" value={new Date(rental.expires_at).toLocaleDateString()} />
          ) : (
            <div style={{ padding: '12px 14px', background: 'var(--nb-bg)' }}>
              <CountdownTimer
                ttlSeconds={rental.ttl_seconds}
                expiresAt={rental.expires_at}
                onExpire={() => onExpire(rental.id)}
                size="md"
              />
            </div>
          )}
          <StatCell icon={Zap} label={isHistory ? 'TOKENS USED' : 'TOKENS LEFT'} value={`${((isHistory ? rental.tokens_used : rental.tokens_remaining) / 1000).toFixed(1)}K`} green={!isHistory} />
          <StatCell icon={TrendingUp} label="TOTAL CAP" value={`${((rental.tokens_used + rental.tokens_remaining) / 1000).toFixed(1)}K`} />
          <StatCell icon={Key} label="REQUESTS" value={rental.requests_made} />
        </div>

        {/* Progress */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-surface)' }}>
          <TokenProgressBar used={rental.tokens_used} remaining={rental.tokens_remaining} size={isHistory ? 'sm' : 'md'} />
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', background: 'var(--nb-raised)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {rental.created_at && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--nb-text-4)', letterSpacing: '0.04em' }}>
              {new Date(rental.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
            </span>
          )}
          <button
            onClick={() => onInvoice(rental.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.04em', color: 'var(--nb-text-3)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', transition: 'color 120ms' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
          >
            <FileText size={11} /> RECEIPT
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [activeRentals,  setActiveRentals]  = useState([]);
  const [historyRentals, setHistoryRentals] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState('active');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const wsRefs = useRef({});
  const [searchParams] = useSearchParams();

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
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'usage_update') {
          setActiveRentals(prev => prev.map(r =>
            r.id === rentalId ? { ...r, tokens_used: data.tokens_used, tokens_remaining: data.tokens_remaining } : r
          ));
        } else if (data.type === 'rental_expired') {
          handleRentalExpire(rentalId);
        } else if (data.type === 'spending_alert') {
          toast.error(`Spending alert: ₹${data.amount_usd.toFixed(2)} in ${data.window_minutes} min`);
        }
      } catch {}
    };
    ws.onerror = () => ws.close();
    ws.onclose = () => { delete wsRefs.current[rentalId]; };
    wsRefs.current[rentalId] = ws;
  };

  const loadRentals = async () => {
    try {
      const activeResponse = await marketplaceAPI.getActiveRentals();
      setActiveRentals(activeResponse.data);
      activeResponse.data.forEach(r => connectWebSocket(r.id));
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

  const handleRentalExpire = (rentalId) => {
    setActiveRentals(prev => prev.filter(r => r.id !== rentalId));
    loadRentals();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('API key copied!');
  };

  const handleViewInvoice = async (rentalId) => {
    try {
      const response = await invoiceAPI.getInvoiceHtml(rentalId);
      const blob = new Blob([response.data], { type: 'text/html' });
      window.open(window.URL.createObjectURL(blob), '_blank');
    } catch { toast.error('Failed to load invoice'); }
  };

  const currentRentals = activeTab === 'active' ? activeRentals : historyRentals;

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
        <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
          {/* Payment success banner */}
          <AnimatePresence>
            {paymentSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderRadius: '4px', background: 'var(--nb-green-bg)', border: '1px solid var(--nb-green-border)' }}
              >
                <CheckCircle2 size={16} style={{ color: 'var(--nb-green)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--nb-green)', letterSpacing: '-0.01em' }}>Payment confirmed!</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--nb-text-2)', marginTop: '2px' }}>Your rental is activating — it will appear below in a few seconds.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
            <motion.div variants={fadeUp(0)} initial="hidden" animate="show">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <span style={{ width: '18px', height: '1px', background: 'var(--nb-green)', display: 'inline-block' }} />
                DASHBOARD
              </span>
              <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2.2rem,5vw,3.4rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--nb-text)', lineHeight: 0.98, marginBottom: '10px' }}>
                My Rentals
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--nb-text-2)' }}>Manage and monitor your AI API rentals.</p>
            </motion.div>
            <motion.div variants={fadeUp(0.08)} initial="hidden" animate="show" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <Link to="/playground" className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                <FlaskConical size={13} /> Playground
              </Link>
              <Link to="/marketplace" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
                <ShoppingBag size={13} /> Buy plan
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Tabs ── */}
      <section style={{ padding: '20px clamp(20px,5vw,72px) 0', borderBottom: '1px solid var(--nb-border)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '0' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 20px', borderRadius: '0', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 500,
                cursor: 'pointer', border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--nb-green)' : '2px solid transparent',
                background: 'transparent',
                color: activeTab === tab.id ? 'var(--nb-text)' : 'var(--nb-text-3)',
                transition: 'color 120ms',
                marginBottom: '-1px',
              }}>
              <tab.icon size={13} />
              {tab.label}
              {tab.id === 'active' && activeRentals.length > 0 && (
                <span style={{ minWidth: '18px', height: '16px', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nb-green)', color: 'oklch(12% 0.028 255)', borderRadius: '2px', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700 }}>
                  {activeRentals.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ── Content ── */}
      <section style={{ flex: 1, padding: 'clamp(28px,4vw,48px) clamp(20px,5vw,72px) clamp(64px,9vw,104px)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="dash-grid">
                {[1, 2].map(n => (
                  <div key={n} style={{ height: '280px', background: 'var(--nb-surface)', borderRadius: '4px', border: '1px solid var(--nb-border)', animation: 'nb-pulse 1.5s infinite' }} />
                ))}
              </motion.div>
            ) : currentRentals.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '2px', background: 'var(--nb-green-bg)', border: '1px solid var(--nb-green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <ShoppingBag size={18} style={{ color: 'var(--nb-green)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--nb-text)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                  {activeTab === 'active' ? 'No active rentals' : 'No rental history'}
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--nb-text-2)', marginBottom: '24px' }}>
                  {activeTab === 'active' ? 'Purchase a plan to get your virtual API key instantly.' : 'Your past rentals will appear here.'}
                </p>
                {activeTab === 'active' && (
                  <Link to="/marketplace" className="btn btn-primary" style={{ display: 'inline-flex' }}>
                    <ShoppingBag size={13} /> Browse plans
                  </Link>
                )}
              </motion.div>
            ) : (
              <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="dash-grid">
                {currentRentals.map(rental => (
                  <RentalCard
                    key={rental.id}
                    rental={rental}
                    isHistory={activeTab === 'history'}
                    onExpire={handleRentalExpire}
                    onCopy={copyToClipboard}
                    onInvoice={handleViewInvoice}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <Footer />
      <style>{`
        @keyframes nb-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @media (max-width: 720px) { .dash-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
