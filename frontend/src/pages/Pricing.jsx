import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { marketplaceAPI } from '../api/client';

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-60px' };
const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay } },
});

const SP = { padding: 'clamp(64px,9vw,104px) clamp(20px,5vw,72px)' };
const MAX = { maxWidth: '1120px', margin: '0 auto' };

const TIER_META = {
  15:   { label: '15 min',  sublabel: 'Quick test',    desc: 'Run a sanity check, prototype a single flow, or validate a prompt before committing longer.' },
  30:   { label: '30 min',  sublabel: 'Short session', desc: 'Enough runway for most debugging sessions and short build experiments.' },
  60:   { label: '1 hour',  sublabel: 'Work session',  desc: 'The most popular choice. A real working block with headroom for iteration.', popular: true },
  1440: { label: '24 hrs',  sublabel: 'Full day',      desc: 'Long builds, overnight runs, or anything that needs a full day of uninterrupted access.' },
};

const FALLBACK = [
  { duration_minutes: 15,   price: '49',  token_cap: 20000   },
  { duration_minutes: 30,   price: '89',  token_cap: 40000   },
  { duration_minutes: 60,   price: '149', token_cap: 80000   },
  { duration_minutes: 1440, price: '499', token_cap: 1200000 },
];

const INCLUDES = [
  ['All active AI providers', 'GPT-4o, Claude 3.5, Gemini 1.5 Pro — one plan unlocks all.'],
  ['Real-time token dashboard', 'Watch usage tick down live. Never hit a wall mid-session.'],
  ['IP-pinned key security', 'Your key locks to your IP on first request. Structurally safe.'],
  ['OpenAI-compatible endpoint', 'Drop into any OpenAI SDK. Zero code changes required.'],
  ['PII masking on all prompts', 'Personal data stripped before it reaches the model.'],
  ['Semantic response caching', 'Repeated prompts reuse cached responses, saving tokens.'],
  ['Email delivery of your key', 'Key lands in your inbox the moment payment clears.'],
  ['HTML invoice on every plan', 'Download your receipt immediately after purchase.'],
];

const FAQS = [
  { q: 'Can I switch models within one rental?',        a: 'Yes. Each plan unlocks all active providers. Specify the model per-request using the standard OpenAI model field.' },
  { q: 'What happens when tokens run out before time?', a: 'Your key pauses automatically. Buy a new plan instantly and it activates alongside the existing window.' },
  { q: 'Is there a free trial?',                        a: 'Sign up free and explore the dashboard, docs, and playground. Live API access requires a paid plan.' },
  { q: 'Do unused tokens roll over?',                   a: 'No. Token balance and rental window both expire at the end of the period. Plan around what you need.' },
  { q: 'How do drain rates work?',                      a: 'Expensive models consume tokens faster. GPT-4o uses 10x more credits than Gemini Flash per call. The docs list every rate.' },
];

const fmt = n => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}K`;

export default function Pricing() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    marketplaceAPI.getPlans().then(r => setPlans(r.data)).catch(() => {});
  }, []);

  const displayPlans = plans.length > 0 ? plans : FALLBACK;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nb-bg)' }}>
      <Helmet>
        <title>Pricing — AIRent | Affordable AI API Rental Plans in INR</title>
        <meta name="description" content="Simple, pay-as-you-go AI API rental plans. Rent GPT-4o, Claude, Gemini by the hour or day. No subscription. Pay in INR via UPI." />
        <link rel="canonical" href="https://airent.dev/pricing" />
      </Helmet>
      <Navbar />

      {/* ── Hero ── */}
      <section
        className="nb-grid-hero"
        style={{
          paddingTop: 'clamp(120px,16vw,180px)',
          paddingBottom: 'clamp(64px,8vw,96px)',
          paddingLeft: 'clamp(20px,5vw,72px)',
          paddingRight: 'clamp(20px,5vw,72px)',
          borderBottom: '1px solid var(--nb-border)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(to bottom, transparent, var(--nb-bg))', pointerEvents: 'none' }} />
        <div style={{ ...MAX, position: 'relative' }}>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
              <span style={{ width: '18px', height: '1px', background: 'var(--nb-green)', display: 'inline-block' }} />
              TRANSPARENT PRICING
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp(0.06)}
            initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2.8rem,7vw,5.2rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--nb-text)', lineHeight: 0.98, marginBottom: '28px' }}
          >
            Pay for what<br />
            <span style={{ color: 'var(--nb-text-2)' }}>you use.</span>
          </motion.h1>
          <motion.p
            variants={fadeUp(0.12)}
            initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', lineHeight: 1.75, color: 'var(--nb-text-2)', maxWidth: '44ch', marginBottom: '40px' }}
          >
            One-time payments in INR. No subscriptions, no annual lock-in.
            One plan unlocks every active AI provider.
          </motion.p>
          <motion.div variants={fadeUp(0.18)} initial="hidden" animate="show" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link to="/marketplace" className="btn btn-primary" style={{ padding: '10px 22px' }}>
              <ShoppingBag size={14} /> Browse Marketplace <ArrowRight size={14} />
            </Link>
            <Link to="/docs" className="btn btn-secondary" style={{ padding: '10px 18px' }}>View API docs</Link>
          </motion.div>
        </div>
      </section>

      {/* ── Plans — table rows ── */}
      <section style={{ borderBottom: '1px solid var(--nb-border)', ...SP }}>
        <div style={{ ...MAX }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP} style={{ marginBottom: '40px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '18px' }}>PLANS</span>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--nb-text)', lineHeight: 1.15 }}>
              Choose your duration
            </h2>
          </motion.div>

          {/* Plan rows — not cards */}
          <div>
            {displayPlans.map((plan, i) => {
              const meta = TIER_META[plan.duration_minutes] || { label: `${plan.duration_minutes}m`, sublabel: '', desc: '' };
              const isPopular = !!(meta.popular);
              return (
                <motion.div
                  key={plan.id || plan.duration_minutes}
                  variants={fadeUp(0)}
                  initial="hidden"
                  whileInView="show"
                  viewport={VP}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr 1fr auto',
                    gap: '24px 40px',
                    alignItems: 'center',
                    padding: '28px 0',
                    borderTop: '1px solid var(--nb-border)',
                    background: isPopular ? 'oklch(16% 0.06 145 / 0.08)' : 'transparent',
                    margin: isPopular ? '0 -16px' : '0',
                    padding: isPopular ? '28px 16px' : '28px 0',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: 'var(--nb-text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {meta.label}
                      {isPopular && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--nb-green)', border: '1px solid var(--nb-green-border)', padding: '1px 6px', borderRadius: '2px', letterSpacing: '0.1em' }}>POPULAR</span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--nb-text-3)', marginTop: '2px' }}>{meta.sublabel}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.5rem', color: isPopular ? 'var(--nb-green)' : 'var(--nb-text)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                      ₹{plan.price}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--nb-text-3)', marginTop: '4px' }}>
                      {fmt(plan.token_cap)} tokens · one-time
                    </div>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--nb-text-2)', maxWidth: '38ch' }}>{meta.desc}</p>
                  <Link to="/marketplace" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '8px 16px', whiteSpace: 'nowrap' }}>
                    Rent now
                  </Link>
                </motion.div>
              );
            })}
            <div style={{ borderTop: '1px solid var(--nb-border)' }} />
          </div>

          <motion.p variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--nb-text-3)', marginTop: '20px', letterSpacing: '0.04em' }}>
            Plans do not auto-renew. You are never charged without choosing to buy.
          </motion.p>
        </div>
      </section>

      {/* ── What's included — rule rows ── */}
      <section style={{ borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-surface)', ...SP }}>
        <div style={{ ...MAX }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP} style={{ marginBottom: '40px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '18px' }}>EVERY PLAN INCLUDES</span>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--nb-text)', lineHeight: 1.15 }}>
              Everything you need, nothing you don't.
            </h2>
          </motion.div>

          <div>
            {INCLUDES.map(([label, detail], i) => (
              <motion.div
                key={label}
                variants={fadeUp(0)}
                initial="hidden"
                whileInView="show"
                viewport={VP}
                style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px 48px', alignItems: 'start', padding: '22px 0', borderTop: '1px solid var(--nb-border)' }}
              >
                <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--nb-text)', letterSpacing: '-0.01em' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--nb-text-2)' }}>{detail}</span>
              </motion.div>
            ))}
            <div style={{ borderTop: '1px solid var(--nb-border)' }} />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ borderBottom: '1px solid var(--nb-border)', ...SP }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP} style={{ marginBottom: '40px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '18px' }}>COMMON QUESTIONS</span>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--nb-text)', lineHeight: 1.15 }}>
              Things people ask before buying
            </h2>
          </motion.div>
          <div>
            {FAQS.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp(0)}
                initial="hidden"
                whileInView="show"
                viewport={VP}
                style={{ padding: '24px 0', borderTop: '1px solid var(--nb-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 48px', alignItems: 'start' }}
              >
                <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--nb-text)', letterSpacing: '-0.01em', lineHeight: 1.45 }}>{item.q}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', lineHeight: 1.72, color: 'var(--nb-text-2)' }}>{item.a}</p>
              </motion.div>
            ))}
            <div style={{ borderTop: '1px solid var(--nb-border)' }} />
          </div>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP} style={{ marginTop: '20px' }}>
            <Link to="/faq" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--nb-text-3)', textDecoration: 'none', letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text-2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
            >
              ALL FAQS <ArrowRight size={12} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ ...SP }}>
        <div style={{ ...MAX }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}
          >
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '16px' }}>NEED SOMETHING CUSTOM</span>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(1.6rem,4vw,2.8rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--nb-text)', lineHeight: 1.1, maxWidth: '20ch' }}>
                High volume or team access?
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link to="/contact" className="btn btn-primary" style={{ padding: '10px 22px' }}>Talk to us <ArrowRight size={14} /></Link>
              <Link to="/marketplace" className="btn btn-secondary" style={{ padding: '10px 18px' }}>Browse plans</Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
