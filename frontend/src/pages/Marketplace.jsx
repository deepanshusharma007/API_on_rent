import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, ShoppingBag, ArrowRight, LayoutDashboard, FlaskConical, CheckCircle2, Cpu, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceAPI, paymentAPI, providersAPI } from '../api/client';
import useAuthStore from '../store/authStore';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getProviderMeta } from '../lib/providerMeta.jsx';

const EASE = [0.22, 1, 0.36, 1];
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });

function formatTokens(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${(n / 1000).toFixed(0)}K`;
}

function formatDuration(plan) {
  if (plan.duration_label) return plan.duration_label;
  if (plan.name) return plan.name;
  const m = plan.duration_minutes;
  if (m >= 1440) return `${m / 1440} day${m / 1440 > 1 ? 's' : ''}`;
  if (m >= 60)   return `${m / 60} hour${m / 60 > 1 ? 's' : ''}`;
  return `${m} min`;
}

const DURATION_LABELS = { 15: '15 min', 30: '30 min', 60: '1 hour', 1440: '24 hrs' };

function StepNum({ n, done }) {
  return (
    <div style={{
      width: '22px', height: '22px', borderRadius: '2px', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.04em',
      background: done ? 'var(--nb-green-bg)' : 'var(--nb-raised)',
      border: `1px solid ${done ? 'var(--nb-green-border)' : 'var(--nb-border)'}`,
      color: done ? 'var(--nb-green)' : 'var(--nb-text-3)',
    }}>
      {String(n).padStart(2, '0')}
    </div>
  );
}

export default function Marketplace() {
  const [plans,           setPlans]           = useState([]);
  const [activeProviders, setActiveProviders] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [purchasing,      setPurchasing]      = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedPlan,     setSelectedPlan]     = useState(null);

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
    if (purchasing) return; // guard against rapid double-clicks before state update
    setPurchasing(true);
    try {
      const response = await paymentAPI.createCheckoutSession(selectedPlan.id, selectedProvider);
      const { payment_session_id } = response.data;
      if (window.Cashfree) {
        const cashfree = window.Cashfree({ mode: import.meta.env.VITE_CASHFREE_ENV || 'sandbox' });
        cashfree.checkout({ paymentSessionId: payment_session_id, redirectTarget: '_self' });
        // page navigates away on success — no need to reset purchasing
      } else {
        toast.error('Payment SDK not loaded. Please refresh.');
        setPurchasing(false);
      }
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to initiate payment';
      toast.error(msg);
      setPurchasing(false);
    }
  };

  const step = selectedProvider ? (selectedPlan ? 3 : 2) : 1;

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
        <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <motion.span variants={fadeUp(0)} initial="hidden" animate="show"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}
            >
              <span style={{ width: '18px', height: '1px', background: 'var(--nb-green)', display: 'inline-block' }} />
              AI API MARKETPLACE
            </motion.span>
            <motion.h1 variants={fadeUp(0.06)} initial="hidden" animate="show"
              style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2.2rem,5vw,3.4rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--nb-text)', lineHeight: 0.98, marginBottom: '16px' }}
            >
              Rent AI by the hour.
            </motion.h1>
            <motion.p variants={fadeUp(0.12)} initial="hidden" animate="show"
              style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', color: 'var(--nb-text-2)', lineHeight: 1.75, maxWidth: '44ch' }}
            >
              Pick a provider, choose a duration, get a virtual key instantly. Pay in INR via UPI.
            </motion.p>
          </div>
          <motion.div variants={fadeUp(0.16)} initial="hidden" animate="show" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <Link to="/dashboard" className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
              <LayoutDashboard size={13} /> My Rentals
            </Link>
            <Link to="/playground" className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
              <FlaskConical size={13} /> Playground
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Steps ── */}
      <section style={{ flex: 1, padding: 'clamp(32px,5vw,56px) clamp(20px,5vw,72px) clamp(64px,9vw,104px)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>

          {loading ? (
            <div style={{ border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}>
              {[1, 2, 3].map(n => <div key={n} style={{ height: '80px', background: 'var(--nb-surface)', borderTop: n > 1 ? '1px solid var(--nb-border)' : 'none', animation: 'nb-pulse 1.5s infinite' }} />)}
            </div>
          ) : (
            <>
              {/* Step 1 — Provider */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <StepNum n={1} done={step >= 1} />
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--nb-text)', letterSpacing: '-0.01em' }}>Choose a provider</h2>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--nb-text-3)', marginTop: '2px' }}>Select the AI provider you want to use</p>
                  </div>
                  {selectedProvider && (
                    <button onClick={() => { setSelectedProvider(null); setSelectedPlan(null); }}
                      style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--nb-text-3)', letterSpacing: '0.04em', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <ChevronLeft size={11} /> CHANGE
                    </button>
                  )}
                </div>

                {activeProviders.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--nb-text-3)', letterSpacing: '0.06em' }}>
                    NO PROVIDERS AVAILABLE — CHECK BACK SOON
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '1px', gridTemplateColumns: `repeat(${Math.min(activeProviders.length, 4)}, 1fr)`, background: 'var(--nb-grid)', border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}>
                    {activeProviders.map(providerId => {
                      const meta = getProviderMeta(providerId);
                      const isSelected = selectedProvider === providerId;
                      return (
                        <button key={providerId}
                          onClick={() => { setSelectedProvider(providerId); setSelectedPlan(null); }}
                          style={{
                            textAlign: 'left', padding: '24px',
                            background: isSelected ? 'var(--nb-green-bg)' : 'var(--nb-surface)',
                            border: 'none', cursor: 'pointer', position: 'relative',
                            transition: 'background 120ms',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--nb-raised)'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--nb-surface)'; }}
                        >
                          {isSelected && (
                            <div style={{ position: 'absolute', top: '10px', right: '10px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--nb-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CheckCircle2 size={10} style={{ color: 'var(--nb-bg)' }} />
                            </div>
                          )}
                          <div style={{ marginBottom: '10px' }}>
                            <meta.Logo style={{ width: '28px', height: '28px' }} />
                          </div>
                          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', color: isSelected ? 'var(--nb-green)' : 'var(--nb-text)', letterSpacing: '-0.01em', marginBottom: '3px' }}>
                            {meta.name || providerId}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--nb-text-3)', letterSpacing: '0.04em' }}>ALL MODELS INCLUDED</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 2 — Duration */}
              <AnimatePresence>
                {selectedProvider && (
                  <motion.div key="step2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <StepNum n={2} done={step >= 2} />
                      <div>
                        <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--nb-text)', letterSpacing: '-0.01em' }}>Choose a duration</h2>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--nb-text-3)', marginTop: '2px' }}>Your key is valid for the full period</p>
                      </div>
                      {selectedPlan && (
                        <button onClick={() => setSelectedPlan(null)}
                          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--nb-text-3)', letterSpacing: '0.04em', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <ChevronLeft size={11} /> CHANGE
                        </button>
                      )}
                    </div>

                    {plans.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--nb-text-3)', letterSpacing: '0.06em' }}>NO PLANS AVAILABLE YET</div>
                    ) : (
                      <div style={{ display: 'grid', gap: '1px', gridTemplateColumns: `repeat(${Math.min(plans.length, 4)}, 1fr)`, background: 'var(--nb-grid)', border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}>
                        {plans.map(plan => {
                          const isSelected = selectedPlan?.id === plan.id;
                          const durationText = DURATION_LABELS[plan.duration_minutes] || formatDuration(plan);
                          return (
                            <button key={plan.id}
                              onClick={() => setSelectedPlan(plan)}
                              style={{
                                textAlign: 'left', padding: '24px',
                                background: isSelected ? 'var(--nb-green-bg)' : 'var(--nb-surface)',
                                border: 'none', cursor: 'pointer', position: 'relative',
                                transition: 'background 120ms',
                              }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--nb-raised)'; }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--nb-surface)'; }}
                            >
                              {isSelected && (
                                <div style={{ position: 'absolute', top: '10px', right: '10px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--nb-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <CheckCircle2 size={10} style={{ color: 'var(--nb-bg)' }} />
                                </div>
                              )}
                              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: isSelected ? 'var(--nb-green)' : 'var(--nb-text)', letterSpacing: '-0.02em', marginBottom: '3px' }}>{durationText}</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--nb-text-3)', letterSpacing: '0.04em', marginBottom: '16px' }}>{formatTokens(plan.token_cap)} TOKENS</div>
                              <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: isSelected ? 'var(--nb-green)' : 'var(--nb-text)' }}>₹{plan.price}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 3 — Review & Rent */}
              <AnimatePresence>
                {selectedProvider && selectedPlan && (() => {
                  const provMeta = getProviderMeta(selectedProvider);
                  const durationText = DURATION_LABELS[selectedPlan.duration_minutes] || formatDuration(selectedPlan);
                  return (
                    <motion.div key="step3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <StepNum n={3} done />
                        <div>
                          <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--nb-text)', letterSpacing: '-0.01em' }}>Review and rent</h2>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--nb-text-3)', marginTop: '2px' }}>One-time payment, instant key delivery, no subscription</p>
                        </div>
                      </div>

                      <div style={{ border: '1px solid var(--nb-green-border)', borderRadius: '4px', overflow: 'hidden', background: 'var(--nb-green-bg)' }}>
                        <div style={{ padding: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}>
                          {/* Left: Details */}
                          <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <provMeta.Logo style={{ width: '28px', height: '28px', flexShrink: 0 }} />
                              <div>
                                <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: 'var(--nb-text)', letterSpacing: '-0.02em' }}>
                                  {provMeta.name || selectedProvider} — {durationText}
                                </h3>
                                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--nb-text-2)' }}>All active {provMeta.name || selectedProvider} models included</p>
                              </div>
                            </div>

                            {/* Stats row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--nb-border)', border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}>
                              {[
                                { icon: Zap,   label: 'TOKEN CAP', value: formatTokens(selectedPlan.token_cap) },
                                { icon: Clock, label: 'DURATION',  value: durationText },
                                { icon: Cpu,   label: 'RATE LIMIT', value: `${selectedPlan.rpm_limit} RPM` },
                              ].map(({ icon: Icon, label, value }) => (
                                <div key={label} style={{ padding: '12px 14px', background: 'var(--nb-bg)' }}>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--nb-text-3)', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                                    <Icon size={10} /> {label}
                                  </span>
                                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--nb-green)' }}>{value}</span>
                                </div>
                              ))}
                            </div>

                            {/* Feature list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {[
                                'Instant virtual key via email and dashboard',
                                'Key IP-pinned after first use for security',
                                'PII auto-masked before forwarding to provider',
                              ].map(f => (
                                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--nb-text-2)' }}>
                                  <CheckCircle2 size={12} style={{ color: 'var(--nb-green)', flexShrink: 0 }} />
                                  {f}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Right: Price + CTA */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px', minWidth: '140px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontFamily: 'var(--font-head)', fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--nb-green)' }}>₹{selectedPlan.price}</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--nb-text-3)', letterSpacing: '0.04em' }}>ONE-TIME</div>
                            </div>
                            <button
                              onClick={handlePurchase} disabled={purchasing}
                              className="btn btn-primary"
                              style={{ width: '100%', justifyContent: 'center', padding: '11px 20px', opacity: purchasing ? 0.6 : 1, cursor: purchasing ? 'not-allowed' : 'pointer', pointerEvents: purchasing ? 'none' : 'auto' }}
                            >
                              {purchasing
                                ? <span style={{ width: '14px', height: '14px', border: '2px solid rgba(2,44,34,0.3)', borderTopColor: '#02180e', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                : <><ShoppingBag size={13} /> Rent now <ArrowRight size={13} /></>
                              }
                            </button>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--nb-text-3)', letterSpacing: '0.04em', textAlign: 'center' }}>SECURE VIA CASHFREE</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </>
          )}
        </div>
      </section>

      <Footer />
      <style>{`
        @keyframes nb-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) { .mk-grid { grid-template-columns: 1fr 1fr !important; } }
      `}</style>
    </div>
  );
}
