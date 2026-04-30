import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Clock, Zap, TrendingUp, Copy, Activity, History,
  FileText, CheckCircle, ShoppingBag, FlaskConical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceAPI, invoiceAPI, paymentAPI } from '../api/client';
import CountdownTimer from '../components/CountdownTimer';
import TokenProgressBar from '../components/TokenProgressBar';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, scaleIn, staggerContainer, viewport } from '../lib/motion';

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');

const TABS = [
  { id: 'active',  label: 'Active Rentals', icon: Activity },
  { id: 'history', label: 'Rental History',  icon: History },
];

function StatChip({ icon: Icon, label, value, accent }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '4px',
      padding: '12px', borderRadius: '8px',
      background: 'var(--c-raised)', border: '1px solid var(--c-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--c-text-3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
        <Icon size={12} style={{ color: accent ? 'var(--c-accent)' : 'var(--c-text-3)', flexShrink: 0 }} />
        {label}
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 800, color: accent ? 'var(--c-accent-hi)' : 'var(--c-text)' }}>{value}</div>
    </div>
  );
}

function RentalCard({ rental, isHistory, onExpire, onCopy, onInvoice }) {
  return (
    <motion.div variants={scaleIn}>
      <div style={{
        padding: '20px', borderRadius: '10px',
        background: 'var(--c-surface)',
        border: `1px solid ${isHistory ? 'var(--c-border)' : 'var(--c-border-hi)'}`,
        opacity: isHistory ? 0.8 : 1,
      }}>
        {/* Status + Plan */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: rental.status === 'active' ? 'var(--c-accent)' : 'var(--c-border-hi)',
              animation: rental.status === 'active' ? 'pulse 2s infinite' : 'none',
            }} />
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: rental.status === 'active' ? 'var(--c-accent)' : 'var(--c-text-3)',
            }}>
              {rental.status}
            </span>
          </div>
          {rental.plan_name && (
            <span style={{
              fontSize: '0.7rem', color: 'var(--c-text-3)',
              background: 'var(--c-raised)', border: '1px solid var(--c-border)',
              padding: '2px 8px', borderRadius: '4px',
            }}>
              {rental.plan_name}
            </span>
          )}
        </div>

        {/* Virtual Key */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', color: 'var(--c-text-3)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Virtual API Key
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              flex: 1, padding: '8px 12px', borderRadius: '6px',
              background: 'var(--c-raised)', border: '1px solid var(--c-border)',
              fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--c-text-2)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {rental.virtual_key}
            </div>
            <button
              onClick={() => !isHistory && onCopy(rental.virtual_key)}
              disabled={isHistory}
              style={{
                padding: '8px', borderRadius: '6px',
                background: 'var(--c-raised)', border: '1px solid var(--c-border)',
                color: isHistory ? 'var(--c-text-3)' : 'var(--c-accent)',
                cursor: isHistory ? 'not-allowed' : 'pointer', opacity: isHistory ? 0.4 : 1,
              }}
            >
              <Copy size={14} />
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {isHistory ? (
            <StatChip icon={Clock} label="Expired" value={new Date(rental.expires_at).toLocaleDateString()} />
          ) : (
            <CountdownTimer
              ttlSeconds={rental.ttl_seconds}
              expiresAt={rental.expires_at}
              onExpire={() => onExpire(rental.id)}
              size="md"
            />
          )}
          <StatChip icon={Zap} label={isHistory ? 'Tokens Used' : 'Tokens Left'}
            value={`${((isHistory ? rental.tokens_used : rental.tokens_remaining) / 1000).toFixed(1)}K`}
            accent={!isHistory} />
          <StatChip icon={TrendingUp} label="Total Cap"
            value={`${((rental.tokens_used + rental.tokens_remaining) / 1000).toFixed(1)}K`} />
          <StatChip icon={Key} label="Requests" value={rental.requests_made} />
        </div>

        {/* Progress */}
        <div style={{ marginBottom: '16px' }}>
          <TokenProgressBar
            used={rental.tokens_used}
            remaining={rental.tokens_remaining}
            size={isHistory ? 'sm' : 'md'}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {rental.created_at && (
            <span style={{ color: 'var(--c-text-3)', fontSize: '0.75rem' }}>
              {new Date(rental.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          <button
            onClick={() => onInvoice(rental.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              color: 'var(--c-accent)', fontSize: '0.775rem', fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto',
            }}
          >
            <FileText size={13} /> Receipt
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
  const [searchParams]  = useSearchParams();

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
    ws.onerror  = () => ws.close();
    ws.onclose  = () => { delete wsRefs.current[rentalId]; };
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ paddingTop: '120px', paddingBottom: '24px', paddingLeft: '20px', paddingRight: '20px' }}>
        <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show" className="max-w-5xl mx-auto">

          {/* Payment success banner */}
          <AnimatePresence>
            {paymentSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '8px',
                  background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-border)',
                }}
              >
                <CheckCircle size={18} style={{ color: 'var(--c-accent)', flexShrink: 0 }} />
                <div>
                  <p style={{ color: 'var(--c-accent-hi)', fontWeight: 600, fontSize: '0.875rem' }}>Payment confirmed!</p>
                  <p style={{ color: 'var(--c-accent)', fontSize: '0.775rem' }}>Your rental is being activated — it will appear below in a few seconds.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: '8px' }}>Dashboard</p>
              <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', marginBottom: '4px' }}>My Rentals</h1>
              <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem' }}>Manage and monitor your AI API rentals</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/playground" className="btn btn-secondary">
                <FlaskConical size={14} /> Playground
              </Link>
              <Link to="/marketplace" className="btn btn-primary">
                <ShoppingBag size={14} /> Buy Plan
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Tabs */}
      <section style={{ paddingLeft: '20px', paddingRight: '20px', paddingBottom: '20px' }}>
        <div className="max-w-5xl mx-auto">
          <div style={{
            display: 'inline-flex', gap: '4px', padding: '4px',
            background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '8px',
          }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '7px 16px', borderRadius: '6px', fontSize: '0.825rem', fontWeight: 500,
                  cursor: 'pointer', border: '1px solid',
                  background:  activeTab === tab.id ? 'var(--c-accent-bg)'     : 'transparent',
                  borderColor: activeTab === tab.id ? 'var(--c-accent-border)' : 'transparent',
                  color:       activeTab === tab.id ? 'var(--c-accent-hi)'     : 'var(--c-text-3)',
                  transition: 'all 150ms',
                }}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.id === 'active' && activeRentals.length > 0 && (
                  <span style={{
                    minWidth: '18px', height: '18px', padding: '0 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--c-accent)', color: '#022c22',
                    borderRadius: '9px', fontSize: '0.65rem', fontWeight: 700,
                  }}>
                    {activeRentals.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: '0 20px 80px', flex: 1 }}>
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map(n => (
                  <div key={n} style={{ height: '280px', background: 'var(--c-surface)', borderRadius: '10px', border: '1px solid var(--c-border)', animation: 'pulse 1.5s infinite' }} />
                ))}
              </motion.div>
            ) : currentRentals.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '12px',
                  background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <ShoppingBag size={24} style={{ color: 'var(--c-accent)' }} />
                </div>
                <h3 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>
                  {activeTab === 'active' ? 'No active rentals' : 'No rental history'}
                </h3>
                <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem', marginBottom: '24px' }}>
                  {activeTab === 'active' ? 'Purchase a plan to get your virtual API key instantly.' : 'Your past rentals will appear here.'}
                </p>
                {activeTab === 'active' && (
                  <Link to="/marketplace" className="btn btn-primary" style={{ display: 'inline-flex' }}>
                    <ShoppingBag size={14} /> Browse Plans
                  </Link>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                variants={staggerContainer(0.07)} initial="hidden" animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
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
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
