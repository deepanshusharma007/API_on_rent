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
import { fadeUp, fadeIn, scaleIn, staggerContainer, viewport } from '../lib/motion';
import { getProviderMeta, inferProvider } from '../lib/providerMeta.jsx';

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

export default function Marketplace() {
  const [plans, setPlans]                   = useState([]);
  const [activeProviders, setActiveProviders] = useState([]); // list of provider id strings
  const [loading, setLoading]               = useState(true);
  const [purchasing, setPurchasing]         = useState(false);

  // 3-step state
  const [selectedProvider, setSelectedProvider] = useState(null); // e.g. "openai"
  const [selectedPlan, setSelectedPlan]         = useState(null);

  const navigate = useNavigate();
  const logout   = useAuthStore(s => s.logout);

  useEffect(() => {
    Promise.all([marketplaceAPI.getPlans(), providersAPI.getActiveProviders()])
      .then(([plansRes, providersRes]) => {
        const activePlans = plansRes.data.filter(p => p.is_active);
        setPlans(activePlans);
        setActiveProviders(providersRes.data.providers || []);
      })
      .catch(() => toast.error('Failed to load marketplace'))
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async () => {
    if (!selectedPlan || !selectedProvider) {
      toast.error('Please complete all steps');
      return;
    }
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

  const quickLinks = [
    { icon: LayoutDashboard, label: 'My Rentals', to: '/dashboard' },
    { icon: FlaskConical,    label: 'Playground',  to: '/playground' },
    { icon: Activity,        label: 'Status',      to: '/status' },
  ];

  const step = selectedProvider ? (selectedPlan ? 3 : 2) : 1;

  return (
    <div className="min-h-screen flex flex-col bg-[#07070f]">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 pb-10 px-5 text-center overflow-hidden">
        <div className="blob-1 top-[-80px] left-1/2 -translate-x-1/2 opacity-50" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show"
          className="relative max-w-2xl mx-auto">
          <motion.p variants={fadeUp} className="text-violet-400 text-sm font-semibold tracking-widest uppercase mb-4">
            AI API Marketplace
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl font-black text-white leading-tight mb-4">
            Rent AI access<br /><span className="gradient-text">by the hour</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-gray-400 text-lg mb-6">
            Pick a provider. Choose a duration. Get a virtual key instantly.
          </motion.p>
          <motion.div variants={fadeUp} className="flex gap-2 flex-wrap justify-center">
            {quickLinks.map(({ icon: Icon, label, to }) => (
              <Link key={to} to={to}
                className="flex items-center gap-2 px-4 py-2 glass-card border border-white/[0.06] hover:border-white/[0.14] text-gray-400 hover:text-white rounded-xl text-sm transition-all">
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
            <button onClick={() => { logout(); navigate('/'); }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm transition-all">
              <LogOut className="w-4 h-4" />Log out
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Main */}
      <section className="px-5 pb-20 flex-1">
        <div className="max-w-4xl mx-auto space-y-10">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(n => <div key={n} className="h-32 glass-card rounded-2xl animate-pulse border border-white/[0.04]" />)}
            </div>
          ) : (
            <>
              {/* ── Step 1 — Pick Provider ── */}
              <motion.div variants={staggerContainer(0.06)} initial="hidden" whileInView="show" viewport={viewport}>
                <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border transition-all ${
                    step >= 1 ? 'bg-violet-500/20 border-violet-500/30 text-violet-400' : 'bg-white/5 border-white/10 text-gray-600'
                  }`}>1</div>
                  <div>
                    <h2 className="text-white font-black text-xl">Choose a provider</h2>
                    <p className="text-gray-600 text-sm">Select the AI provider you want to use</p>
                  </div>
                  {selectedProvider && (
                    <button
                      onClick={() => { setSelectedProvider(null); setSelectedPlan(null); }}
                      className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                      <ChevronLeft className="w-3 h-3" /> Change
                    </button>
                  )}
                </motion.div>

                {activeProviders.length === 0 ? (
                  <div className="py-12 text-center text-gray-600">No providers available right now — check back soon.</div>
                ) : (
                  <div className={`grid gap-4 ${activeProviders.length === 1 ? 'grid-cols-1 max-w-xs' : activeProviders.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
                    {activeProviders.map(providerId => {
                      const meta = getProviderMeta(providerId);
                      const isSelected = selectedProvider === providerId;
                      return (
                        <motion.button key={providerId} variants={scaleIn}
                          whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                          onClick={() => { setSelectedProvider(providerId); setSelectedPlan(null); }}
                          className={`relative text-left p-6 rounded-2xl border transition-all duration-200 ${
                            isSelected
                              ? `${meta.bg} ${meta.border} ring-1 ${meta.glow}`
                              : 'glass-card border-white/[0.06] hover:border-white/[0.14]'
                          }`}>
                          {isSelected && <CheckCircle className={`absolute top-3 right-3 w-4 h-4 ${meta.accent}`} />}
                          <div className={`mb-3 ${meta.logoColor || meta.accent}`}>
                            <meta.Logo className="w-10 h-10" />
                          </div>
                          <div className={`font-black text-lg ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                            {meta.name || providerId}
                          </div>
                          <div className="text-gray-500 text-xs mt-1">All models included</div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* ── Step 2 — Pick Duration ── */}
              <AnimatePresence>
                {selectedProvider && (
                  <motion.div key="step2"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border transition-all ${
                        step >= 2 ? 'bg-violet-500/20 border-violet-500/30 text-violet-400' : 'bg-white/5 border-white/10 text-gray-600'
                      }`}>2</div>
                      <div>
                        <h2 className="text-white font-black text-xl">Choose a duration</h2>
                        <p className="text-gray-600 text-sm">Your key works for the full period</p>
                      </div>
                      {selectedPlan && (
                        <button
                          onClick={() => setSelectedPlan(null)}
                          className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                          <ChevronLeft className="w-3 h-3" /> Change
                        </button>
                      )}
                    </div>

                    {plans.length === 0 ? (
                      <div className="py-12 text-center text-gray-600">No plans available yet — check back soon.</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {plans.map(plan => {
                          const isSelected = selectedPlan?.id === plan.id;
                          const emojis = { 15: '⚡', 30: '🕐', 60: '🌙', 1440: '☀️' };
                          const emoji = emojis[plan.duration_minutes] || '⏱️';
                          const durationText = formatDuration(plan);
                          return (
                            <motion.button key={plan.id} variants={scaleIn}
                              whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                              onClick={() => setSelectedPlan(plan)}
                              className={`relative text-left p-5 rounded-2xl border transition-all duration-200 ${
                                isSelected
                                  ? 'bg-violet-500/15 border-violet-500/40 ring-1 ring-violet-500/30'
                                  : 'glass-card border-white/[0.06] hover:border-white/[0.14]'
                              }`}>
                              {isSelected && <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-violet-400" />}
                              <div className="text-3xl mb-3">{emoji}</div>
                              <div className={`font-black text-lg ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                {durationText}
                              </div>
                              <div className="text-gray-500 text-xs mt-1">{formatTokens(plan.token_cap)} tokens</div>
                              <div className={`text-2xl font-black mt-3 ${isSelected ? 'text-violet-300' : 'text-white'}`}>
                                ${plan.price}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Step 3 — Review & Buy ── */}
              <AnimatePresence>
                {selectedProvider && selectedPlan && (
                  <motion.div key="step3"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-black text-xs">3</div>
                      <div>
                        <h2 className="text-white font-black text-xl">Review & rent</h2>
                        <p className="text-gray-600 text-sm">One-time payment · instant key delivery · no subscription</p>
                      </div>
                    </div>

                    {(() => {
                      const provMeta = getProviderMeta(selectedProvider);
                      const durationText = formatDuration(selectedPlan);
                      return (
                        <div className="relative rounded-3xl border overflow-hidden bg-gradient-to-br from-violet-600/10 to-fuchsia-600/5 border-violet-500/30 ring-1 ring-violet-500/20">
                          <div className="p-8">
                            <div className="flex flex-col md:flex-row md:items-start gap-8">
                              {/* Left: details */}
                              <div className="flex-1 space-y-5">
                                {/* Provider + duration heading */}
                                <div className="flex items-center gap-3">
                                  <div className={`${provMeta.logoColor || provMeta.accent}`}>
                                    <provMeta.Logo className="w-8 h-8" />
                                  </div>
                                  <div>
                                    <h3 className="text-white font-black text-2xl">{provMeta.name || selectedProvider} — {durationText}</h3>
                                    <p className="text-gray-400 text-sm mt-0.5">Access to all active {provMeta.name || selectedProvider} models for the full duration</p>
                                  </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {[
                                    { icon: Zap,   label: 'Token cap',  value: formatTokens(selectedPlan.token_cap) },
                                    { icon: Clock, label: 'Duration',    value: durationText },
                                    { icon: Cpu,   label: 'Rate limit',  value: `${selectedPlan.rpm_limit} RPM` },
                                  ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Icon className="w-3 h-3 text-gray-600" />
                                        <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">{label}</span>
                                      </div>
                                      <div className="font-black text-sm text-violet-300">{value}</div>
                                    </div>
                                  ))}
                                </div>

                                {/* Features */}
                                <ul className="space-y-1.5 text-sm text-gray-400">
                                  {[
                                    'Instant virtual key delivery via email & dashboard',
                                    'Key is IP-pinned after first use for security',
                                    'PII auto-masked before forwarding to provider',
                                    'HTML invoice available after purchase',
                                  ].map(f => (
                                    <li key={f} className="flex items-center gap-2">
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      {f}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Right: price + CTA */}
                              <div className="md:w-48 flex flex-col items-center md:items-end gap-4">
                                <div className="text-right">
                                  <div className="text-5xl font-black text-white">${selectedPlan.price}</div>
                                  <div className="text-gray-500 text-sm">one-time</div>
                                </div>
                                <motion.button
                                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                  onClick={handlePurchase} disabled={purchasing}
                                  className="w-full flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl transition-all shadow-2xl shadow-violet-500/30 disabled:opacity-60">
                                  {purchasing
                                    ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <><ShoppingBag className="w-5 h-5" />Rent Now <ArrowRight className="w-4 h-4" /></>}
                                </motion.button>
                                <p className="text-gray-700 text-xs text-center">Secure checkout via Cashfree</p>
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
    </div>
  );
}
