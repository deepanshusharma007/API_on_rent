import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, History, Key, Settings, HelpCircle,
  Zap, Clock, CheckCircle2, Cpu, ChevronRight, IndianRupee, LogOut, X, Terminal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceAPI, paymentAPI, providersAPI } from '../api/client';
import useAuthStore from '../store/authStore';
import { getProviderMeta } from '../lib/providerMeta.jsx';

const EASE = [0.22, 1, 0.36, 1];
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE, delay: d } } });

const SIDEBAR_NAV = [
  { id: 'marketplace', label: 'Marketplace',   icon: ShoppingBag, to: '/marketplace' },
  { id: 'active',      label: 'Active Rentals', icon: Zap,         to: '/dashboard?tab=active'  },
  { id: 'history',     label: 'Usage History',  icon: History,     to: '/dashboard?tab=history' },
  { id: 'keys',        label: 'API Keys',        icon: Key,         to: '/dashboard?tab=keys'   },
  { id: 'playground',  label: 'Playground',      icon: Terminal,    to: '/playground' },
];

function formatTokens(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${(n / 1000).toFixed(0)}K`;
}

function formatDuration(plan) {
  if (plan.duration_label) return plan.duration_label;
  if (plan.name) return plan.name;
  const m = plan.duration_minutes;
  if (m >= 1440) return `${m / 1440} Day${m / 1440 > 1 ? 's' : ''}`;
  if (m >= 60)   return `${m / 60} Hour${m / 60 > 1 ? 's' : ''}`;
  return `${m} Min`;
}

/* ── Provider card ── */
function ProviderCard({ providerId, meta, selected, onClick }) {
  const tag = {
    openai:    { label: 'LOW LATENCY',     color: 'var(--secondary)' },
    anthropic: { label: 'BEST REASONING',  color: 'var(--primary)'   },
    google:    { label: 'MASSIVE CONTEXT', color: '#f59e0b'          },
  }[providerId?.toLowerCase()] || { label: 'AVAILABLE', color: 'var(--secondary)' };

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', padding: '20px', borderRadius: '12px', cursor: 'pointer',
        background: selected ? 'rgba(192,193,255,0.08)' : '#111520',
        border: `1px solid ${selected ? 'rgba(192,193,255,0.3)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'border-color 150ms, background 150ms',
        position: 'relative', width: '100%',
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = '#141820'; } }}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#111520'; } }}
    >
      {/* check icon */}
      {selected && (
        <div style={{ position: 'absolute', top: '12px', right: '12px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle2 size={11} color="var(--on-primary)" />
        </div>
      )}
      {/* logo */}
      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', fontSize: '1.1rem' }}>
        <meta.Logo style={{ width: '22px', height: '22px' }} />
      </div>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: '#e8edf8', marginBottom: '4px' }}>{meta.name || providerId}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--on-surface-3)', marginBottom: '14px' }}>All models included</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '5px', background: 'rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: tag.color }}>
        {tag.label}
      </div>
    </button>
  );
}

/* ── Plan card ── */
function PlanCard({ plan, selected, onClick }) {
  const dur = formatDuration(plan);
  const isPopular = plan.duration_minutes === 60;
  const sublabels = { 15: 'STARTER', 30: 'DEVELOPER', 60: 'POPULAR', 1440: 'ENTERPRISE' };
  const sublabel = sublabels[plan.duration_minutes] || 'PLAN';

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', padding: '20px', borderRadius: '12px', cursor: 'pointer',
        background: selected ? 'rgba(192,193,255,0.08)' : '#111520',
        border: `1px solid ${selected ? 'rgba(192,193,255,0.35)' : isPopular ? 'rgba(192,193,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'border-color 150ms, background 150ms',
        position: 'relative', width: '100%',
        display: 'flex', flexDirection: 'column', gap: '0',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = isPopular ? 'rgba(192,193,255,0.3)' : 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = '#141820'; } }}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = isPopular ? 'rgba(192,193,255,0.2)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#111520'; } }}
    >
      {/* Popular ribbon */}
      {isPopular && (
        <div style={{
          position: 'absolute', top: '14px', right: '-20px',
          background: 'var(--primary)', color: 'var(--on-primary)',
          fontFamily: 'var(--font-mono)', fontSize: '0.5rem', fontWeight: 700,
          letterSpacing: '0.08em', padding: '4px 24px',
          transform: 'rotate(45deg)',
        }}>POPULAR</div>
      )}

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: selected ? 'var(--primary)' : 'var(--on-surface-3)', marginBottom: '10px' }}>
        {sublabel}
      </div>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.8rem', color: '#e8edf8', letterSpacing: '-0.03em', marginBottom: '4px' }}>
        ₹{plan.price}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '16px', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--on-surface-2)' }}>
          <CheckCircle2 size={12} color="var(--secondary)" /> {formatTokens(plan.token_cap)} Tokens
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--on-surface-2)' }}>
          <CheckCircle2 size={12} color="var(--secondary)" /> {dur} Access
        </div>
        {isPopular && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--on-surface-2)' }}>
            <CheckCircle2 size={12} color="var(--secondary)" /> Priority Queue
          </div>
        )}
      </div>
      <button style={{
        width: '100%', padding: '9px', borderRadius: '7px', border: `1px solid ${selected ? 'rgba(192,193,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
        background: selected ? 'rgba(192,193,255,0.15)' : 'transparent',
        color: selected ? 'var(--primary)' : '#e8edf8',
        fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
        cursor: 'pointer', transition: 'all 120ms',
        pointerEvents: 'none',
      }}>
        {selected ? 'Current Choice' : 'Select'}
      </button>
    </button>
  );
}

export default function Marketplace() {
  const [plans,            setPlans]            = useState([]);
  const [activeProviders,  setActiveProviders]  = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [purchasing,       setPurchasing]       = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedPlan,     setSelectedPlan]     = useState(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [bannerUp,     setBannerUp]     = useState(() => sessionStorage.getItem('banner_dismissed') !== 'true');

  useEffect(() => {
    const id = setInterval(() => setBannerUp(sessionStorage.getItem('banner_dismissed') !== 'true'), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Promise.all([marketplaceAPI.getPlans(), providersAPI.getActiveProviders()])
      .then(([plansRes, providersRes]) => {
        setPlans(plansRes.data.filter(p => p.is_active));
        setActiveProviders(providersRes.data.providers || []);
      })
      .catch(() => toast.error('Failed to load marketplace'))
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async () => {
    if (!selectedPlan || !selectedProvider) { toast.error('Please complete all steps'); return; }
    if (purchasing) return;
    setPurchasing(true);
    try {
      const response = await paymentAPI.createCheckoutSession(selectedPlan.id, selectedProvider);
      const { payment_session_id } = response.data;
      if (window.Cashfree) {
        const cashfree = window.Cashfree({ mode: import.meta.env.VITE_CASHFREE_ENV || 'sandbox' });
        cashfree.checkout({ paymentSessionId: payment_session_id, redirectTarget: '_self' });
      } else {
        toast.error('Payment SDK not loaded. Please refresh.');
        setPurchasing(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initiate payment');
      setPurchasing(false);
    }
  };

  const step = selectedProvider ? (selectedPlan ? 3 : 2) : 1;
  const provMeta = selectedProvider ? getProviderMeta(selectedProvider) : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0a0d14', fontFamily: 'var(--font-body)' }}>

      {/* ══ SIDEBAR ══ */}
      <aside style={{
        width: '220px', flexShrink: 0, background: '#0d1017',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: bannerUp ? '40px' : '0px', left: 0, bottom: 0, zIndex: 50, transition: 'top 200ms ease',
        overflowY: 'auto',
      }}>
        {/* Logo / user */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--on-primary)' }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <Link to="/" style={{ textDecoration: 'none' }}><div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.875rem', color: '#e8edf8', transition: 'color 120ms' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = '#e8edf8'}>Developer Console</div></Link>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--on-surface-3)', letterSpacing: '0.04em' }}>{user?.email?.split('@')[0] || 'User'}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {SIDEBAR_NAV.map(item => {
            const isActive = item.id === 'marketplace';
            const Icon = item.icon;
            return (
              <Link key={item.id} to={item.to} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px', marginBottom: '2px',
                textDecoration: 'none',
                background: isActive ? 'rgba(192,193,255,0.12)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--on-surface-2)',
                fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: isActive ? 600 : 400,
                transition: 'background 120ms, color 120ms',
              }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e8edf8'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--on-surface-2)'; } }}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 12px' }}>
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
      <div style={{ marginLeft: '220px', flex: 1, minWidth: 0, paddingTop: bannerUp ? '40px' : '0px', transition: 'padding-top 200ms ease' }}>
        <div style={{ padding: 'clamp(28px,4vw,44px) clamp(24px,4vw,48px)', minHeight: '100vh' }}>

          {/* Page header */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(1.6rem,3vw,2.2rem)', color: '#e8edf8', letterSpacing: '-0.02em', marginBottom: '8px' }}>
              AI Marketplace
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', color: 'var(--on-surface-2)', lineHeight: 1.6, maxWidth: '520px' }}>
              Rent premium AI API access instantly. Prepaid credits, pay-as-you-use, zero platform fees for Indian developers.
            </p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ background: '#111520', borderRadius: '14px', height: n === 1 ? '180px' : '220px', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

              {/* ── STEP 1: Choose Provider ── */}
              <motion.div initial="hidden" animate="show" variants={fadeUp(0)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: step >= 1 ? 'var(--primary)' : 'rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
                    color: step >= 1 ? 'var(--on-primary)' : 'var(--on-surface-3)',
                  }}>1</div>
                  <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.0625rem', color: '#e8edf8', letterSpacing: '-0.01em' }}>
                    Choose Provider
                  </h2>
                  {selectedProvider && (
                    <button onClick={() => { setSelectedProvider(null); setSelectedPlan(null); }} style={{
                      marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700,
                      letterSpacing: '0.06em', color: 'var(--on-surface-3)', background: 'none', border: 'none',
                      cursor: 'pointer', transition: 'color 120ms',
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-3)'}
                    >
                      CHANGE
                    </button>
                  )}
                </div>

                {activeProviders.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', background: '#111520', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--on-surface-3)', letterSpacing: '0.08em' }}>
                    NO PROVIDERS AVAILABLE — CHECK BACK SOON
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(activeProviders.length, 3)}, 1fr)`, gap: '12px' }}>
                    {activeProviders.map(pid => (
                      <ProviderCard
                        key={pid}
                        providerId={pid}
                        meta={getProviderMeta(pid)}
                        selected={selectedProvider === pid}
                        onClick={() => { setSelectedProvider(pid); setSelectedPlan(null); }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>

              {/* ── STEP 2: Pick Plan ── */}
              <AnimatePresence>
                {selectedProvider && (
                  <motion.div key="step2" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        background: step >= 2 ? 'var(--primary)' : 'rgba(255,255,255,0.07)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
                        color: step >= 2 ? 'var(--on-primary)' : 'var(--on-surface-3)',
                      }}>2</div>
                      <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.0625rem', color: '#e8edf8', letterSpacing: '-0.01em' }}>
                        Pick Plan
                      </h2>
                      {selectedPlan && (
                        <button onClick={() => setSelectedPlan(null)} style={{
                          marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700,
                          letterSpacing: '0.06em', color: 'var(--on-surface-3)', background: 'none', border: 'none', cursor: 'pointer',
                        }}>
                          CHANGE
                        </button>
                      )}
                    </div>

                    {plans.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', background: '#111520', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--on-surface-3)' }}>
                        NO PLANS AVAILABLE YET
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 4)}, 1fr)`, gap: '12px' }}>
                        {plans.map(plan => (
                          <PlanCard
                            key={plan.id}
                            plan={plan}
                            selected={selectedPlan?.id === plan.id}
                            onClick={() => setSelectedPlan(plan)}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── STEP 3: Checkout ── */}
              <AnimatePresence>
                {selectedProvider && selectedPlan && (
                  <motion.div key="step3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        background: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
                        color: 'var(--on-primary)',
                      }}>3</div>
                      <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.0625rem', color: '#e8edf8', letterSpacing: '-0.01em' }}>
                        Checkout
                      </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'start' }} className="checkout-grid">

                      {/* Order Summary */}
                      <div style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '28px' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '20px' }}>
                          ORDER SUMMARY
                        </div>

                        {/* Item row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <div>
                            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: '#e8edf8', marginBottom: '4px' }}>
                              {formatDuration(selectedPlan)} ({provMeta?.name || selectedProvider})
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--on-surface-3)' }}>
                              {(selectedPlan.token_cap || 0).toLocaleString()} Tokens · {formatDuration(selectedPlan)} Validity
                            </div>
                          </div>
                          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: '#e8edf8', whiteSpace: 'nowrap' }}>
                            ₹{selectedPlan.price}.00
                          </div>
                        </div>

                        {/* GST row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)' }}>GST (18%)</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--on-surface-2)' }}>
                            ₹{(Math.round(Number(selectedPlan.price) * 0.18)).toFixed(2)}
                          </span>
                        </div>

                        {/* Total */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: '#e8edf8' }}>Total Payable</span>
                          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--secondary)', letterSpacing: '-0.02em' }}>
                            ₹{(Number(selectedPlan.price) * 1.18).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)' }}>
                          PAYMENT METHOD
                        </div>

                        {/* UPI option */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '10px', background: 'rgba(192,193,255,0.08)', border: '1px solid rgba(192,193,255,0.2)' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(192,193,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <IndianRupee size={15} color="var(--primary)" />
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', color: '#e8edf8' }}>UPI / Cashfree</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--secondary)', marginTop: '2px' }}>INSTANT ACTIVATION</div>
                          </div>
                        </div>

                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--on-surface-3)', lineHeight: 1.65 }}>
                          By clicking pay, you agree to our terms of service and refund policy. Credits are added instantly to your wallet.
                        </p>

                        {/* Pay button */}
                        <button
                          onClick={handlePurchase}
                          disabled={purchasing}
                          style={{
                            width: '100%', padding: '14px', borderRadius: '10px', border: 'none', cursor: purchasing ? 'not-allowed' : 'pointer',
                            background: purchasing ? 'rgba(255,255,255,0.1)' : 'var(--primary)',
                            color: purchasing ? 'var(--on-surface-3)' : 'var(--on-primary)',
                            fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            transition: 'filter 120ms', opacity: purchasing ? 0.7 : 1,
                          }}
                          onMouseEnter={e => { if (!purchasing) e.currentTarget.style.filter = 'brightness(1.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
                        >
                          {purchasing ? (
                            <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                          ) : 'Pay via UPI'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px clamp(24px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', color: '#e8edf8', marginBottom: '3px' }}>AIRent</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--on-surface-3)' }}>© 2024 AIRent. Built for the Indian Developer Ecosystem. High-speed AI infrastructure rentals.</div>
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
                <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-3)', padding: '4px', display: 'flex', alignItems: 'center' }}>
                  <X size={16} />
                </button>
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
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 680px) {
          aside { width: 100% !important; position: relative !important; height: auto !important; }
        }
      `}</style>
    </div>
  );
}
