import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Globe, Lock, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const EASE = [0.22, 1, 0.36, 1];
const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE, delay } },
});
const VP = { once: true, margin: '-60px' };

const STEPS = [
  { n: '01', title: 'Pick a plan',    body: 'Choose a model family and rental window. 15 minutes to 24 hours.' },
  { n: '02', title: 'Pay in INR',     body: 'UPI, card, or net banking via Cashfree. No foreign currency fees.' },
  { n: '03', title: 'Get your key',   body: 'Virtual key delivered instantly to your dashboard and email.' },
  { n: '04', title: 'Start building', body: 'Drop the key into any OpenAI SDK. Tokens tracked in real time.' },
];

const BENTO = [
  { icon: Zap,    title: 'Key in under 10 seconds',      body: 'Payment clears, virtual key lands instantly. No manual review, no approval queue.', wide: true },
  { icon: Globe,  title: 'Three providers, one endpoint', body: 'GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro. OpenAI-compatible API.' },
  { icon: Lock,   title: 'IP-pinned keys',               body: 'Every key locks to your IP after the first request. Misuse is structurally prevented.' },
  { icon: Shield, title: 'PII filter',                   body: 'Personal data stripped from every prompt before it reaches the model.' },
  { icon: Clock,  title: 'Hard token caps',              body: 'Server-side limits. Accidental overspend is not possible.' },
];

const PLANS = [
  { label: '15 min',   tokens: '20K',  popular: false },
  { label: '30 min',   tokens: '40K',  popular: false },
  { label: '1 hour',   tokens: '80K',  popular: true  },
  { label: '24 hours', tokens: '1.2M', popular: false },
];

const PROVIDERS = ['OpenAI GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro', 'GPT-4o-mini', 'Gemini Flash', 'OpenAI GPT-4o'];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Helmet>
        <title>AIRent — Rent AI APIs by the Minute | GPT, Claude, Gemini on Rent</title>
        <meta name="description" content="Rent GPT-4o, Claude, Gemini APIs by the hour. No subscription, no lock-in. Pay in INR via UPI. Get your API key in under 10 seconds." />
        <link rel="canonical" href="https://airent.dev/" />
      </Helmet>

      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="grid-lines" style={{
        paddingTop: 'clamp(120px, 18vw, 180px)',
        paddingBottom: 'clamp(80px, 10vw, 120px)',
        paddingLeft: 'clamp(20px, 5vw, 72px)',
        paddingRight: 'clamp(20px, 5vw, 72px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Radial fade mask over grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 50% 100%, var(--nb-bg) 30%, transparent 70%)',
        }} />
        {/* Mint glow orb */}
        <div style={{
          position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
          width: '700px', height: '350px', pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, oklch(0.5 0.14 168 / 0.18), transparent 70%)',
          filter: 'blur(40px)',
        }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}
            className="hero-grid">

            {/* Left — copy */}
            <div>
              <motion.div variants={fadeUp(0)} initial="hidden" animate="show">
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.12em',
                  color: 'var(--mint)', marginBottom: '28px',
                  background: 'var(--nb-green-bg)', border: '1px solid var(--nb-green-border)',
                  padding: '4px 12px', borderRadius: '999px',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--mint)', display: 'inline-block' }} />
                  AI API MARKETPLACE
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp(0.06)} initial="hidden" animate="show" style={{
                fontFamily: 'var(--font-head)', fontWeight: 700,
                fontSize: 'clamp(2.6rem, 6vw, 4.5rem)', lineHeight: 1.0,
                letterSpacing: '-0.04em', color: 'var(--nb-text)', marginBottom: '8px',
              }}>
                Rent AI APIs.
              </motion.h1>
              <motion.h1 variants={fadeUp(0.1)} initial="hidden" animate="show" style={{
                fontFamily: 'var(--font-head)', fontWeight: 700,
                fontSize: 'clamp(2.6rem, 6vw, 4.5rem)', lineHeight: 1.0,
                letterSpacing: '-0.04em', color: 'var(--nb-text-3)', marginBottom: '8px',
              }}>
                Pay in INR.
              </motion.h1>
              <motion.h1 variants={fadeUp(0.14)} initial="hidden" animate="show" style={{
                fontFamily: 'var(--font-head)', fontWeight: 700,
                fontSize: 'clamp(2.6rem, 6vw, 4.5rem)', lineHeight: 1.0,
                letterSpacing: '-0.04em', color: 'var(--mint)', marginBottom: '32px',
              }}>
                Ship today.
              </motion.h1>

              <motion.p variants={fadeUp(0.19)} initial="hidden" animate="show" style={{
                fontFamily: 'var(--font-body)', fontSize: 'clamp(0.9375rem, 1.8vw, 1.0625rem)',
                lineHeight: 1.72, color: 'var(--nb-text-2)', maxWidth: '46ch', marginBottom: '40px',
              }}>
                Time-bound virtual keys for GPT-4o, Claude, and Gemini.
                No subscription, no lock-in, no forex fees.
                One payment, one key, instant access.
              </motion.p>

              <motion.div variants={fadeUp(0.24)} initial="hidden" animate="show" style={{
                display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '40px',
              }}>
                <button className="btn btn-primary" style={{ padding: '11px 24px', fontSize: '0.9rem' }}
                  onClick={() => navigate('/register')}>
                  Get started free <ArrowRight size={15} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '11px 20px', fontSize: '0.9rem' }}
                  onClick={() => navigate('/marketplace')}>
                  Browse plans
                </button>
              </motion.div>

              <motion.div variants={fadeUp(0.29)} initial="hidden" animate="show" style={{ display: 'flex', flexWrap: 'wrap' }}>
                {['No subscription', 'UPI payment', 'Key in 10 seconds', 'OpenAI-compatible', 'INR only'].map((t, i, arr) => (
                  <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.06em' }}>
                    {t}{i < arr.length - 1 && <span style={{ margin: '0 12px', opacity: 0.3 }}>·</span>}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right — terminal card */}
            <motion.div variants={fadeUp(0.12)} initial="hidden" animate="show">
              <div className="bento-card" style={{
                padding: '0', overflow: 'hidden',
                boxShadow: '0 0 0 1px oklch(1 0 0 / 0.08), 0 40px 80px -20px oklch(0 0 0 / 0.7), 0 0 60px -20px oklch(0.5 0.14 168 / 0.2)',
              }}>
                {/* Title bar */}
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--nb-border)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'oklch(0.19 0.03 235 / 0.8)',
                }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['oklch(0.65 0.22 25)', 'oklch(0.75 0.18 75)', 'oklch(0.65 0.22 145)'].map((c, i) => (
                      <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />
                    ))}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', marginLeft: '8px' }}>
                    airent — terminal
                  </span>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', lineHeight: 1.8 }}>
                  <div><span style={{ color: 'var(--mint)' }}>$ </span><span style={{ color: 'var(--nb-text)' }}>airent rent --model gpt-4o --duration 1h</span></div>
                  <div style={{ marginTop: '12px', color: 'var(--nb-text-3)' }}>Authenticating...</div>
                  <div style={{ color: 'var(--nb-text-3)' }}>Processing payment via Cashfree...</div>
                  <div style={{ marginTop: '8px', color: 'var(--mint)' }}>Key provisioned in 3.2s</div>

                  {/* Key card */}
                  <div style={{
                    marginTop: '16px', padding: '14px 16px',
                    background: 'oklch(0.14 0.025 240)', border: '1px solid var(--nb-green-border)', borderRadius: '10px',
                  }}>
                    <div style={{ color: 'var(--nb-text-3)', fontSize: '0.6875rem', letterSpacing: '0.08em', marginBottom: '6px' }}>VIRTUAL KEY</div>
                    <div style={{ color: 'var(--nb-text)', letterSpacing: '0.04em' }}>
                      vk_<span style={{ color: 'var(--mint)' }}>4xK9mP2qR8nL</span>
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--nb-text-3)' }}>
                      <span>80,000 tokens</span>
                      <span style={{ color: 'var(--mint)' }}>expires in 59:47</span>
                    </div>
                    <div style={{ marginTop: '8px', height: '3px', background: 'oklch(1 0 0 / 0.06)', borderRadius: '2px' }}>
                      <div style={{ width: '100%', height: '100%', background: 'var(--mint)', borderRadius: '2px' }} />
                    </div>
                  </div>

                  <div style={{ marginTop: '14px', color: 'var(--nb-text-3)' }}># Drop into any OpenAI SDK:</div>
                  <div><span style={{ color: 'var(--nb-text-2)' }}>OPENAI_API_KEY=</span><span style={{ color: 'var(--mint)' }}>vk_4xK9mP2qR8nL</span></div>
                  <div><span style={{ color: 'var(--nb-text-2)' }}>OPENAI_BASE_URL=</span><span style={{ color: 'var(--nb-text)' }}>https://api.airent.dev/v1</span></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PROVIDER MARQUEE ──────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--nb-border)', borderBottom: '1px solid var(--nb-border)', padding: '18px 0', overflow: 'hidden' }}>
        <div className="marquee-banner" style={{ gap: '0' }}>
          {[...PROVIDERS, ...PROVIDERS].map((p, i) => (
            <span key={i} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.08em',
              color: 'var(--nb-text-3)', padding: '0 40px', borderRight: '1px solid var(--nb-border)',
              whiteSpace: 'nowrap',
            }}>
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,112px) clamp(20px,5vw,72px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP} style={{ marginBottom: '48px' }}>
            <span className="eyebrow" style={{ display: 'block', marginBottom: '14px' }}>HOW IT WORKS</span>
            <h2 className="nb-headline">Up and running in 3 minutes.</h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="steps-grid">
            {STEPS.map((s, i) => (
              <motion.div key={s.n} className="bento-card" variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
                transition={{ delay: i * 0.07, duration: 0.5, ease: EASE }}
                style={{ padding: '28px 24px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', marginBottom: '20px',
                  background: 'var(--nb-green-bg)', border: '1px solid var(--nb-green-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--mint)', fontWeight: 600 }}>{s.n}</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '1rem', color: 'var(--nb-text)', letterSpacing: '-0.015em', marginBottom: '10px' }}>
                  {s.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--nb-text-2)' }}>
                  {s.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE BENTO ─────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,112px) clamp(20px,5vw,72px)', background: 'oklch(0.14 0.025 238)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP} style={{ marginBottom: '48px' }}>
            <span className="eyebrow" style={{ display: 'block', marginBottom: '14px' }}>BUILT RIGHT</span>
            <h2 className="nb-headline" style={{ maxWidth: '26ch' }}>Infrastructure that earns your trust.</h2>
          </motion.div>

          {/* Row 1: wide + narrow */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }} className="bento-row-1">
            {BENTO.slice(0, 2).map((cell, i) => (
              <motion.div key={cell.title} className="bento-card" variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
                transition={{ delay: i * 0.07, duration: 0.5, ease: EASE }}
                style={{ padding: '32px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px', marginBottom: '20px',
                  background: 'var(--nb-green-bg)', border: '1px solid var(--nb-green-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <cell.icon size={18} color="var(--mint)" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '1.0625rem', color: 'var(--nb-text)', letterSpacing: '-0.015em', marginBottom: '10px' }}>
                  {cell.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', lineHeight: 1.72, color: 'var(--nb-text-2)' }}>
                  {cell.body}
                </p>
              </motion.div>
            ))}
          </div>
          {/* Row 2: three equal */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="bento-row-2">
            {BENTO.slice(2).map((cell, i) => (
              <motion.div key={cell.title} className="bento-card" variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
                transition={{ delay: (i + 2) * 0.07, duration: 0.5, ease: EASE }}
                style={{ padding: '28px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', marginBottom: '18px',
                  background: 'var(--nb-green-bg)', border: '1px solid var(--nb-green-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <cell.icon size={17} color="var(--mint)" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--nb-text)', letterSpacing: '-0.015em', marginBottom: '10px' }}>
                  {cell.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', lineHeight: 1.72, color: 'var(--nb-text-2)' }}>
                  {cell.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,112px) clamp(20px,5vw,72px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP} style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '40px',
          }}>
            <div>
              <span className="eyebrow" style={{ display: 'block', marginBottom: '14px' }}>PRICING</span>
              <h2 className="nb-headline">Pay for the time you use.</h2>
            </div>
            <Link to="/pricing" style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--nb-text-3)',
              textDecoration: 'none', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '4px',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text-2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
            >
              ALL PLANS →
            </Link>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }} className="plans-grid">
            {PLANS.map((p, i) => (
              <motion.div key={p.label} className="bento-card" variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
                transition={{ delay: i * 0.07, duration: 0.5, ease: EASE }}
                style={{
                  padding: '24px',
                  ...(p.popular ? { border: '1px solid var(--nb-green-border)', boxShadow: 'var(--shadow-glow)' } : {}),
                }}>
                {p.popular && <div style={{ marginBottom: '12px' }}><span className="badge">POPULAR</span></div>}
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--nb-text)', letterSpacing: '-0.03em', marginBottom: '4px' }}>
                  {p.label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--nb-text-3)', marginBottom: '20px' }}>
                  {p.tokens} tokens
                </div>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8125rem' }}
                  onClick={() => navigate('/marketplace')}>
                  Rent now
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDER QUOTE ─────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,112px) clamp(20px,5vw,72px)', background: 'oklch(0.14 0.025 238)' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <motion.div className="bento-card" variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
            style={{ padding: '40px 36px' }}>
            <span className="eyebrow" style={{ display: 'block', marginBottom: '24px' }}>WHY THIS EXISTS</span>
            <blockquote style={{ margin: 0, padding: 0, border: 'none' }}>
              <p style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.2vw, 1.375rem)',
                color: 'var(--nb-text-2)', lineHeight: 1.72, marginBottom: '28px',
              }}>
                "I built AIRent because I was tired of hitting rate limits, waiting for API
                approvals, and paying in USD with forex fees just to test a model for a side
                project. If you are a student or indie developer in India who wants to experiment
                with frontier AI without the overhead, this is for you."
              </p>
              <footer style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'var(--nb-green-bg)', border: '1px solid var(--nb-green-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-head)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--mint)',
                }}>
                  D
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.9rem', color: 'var(--nb-text)' }}>Deepanshu Sharma</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--nb-text-3)', letterSpacing: '0.06em' }}>FOUNDER, AIRENT</div>
                </div>
              </footer>
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* ── CTA CLOSE ─────────────────────────────────────────────────── */}
      <section className="grid-lines" style={{ padding: 'clamp(80px,12vw,128px) clamp(20px,5vw,72px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 80% at 50% 50%, oklch(0.32 0.09 165 / 0.12), transparent 70%)',
        }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}>
            <span className="eyebrow" style={{ display: 'block', marginBottom: '20px' }}>READY TO SHIP</span>
            <h2 style={{
              fontFamily: 'var(--font-head)', fontWeight: 700,
              fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.04em',
              color: 'var(--nb-text)', lineHeight: 1.05, margin: '0 auto 40px', maxWidth: '22ch',
            }}>
              Account in 30 seconds. Start building.
            </h2>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '0.9375rem' }}
                onClick={() => navigate('/register')}>
                Get your API key <ArrowRight size={15} />
              </button>
              <button className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '0.9375rem' }}
                onClick={() => navigate('/docs')}>
                Read the docs
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />

      <style>{`
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bento-row-1 { grid-template-columns: 1fr !important; }
          .bento-row-2 { grid-template-columns: 1fr 1fr !important; }
          .plans-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .steps-grid { grid-template-columns: 1fr !important; }
          .bento-row-2 { grid-template-columns: 1fr !important; }
          .plans-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
