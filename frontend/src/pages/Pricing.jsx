import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, ArrowRight, ShoppingBag, Zap, Clock, Shield, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { marketplaceAPI, providersAPI } from '../api/client';
import { fadeUp, fadeLeft, fadeRight, scaleIn, staggerContainer, viewport } from '../lib/motion';
import { getProviderMeta, PROVIDER_META } from '../lib/providerMeta.jsx';

/* ─── Static data ─────────────────────────────────────────── */

const INCLUSIONS = [
  { icon: Zap,    label: 'All AI models',             detail: 'GPT-4o, Claude, Gemini and every active provider, included in every plan.' },
  { icon: Clock,  label: 'Real-time token dashboard', detail: 'Watch usage tick down live. Never hit an unexpected wall mid-session.' },
  { icon: Shield, label: 'IP-pinned key security',    detail: 'Your key is locked to your IP. No-one else can use it, even if they find it.' },
  { icon: Cpu,    label: 'OpenAI-compatible API',     detail: 'Drop in your virtual key anywhere the OpenAI SDK is supported. Zero code changes.' },
];

const INCLUSIONS_LIST = [
  'Semantic response caching',
  'PII masking on all prompts',
  'HTML invoice and receipt',
  'Email delivery of your key',
  'Pausable key on token exhaustion',
  'All payment methods via Cashfree',
];

const FAQS = [
  { q: 'Can I switch models within one rental?',         a: "Yes. Each plan unlocks all active providers. Specify the model per-request using the standard OpenAI model field." },
  { q: 'What happens when tokens run out before time?',  a: 'Your key pauses automatically. You can buy a new plan instantly and it activates alongside the existing window.' },
  { q: 'Is there a free trial?',                         a: 'Sign up free and explore the dashboard, docs, and playground. Live API access requires a paid plan.' },
  { q: 'Do unused tokens roll over?',                    a: 'No. Token balance and rental window both expire at the end of the period. Plan around what you need.' },
  { q: 'How do drain rates work?',                       a: 'Expensive models consume tokens faster. GPT-4o uses 10x more credits than Gemini Flash per call. The docs list every rate.' },
];

const TIER_META = {
  15:   { label: '15 min', sublabel: 'Quick test',     desc: 'Run a sanity check, prototype a single flow, or validate a prompt before committing longer.' },
  30:   { label: '30 min', sublabel: 'Short session',  desc: 'Enough runway for most debugging sessions and short build experiments.' },
  60:   { label: '1 hour', sublabel: 'Work session',   desc: 'The most popular choice. A real working block with headroom for iteration.', popular: true },
  1440: { label: '24 hrs', sublabel: 'Full day',       desc: 'Long builds, overnight runs, or anything that needs a full day of uninterrupted access.' },
};

const FALLBACK = [
  { duration_minutes: 15,   price: '49',  token_cap: 20000   },
  { duration_minutes: 30,   price: '89',  token_cap: 40000   },
  { duration_minutes: 60,   price: '149', token_cap: 80000   },
  { duration_minutes: 1440, price: '499', token_cap: 1200000 },
];

/* ─── Provider chip for marquee ──────────────────────────── */

function ProviderChip({ providerKey }) {
  const { Logo, logoColor, name, bg, border } = getProviderMeta(providerKey);
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

/* ─── Plan card ───────────────────────────────────────────── */

function PlanCard({ plan, isPopular, fmt }) {
  const meta = TIER_META[plan.duration_minutes] || { label: `${plan.duration_minutes}m`, sublabel: '', desc: '' };

  return (
    <div
      style={{
        padding: isPopular ? '28px' : '24px',
        borderRadius: '12px',
        height: '100%',
        position: 'relative',
        background: isPopular ? 'var(--c-accent-bg)' : 'var(--c-surface)',
        border: `1px solid ${isPopular ? 'var(--c-accent-border)' : 'var(--c-border)'}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 150ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }}
    >
      {isPopular && (
        <div style={{
          position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--c-accent)', color: '#022c22',
          fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: '4px',
          whiteSpace: 'nowrap', letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Most Popular
        </div>
      )}

      <div style={{ marginBottom: '2px', color: 'var(--c-text)', fontWeight: 700, fontSize: '1rem' }}>
        {plan.duration_label || meta.label}
      </div>
      <div style={{ color: 'var(--c-text-3)', fontSize: '0.75rem', marginBottom: '20px', letterSpacing: '0.02em' }}>
        {meta.sublabel}
      </div>

      <div style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.035em', color: isPopular ? 'var(--c-accent-hi)' : 'var(--c-text)', lineHeight: 1 }}>
        &#8377;{plan.price}
      </div>
      <div style={{ color: 'var(--c-text-3)', fontSize: '0.75rem', marginBottom: '16px', marginTop: '4px' }}>
        one-time &middot; {fmt(plan.token_cap)} tokens
      </div>

      <p style={{ color: 'var(--c-text-2)', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: '20px', flex: 1 }}>
        {meta.desc}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isPopular ? 'var(--c-accent)' : 'var(--c-text-3)', fontSize: '0.75rem', fontWeight: 500 }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
        Buy on Marketplace
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

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
  const fmt            = n => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}K`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Helmet>
        <title>Pricing &mdash; AIRent | Affordable AI API Rental Plans in INR</title>
        <meta name="description" content="Simple, pay-as-you-go AI API rental plans. Rent GPT-4o, Claude, Gemini by the hour or day. No subscription. Pay in INR via UPI." />
        <link rel="canonical" href="https://airent.dev/pricing" />
      </Helmet>
      <Navbar />

      {/* ── Hero ── */}
      <section style={{ paddingTop: '120px', paddingBottom: '80px', paddingLeft: '20px', paddingRight: '20px' }}>
        <div className="max-w-3xl mx-auto">
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show">
            <motion.p variants={fadeUp} className="eyebrow mb-5">Transparent Pricing</motion.p>
            <motion.h1 variants={fadeUp} style={{
              fontSize: 'clamp(2.2rem, 6vw, 3.8rem)', fontWeight: 800,
              letterSpacing: '-0.035em', color: 'var(--c-text)', lineHeight: 1.05, marginBottom: '20px',
            }}>
              Pay for what you use.<br />Nothing more.
            </motion.h1>
            <motion.p variants={fadeUp} style={{
              color: 'var(--c-text-2)', fontSize: '1.05rem', lineHeight: 1.7,
              marginBottom: '32px', maxWidth: '560px',
            }}>
              One-time payments in INR. No subscriptions, no annual lock-in.
              Pick a duration and get instant access to every active AI provider.
            </motion.p>
            <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Link to="/marketplace" className="btn btn-primary" style={{ padding: '11px 24px' }}>
                <ShoppingBag size={15} /> Browse Marketplace <ArrowRight size={15} />
              </Link>
              <Link to="/docs" className="btn btn-ghost">View API docs</Link>
            </motion.div>
            <motion.p variants={fadeUp} style={{ color: 'var(--c-text-3)', fontSize: '0.775rem', marginTop: '16px' }}>
              Powered by Cashfree &middot; UPI, cards, netbanking &middot; Instant key delivery
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Provider strip ── */}
      <section style={{ borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface)', padding: '36px 0' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="marquee-banner">
            {slideItems.map((pid, i) => <ProviderChip key={`${pid}-${i}`} providerKey={pid} />)}
          </div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section style={{ padding: '96px 20px', background: 'var(--c-bg)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={staggerContainer(0.07)} initial="hidden" whileInView="show" viewport={viewport}>
            <motion.p variants={fadeUp} className="eyebrow mb-4">Plans</motion.p>
            <motion.h2 variants={fadeUp} style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800,
              letterSpacing: '-0.025em', color: 'var(--c-text)', marginBottom: '10px',
            }}>
              Choose your duration
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: 'var(--c-text-3)', fontSize: '0.875rem', maxWidth: '500px', lineHeight: 1.65, marginBottom: '48px' }}>
              One plan gives access to all active AI models. Expensive models consume tokens faster, that is the only difference.
            </motion.p>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.09)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start"
          >
            {displayPlans.map(plan => {
              const meta = TIER_META[plan.duration_minutes];
              const isPopular = !!(meta && meta.popular);
              return (
                <motion.div key={plan.id || plan.duration_minutes} variants={scaleIn} style={{ height: '100%' }}>
                  <PlanCard plan={plan} isPopular={isPopular} fmt={fmt} />
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
            style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
          >
            <p style={{ color: 'var(--c-text-3)', fontSize: '0.85rem', textAlign: 'center', maxWidth: '380px', lineHeight: 1.65 }}>
              All plans include every active AI provider. Select a duration on the Marketplace to buy.
            </p>
            <Link to="/marketplace" className="btn btn-primary">
              <ShoppingBag size={15} /> Go to Marketplace <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── What's included ── */}
      <section style={{ padding: '80px 20px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left: headline + feature pillars */}
            <motion.div variants={fadeLeft} initial="hidden" whileInView="show" viewport={viewport}>
              <p className="eyebrow mb-4">Every Plan Includes</p>
              <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)', marginBottom: '32px', lineHeight: 1.2 }}>
                Everything you need.<br />Nothing you don't.
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {INCLUSIONS.map(({ icon: Icon, label, detail }) => (
                  <div key={label} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                      background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={16} style={{ color: 'var(--c-accent)' }} />
                    </div>
                    <div>
                      <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '3px' }}>{label}</div>
                      <div style={{ color: 'var(--c-text-3)', fontSize: '0.8rem', lineHeight: 1.6 }}>{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right: checklist */}
            <motion.div variants={fadeRight} initial="hidden" whileInView="show" viewport={viewport}>
              <div style={{
                background: 'var(--c-raised)', border: '1px solid var(--c-border)',
                borderRadius: '12px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}>
                <p style={{ color: 'var(--c-text-2)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '20px', letterSpacing: '0.01em' }}>
                  Also included in every plan
                </p>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {INCLUSIONS_LIST.map((item, i) => (
                    <div key={item} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 0',
                      borderBottom: i < INCLUSIONS_LIST.length - 1 ? '1px solid var(--c-border)' : 'none',
                    }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--c-accent)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--c-text-2)', fontSize: '0.85rem' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '18px', background: 'var(--c-raised)', border: '1px solid var(--c-border)', borderRadius: '10px' }}>
                <p style={{ color: 'var(--c-text-3)', fontSize: '0.775rem', lineHeight: 1.65 }}>
                  Plans do not auto-renew. You are never charged without choosing to buy. Keys expire naturally at the end of their window.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '96px 20px', background: 'var(--c-bg)' }}>
        <div className="max-w-2xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginBottom: '40px' }}>
            <p className="eyebrow mb-4">Common Questions</p>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)' }}>
              Things people ask before buying
            </h2>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {FAQS.map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
                style={{ padding: '22px 0', borderBottom: '1px solid var(--c-border)' }}
              >
                <p style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', letterSpacing: '-0.01em' }}>{item.q}</p>
                <p style={{ color: 'var(--c-text-3)', fontSize: '0.83rem', lineHeight: 1.7, maxWidth: '560px' }}>{item.a}</p>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginTop: '24px' }}>
            <Link to="/faq" style={{ color: 'var(--c-accent)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}>
              View all FAQs <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── CTA close ── */}
      <section style={{ padding: '80px 20px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)' }}>
        <div className="max-w-lg mx-auto" style={{ textAlign: 'center' }}>
          <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}>
            <motion.h2 variants={fadeUp} style={{ color: 'var(--c-text)', fontWeight: 800, fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: '12px', letterSpacing: '-0.025em' }}>
              Need something custom?
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: 'var(--c-text-3)', fontSize: '0.9rem', marginBottom: '28px', lineHeight: 1.65 }}>
              High-volume usage, team access, or white-label integration? Let's figure it out.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/contact" className="btn btn-primary">Talk to us <ArrowRight size={15} /></Link>
              <Link to="/marketplace" className="btn btn-secondary"><ShoppingBag size={15} /> Browse plans</Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
