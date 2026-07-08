import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Zap, Clock, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { marketplaceAPI } from '../api/client';

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-40px' };
const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay } },
});

const PROVIDERS = ['OPENAI', 'ANTHROPIC', 'GOOGLE'];

const TIER_META = {
  15:   { label: '15 Minutes', sublabel: 'BURST MODE',    icon: <Zap size={14} />,   drainMult: 1.2, bestValue: false },
  30:   { label: '30 Minutes', sublabel: 'STANDARD',      icon: <Clock size={14} />, drainMult: 1.0, bestValue: false },
  60:   { label: '1 Hour',     sublabel: 'POPULAR',       icon: <Zap size={14} />,   drainMult: 0.9, bestValue: true  },
  1440: { label: '24 Hours',   sublabel: 'ENTERPRISE',    icon: <Clock size={14} />, drainMult: 0.8, bestValue: false },
};

const FALLBACK = [
  { duration_minutes: 15,   price: '49',  token_cap: 20000  },
  { duration_minutes: 30,   price: '89',  token_cap: 40000  },
  { duration_minutes: 60,   price: '149', token_cap: 80000  },
  { duration_minutes: 1440, price: '499', token_cap: 120000 },
];

const PROVIDER_SPECS = {
  OPENAI:    { label: 'OPENAI',     drain: '10x Tokens',  minDur: '15 Minutes', concurrency: '5 Parallel Requests',  latency: '85ms (Azure India)',   latencyGreen: true  },
  ANTHROPIC: { label: 'ANTHROPIC',  drain: '12x Tokens',  minDur: '30 Minutes', concurrency: '2 Parallel Requests',  latency: '160ms (US-East)',      latencyGreen: false },
  GOOGLE:    { label: 'GOOGLE',     drain: '8x Tokens',   minDur: '15 Minutes', concurrency: '10 Parallel Requests', latency: '70ms (Mumbai Region)', latencyGreen: true  },
};

const SPEC_ROWS = [
  { key: 'drain',       label: 'Base Drain Rate'      },
  { key: 'minDur',      label: 'Min Rental Duration'  },
  { key: 'concurrency', label: 'Concurrency Limits'   },
  { key: 'latency',     label: 'Indian Local Latency' },
];

const FAQS = [
  {
    q: 'What exactly is "Token Drain"?',
    a: 'Token Drain is our multiplier system for prepaid rentals. Since we provide infrastructure-level access, some models consume resources faster than others. A 10x drain means for every 1000 real tokens used, 10,000 are "drained" from your allocated rental cap.',
  },
  {
    q: 'Do unused tokens expire?',
    a: 'Yes. Each rental is a dedicated time-slot on our cluster. Once your duration (e.g., 1 hour) ends, the API key is automatically revoked and any remaining tokens in that specific slot expire. We recommend choosing a duration that matches your expected burst window.',
  },
  {
    q: 'Can I top-up an active rental?',
    a: 'Absolutely. You can add more tokens to an active session via the Developer Console. This will not extend the time duration, but it will increase your capacity for that remaining window.',
  },
  {
    q: 'How is the price calculated in INR?',
    a: 'Prices are localized for the Indian market, inclusive of all platform fees. We use UPI for instant checkout so you don\'t have to deal with international transaction failures or high forex margins.',
  },
];

const fmt = n => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}K`;

function DrainBar({ mult }) {
  const filled = Math.round(mult * 5);
  return (
    <div style={{ display: 'flex', gap: '3px', marginTop: '10px' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: '4px', borderRadius: '2px',
          background: i < filled ? 'var(--secondary)' : 'rgba(255,255,255,0.08)',
          transition: 'background 200ms',
        }} />
      ))}
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', gap: '16px',
        }}
      >
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9375rem', color: '#e8edf8', lineHeight: 1.4 }}>{q}</span>
        <ChevronDown size={16} color="var(--on-surface-3)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)', lineHeight: 1.75, paddingBottom: '20px' }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Pricing() {
  const [plans, setPlans]         = useState([]);
  const [activeTab, setActiveTab] = useState('OPENAI');
  const navigate = useNavigate();

  useEffect(() => {
    marketplaceAPI.getPlans().then(r => setPlans(r.data)).catch(() => {});
  }, []);

  const displayPlans = plans.length > 0 ? plans : FALLBACK;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0d14' }}>
      <Helmet>
        <title>Pricing — AIRent | Affordable AI API Rental Plans in INR</title>
        <meta name="description" content="Simple, pay-as-you-go AI API rental plans. Rent GPT-4o, Claude, Gemini by the hour or day. No subscription. Pay in INR via UPI." />
        <link rel="canonical" href="https://airent.dev/pricing" />
      </Helmet>
      <Navbar />

      <main style={{ flex: 1, paddingTop: '60px' }}>

        {/* ── HERO ── */}
        <section style={{ padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,56px) clamp(40px,6vw,64px)', background: '#0d1017' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <motion.h1 initial="hidden" animate="show" variants={fadeUp(0)} style={{
              fontFamily: 'var(--font-head)', fontWeight: 800,
              fontSize: 'clamp(2.2rem,6vw,3.5rem)', lineHeight: 1.05,
              letterSpacing: '-0.03em', color: '#e8edf8', marginBottom: '20px',
            }}>
              Compute on tap.<br />Pay as you drain.
            </motion.h1>
            <motion.p initial="hidden" animate="show" variants={fadeUp(0.07)} style={{
              fontFamily: 'var(--font-body)', fontSize: '0.9375rem', lineHeight: 1.7,
              color: 'var(--on-surface-2)', maxWidth: '420px',
            }}>
              High-performance AI API rentals for Indian developers. No subscriptions. No credit cards. Just prepaid keys with clear drain metrics.
            </motion.p>
          </div>
        </section>

        {/* ── PROVIDER TABS ── */}
        <section style={{ background: '#0a0d14', padding: '0 clamp(20px,5vw,56px)' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {PROVIDERS.map(p => (
                <button
                  key={p}
                  onClick={() => setActiveTab(p)}
                  style={{
                    padding: '18px 28px', background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
                    letterSpacing: '0.08em', color: activeTab === p ? '#e8edf8' : 'var(--on-surface-3)',
                    borderBottom: `2px solid ${activeTab === p ? 'var(--primary)' : 'transparent'}`,
                    marginBottom: '-1px', transition: 'color 150ms',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── PLAN CARDS ── */}
        <section style={{ background: '#0a0d14', padding: 'clamp(32px,5vw,56px) clamp(20px,5vw,56px)' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }} className="plan-cards-grid">
              {displayPlans.map((plan, i) => {
                const meta = TIER_META[plan.duration_minutes] || { label: `${plan.duration_minutes}m`, sublabel: '', drainMult: 1, bestValue: false };
                const isPopular = plan.duration_minutes === 60;
                return (
                  <motion.div key={plan.id || plan.duration_minutes} initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(i * 0.06)}>
                    <div style={{
                      background: '#111520', borderRadius: '14px', padding: '22px 20px',
                      border: `1px solid ${isPopular ? 'rgba(192,193,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
                      height: '100%', display: 'flex', flexDirection: 'column', gap: '0',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      {/* Best value ribbon */}
                      {meta.bestValue && (
                        <div style={{
                          position: 'absolute', top: '14px', right: '-22px',
                          background: 'var(--primary)', color: 'var(--on-primary)',
                          fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700,
                          letterSpacing: '0.08em', padding: '4px 28px',
                          transform: 'rotate(45deg)', transformOrigin: 'center',
                        }}>BEST VALUE</div>
                      )}

                      {/* Sublabel + icon */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: isPopular ? 'var(--primary)' : 'var(--on-surface-3)' }}>
                          {meta.sublabel}
                        </span>
                        <span style={{ color: 'var(--on-surface-3)' }}>{meta.icon}</span>
                      </div>

                      {/* Duration label */}
                      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.0625rem', color: '#e8edf8', marginBottom: '20px' }}>
                        {meta.label}
                      </div>

                      {/* Token Cap */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--on-surface-3)' }}>Token Cap</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: '#e8edf8' }}>{fmt(plan.token_cap)}</span>
                      </div>

                      {/* Drain Rate */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--on-surface-3)' }}>Drain Rate</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)' }}>
                          {meta.drainMult.toFixed(1)}x Base
                        </span>
                      </div>

                      {/* Progress bar */}
                      <DrainBar mult={meta.drainMult} />

                      {/* Price */}
                      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '2rem', color: '#e8edf8', letterSpacing: '-0.03em', marginTop: '20px', marginBottom: '16px' }}>
                        ₹{plan.price}
                      </div>

                      {/* CTA */}
                      <button
                        onClick={() => navigate('/marketplace')}
                        style={{
                          width: '100%', padding: '11px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 700,
                          background: isPopular ? 'var(--primary)' : 'rgba(255,255,255,0.07)',
                          color: isPopular ? 'var(--on-primary)' : '#e8edf8',
                          transition: 'filter 120ms, background 120ms',
                          marginTop: 'auto',
                        }}
                        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                      >
                        Rent Slot
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FEATURE COMPARISON TABLE ── */}
        <section style={{ background: '#0a0d14', padding: '0 clamp(20px,5vw,56px) clamp(48px,7vw,80px)' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <motion.h2 initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{
              fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 'clamp(1.3rem,2.5vw,1.75rem)',
              color: '#e8edf8', letterSpacing: '-0.02em', marginBottom: '24px',
            }}>
              Feature Comparison
            </motion.h2>

            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0.06)} style={{
              background: '#111520', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden',
            }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', background: '#141820', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)' }}>SPECIFICATION</span>
                {Object.entries(PROVIDER_SPECS).map(([key, spec]) => (
                  <span key={key} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: key === 'GOOGLE' ? 'var(--secondary)' : 'var(--on-surface-2)' }}>
                    {spec.label}
                  </span>
                ))}
              </div>

              {/* Table rows */}
              {SPEC_ROWS.map((row, i) => (
                <div key={row.key} style={{
                  display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                  padding: '18px 24px',
                  borderBottom: i < SPEC_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: '#e8edf8' }}>{row.label}</span>
                  {Object.entries(PROVIDER_SPECS).map(([key, spec]) => {
                    const val = spec[row.key];
                    const isGreen = row.key === 'latency' && spec.latencyGreen;
                    return (
                      <span key={key} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 500, color: isGreen ? 'var(--secondary)' : 'var(--on-surface-2)' }}>
                        {val}
                      </span>
                    );
                  })}
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ background: '#0d1017', padding: 'clamp(48px,7vw,80px) clamp(20px,5vw,56px)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <motion.h2 initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{
              fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 'clamp(1.4rem,2.5vw,1.9rem)',
              color: '#e8edf8', letterSpacing: '-0.02em', marginBottom: '32px',
            }}>
              Frequently Asked Questions
            </motion.h2>

            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0.06)}>
              {FAQS.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
