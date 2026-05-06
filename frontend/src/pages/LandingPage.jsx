import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/* ── Motion presets ──────────────────────────────────────────────────────── */
const EASE = [0.22, 1, 0.36, 1];
const fadeUp   = (delay = 0) => ({ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay } } });
const fadeIn   = (delay = 0) => ({ hidden: { opacity: 0 },        show: { opacity: 1,        transition: { duration: 0.45, ease: EASE, delay } } });
const VP       = { once: true, margin: '-60px' };

/* ── Steps ───────────────────────────────────────────────────────────────── */
const STEPS = [
  { n: '01', title: 'Pick a plan',    body: 'Choose a model family and rental window. 15 minutes to 24 hours.' },
  { n: '02', title: 'Pay in INR',     body: 'UPI, card, or net banking via Cashfree. No foreign currency fees.' },
  { n: '03', title: 'Get your key',   body: 'Virtual key delivered instantly to your dashboard and email.' },
  { n: '04', title: 'Start building', body: 'Drop the key into any OpenAI SDK. Tokens tracked in real time.' },
];

/* ── Bento features ──────────────────────────────────────────────────────── */
const BENTO = [
  {
    span: 'bento-3 bento-tall',
    n: '01',
    title: 'Key in under 10 seconds',
    body: 'Payment clears, virtual key lands in your dashboard and email immediately. No manual review, no approval queue.',
    accent: true,
  },
  {
    span: 'bento-3 bento-tall',
    n: '02',
    title: 'Three providers, one endpoint',
    body: 'GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro. OpenAI-compatible API. Switch models by changing a single parameter.',
  },
  {
    span: 'bento-2',
    n: '03',
    title: 'IP-pinned keys',
    body: 'Every virtual key locks to your IP after the first request. Misuse is structurally prevented.',
  },
  {
    span: 'bento-2',
    n: '04',
    title: 'PII filter',
    body: 'Personal data is stripped from every prompt before it reaches the model. Nothing is stored.',
  },
  {
    span: 'bento-2',
    n: '05',
    title: 'Hard token caps',
    body: 'Server-side limits. Accidental overspend is not possible.',
  },
  {
    span: 'bento-6',
    n: '06',
    title: 'Pay in INR via UPI',
    body: 'No foreign currency fees. No minimum spend. Cashfree handles the transaction — your bank sees a domestic payment.',
    wide: true,
  },
];

/* ── Plans ───────────────────────────────────────────────────────────────── */
const PLANS = [
  { label: '15 min',   tokens: '20K',  popular: false },
  { label: '30 min',   tokens: '40K',  popular: false },
  { label: '1 hour',   tokens: '80K',  popular: true  },
  { label: '24 hours', tokens: '1.2M', popular: false },
];

/* ── Shared section padding ── */
const SP = { padding: 'clamp(64px,10vw,112px) clamp(20px,5vw,72px)' };
const MAX = { maxWidth: '1200px', margin: '0 auto' };

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nb-bg)' }}>
      <Helmet>
        <title>AIRent — Rent AI APIs by the Minute | GPT, Claude, Gemini on Rent</title>
        <meta name="description" content="Rent GPT-4o, Claude, Gemini APIs by the hour. No subscription, no lock-in. Pay in INR via UPI. Get your API key in under 10 seconds." />
        <link rel="canonical" href="https://airent.dev/" />
      </Helmet>

      <Navbar />

      {/* ═══════════════════════════════════════════════════════════════════
          HERO — text-only, visible grid background
          ═════════════════════════════════════════════════════════════════ */}
      <section
        className="nb-grid-hero"
        style={{
          paddingTop: 'clamp(130px, 18vw, 200px)',
          paddingBottom: 'clamp(72px, 10vw, 112px)',
          paddingLeft: 'clamp(20px, 5vw, 72px)',
          paddingRight: 'clamp(20px, 5vw, 72px)',
          borderBottom: '1px solid var(--nb-border)',
          position: 'relative',
        }}
      >
        {/* Fade gradient over grid at bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(to bottom, transparent, var(--nb-bg))', pointerEvents: 'none' }} />

        <div style={{ ...MAX, position: 'relative' }}>
          <motion.div variants={fadeIn(0)} initial="hidden" animate="show">
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              letterSpacing: '0.12em',
              color: 'var(--nb-green)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '32px',
            }}>
              <span style={{ display: 'inline-block', width: '18px', height: '1px', background: 'var(--nb-green)' }} />
              AI API MARKETPLACE
            </span>
          </motion.div>

          {/* Display heading — Geist, brutalist tight leading */}
          <motion.h1
            className="nb-display"
            variants={fadeUp(0.05)}
            initial="hidden"
            animate="show"
            style={{ marginBottom: '12px' }}
          >
            Rent AI APIs.
          </motion.h1>
          <motion.h1
            className="nb-display"
            variants={fadeUp(0.1)}
            initial="hidden"
            animate="show"
            style={{ color: 'var(--nb-text-2)', marginBottom: '12px' }}
          >
            Pay in INR.
          </motion.h1>
          <motion.h1
            className="nb-display"
            variants={fadeUp(0.15)}
            initial="hidden"
            animate="show"
            style={{ marginBottom: '40px' }}
          >
            Ship today.
          </motion.h1>

          <motion.p
            variants={fadeUp(0.22)}
            initial="hidden"
            animate="show"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1rem, 2vw, 1.125rem)',
              lineHeight: 1.7,
              color: 'var(--nb-text-2)',
              maxWidth: '48ch',
              marginBottom: '44px',
            }}
          >
            Time-bound virtual keys for GPT-4o, Claude, and Gemini.
            No subscription, no lock-in, no forex fees.
            One payment, one key, instant access.
          </motion.p>

          <motion.div
            variants={fadeUp(0.28)}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '56px' }}
          >
            <button
              className="btn btn-primary"
              style={{ padding: '11px 24px', fontSize: '0.9rem' }}
              onClick={() => navigate('/register')}
            >
              Get started free <ArrowRight size={14} />
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '11px 20px', fontSize: '0.9rem' }}
              onClick={() => navigate('/pricing')}
            >
              See pricing
            </button>
            <Link
              to="/docs"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--nb-text-3)', fontSize: '0.875rem', textDecoration: 'none', fontFamily: 'var(--font-body)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text-2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
            >
              Read the docs <ArrowUpRight size={13} />
            </Link>
          </motion.div>

          {/* Inline trust signals — mono, small, no icons */}
          <motion.div
            variants={fadeUp(0.34)}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 0' }}
          >
            {['No subscription', 'UPI payment', 'Key in 10 seconds', 'OpenAI-compatible', 'INR only', 'No KYC'].map((t, i, arr) => (
              <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.06em' }}>
                {t}{i < arr.length - 1 && <span style={{ margin: '0 14px', opacity: 0.3 }}>·</span>}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HOW IT WORKS — numbered rule rows
          ═════════════════════════════════════════════════════════════════ */}
      <section style={{ borderBottom: '1px solid var(--nb-border)' }}>
        <div style={{ ...MAX, ...SP }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP} style={{ marginBottom: '48px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '18px' }}>HOW IT WORKS</span>
            <h2 className="nb-headline">Up and running in 3 minutes</h2>
          </motion.div>

          <div>
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                variants={fadeUp(0)}
                initial="hidden"
                whileInView="show"
                viewport={VP}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr 1fr',
                  gap: '24px 40px',
                  alignItems: 'start',
                  padding: '24px 0',
                  borderTop: '1px solid var(--nb-border)',
                }}
                className="step-row"
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-green)', letterSpacing: '0.06em', paddingTop: '3px' }}>{s.n}</span>
                <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--nb-text)', letterSpacing: '-0.01em', lineHeight: 1.4 }}>{s.title}</h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--nb-text-2)' }} className="step-row-body">{s.body}</p>
              </motion.div>
            ))}
            <div style={{ borderTop: '1px solid var(--nb-border)' }} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURE BENTO — asymmetric visible grid
          ═════════════════════════════════════════════════════════════════ */}
      <section style={{ borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-surface)' }}>
        <div style={{ ...MAX, ...SP }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP} style={{ marginBottom: '40px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '18px' }}>BUILT RIGHT</span>
            <h2 className="nb-headline" style={{ maxWidth: '24ch' }}>Infrastructure that earns your trust.</h2>
          </motion.div>

          {/* Bento — uses CSS grid gap as visible structural lines */}
          <div className="bento-grid">
            {BENTO.map((cell, i) => (
              <motion.div
                key={cell.n}
                className={`bento-cell ${cell.span}`}
                variants={fadeUp(0)}
                initial="hidden"
                whileInView="show"
                viewport={VP}
                transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
                style={cell.wide ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '40px', flexWrap: 'wrap' } : {}}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: cell.accent ? 'var(--nb-green)' : 'var(--nb-text-3)', letterSpacing: '0.08em', display: 'block', marginBottom: cell.wide ? '0' : '20px' }}>
                  {cell.n}
                </span>
                <div style={cell.wide ? { flex: 1 } : {}}>
                  <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: cell.wide ? '1rem' : '0.9375rem', color: 'var(--nb-text)', letterSpacing: '-0.015em', lineHeight: 1.3, marginBottom: '10px' }}>
                    {cell.title}
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8375rem', lineHeight: 1.7, color: 'var(--nb-text-2)', maxWidth: cell.wide ? '52ch' : undefined }}>
                    {cell.body}
                  </p>
                </div>
                {cell.accent && (
                  <div style={{ position: 'absolute', top: '20px', right: '20px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--nb-green)' }} />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          PRICING — linear table rows
          ═════════════════════════════════════════════════════════════════ */}
      <section style={{ borderBottom: '1px solid var(--nb-border)' }}>
        <div style={{ ...MAX, ...SP }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '40px' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '18px' }}>PRICING</span>
              <h2 className="nb-headline">Pay for the time you use.</h2>
            </div>
            <Link
              to="/pricing"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--nb-text-3)', fontSize: '0.8125rem', textDecoration: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text-2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
            >
              ALL PLANS <ArrowUpRight size={12} />
            </Link>
          </motion.div>

          <div>
            {PLANS.map((p, i) => (
              <motion.div
                key={p.label}
                variants={fadeUp(0)}
                initial="hidden"
                whileInView="show"
                viewport={VP}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr auto',
                  gap: '24px 40px',
                  alignItems: 'center',
                  padding: '20px 0',
                  borderTop: '1px solid var(--nb-border)',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-head)',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: p.popular ? 'var(--nb-text)' : 'var(--nb-text-2)',
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  {p.label}
                  {p.popular && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--nb-green)', letterSpacing: '0.1em', border: '1px solid var(--nb-green-border)', padding: '1px 6px', borderRadius: '2px' }}>
                      POPULAR
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--nb-text-3)' }}>
                  {p.tokens} tokens included
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '7px 16px' }}
                  onClick={() => navigate('/marketplace')}
                >
                  Rent now
                </button>
              </motion.div>
            ))}
            <div style={{ borderTop: '1px solid var(--nb-border)' }} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOUNDER QUOTE — Playfair italic, no card
          ═════════════════════════════════════════════════════════════════ */}
      <section style={{ borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-surface)' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', ...SP }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '32px' }}>WHY THIS EXISTS</span>
            <blockquote style={{ margin: 0, padding: 0, border: 'none' }}>
              <p style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 'clamp(1.15rem, 2.5vw, 1.5rem)',
                color: 'var(--nb-text-2)',
                lineHeight: 1.68,
                marginBottom: '32px',
                maxWidth: '62ch',
              }}>
                "I built AIRent because I was tired of hitting rate limits, waiting for API
                approvals, and paying in USD with forex fees just to test a model for a side
                project. If you are a student or indie developer in India who wants to experiment
                with frontier AI without the overhead, this is for you."
              </p>
              <footer style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '2px', background: 'var(--nb-raised)', border: '1px solid var(--nb-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--nb-text-2)', flexShrink: 0 }}>
                  D
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.875rem', color: 'var(--nb-text-2)' }}>Deepanshu Sharma</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--nb-text-3)', letterSpacing: '0.06em' }}>FOUNDER, AIRENT</div>
                </div>
              </footer>
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CTA CLOSE — full-width row: left headline, right buttons
          ═════════════════════════════════════════════════════════════════ */}
      <section>
        <div style={{ ...MAX, ...SP }}>
          <motion.div
            variants={fadeUp(0)}
            initial="hidden"
            whileInView="show"
            viewport={VP}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}
          >
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '18px' }}>READY TO SHIP</span>
              <h2
                style={{
                  fontFamily: 'var(--font-head)',
                  fontSize: 'clamp(1.8rem, 4vw, 3.2rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: 'var(--nb-text)',
                  lineHeight: 1.08,
                  maxWidth: '18ch',
                }}
              >
                Account in 30 seconds. Start building.
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '12px 28px', fontSize: '0.9rem' }}
                onClick={() => navigate('/register')}
              >
                Get your API key <ArrowRight size={14} />
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '10px 16px', fontSize: '0.875rem', color: 'var(--nb-text-3)' }}
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
