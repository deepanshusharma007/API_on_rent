﻿import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Zap, IndianRupee, CheckCircle, Video, Bot, CreditCard, KeyRound, Rocket, Clock, Globe } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const EASE = [0.22, 1, 0.36, 1];
const fadeUp = (delay = 0) => ({
  hidden:  { opacity: 0, y: 20 },
  show:    { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay } },
});
const VP = { once: true, margin: '-50px' };

const FLOW_STEPS = [
  {
    Icon: Bot,
    num: '1.',
    title: 'Pick Provider',
    body: 'Choose from OpenAI, Anthropic, or Google. All providers are available on every plan with no lock-in.',
  },
  {
    Icon: CreditCard,
    num: '2.',
    title: 'Pay via UPI',
    body: 'Scan QR or use your favorite UPI app. Instant INR settlement without international transaction fees.',
  },
  {
    Icon: KeyRound,
    num: '3.',
    title: 'Use Instantly',
    body: 'Get your temporary API key immediately. Start coding with 100% uptime guaranteed by our infrastructure.',
  },
];

const PLANS = [
  { Icon: Zap,    model: '15 Minutes', duration: '20K tokens · all providers', price: '₹49',  popular: false },
  { Icon: Bot,    model: '30 Minutes', duration: '40K tokens · all providers', price: '₹89',  popular: false },
  { Icon: Rocket, model: '1 Hour',     duration: '80K tokens · all providers', price: '₹149', popular: true  },
  { Icon: Globe,  model: '24 Hours',   duration: '120K tokens · all providers', price: '₹499', popular: false },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0d14' }}>
      <Helmet>
        <title>AIRent â€" Rent AI APIs by the Minute | GPT, Claude, Gemini on Rent</title>
        <meta name="description" content="Rent GPT-4o, Claude, Gemini APIs by the hour. No subscription, no lock-in. Pay in INR via UPI. Get your API key in under 60 seconds." />
        <link rel="canonical" href="https://airent.dev/" />
      </Helmet>

      <Navbar />

      <main style={{ flex: 1, paddingTop: 'var(--header-h, 60px)' }}>

        {/* â"€â"€ HERO â"€â"€ */}
        <section style={{
          minHeight: '520px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(64px, 10vw, 100px) clamp(16px, 5vw, 48px) clamp(48px, 8vw, 80px)',
          textAlign: 'center',
          background: 'linear-gradient(180deg, #0d1017 0%, #0a0d14 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* subtle top glow */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '500px', height: '200px', background: 'radial-gradient(ellipse, rgba(99,230,190,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <motion.div initial="hidden" animate="show" variants={fadeUp(0)}>
            {/* Beta badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '5px 14px', borderRadius: '999px',
              border: '1px solid rgba(99,230,190,0.3)',
              background: 'rgba(99,230,190,0.06)',
              fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700,
              letterSpacing: '0.1em', color: 'var(--secondary)', marginBottom: '28px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--secondary)', display: 'inline-block' }} />
              BETA ACCESS NOW OPEN
            </div>
          </motion.div>

          <motion.h1 initial="hidden" animate="show" variants={fadeUp(0.07)} style={{
            fontFamily: 'var(--font-head)', fontWeight: 800,
            fontSize: 'clamp(2rem, 6vw, 3.25rem)',
            lineHeight: 1.1, letterSpacing: '-0.02em',
            color: '#e8edf8', marginBottom: '18px', maxWidth: '640px',
          }}>
            Prepaid AI for{' '}
            <span style={{ color: 'var(--secondary)' }}>Indian Developers</span>
          </motion.h1>

          <motion.p initial="hidden" animate="show" variants={fadeUp(0.13)} style={{
            fontFamily: 'var(--font-body)', fontSize: '1rem', lineHeight: 1.6,
            color: 'var(--on-surface-2)', maxWidth: '460px', marginBottom: '36px',
          }}>
            Access OpenAI, Anthropic, and Google APIs in 60s. No monthly subscriptions. No tedious KYC. Pay only for what you compute.
          </motion.p>

          <motion.div initial="hidden" animate="show" variants={fadeUp(0.18)} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '48px' }}>
            <button onClick={() => navigate('/marketplace')} style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '13px 28px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700,
              color: '#0a1a12',
              background: 'linear-gradient(135deg, #4edea3 0%, #3bc98e 100%)',
              boxShadow: '0 4px 24px -6px rgba(78,222,163,0.5)',
              transition: 'filter 120ms',
            }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.07)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'none'}
            >
              Get Your First Key
            </button>
            <Link to="/docs" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '13px 24px', borderRadius: '10px',
              fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600,
              color: 'var(--on-surface-2)', textDecoration: 'none',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              transition: 'border-color 120ms, color 120ms',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#e8edf8'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--on-surface-2)'; }}
            >
              <Video size={15} /> View Docs
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div initial="hidden" animate="show" variants={fadeUp(0.24)} style={{ display: 'flex', gap: 'clamp(20px, 4vw, 48px)', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { icon: <CheckCircle size={14} />, label: 'Verified Models' },
              { icon: <Zap size={14} />,          label: '100ms Latency'   },
              { icon: <IndianRupee size={14} />,  label: 'UPI Integrated'  },
            ].map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--on-surface-3)', fontFamily: 'var(--font-body)', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--secondary)' }}>{b.icon}</span>
                {b.label}
              </div>
            ))}
          </motion.div>
        </section>

        {/* â"€â"€ INSTANT DEPLOYMENT FLOW â"€â"€ */}
        <section style={{ background: '#0d1017', padding: 'clamp(64px, 8vw, 96px) clamp(16px, 5vw, 48px)' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#e8edf8', letterSpacing: '-0.02em' }}>
                Instant Deployment Flow
              </h2>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="flow-grid">
              {FLOW_STEPS.map((s, i) => (
                <motion.div key={s.title} initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(i * 0.08)}>
                  <div style={{
                    background: '#141720', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '16px', padding: '32px 24px', height: '100%', textAlign: 'center',
                  }}>
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '50%',
                      background: i === 0 ? 'rgba(192,193,255,0.15)' : i === 1 ? 'rgba(78,222,163,0.15)' : 'rgba(208,188,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}>
                      <s.Icon size={22} color={i === 0 ? 'var(--primary)' : i === 1 ? 'var(--secondary)' : '#d0bcff'} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.0625rem', color: '#e8edf8', marginBottom: '10px' }}>
                      {s.num} {s.title}
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)', lineHeight: 1.65 }}>
                      {s.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* â"€â"€ BENTO FEATURE GRID â"€â"€ */}
        <section style={{ background: '#0a0d14', padding: 'clamp(48px, 6vw, 80px) clamp(16px, 5vw, 48px)' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto', gap: '16px' }} className="feat-grid">

            {/* IP Security â€" wide left, spans 2 rows */}
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{ gridRow: 'span 2' }}>
              <div style={{
                background: '#111520', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '32px 28px', height: '100%',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                overflow: 'hidden', position: 'relative',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <ShieldCheck size={20} color="var(--secondary)" />
                    <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.125rem', color: '#e8edf8' }}>IP-Pinned Security</span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)', lineHeight: 1.65, maxWidth: '260px' }}>
                    Lock your API key to specific server IPs. Prevents unauthorized usage even if your key is leaked in a codebase.
                  </p>
                </div>
                {/* World map graphic â€" CSS grid dots */}
                <div style={{
                  marginTop: '28px', borderRadius: '10px', overflow: 'hidden',
                  background: 'rgba(78,222,163,0.04)', border: '1px solid rgba(78,222,163,0.1)',
                  padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: '140px',
                  backgroundImage: 'radial-gradient(rgba(78,222,163,0.18) 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(78,222,163,0.6)', marginBottom: '6px', letterSpacing: '0.1em' }}>NETWORK SECURED</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary)' }}>4.8 TB/s</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(78,222,163,0.5)', marginTop: '4px' }}>throughput capacity</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Instant Delivery â€" top right */}
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0.08)}>
              <div style={{
                background: '#111520', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '28px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '14px',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'rgba(78,222,163,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Zap size={20} color="var(--secondary)" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.0625rem', color: '#e8edf8', marginBottom: '8px' }}>Instant Delivery</div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)', lineHeight: 1.65 }}>
                    Keys are generated and displayed within 60 seconds of payment confirmation.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Cost Control â€" bottom right */}
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0.12)}>
              <div style={{
                background: '#111520', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '28px 24px',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)', marginBottom: '10px' }}>SERVER_ENFORCED_LIMITS</div>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.0625rem', color: '#e8edf8', marginBottom: '8px' }}>Cost Control</div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)', lineHeight: 1.65, marginBottom: '20px' }}>
                  Set hard limits on token usage. Never wake up to a massive surprise bill from big AI providers again.
                </p>
                {/* segmented progress bar */}
                <div style={{ display: 'flex', gap: '3px' }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} style={{
                      flex: 1, height: '5px', borderRadius: '2px',
                      background: i < 5 ? 'var(--primary)' : i < 8 ? 'rgba(192,193,255,0.25)' : 'rgba(255,255,255,0.06)',
                    }} />
                  ))}
                </div>
              </div>
            </motion.div>

          </div>

          {/* Second bento row: Transparent INR Pricing â€" full width */}
          <div style={{ maxWidth: '960px', margin: '16px auto 0' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0.08)}>
              <div style={{
                background: '#111520', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '28px 32px',
                display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'center',
              }} className="pricing-bento">
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.125rem', color: '#e8edf8', marginBottom: '8px' }}>Transparent INR Pricing</div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)', lineHeight: 1.65, marginBottom: '16px', maxWidth: '400px' }}>
                    No dollar-to-rupee conversion math. What you see is what you pay. Perfect for Indian freelancers and startups.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['FIXED RATE', 'GST INVOICE'].map(tag => (
                      <span key={tag} style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
                        padding: '4px 10px', borderRadius: '6px',
                        background: 'rgba(192,193,255,0.08)', color: 'var(--primary)',
                        border: '1px solid rgba(192,193,255,0.15)',
                      }}>{tag}</span>
                    ))}
                  </div>
                </div>
                {/* 3D chip visual */}
                <div style={{
                  width: '100px', height: '100px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1219 100%)',
                  border: '1px solid rgba(192,193,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 8px 32px -8px rgba(192,193,255,0.15)',
                }}>
                  <IndianRupee size={36} color="var(--primary)" strokeWidth={1.5} />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* â"€â"€ COMPUTE PACKAGES / PRICING â"€â"€ */}
        <section style={{ background: '#0d1017', padding: 'clamp(64px, 8vw, 96px) clamp(16px, 5vw, 48px)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#e8edf8', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                Compute Packages
              </h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', color: 'var(--on-surface-2)' }}>
                Micro-rentals for testing, debugging, or quick tasks.
              </p>
            </motion.div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PLANS.map((plan, i) => (
                <motion.div key={plan.model} initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(i * 0.07)}>
                  <div
                    onClick={() => navigate('/marketplace')}
                    style={{
                      display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '16px',
                      padding: '20px 24px', borderRadius: '12px', cursor: 'pointer',
                      background: plan.popular ? 'rgba(78,222,163,0.06)' : '#141720',
                      border: `1px solid ${plan.popular ? 'rgba(78,222,163,0.25)' : 'rgba(255,255,255,0.07)'}`,
                      transition: 'border-color 150ms, background 150ms',
                      position: 'relative',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = plan.popular ? 'rgba(78,222,163,0.4)' : 'rgba(255,255,255,0.14)';
                      e.currentTarget.style.background = plan.popular ? 'rgba(78,222,163,0.09)' : '#181d2a';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = plan.popular ? 'rgba(78,222,163,0.25)' : 'rgba(255,255,255,0.07)';
                      e.currentTarget.style.background = plan.popular ? 'rgba(78,222,163,0.06)' : '#141720';
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px', fontSize: '1.2rem',
                      background: plan.popular ? 'rgba(78,222,163,0.12)' : 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <plan.Icon size={18} color={plan.popular ? 'var(--secondary)' : 'var(--on-surface-2)'} />
                    </div>

                    {/* Name + duration */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: '#e8edf8' }}>{plan.model}</span>
                        {plan.popular && (
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em',
                            padding: '2px 7px', borderRadius: '4px',
                            background: 'var(--secondary)', color: '#003824',
                          }}>POPULAR</span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--on-surface-3)' }}>{plan.duration}</div>
                    </div>

                    {/* Price + CTA */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.25rem',
                        color: plan.popular ? 'var(--secondary)' : '#e8edf8', letterSpacing: '-0.02em',
                      }}>{plan.price}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--on-surface-3)', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        RENT NOW <ArrowRight size={10} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.p initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0.24)} style={{ textAlign: 'center', marginTop: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--on-surface-4)', fontStyle: 'italic' }}>
              * Prices exclusive of GST. No recurring billing. Ever.
            </motion.p>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

