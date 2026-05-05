import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, Shield, Clock, Code2, ArrowRight, Globe,
  RefreshCcw, Lock, BarChart3, CheckCircle2, ChevronRight,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeLeft, fadeRight, staggerContainer, scaleIn, viewport } from '../lib/motion';

// ── Code snippet data ──────────────────────────────────────────────────────
const SNIPPETS = {
  python: [
    { t: 'kw', v: 'import openai' },
    { t: '',   v: '' },
    { t: 'id', v: 'client = openai.OpenAI(' },
    { t: 'cm', v: '    # paste your AIRent virtual key here' },
    { t: 'st', v: '    api_key="vk_xxxxxxxxxxxxxxxxxxxx",' },
    { t: 'st', v: '    base_url="https://api-on-rent-backend.onrender.com/v1"' },
    { t: 'id', v: ')' },
    { t: '',   v: '' },
    { t: 'id', v: 'response = client.chat.completions.create(' },
    { t: 'st', v: '    model="gpt-4o",' },
    { t: 'st', v: '    messages=[{"role": "user", "content": "Hello!"}]' },
    { t: 'id', v: ')' },
    { t: 'kw', v: 'print(response.choices[0].message.content)' },
  ],
  node: [
    { t: 'kw', v: "import OpenAI from 'openai';" },
    { t: '',   v: '' },
    { t: 'kw', v: 'const client = new OpenAI({' },
    { t: 'cm', v: '  // paste your AIRent virtual key here' },
    { t: 'st', v: '  apiKey: "vk_xxxxxxxxxxxxxxxxxxxx",' },
    { t: 'st', v: '  baseURL: "https://api-on-rent-backend.onrender.com/v1"' },
    { t: 'kw', v: '});' },
    { t: '',   v: '' },
    { t: 'kw', v: 'const res = await client.chat.completions.create({' },
    { t: 'st', v: '  model: "gpt-4o",' },
    { t: 'st', v: '  messages: [{ role: "user", content: "Hello!" }]' },
    { t: 'kw', v: '});' },
    { t: 'id', v: 'console.log(res.choices[0].message.content);' },
  ],
  curl: [
    { t: 'kw', v: 'curl https://api-on-rent-backend.onrender.com/v1/chat/completions \\' },
    { t: 'st', v: '  -H "Authorization: Bearer vk_xxxxxxxxxxxxxxxxxxxx" \\' },
    { t: 'st', v: '  -H "Content-Type: application/json" \\' },
    { t: 'id', v: '  -d \'{' },
    { t: 'st', v: '    "model": "gpt-4o",' },
    { t: 'st', v: '    "messages": [{"role": "user", "content": "Hello!"}]' },
    { t: 'id', v: "  }'" },
  ],
};

const lineColor = t =>
  t === 'kw' ? '#10b981' :
  t === 'st' ? '#58a6ff' :
  t === 'cm' ? '#636e7b' : '#8b949e';

// ── Features ───────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Zap,
    title: 'Key in under 10 seconds',
    desc: 'Payment clears, virtual key lands in your dashboard and email immediately. No manual review, no approval queue.',
    aside: 'Instant delivery',
  },
  {
    icon: Shield,
    title: 'Secure at every layer',
    desc: 'Each key is IP-pinned after first use. Prompts pass through a PII filter and AI safety scanner on every request. Nothing is stored.',
    aside: 'Privacy by default',
  },
  {
    icon: Globe,
    title: 'Three providers, one interface',
    desc: 'GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro. All reachable from one endpoint. Switch models with a single parameter change.',
    aside: 'OpenAI-compatible',
  },
  {
    icon: Lock,
    title: 'Hard cost protection',
    desc: 'Token caps and circuit breakers are enforced server-side. Accidental overspend is not possible. Your budget is the limit.',
    aside: 'Zero overage risk',
  },
];

// ── How it works steps ─────────────────────────────────────────────────────
const STEPS = [
  { n: '01', title: 'Pick a plan',    desc: 'Choose a model family and rental window. 15 minutes to 24 hours.' },
  { n: '02', title: 'Pay in INR',     desc: 'UPI, card, or net banking via Cashfree. No foreign currency fees.' },
  { n: '03', title: 'Get your key',   desc: 'Virtual key delivered instantly to your dashboard and email.' },
  { n: '04', title: 'Start building', desc: 'Drop the key into any OpenAI SDK. Tokens tracked in real time.' },
];

// ── Pricing tiers preview ──────────────────────────────────────────────────
const PLANS = [
  { label: '15 min',  tokens: '20K',   popular: false },
  { label: '30 min',  tokens: '40K',   popular: false },
  { label: '1 hour',  tokens: '80K',   popular: true  },
  { label: '24 hours',tokens: '1.2M',  popular: false },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('python');

  const tabs = ['python', 'node', 'curl'];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Helmet>
        <title>AIRent — Rent AI APIs by the Minute | AI on Rent, API on Rent</title>
        <meta name="description" content="Rent GPT-4o, Claude, Gemini APIs by the hour. No subscription, no lock-in. Pay in INR via UPI. Get your virtual API key in under 10 seconds. AI on rent, API on rent." />
        <link rel="canonical" href="https://airent.dev/" />
      </Helmet>

      <Navbar />

      {/* ── HERO: split layout ─────────────────────────────────────────── */}
      <section style={{ paddingTop: '112px', paddingBottom: '80px', paddingLeft: '20px', paddingRight: '20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}
          className="flex-col md:grid">

          {/* Left: headline + CTA */}
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show">
            <motion.p variants={fadeUp} className="eyebrow" style={{ marginBottom: '20px' }}>
              AI API Marketplace
            </motion.p>
            <motion.h1
              variants={fadeUp}
              style={{
                fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-0.035em',
                color: 'var(--c-text)',
                marginBottom: '20px',
              }}
            >
              Rent AI APIs.<br />Pay in INR.<br />Ship today.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              style={{ color: 'var(--c-text-2)', fontSize: '1rem', lineHeight: 1.75, marginBottom: '36px', maxWidth: '42ch' }}
            >
              Time-bound virtual keys for GPT-4o, Claude, and Gemini.
              No subscription, no lock-in. One payment, one key, instant access.
            </motion.p>
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '40px' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '11px 24px', fontSize: '0.9rem' }}
                onClick={() => navigate('/register')}
              >
                Get started free <ArrowRight size={15} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '11px 20px', fontSize: '0.9rem' }}
                onClick={() => navigate('/pricing')}
              >
                See pricing
              </button>
            </motion.div>

            {/* Trust signals — inline, no cards */}
            <motion.div variants={fadeUp} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px' }}>
              {[
                'No subscription',
                'Pay via UPI',
                'Key in 10 seconds',
                'OpenAI-compatible',
              ].map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--c-text-3)', fontSize: '0.8rem' }}>
                  <CheckCircle2 size={12} style={{ color: 'var(--c-accent)', flexShrink: 0 }} />
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: code snippet with language tabs */}
          <motion.div variants={fadeRight} initial="hidden" animate="show">
            <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
              {/* Tab bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0', borderBottom: '1px solid var(--c-border)', background: 'var(--c-raised)', padding: '0 16px' }}>
                <div style={{ display: 'flex', gap: '6px', padding: '10px 0', marginRight: '12px' }}>
                  {['#ff5f57','#febc2e','#28c840'].map(c => (
                    <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0', flex: 1 }}>
                  {tabs.map(t => (
                    <button
                      key={t}
                      onClick={() => setLang(t)}
                      style={{
                        padding: '10px 14px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: lang === t ? '2px solid var(--c-accent)' : '2px solid transparent',
                        color: lang === t ? 'var(--c-accent)' : 'var(--c-text-3)',
                        cursor: 'pointer',
                        transition: 'color 150ms',
                        marginBottom: '-1px',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {/* Code */}
              <div style={{ padding: '20px 20px 24px', overflowX: 'auto' }}>
                {SNIPPETS[lang].map((line, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '0.775rem', lineHeight: '1.8' }}>
                    <span style={{ color: 'var(--c-text-3)', width: '18px', textAlign: 'right', userSelect: 'none', flexShrink: 0, opacity: 0.5 }}>
                      {line.t !== '' ? i + 1 : ''}
                    </span>
                    <span style={{ color: lineColor(line.t), whiteSpace: 'pre' }}>{line.v || ' '}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 20px', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginBottom: '64px' }}>
            <p className="eyebrow" style={{ marginBottom: '16px' }}>Simple process</p>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)', lineHeight: 1.2 }}>
              Up and running in 3 minutes
            </h2>
          </motion.div>

          {/* Steps: horizontal line of numbered items — no cards */}
          <motion.div
            variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0' }}
          >
            {STEPS.map((s, i) => (
              <motion.div key={s.n} variants={fadeUp} style={{ position: 'relative', paddingRight: '24px', paddingBottom: '24px' }}>
                {/* Connector line between steps */}
                {i < STEPS.length - 1 && (
                  <div style={{ position: 'absolute', top: '18px', right: '0', width: '100%', height: '1px', background: 'var(--c-border)', display: 'none' }} className="hidden lg:block" />
                )}
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--c-text-3)', lineHeight: 1, marginBottom: '16px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em' }}>
                  {s.n}
                </div>
                <h3 style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>{s.title}</h3>
                <p style={{ color: 'var(--c-text-3)', fontSize: '0.825rem', lineHeight: 1.65, maxWidth: '28ch' }}>{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES: asymmetric rows ─────────────────────────────────────── */}
      <section style={{ padding: '96px 20px', background: 'var(--c-bg)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginBottom: '64px' }}>
            <p className="eyebrow" style={{ marginBottom: '16px' }}>Built right</p>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)', lineHeight: 1.2, maxWidth: '20ch' }}>
              Infrastructure that earns your trust.
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.08)} initial="hidden" whileInView="show" viewport={viewport}
            style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={i % 2 === 0 ? fadeLeft : fadeRight}
                style={{
                  display: 'grid',
                  gridTemplateColumns: i % 2 === 0 ? '1fr 2fr' : '2fr 1fr',
                  gap: '48px',
                  alignItems: 'center',
                  padding: '40px 0',
                  borderBottom: i < FEATURES.length - 1 ? '1px solid var(--c-border)' : 'none',
                }}
                className="flex-col md:grid"
              >
                {i % 2 === 0 ? (
                  <>
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--c-accent)', marginBottom: '12px' }}>
                        <f.icon size={12} />
                        {f.aside}
                      </span>
                    </div>
                    <div>
                      <h3 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '10px', letterSpacing: '-0.01em' }}>{f.title}</h3>
                      <p style={{ color: 'var(--c-text-2)', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: '52ch' }}>{f.desc}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '10px', letterSpacing: '-0.01em' }}>{f.title}</h3>
                      <p style={{ color: 'var(--c-text-2)', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: '52ch' }}>{f.desc}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--c-accent)' }}>
                        <f.icon size={12} />
                        {f.aside}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────────────────────────────────── */}
      <section style={{ padding: '96px 20px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginBottom: '48px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: '16px' }}>Transparent pricing</p>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)', lineHeight: 1.2 }}>
                Pay for the time you use.
              </h2>
            </div>
            <Link to="/pricing" style={{ color: 'var(--c-accent)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              All plans <ChevronRight size={14} />
            </Link>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.08)} initial="hidden" whileInView="show" viewport={viewport}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}
          >
            {PLANS.map(p => (
              <motion.div key={p.label} variants={scaleIn}>
                <div
                  style={{
                    padding: '24px 20px',
                    borderRadius: '10px',
                    background: 'var(--c-raised)',
                    border: p.popular ? '1px solid var(--c-accent-border)' : '1px solid var(--c-border)',
                    position: 'relative',
                    transition: 'border-color 150ms',
                  }}
                  onMouseEnter={e => { if (!p.popular) e.currentTarget.style.borderColor = 'var(--c-border-hi)'; }}
                  onMouseLeave={e => { if (!p.popular) e.currentTarget.style.borderColor = 'var(--c-border)'; }}
                >
                  {p.popular && (
                    <span style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-border)', color: 'var(--c-accent-hi)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 10px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                      Popular
                    </span>
                  )}
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-text)', marginBottom: '6px' }}>{p.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--c-text-3)', marginBottom: '16px' }}>{p.tokens} tokens</div>
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px 12px' }}
                    onClick={() => navigate('/marketplace')}
                  >
                    Rent now
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FOUNDER NOTE ─────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 20px', background: 'var(--c-bg)' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
            <p className="eyebrow" style={{ marginBottom: '24px' }}>Why this exists</p>
            <blockquote style={{ margin: 0, padding: 0, border: 'none' }}>
              <p style={{ fontSize: '1.05rem', color: 'var(--c-text-2)', lineHeight: 1.8, marginBottom: '24px' }}>
                "I built AIRent because I was tired of hitting rate limits, waiting for API approvals,
                and paying in USD with forex fees just to test a model for a side project.
                If you are a student or indie developer in India who wants to experiment with
                frontier AI without the overhead, this is for you. No corporate sales process.
                Just rent a key and build."
              </p>
              <footer style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--c-raised)', border: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color: 'var(--c-text)', flexShrink: 0 }}>
                  D
                </div>
                <div>
                  <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.875rem' }}>Deepanshu Sharma</div>
                  <div style={{ color: 'var(--c-text-3)', fontSize: '0.775rem' }}>Founder, AIRent</div>
                </div>
              </footer>
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* ── CTA CLOSE ────────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 20px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <motion.div variants={staggerContainer(0.08)} initial="hidden" whileInView="show" viewport={viewport}>
            <motion.h2
              variants={fadeUp}
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', marginBottom: '16px', lineHeight: 1.1 }}
            >
              Ready to ship?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              style={{ color: 'var(--c-text-2)', fontSize: '0.95rem', lineHeight: 1.75, marginBottom: '36px', maxWidth: '44ch', margin: '0 auto 36px' }}
            >
              Account in 30 seconds. No credit card required.
              Your first API call is minutes away.
            </motion.p>
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '12px 28px', fontSize: '0.925rem' }}
                onClick={() => navigate('/register')}
              >
                Get your API key <ArrowRight size={15} />
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '12px 20px', fontSize: '0.925rem' }}
                onClick={() => navigate('/docs')}
              >
                Read the docs
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
