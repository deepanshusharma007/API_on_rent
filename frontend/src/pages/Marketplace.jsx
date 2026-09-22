import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, History, Key, Settings, HelpCircle,
  Zap, Clock, CheckCircle2, ChevronRight, IndianRupee, LogOut, Terminal,
  Shield, RefreshCw, Database, Route,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceAPI, paymentAPI } from '../api/client';
import useAuthStore from '../store/authStore';

const EASE = [0.22, 1, 0.36, 1];
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE, delay: d } } });

const SIDEBAR_NAV = [
  { id: 'marketplace', label: 'Marketplace',    icon: ShoppingBag, to: '/marketplace' },
  { id: 'active',      label: 'Active Rentals',  icon: Zap,         to: '/dashboard?tab=active'  },
  { id: 'history',     label: 'Usage History',   icon: History,     to: '/dashboard?tab=history' },
  { id: 'keys',        label: 'API Keys',         icon: Key,         to: '/dashboard?tab=keys'   },
  { id: 'playground',  label: 'Playground',       icon: Terminal,    to: '/playground' },
];

// Static gateway model catalogue â€” matches backend router.py


function formatTokens(n) {
  if (!n) return 'â€”';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${(n / 1000).toFixed(0)}K`;
}
function formatDuration(plan) {
  const m = plan.duration_minutes || 0;
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${m / 60} hour${m / 60 > 1 ? 's' : ''}`;
  return `${m / 1440} day${m / 1440 > 1 ? 's' : ''}`;
}

function SidebarLink({ item }) {
  const isActive = item.id === 'marketplace';
  const Icon = item.icon;
  return (
    <Link to={item.to} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', borderRadius: '8px', marginBottom: '2px',
      textDecoration: 'none',
      background: isActive ? 'rgba(192,193,255,0.12)' : 'transparent',
      color: isActive ? 'var(--primary)' : 'var(--on-surface-2)',
      fontSize: '0.875rem', fontFamily: 'var(--font-body)', fontWeight: isActive ? 600 : 400,
      transition: 'background 120ms, color 120ms',
    }}
      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--on-surface-2)'; } }}
      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--on-surface-3)'; } }}
    >
      <Icon size={15} />{item.label}
    </Link>
  );
}

function PlanCard({ plan, selected, onClick }) {
  const isPopular = (plan.duration_minutes || 0) === 60;
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', padding: '20px', borderRadius: '12px', cursor: 'pointer',
      background: selected ? 'rgba(192,193,255,0.08)' : '#111520',
      border: `1px solid ${selected ? 'rgba(192,193,255,0.35)' : isPopular ? 'rgba(192,193,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
      transition: 'border-color 150ms, background 150ms',
      position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: '0', overflow: 'hidden',
    }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = 'rgba(192,193,255,0.3)'; e.currentTarget.style.background = '#141820'; } }}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = isPopular ? 'rgba(192,193,255,0.2)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#111520'; } }}
    >
      {isPopular && (
        <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--primary)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderBottomLeftRadius: '8px', letterSpacing: '0.04em' }}>POPULAR</div>
      )}
      {selected && (
        <div style={{ position: 'absolute', top: '14px', left: '14px', color: 'var(--primary)' }}><CheckCircle2 size={16} /></div>
      )}
      <div style={{ paddingLeft: selected ? '28px' : '0' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-3)', marginBottom: '6px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {plan.duration_label || formatDuration(plan)}
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e8edf8', fontFamily: 'var(--font-head)', lineHeight: 1.1, marginBottom: '8px' }}>
          <IndianRupee size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />{plan.price}
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-3)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span>{formatTokens(plan.token_cap)} tokens</span>
          <span>{plan.rpm_limit} req/min</span>
          <span>All models included</span>
        </div>
      </div>
    </button>
  );
}

export default function Marketplace() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [bannerUp, setBannerUp] = useState(() => sessionStorage.getItem('banner_dismissed') !== 'true');

  useEffect(() => {
    const id = setInterval(() => setBannerUp(sessionStorage.getItem('banner_dismissed') !== 'true'), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    marketplaceAPI.getPlans()
      .then(res => setPlans(res.data.filter(p => p.is_active)))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async () => {
    if (!selectedPlan) { toast.error('Please select a plan'); return; }
    setPurchasing(true);
    try {
      // Gateway mode: no provider needed â€” pass 'gateway' as provider placeholder
      const response = await paymentAPI.createCheckoutSession(selectedPlan.id, 'gateway');
      const { payment_session_id } = response.data;
      if (window.Cashfree) {
        const cashfree = window.Cashfree({ mode: import.meta.env.VITE_CASHFREE_ENV || 'sandbox' });
        cashfree.checkout({ paymentSessionId: payment_session_id, redirectTarget: '_self' });
      } else {
        toast.error('Payment SDK not loaded. Please refresh.');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initiate payment');
    } finally {
      setPurchasing(false);
    }
  };

  const step = selectedPlan ? 2 : 1;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0, position: 'fixed', top: bannerUp ? '40px' : '0px', left: 0,
        height: bannerUp ? 'calc(100vh - 40px)' : '100vh', background: '#0d1117',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', zIndex: 40, overflowY: 'auto',
      }} className="app-sidebar">
        <div style={{ padding: '20px 16px 12px' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.875rem', color: '#e8edf8', transition: 'color 120ms' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.color = '#e8edf8'}>Developer Console</div>
          </Link>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--on-surface-3)', letterSpacing: '0.04em' }}>
            {user?.email?.split('@')[0] || 'User'}
          </div>
        </div>
        <nav style={{ padding: '4px 12px', flex: 1 }}>
          {SIDEBAR_NAV.map(item => <SidebarLink key={item.id} item={item} />)}
        </nav>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 12px' }}>
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 4px',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-3)',
            fontFamily: 'var(--font-body)', fontSize: '0.8125rem', borderRadius: '6px', transition: 'color 120ms',
          }} onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-3)'}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: '220px', flex: 1, padding: '32px clamp(16px,3vw,40px)', maxWidth: '900px', paddingTop: bannerUp ? 'calc(32px + 40px)' : '32px' }} className="app-main">
        {/* Header */}
        <motion.div variants={fadeUp(0)} initial="hidden" animate="show" style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(1.4rem,3vw,1.75rem)', fontWeight: 700, color: '#e8edf8', marginBottom: '6px' }}>
            Get API Access
          </h1>
          <p style={{ color: 'var(--on-surface-3)', fontSize: '0.9rem' }}>
            One key. All models. Pick a plan and start building in seconds.
          </p>
        </motion.div>

        {/* Gateway feature pills */}
        <motion.div variants={fadeUp(0.05)} initial="hidden" animate="show"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
          {[
            { icon: Route,      label: 'Smart Routing' },
            { icon: RefreshCw,  label: 'Auto Fallback' },
            { icon: Database,   label: 'Semantic Cache' },
            { icon: Shield,     label: 'Guardrails' },
          ].map(({ icon: Icon, label }) => (
            <span key={label} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', borderRadius: '20px',
              border: '1px solid rgba(192,193,255,0.15)', background: 'rgba(192,193,255,0.05)',
              fontSize: '0.75rem', color: 'var(--primary)', fontFamily: 'var(--font-body)',
            }}>
              <Icon size={12} />{label}
            </span>
          ))}
        </motion.div>

        {/* Steps */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px' }}>
          {[{ n: 1, label: 'Choose Plan' }, { n: 2, label: 'Checkout' }].map(({ n, label }, i) => (
            <React.Fragment key={n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step >= n ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                  color: step >= n ? '#fff' : 'var(--on-surface-3)',
                  fontSize: '0.75rem', fontWeight: 700, transition: 'background 300ms',
                }}>{n}</div>
                <span style={{ fontSize: '0.8125rem', color: step >= n ? 'var(--on-surface-2)' : 'var(--on-surface-3)', fontFamily: 'var(--font-body)', transition: 'color 300ms' }}>{label}</span>
              </div>
              {i < 1 && <ChevronRight size={14} style={{ color: 'var(--on-surface-3)', flexShrink: 0 }} />}
            </React.Fragment>
          ))}
        </div>

        {/* STEP 1: Choose Plan */}
        <motion.div variants={fadeUp(0.1)} initial="hidden" animate="show">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(192,193,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>1</div>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, color: '#e8edf8' }}>Choose a plan</span>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: '12px' }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ height: '130px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: '12px' }} className="plans-grid-mp">
              {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan} selected={selectedPlan?.id === plan.id} onClick={() => setSelectedPlan(plan)} />
              ))}
            </div>
          )}

        </motion.div>

        {/* STEP 2: Checkout */}
        <AnimatePresence>
          {selectedPlan && (
            <motion.div key="checkout" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }} style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(192,193,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>2</div>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, color: '#e8edf8' }}>Checkout</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'start' }} className="checkout-grid">
                {/* Order summary */}
                <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-3)', marginBottom: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Summary</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#e8edf8' }}>
                      <span>Plan</span>
                      <span style={{ fontWeight: 600 }}>{plan => plan.name || formatDuration(selectedPlan)}{selectedPlan.duration_label || formatDuration(selectedPlan)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--on-surface-3)' }}>
                      <span>Token cap</span>
                      <span>{formatTokens(selectedPlan.token_cap)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--on-surface-3)' }}>
                      <span>Duration</span>
                      <span>{formatDuration(selectedPlan)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--on-surface-3)' }}>
                      <span>Access</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>all models</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--on-surface-3)' }}>
                      <span>Rate limit</span>
                      <span>{selectedPlan.rpm_limit} req/min</span>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--on-surface-3)' }}>
                        <span>Subtotal</span><span>â‚¹{selectedPlan.price}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--on-surface-3)', marginTop: '4px' }}>
                        <span>GST (18%)</span><span>â‚¹{(Math.round(Number(selectedPlan.price) * 0.18)).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#e8edf8', fontWeight: 700, marginTop: '8px' }}>
                        <span>Total</span><span>â‚¹{(Number(selectedPlan.price) * 1.18).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pay card */}
                <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-3)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>ðŸ’³</div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', color: '#e8edf8' }}>UPI / Cashfree</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-3)' }}>Secure payment gateway</div>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-3)', lineHeight: 1.5, margin: 0 }}>
                    After payment, your virtual API key will be emailed and shown on your dashboard. Use it with any OpenAI-compatible client.
                  </p>

                  <button onClick={handlePurchase} disabled={purchasing} style={{
                    width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                    cursor: purchasing ? 'not-allowed' : 'pointer',
                    background: purchasing ? 'rgba(255,255,255,0.1)' : 'var(--primary)',
                    color: purchasing ? 'var(--on-surface-3)' : 'var(--on-primary)',
                    fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'filter 120ms', opacity: purchasing ? 0.7 : 1,
                  }}
                    onMouseEnter={e => { if (!purchasing) e.currentTarget.style.filter = 'brightness(1.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}>
                    {purchasing ? (
                      <><span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Processing...</>
                    ) : (
                      <><IndianRupee size={16} />Pay â‚¹{(Number(selectedPlan.price) * 1.18).toFixed(2)}</>
                    )}
                  </button>

                  <button onClick={() => setSelectedPlan(null)} style={{
                    width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent', cursor: 'pointer', color: 'var(--on-surface-3)',
                    fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                  }}>Change plan</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) { .checkout-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 768px) { .app-sidebar { display: none !important; } .app-main { margin-left: 0 !important; } }
        @media (max-width: 480px) { .plans-grid-mp { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}