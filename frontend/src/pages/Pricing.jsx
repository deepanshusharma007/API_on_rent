import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { marketplaceAPI, providersAPI } from '../api/client';
import { fadeUp, scaleIn, staggerContainer, viewport } from '../lib/motion';
import { getProviderMeta, PROVIDER_META } from '../lib/providerMeta.jsx';

const INCLUSIONS = [
  'All supported AI models',
  'Real-time token dashboard',
  'OpenAI-compatible endpoint',
  'Semantic response caching',
  'IP-pinned key security',
  'PII masking on all prompts',
  'HTML invoice & receipt',
  'Email delivery of your key',
];

const FAQS = [
  { q: 'Can I switch models within one rental?',          a: "Yes — each plan unlocks all active providers. Specify the model per-request." },
  { q: 'What if tokens run out before time expires?',      a: 'Your key pauses. Buy a new plan instantly — it activates alongside the existing one.' },
  { q: 'Is there a free trial?',                          a: 'Sign up free and explore the dashboard. API access requires a paid plan.' },
  { q: 'Do unused tokens roll over?',                     a: 'No — token balance and rental window both expire at the end of the period.' },
  { q: 'How do drain rates work?',                        a: 'Expensive models consume tokens faster. GPT-4o costs 10× more credits than Gemini Flash per call.' },
];

const TIER_META = {
  15:   { label: '15 min', desc: 'Quick prototype'  },
  30:   { label: '30 min', desc: 'Short session'    },
  60:   { label: '1 hour', desc: 'Work session', popular: true },
  1440: { label: '24 hrs', desc: 'Full day access'  },
};

const FALLBACK = [
  { duration_minutes: 15,   price: '49',  token_cap: 20000   },
  { duration_minutes: 30,   price: '89',  token_cap: 40000   },
  { duration_minutes: 60,   price: '149', token_cap: 80000   },
  { duration_minutes: 1440, price: '499', token_cap: 1200000 },
];

function ProviderChip({ providerKey }) {
  const meta = getProviderMeta(providerKey);
  const { Logo, logoColor, name, bg, border } = meta;
  return (
    <div
      className="flex-shrink-0 mx-3 flex items-center gap-3 px-5 py-3 rounded-lg"
      style={{ background: 'var(--c-raised)', border: '1px solid var(--c-border)', minWidth: '160px' }}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg} border ${border}`}>
        <Logo className={`w-5 h-5 ${logoColor}`} />
      </div>
      <div>
        <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.85rem' }}>{name || providerKey}</div>
        <div style={{ color: 'var(--c-accent)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--c-accent)', display: 'inline-block' }} />
          Active
        </div>
      </div>
    </div>
  );
}

export default function Pricing() {
  const [plans,     setPlans]     = useState([]);
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    Promise.all([marketplaceAPI.getPlans(), providersAPI.getActiveProviders()])
      .then(([p, pr]) => { setPlans(p.data); setProviders(pr.data.providers || []); })
      .catch(() => {});
  }, []);

  const displayPlans   = plans.length > 0 ? plans : FALLBACK;
  const slideProviders = providers.length > 0 ? providers : Object.keys(PROVIDER_META);
  const slideItems     = [...slideProviders, ...slideProviders, ...slideProviders];
  const fmt            = n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : `${(n/1000).toFixed(0)}K`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ paddingTop: '120px', paddingBottom: '80px', paddingLeft: '20px', paddingRight: '20px' }}>
        <div className="max-w-2xl mx-auto">
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show">
            <motion.p variants={fadeUp} className="eyebrow mb-5">Transparent Pricing</motion.p>
            <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', lineHeight: 1.1, marginBottom: '20px' }}>
              Pay for what you use.<br />Nothing more.
            </motion.h1>
            <motion.p variants={fadeUp} className="prose-width" style={{ color: 'var(--c-text-2)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '32px' }}>
              One-time payments. No subscriptions. Pick a duration — get instant access to all AI models.
            </motion.p>
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <Link to="/marketplace" className="btn btn-primary" style={{ padding: '11px 24px' }}>
                <ShoppingBag size={15} /> Browse Marketplace <ArrowRight size={15} />
              </Link>
            </motion.div>
            <motion.p variants={fadeUp} style={{ color: 'var(--c-text-3)', fontSize: '0.775rem', marginTop: '14px' }}>
              Powered by Cashfree · All major payment methods · Prices in INR
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Provider strip */}
      <section style={{ borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface)', padding: '40px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px', padding: '0 20px' }}>
          <p className="eyebrow mb-3">Supported Providers</p>
          <h2 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--c-text)' }}>
            World-class AI, on demand
          </h2>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div className="marquee">
            {slideItems.map((pid, i) => <ProviderChip key={`${pid}-${i}`} providerKey={pid} />)}
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section style={{ padding: '96px 20px', background: 'var(--c-bg)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginBottom: '48px' }}>
            <p className="eyebrow mb-4">Plans</p>
            <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)', marginBottom: '10px' }}>Choose your duration</h2>
            <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem', maxWidth: '480px' }}>
              One plan gives access to all active AI models. Expensive models consume tokens faster — that's the only difference.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.08)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {displayPlans.map(plan => {
              const meta    = TIER_META[plan.duration_minutes] || { label: `${plan.duration_minutes}m`, desc: '' };
              const popular = meta.popular;
              return (
                <motion.div key={plan.id || plan.duration_minutes} variants={scaleIn}>
                  <div
                    style={{
                      padding: '24px', borderRadius: '10px', height: '100%', position: 'relative',
                      background: popular ? 'var(--c-accent-bg)' : 'var(--c-surface)',
                      border: `1px solid ${popular ? 'var(--c-accent-border)' : 'var(--c-border)'}`,
                      display: 'flex', flexDirection: 'column',
                    }}
                  >
                    {popular && (
                      <div
                        style={{
                          position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                          background: 'var(--c-accent)', color: '#022c22',
                          fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: '4px',
                          whiteSpace: 'nowrap', letterSpacing: '0.05em', textTransform: 'uppercase',
                        }}
                      >
                        Most Popular
                      </div>
                    )}
                    <div style={{ marginBottom: '4px', color: 'var(--c-text)', fontWeight: 700, fontSize: '1.1rem' }}>
                      {plan.duration_label || meta.label}
                    </div>
                    <div style={{ color: 'var(--c-text-3)', fontSize: '0.8rem', marginBottom: '20px' }}>{meta.desc}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: popular ? 'var(--c-accent-hi)' : 'var(--c-text)', marginBottom: '4px' }}>
                      ₹{plan.price}
                    </div>
                    <div style={{ color: 'var(--c-text-3)', fontSize: '0.775rem', marginBottom: '20px' }}>
                      one-time · {fmt(plan.token_cap)} tokens
                    </div>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: popular ? 'var(--c-accent)' : 'var(--c-text-3)', fontSize: '0.775rem', fontWeight: 500 }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', animation: 'pulse 2s infinite' }} />
                      Buy on Marketplace
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem', textAlign: 'center', maxWidth: '400px' }}>
              All plans include access to every active AI provider. Select a duration on the Marketplace to buy.
            </p>
            <Link to="/marketplace" className="btn btn-primary">
              <ShoppingBag size={15} /> Go to Marketplace <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Inclusions */}
      <section style={{ padding: '80px 20px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginBottom: '40px' }}>
            <p className="eyebrow mb-4">Every Plan Includes</p>
            <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--c-text)' }}>Everything you need, included.</h2>
          </motion.div>
          <motion.div
            variants={staggerContainer(0.06)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3"
          >
            {INCLUSIONS.map(item => (
              <motion.div key={item} variants={scaleIn}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px', background: 'var(--c-raised)', border: '1px solid var(--c-border)', borderRadius: '8px' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--c-accent)', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ color: 'var(--c-text-2)', fontSize: '0.825rem', lineHeight: 1.5 }}>{item}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 20px', background: 'var(--c-bg)' }}>
        <div className="max-w-2xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--c-text)' }}>Common questions</h2>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {FAQS.map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
                style={{ padding: '18px 0', borderBottom: '1px solid var(--c-border)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
              >
                <div>
                  <p style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '6px' }}>{item.q}</p>
                  <p style={{ color: 'var(--c-text-3)', fontSize: '0.825rem', lineHeight: 1.65 }}>{item.a}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div style={{ marginTop: '20px' }}>
            <Link to="/faq" style={{ color: 'var(--c-accent)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}>View all FAQs →</Link>
          </div>
        </div>
      </section>

      {/* Enterprise */}
      <section style={{ padding: '80px 20px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)' }}>
        <div className="max-w-lg mx-auto" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '1.3rem', marginBottom: '10px', letterSpacing: '-0.02em' }}>Need a custom plan?</h2>
          <p style={{ color: 'var(--c-text-3)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.65 }}>High-volume usage, team access, or white-label integration? Let's talk.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/contact" className="btn btn-primary">Talk to us <ArrowRight size={15} /></Link>
            <Link to="/marketplace" className="btn btn-secondary"><ShoppingBag size={15} /> Browse plans</Link>
          </div>
        </div>
      </section>

      <Footer />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
