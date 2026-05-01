import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, Shield, Clock, Code2, ArrowRight, Globe,
  RefreshCcw, Lock, BarChart3, Layers, Terminal,
  CheckCircle2, ChevronRight,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeLeft, fadeRight, staggerContainer, scaleIn, viewport } from '../lib/motion';

const FEATURES = [
  { icon: Zap,        title: 'Instant key delivery',   desc: 'Virtual API key in your dashboard seconds after payment. No approvals, no KYC, no waiting.' },
  { icon: Shield,     title: 'Secure & isolated',       desc: 'Every key is IP-pinned and PII-masked. Prompts are never stored. AI safety filter on every call.' },
  { icon: Clock,      title: 'Time-bound rentals',      desc: 'Pay for 15 minutes to 24 hours. Key auto-expires — zero cleanup needed on your end.' },
  { icon: Code2,      title: 'OpenAI-compatible',       desc: 'Change two lines in your existing code. Works with any OpenAI SDK, any language.' },
  { icon: Globe,      title: 'Three providers, one key', desc: 'GPT-4o, Claude 3.5, Gemini 1.5 Pro — all accessible from one virtual key.' },
  { icon: BarChart3,  title: 'Real-time usage tracking', desc: 'Token balance, requests made, and cache hit rate visible live in your dashboard.' },
  { icon: RefreshCcw, title: 'Semantic caching',        desc: 'Similar prompts return cached answers — saving up to 40% of your token balance automatically.' },
  { icon: Layers,     title: 'Automatic fallback',      desc: 'If one provider goes down, requests re-route instantly. You never see a service failure.' },
  { icon: Lock,       title: 'Cost protection',         desc: 'Hard token caps and circuit breakers mean zero risk of accidental overspend.' },
];

const STEPS = [
  { n: '1', title: 'Choose a plan',   desc: 'Pick a token cap and rental window — 15 min up to 24 hours.' },
  { n: '2', title: 'Pay once',        desc: 'One payment via UPI, card, or net banking through Cashfree.' },
  { n: '3', title: 'Get your key',    desc: 'Virtual API key delivered to your dashboard and email instantly.' },
  { n: '4', title: 'Start building',  desc: 'Drop it into any OpenAI SDK. Tokens tracked in real time.' },
];

const CODE = [
  { t: 'keyword', v: 'import openai' },
  { t: 'blank',   v: '' },
  { t: 'default', v: 'client = openai.OpenAI(' },
  { t: 'string',  v: '    api_key="airent_sk_xxxx",   # your virtual key' },
  { t: 'string',  v: '    base_url="https://api.airent.dev/v1"' },
  { t: 'default', v: ')' },
  { t: 'blank',   v: '' },
  { t: 'default', v: 'response = client.chat.completions.create(' },
  { t: 'string',  v: '    model="gpt-4o",' },
  { t: 'string',  v: '    messages=[{"role": "user", "content": "Hello!"}]' },
  { t: 'default', v: ')' },
  { t: 'keyword', v: 'print(response.choices[0].message.content)' },
];

const lineColor = t =>
  t === 'keyword' ? '#10b981' :
  t === 'string'  ? '#58a6ff' :
  t === 'blank'   ? 'transparent' : '#8b949e';


export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{ paddingTop: '120px', paddingBottom: '96px', paddingLeft: '20px', paddingRight: '20px' }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show">

            {/* Eyebrow */}
            <motion.p variants={fadeUp} className="eyebrow mb-5">
              AI API Marketplace
            </motion.p>

            {/* Headline — no gradient, just weight + size */}
            <motion.h1
              variants={fadeUp}
              style={{
                fontSize: 'clamp(2.4rem, 6vw, 4rem)',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.035em',
                color: 'var(--c-text)',
                marginBottom: '24px',
              }}
            >
              Rent AI APIs<br />by the hour.
            </motion.h1>

            {/* Sub — prose-width, never full bleed */}
            <motion.p
              variants={fadeUp}
              className="prose-width mx-auto"
              style={{ color: 'var(--c-text-2)', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '40px' }}
            >
              No annual subscriptions. No credit-card hoops. Purchase a time-bound virtual API key,
              pick any AI model, and pay only for what you actually use.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
              <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '0.95rem' }} onClick={() => navigate('/register')}>
                Start building free <ArrowRight size={16} />
              </button>
              <button className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={() => navigate('/pricing')}>
                View pricing
              </button>
            </motion.div>

            {/* Trust row — text only, no decorative icons */}
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-6">
              {['No subscription', 'Instant delivery', 'Pay in INR', 'OpenAI-compatible'].map(t => (
                <span key={t} className="inline-flex items-center gap-1.5" style={{ color: 'var(--c-text-3)', fontSize: '0.8rem' }}>
                  <CheckCircle2 size={13} style={{ color: 'var(--c-accent)' }} />
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CODE + COPY ── */}
      <section style={{ padding: '96px 20px', background: 'var(--c-bg)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid md:grid-cols-2 gap-16 items-center"
          >
            <motion.div variants={fadeLeft}>
              <p className="eyebrow mb-4">Drop-in replacement</p>
              <h2 style={{ fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)', lineHeight: 1.2, marginBottom: '20px' }}>
                Zero code changes.<br />Just swap the key.
              </h2>
              <p className="prose-width" style={{ color: 'var(--c-text-2)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '28px' }}>
                AIRent is 100% OpenAI-compatible. Set your key and base URL — that's it.
                Works with Python, Node.js, cURL, or any HTTP client.
              </p>
              <Link to="/register" className="inline-flex items-center gap-1.5" style={{ color: 'var(--c-accent)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
                Try it free <ChevronRight size={15} />
              </Link>
            </motion.div>

            {/* Code block — no nesting, clean border */}
            <motion.div variants={fadeRight}>
              <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Title bar */}
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--c-raised)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                  <span style={{ marginLeft: '8px', color: 'var(--c-text-3)', fontSize: '0.75rem', fontFamily: 'monospace' }}>quickstart.py</span>
                </div>
                {/* Code */}
                <div style={{ padding: '20px', overflowX: 'auto' }}>
                  {CODE.map((line, i) => (
                    <div key={i} style={{ display: 'flex', gap: '16px', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.75' }}>
                      <span style={{ color: 'var(--c-text-3)', width: '16px', textAlign: 'right', userSelect: 'none', flexShrink: 0 }}>
                        {line.t !== 'blank' ? i + 1 : ''}
                      </span>
                      <span style={{ color: lineColor(line.t) }}>{line.v || ' '}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '96px 20px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p className="eyebrow mb-4">Simple process</p>
            <h2 style={{ fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)' }}>
              Up and running in 3 minutes
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {STEPS.map((s, i) => (
              <motion.div key={s.n} variants={scaleIn}>
                <div
                  style={{
                    padding: '24px', borderRadius: '10px',
                    background: 'var(--c-raised)', border: '1px solid var(--c-border)',
                    height: '100%',
                  }}
                >
                  {/* Step number — large, muted, no colored box */}
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--c-border-hi)', lineHeight: 1, marginBottom: '16px', fontVariantNumeric: 'tabular-nums' }}>
                    {s.n.padStart(2, '0')}
                  </div>
                  <h3 style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.925rem', marginBottom: '8px' }}>{s.title}</h3>
                  <p style={{ color: 'var(--c-text-3)', fontSize: '0.825rem', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '96px 20px', background: 'var(--c-bg)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginBottom: '56px' }}>
            <p className="eyebrow mb-4">Built right</p>
            <h2 style={{ fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)', maxWidth: '480px' }}>
              Enterprise infrastructure.<br />Indie-developer pricing.
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.06)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {FEATURES.map(f => (
              <motion.div key={f.title} variants={fadeUp}>
                <div
                  className="card"
                  style={{ padding: '22px', height: '100%', transition: 'border-color 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-border-hi)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border)'}
                >
                  {/* Icon — no colored background box */}
                  <f.icon size={18} style={{ color: 'var(--c-accent)', marginBottom: '14px' }} />
                  <h3 style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>{f.title}</h3>
                  <p style={{ color: 'var(--c-text-3)', fontSize: '0.825rem', lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '96px 20px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}>
            <motion.h2
              variants={fadeUp}
              style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', marginBottom: '16px' }}
            >
              Ready to ship?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="prose-width mx-auto"
              style={{ color: 'var(--c-text-2)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '36px' }}
            >
              Create your account in 30 seconds. No credit card required. Your first API call is minutes away.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                className="btn btn-primary"
                style={{ padding: '12px 28px', fontSize: '0.95rem' }}
                onClick={() => navigate('/register')}
              >
                Get your API key <ArrowRight size={16} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                onClick={() => navigate('/marketplace')}
              >
                Browse marketplace
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
