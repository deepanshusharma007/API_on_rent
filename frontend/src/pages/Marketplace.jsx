import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Clock, ShoppingBag, ArrowRight, LogOut,
  LayoutDashboard, FlaskConical, Activity, CheckCircle, Cpu, ChevronLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceAPI, paymentAPI, providersAPI } from '../api/client';
import useAuthStore from '../store/authStore';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, scaleIn, staggerContainer, viewport } from '../lib/motion';
import { getProviderMeta } from '../lib/providerMeta.jsx';

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

export default function Marketplace() {
  const [plans,           setPlans]           = useState([]);
  const [activeProviders, setActiveProviders] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [purchasing,      setPurchasing]      = useState(false);

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedPlan,     setSelectedPlan]     = useState(null);

  const navigate = useNavigate();
  const logout   = useAuthStore(s => s.logout);

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

  const StepNum = ({ n, active }) => (
    <div style={{
      width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.75rem', fontWeight: 700,
      background: active ? 'var(--c-accent-bg)'     : 'var(--c-raised)',
      border:     `1px solid ${active ? 'var(--c-accent-border)' : 'var(--c-border)'}`,
      color:      active ? 'var(--c-accent-hi)'      : 'var(--c-text-3)',
    }}>
      {n}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ paddingTop: '120px', paddingBottom: '16px', paddingLeft: '20px', paddingRight: '20px' }}>
        <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show" className="max-w-4xl mx-auto">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <motion.p variants={fadeUp} className="eyebrow mb-4">AI API Marketplace</motion.p>
              <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', lineHeight: 1.1, marginBottom: '10px' }}>
                Rent AI access by the hour
              </motion.h1>
              <motion.p variants={fadeUp} style={{ color: 'var(--c-text-2)', fontSize: '0.95rem', lineHeight: 1.65, maxWidth: '480px' }}>
                Pick a provider. Choose a duration. Get a virtual key instantly, in INR via UPI.
              </motion.p>
            </div>
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
              <Link to="/dashboard" className="btn btn-secondary" style={{ fontSize: '0.825rem' }}>
                <LayoutDashboard size={14} /> My Rentals
              </Link>
              <Link to="/playground" className="btn btn-secondary" style={{ fontSize: '0.825rem' }}>
                <FlaskConical size={14} /> Playground
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Main */}
      <section style={{ padding: '24px 20px 80px', flex: 1 }}>
        <div className="max-w-4xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(n => (
                <div key={n} style={{ height: '112px', background: 'var(--c-surface)', borderRadius: '10px', border: '1px solid var(--c-border)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : (
            <>
              {/* Step 1 — Provider */}
              <motion.div variants={staggerContainer(0.06)} initial="hidden" whileInView="show" viewport={viewport}>
                <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <StepNum n={1} active={step >= 1} />
                  <div>
                    <h2 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '0.95rem' }}>Choose a provider</h2>
                    <p style={{ color: 'var(--c-text-3)', fontSize: '0.775rem' }}>Select the AI provider you want to use</p>
                  </div>
                  {selectedProvider && (
                    <button
                      onClick={() => { setSelectedProvider(null); setSelectedPlan(null); }}
                      style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.775rem', color: 'var(--c-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <ChevronLeft size={12} /> Change
                    </button>
                  )}
                </motion.div>

                {activeProviders.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-3)', fontSize: '0.875rem' }}>
                    No providers available right now — check back soon.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: activeProviders.length === 1 ? '200px' : activeProviders.length === 2 ? '1fr 1fr' : 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                    {activeProviders.map(providerId => {
                      const meta = getProviderMeta(providerId);
                      const isSelected = selectedProvider === providerId;
                      return (
                        <motion.button key={providerId} variants={scaleIn}
                          onClick={() => { setSelectedProvider(providerId); setSelectedPlan(null); }}
                          style={{
                            textAlign: 'left', padding: '20px', borderRadius: '10px',
                            background: isSelected ? 'var(--c-accent-bg)' : 'var(--c-surface)',
                            border: `1px solid ${isSelected ? 'var(--c-accent-border)' : 'var(--c-border)'}`,
                            cursor: 'pointer', position: 'relative',
                            transition: 'border-color 150ms, background 150ms',
                          }}>
                          {isSelected && <CheckCircle size={14} style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--c-accent)' }} />}
                          <div style={{ marginBottom: '8px' }}>
                            <meta.Logo className={`w-8 h-8 ${meta.logoColor}`} style={{ width: '32px', height: '32px' }} />
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--c-text)', marginBottom: '2px' }}>
                            {meta.name || providerId}
                          </div>
                          <div style={{ color: 'var(--c-text-3)', fontSize: '0.75rem' }}>All models included</div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Step 2 — Duration */}
              <AnimatePresence>
                {selectedProvider && (
                  <motion.div key="step2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <StepNum n={2} active={step >= 2} />
                      <div>
                        <h2 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '0.95rem' }}>Choose a duration</h2>
                        <p style={{ color: 'var(--c-text-3)', fontSize: '0.775rem' }}>Your key works for the full period</p>
                      </div>
                      {selectedPlan && (
                        <button
                          onClick={() => setSelectedPlan(null)}
                          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.775rem', color: 'var(--c-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <ChevronLeft size={12} /> Change
                        </button>
                      )}
                    </div>

                    {plans.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-3)', fontSize: '0.875rem' }}>
                        No plans available yet — check back soon.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {plans.map(plan => {
                          const isSelected = selectedPlan?.id === plan.id;
                          const durationText = DURATION_LABELS[plan.duration_minutes] || formatDuration(plan);
                          return (
                            <motion.button key={plan.id} variants={scaleIn}
                              onClick={() => setSelectedPlan(plan)}
                              style={{
                                textAlign: 'left', padding: '18px', borderRadius: '10px',
                                background: isSelected ? 'var(--c-accent-bg)' : 'var(--c-surface)',
                                border: `1px solid ${isSelected ? 'var(--c-accent-border)' : 'var(--c-border)'}`,
                                cursor: 'pointer', position: 'relative',
                                transition: 'border-color 150ms, background 150ms',
                              }}>
                              {isSelected && <CheckCircle size={13} style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--c-accent)' }} />}
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--c-text)', marginBottom: '2px' }}>
                                {durationText}
                              </div>
                              <div style={{ color: 'var(--c-text-3)', fontSize: '0.75rem', marginBottom: '12px' }}>
                                {formatTokens(plan.token_cap)} tokens
                              </div>
                              <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: isSelected ? 'var(--c-accent-hi)' : 'var(--c-text)' }}>
                                ₹{plan.price}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 3 — Review & Buy */}
              <AnimatePresence>
                {selectedProvider && selectedPlan && (
                  <motion.div key="step3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <StepNum n={3} active />
                      <div>
                        <h2 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '0.95rem' }}>Review & rent</h2>
                        <p style={{ color: 'var(--c-text-3)', fontSize: '0.775rem' }}>One-time payment · instant key delivery · no subscription</p>
                      </div>
                    </div>

                    {(() => {
                      const provMeta = getProviderMeta(selectedProvider);
                      const durationText = DURATION_LABELS[selectedPlan.duration_minutes] || formatDuration(selectedPlan);
                      return (
                        <div style={{
                          borderRadius: '10px', overflow: 'hidden',
                          background: 'var(--c-surface)',
                          border: '1px solid var(--c-accent-border)',
                        }}>
                          <div style={{ padding: '24px' }}>
                            <div className="flex flex-col md:flex-row md:items-start gap-6">
                              {/* Details */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <provMeta.Logo className={`w-8 h-8 ${provMeta.logoColor}`} style={{ width: '32px', height: '32px' }} />
                                  <div>
                                    <h3 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '1.1rem' }}>
                                      {provMeta.name || selectedProvider} — {durationText}
                                    </h3>
                                    <p style={{ color: 'var(--c-text-3)', fontSize: '0.825rem' }}>
                                      Access to all active {provMeta.name || selectedProvider} models
                                    </p>
                                  </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {[
                                    { icon: Zap,   label: 'Token cap',  value: formatTokens(selectedPlan.token_cap) },
                                    { icon: Clock, label: 'Duration',    value: durationText },
                                    { icon: Cpu,   label: 'Rate limit',  value: `${selectedPlan.rpm_limit} RPM` },
                                  ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} style={{ padding: '12px', borderRadius: '8px', background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                                        <Icon size={11} style={{ color: 'var(--c-text-3)' }} />
                                        <span style={{ fontSize: '0.65rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</span>
                                      </div>
                                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--c-accent-hi)' }}>{value}</div>
                                    </div>
                                  ))}
                                </div>

                                {/* Features */}
                                <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {[
                                    'Instant virtual key delivery via email & dashboard',
                                    'Key is IP-pinned after first use for security',
                                    'PII auto-masked before forwarding to provider',
                                    'HTML invoice available after purchase',
                                  ].map(f => (
                                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--c-text-2)' }}>
                                      <CheckCircle size={13} style={{ color: 'var(--c-accent)', flexShrink: 0 }} />
                                      {f}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Price + CTA */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px', minWidth: '140px' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--c-text)' }}>₹{selectedPlan.price}</div>
                                  <div style={{ color: 'var(--c-text-3)', fontSize: '0.8rem' }}>one-time</div>
                                </div>
                                <button
                                  onClick={handlePurchase} disabled={purchasing}
                                  className="btn btn-primary"
                                  style={{ width: '100%', justifyContent: 'center', padding: '11px 20px', opacity: purchasing ? 0.6 : 1 }}
                                >
                                  {purchasing
                                    ? <span style={{ width: '16px', height: '16px', border: '2px solid rgba(2,44,34,0.3)', borderTopColor: '#022c22', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                    : <><ShoppingBag size={14} /> Rent Now <ArrowRight size={14} /></>
                                  }
                                </button>
                                <p style={{ color: 'var(--c-text-3)', fontSize: '0.725rem', textAlign: 'center' }}>Secure checkout via Cashfree</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </section>

      <Footer />
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
