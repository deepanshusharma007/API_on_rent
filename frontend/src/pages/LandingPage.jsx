import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeLeft, fadeRight, staggerContainer, scaleIn, viewport } from '../lib/motion';

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
    { t: 'id', v: "  -d '{" },
    { t: 'st', v: '    "model": "gpt-4o",' },
    { t: 'st', v: '    "messages": [{"role": "user", "content": "Hello!"}]' },
    { t: 'id', v: "  }'" },
  ],
};

const tokenColor = t =>
  t === 'kw' ? '#10b981' :
  t === 'st' ? '#60a5fa' :
  t === 'cm' ? '#525252' : '#888888';

const FEATURES = [
  {
    label: 'Instant delivery',
    title: 'Key in under 10 seconds',
    body: 'Payment clears, virtual key lands in your dashboard and email immediately. No manual review, no approval queue.',
  },
  {
    label: 'Privacy by default',
    title: 'Secure at every layer',
    body: 'Each key is IP-pinned after first use. Prompts pass through a PII filter and AI safety scanner on every request. Nothing is stored.',
  },
  {
    label: 'OpenAI-compatible',
    title: 'Three providers, one interface',
    body: 'GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro. All reachable from one endpoint. Switch models with a single parameter change.',
  },
  {
    label: 'Zero overage risk',
    title: 'Hard cost protection',
    body: 'Token caps and circuit breakers are enforced server-side. Accidental overspend is not possible. Your budget is the limit.',
  },
];

const STEPS = [
  { n: '01', title: 'Pick a plan',    body: 'Choose a model family and rental window. 15 minutes to 24 hours.' },
  { n: '02', title: 'Pay in INR',     body: 'UPI, card, or net banking via Cashfree. No foreign currency fees.' },
  { n: '03', title: 'Get your key',   body: 'Virtual key delivered instantly to your dashboard and email.' },
  { n: '04', title: 'Start building', body: 'Drop the key into any OpenAI SDK. Tokens tracked in real time.' },
];

const PLANS = [
  { label: '15 min',   tokens: '20K',  price: null },
  { label: '30 min',   tokens: '40K',  price: null },
  { label: '1 hour',   tokens: '80K',  price: null, popular: true },
  { label: '24 hours', tokens: '1.2M', price: null },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('python');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--ink-0)' }}>
      <Helmet>
        <title>AIRent — Rent AI APIs by the Minute | AI on Rent, API on Rent</title>
        <meta name="description" content="Rent GPT-4o, Claude, Gemini APIs by the hour. No subscription, no lock-in. Pay in INR via UPI. Get your virtual API key in under 10 seconds." />
        <link rel="canonical" href="https://airent.dev/" />
      </Helmet>

      <Navbar />

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{
        paddingTop: 'clamp(120px, 18vw, 180px)',
        paddingBottom: 'clamp(64px, 10vw, 96px)',
        paddingLeft: 'clamp(20px, 5vw, 80px)',
        paddingRight: 'clamp(20px, 5vw, 80px)',
        maxWidth: '1120px',
        margin: '0 auto',
        width: '100%',
      }}>
        <motion.div variants={staggerContainer(0.07)} initial="hidden" animate="show">

          {/* Overline — no accent color, just muted mono label */}
          <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--c-accent)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-6)', letterSpacing: '0.08em' }}>
              AI API MARKETPLACE
            </span>
          </motion.div>

          {/* Hero headline — Playfair Display, not DM Sans */}
          <motion.h1
            variants={fadeUp}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.8rem, 7vw, 5.6rem)',
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: '-0.01em',
              color: 'var(--ink-10)',
              marginBottom: '28px',
              maxWidth: '14ch',
            }}
          >
            Rent AI APIs.<br />
            <em style={{ fontStyle: 'italic', color: 'var(--ink-8)' }}>Pay in INR.</em><br />
            Ship today.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            style={{
              fontSize: '1rem',
              lineHeight: 1.75,
              color: 'var(--ink-7)',
              marginBottom: '40px',
              maxWidth: '44ch',
            }}
          >
            Time-bound virtual keys for GPT-4o, Claude, and Gemini.
            No subscription. One payment, one key, instant access.
          </motion.p>

          <motion.div variants={fadeUp} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '48px' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.875rem' }}
              onClick={() => navigate('/register')}
            >
              Get started free <ArrowRight size={14} />
            </button>
            <button
              className="btn btn-outline"
              style={{ padding: '10px 18px', fontSize: '0.875rem' }}
              onClick={() => navigate('/pricing')}
            >
              See pricing
            </button>
          </motion.div>

          {/* Trust signals — inline text, no cards, no icons */}
          <motion.div variants={fadeUp} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 28px' }}>
            {['No subscription', 'Pay via UPI', 'Key in 10 seconds', 'OpenAI-compatible'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--ink-6)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                <CheckCircle2 size={11} style={{ color: 'var(--c-accent)', flexShrink: 0 }} />
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── CODE BLOCK — full width, editorial ─────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--ink-4)',
        borderBottom: '1px solid var(--ink-4)',
        background: 'var(--ink-1)',
        padding: 'clamp(40px,6vw,64px) clamp(20px,5vw,80px)',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-6)', letterSpacing: '0.08em', marginBottom: '20px' }}>
              DROP-IN REPLACEMENT
            </p>

            {/* Language tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '0', borderBottom: '1px solid var(--ink-4)' }}>
              {['python', 'node', 'curl'].map(t => (
                <button
                  key={t}
                  onClick={() => setLang(t)}
                  style={{
                    padding: '8px 16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: lang === t ? '2px solid var(--c-accent)' : '2px solid transparent',
                    color: lang === t ? 'var(--ink-9)' : 'var(--ink-6)',
                    cursor: 'pointer',
                    marginBottom: '-1px',
                    transition: 'color 120ms',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Code */}
            <div style={{ padding: '24px 0', overflowX: 'auto' }}>
              {SNIPPETS[lang].map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', lineHeight: '1.85' }}>
                  <span style={{ color: 'var(--ink-5)', width: '20px', textAlign: 'right', userSelect: 'none', flexShrink: 0 }}>
                    {line.t !== '' ? i + 1 : ''}
                  </span>
                  <span style={{ color: tokenColor(line.t), whiteSpace: 'pre' }}>{line.v || ' '}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section style={{ padding: 'var(--space-section) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginBottom: '56px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-6)', letterSpacing: '0.08em', marginBottom: '16px' }}>HOW IT WORKS</p>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 700, letterSpacing: '-0.022em', color: 'var(--ink-10)', lineHeight: 1.2 }}>
              Up and running in 3 minutes
            </h2>
          </motion.div>

          {/* Steps — rule-separated, no cards */}
          <motion.div variants={staggerContainer(0.08)} initial="hidden" whileInView="show" viewport={viewport}>
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                variants={fadeUp}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 1fr',
                  gap: '32px',
                  alignItems: 'start',
                  padding: '28px 0',
                  borderTop: '1px solid var(--ink-3)',
                }}
                className="step-responsive"
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-5)', letterSpacing: '0.04em', paddingTop: '3px' }}>{s.n}</span>
                <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink-9)', letterSpacing: '-0.01em' }}>{s.title}</h3>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--ink-7)' }}>{s.body}</p>
              </motion.div>
            ))}
            <div style={{ borderTop: '1px solid var(--ink-3)', height: '1px' }} />
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES — rule-row layout, Resend-style ───────────────────────── */}
      <section style={{ padding: 'var(--space-section) clamp(20px,5vw,80px)', borderTop: '1px solid var(--ink-4)', borderBottom: '1px solid var(--ink-4)', background: 'var(--ink-1)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginBottom: '56px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-6)', letterSpacing: '0.08em', marginBottom: '16px' }}>BUILT RIGHT</p>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 700, letterSpacing: '-0.022em', color: 'var(--ink-10)', lineHeight: 1.2, maxWidth: '22ch' }}>
              Infrastructure that earns your trust.
            </h2>
          </motion.div>

          <motion.div variants={staggerContainer(0.07)} initial="hidden" whileInView="show" viewport={viewport}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr 1fr',
                  gap: '32px',
                  alignItems: 'start',
                  padding: '32px 0',
                  borderTop: '1px solid var(--ink-3)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-5)', letterSpacing: '0.04em', paddingTop: '4px' }}>{f.label.toUpperCase()}</span>
                <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink-9)', letterSpacing: '-0.01em', lineHeight: 1.4 }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--ink-7)' }}>{f.body}</p>
              </motion.div>
            ))}
            <div style={{ borderTop: '1px solid var(--ink-3)' }} />
          </motion.div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ─────────────────────────────────────────────────── */}
      <section style={{ padding: 'var(--space-section) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '40px' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-6)', letterSpacing: '0.08em', marginBottom: '14px' }}>PRICING</p>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 700, letterSpacing: '-0.022em', color: 'var(--ink-10)', lineHeight: 1.2 }}>
                Pay for the time you use.
              </h2>
            </div>
            <Link to="/pricing" style={{ color: 'var(--ink-7)', fontSize: '0.8375rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--ink-9)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-7)'}
            >
              All plans <ArrowRight size={12} />
            </Link>
          </motion.div>

          {/* Plan cards — horizontal rule table, not grid cards */}
          <motion.div variants={staggerContainer(0.07)} initial="hidden" whileInView="show" viewport={viewport}>
            {PLANS.map((p, i) => (
              <motion.div
                key={p.label}
                variants={fadeUp}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr auto',
                  gap: '32px',
                  alignItems: 'center',
                  padding: '20px 0',
                  borderTop: '1px solid var(--ink-3)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: p.popular ? 'var(--ink-10)' : 'var(--ink-8)', letterSpacing: '-0.01em' }}>
                  {p.label}
                  {p.popular && <span style={{ marginLeft: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--c-accent)', letterSpacing: '0.08em' }}>POPULAR</span>}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--ink-6)' }}>{p.tokens} tokens included</span>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: '0.8125rem', padding: '6px 14px' }}
                  onClick={() => navigate('/marketplace')}
                >
                  Rent now
                </button>
              </motion.div>
            ))}
            <div style={{ borderTop: '1px solid var(--ink-3)' }} />
          </motion.div>
        </div>
      </section>

      {/* ── FOUNDER NOTE ─────────────────────────────────────────────────────── */}
      <section style={{ padding: 'var(--space-section) clamp(20px,5vw,80px)', borderTop: '1px solid var(--ink-4)', background: 'var(--ink-1)' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-6)', letterSpacing: '0.08em', marginBottom: '32px' }}>WHY THIS EXISTS</p>
            <blockquote style={{ margin: 0, padding: 0, border: 'none' }}>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
                color: 'var(--ink-8)',
                lineHeight: 1.7,
                marginBottom: '32px',
              }}>
                "I built AIRent because I was tired of hitting rate limits, waiting for API approvals,
                and paying in USD with forex fees just to test a model for a side project.
                If you are a student or indie developer in India who wants to experiment with
                frontier AI without the overhead — this is for you."
              </p>
              <footer style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--ink-3)', border: '1px solid var(--ink-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink-8)', flexShrink: 0 }}>
                  D
                </div>
                <div>
                  <div style={{ color: 'var(--ink-8)', fontWeight: 500, fontSize: '0.8375rem' }}>Deepanshu Sharma</div>
                  <div style={{ color: 'var(--ink-6)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>Founder, AIRent</div>
                </div>
              </footer>
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* ── CTA CLOSE ────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'var(--space-section) clamp(20px,5vw,80px)', borderTop: '1px solid var(--ink-4)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                color: 'var(--ink-10)',
                lineHeight: 1.1,
                marginBottom: '12px',
              }}>
                Ready to ship?
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-7)', lineHeight: 1.65 }}>
                Account in 30 seconds. No credit card required.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '11px 24px', fontSize: '0.875rem' }}
                onClick={() => navigate('/register')}
              >
                Get your API key <ArrowRight size={14} />
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '11px 18px', fontSize: '0.875rem', color: 'var(--ink-7)' }}
                onClick={() => navigate('/docs')}
              >
                Read the docs
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
