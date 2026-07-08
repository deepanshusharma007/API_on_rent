import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Github, ArrowRight, Zap, ShieldCheck, Code2, IndianRupee } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-60px' };
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: d } } });

const VALUES = [
  { icon: Zap,          n: '01', title: 'Speed first',         body: 'Your key arrives before you finish your coffee. Activation takes under 10 seconds end-to-end.' },
  { icon: ShieldCheck,  n: '02', title: 'Security by default', body: 'IP-pinned keys, PII masking, and prompt safety checks on every single API request, always.' },
  { icon: Code2,        n: '03', title: 'Developer-first',     body: 'Every detail — from the OpenAI-compatible endpoint to the live token dashboard — built by a dev, for devs.' },
  { icon: IndianRupee,  n: '04', title: 'Made for India',      body: 'Pay in INR via UPI. No forex fees, no enterprise lock-in. Just build what you want, when you want.' },
];

const STACK = ['FastAPI', 'React', 'PostgreSQL', 'Redis', 'LiteLLM', 'Docker', 'Framer Motion', 'Cashfree'];

const MISSION = [
  'Independent developers, students, and small teams deserve the same access to frontier models as Fortune 500 companies.',
  'AIRent flips the model. Instead of paying for what you might use, you pay for exactly what you do use, in a time window you control.',
  'We handle billing complexity, provider rate-limiting, fallback routing, and cost protection so you can focus on shipping.',
];

export default function AboutUs() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0d14' }}>
      <Helmet>
        <title>About — AIRent</title>
        <meta name="description" content="AIRent is a prepaid AI API rental platform built for Indian developers. No subscriptions, no KYC, instant keys." />
      </Helmet>
      <Navbar />

      <main style={{ flex: 1, paddingTop: '60px' }}>

        {/* Hero */}
        <section style={{ padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,56px) clamp(48px,6vw,72px)', background: '#0d1017', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '700px', height: '300px', background: 'radial-gradient(ellipse, rgba(192,193,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: '760px', margin: '0 auto', position: 'relative' }}>
            <motion.div initial="hidden" animate="show" variants={fadeUp(0)}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '999px', border: '1px solid rgba(192,193,255,0.2)', background: 'rgba(192,193,255,0.05)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--primary)', marginBottom: '28px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--primary)' }} />
                ABOUT AIRENT
              </div>
            </motion.div>
            <motion.h1 initial="hidden" animate="show" variants={fadeUp(0.06)} style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(2.2rem,5vw,3.5rem)', lineHeight: 1.08, letterSpacing: '-0.03em', color: '#e8edf8', marginBottom: '24px' }}>
              AI access for every<br />
              <span style={{ color: 'var(--secondary)' }}>Indian builder.</span>
            </motion.h1>
            <motion.p initial="hidden" animate="show" variants={fadeUp(0.12)} style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', lineHeight: 1.75, color: 'var(--on-surface-2)', maxWidth: '560px' }}>
              AIRent is a prepaid rental platform for frontier AI APIs. We exist because great developers shouldn't need a US credit card or a $20/month subscription to experiment with GPT-4o or Claude.
            </motion.p>
          </div>
        </section>

        {/* Mission */}
        <section style={{ padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,56px)', background: '#0a0d14' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{ marginBottom: '40px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)', marginBottom: '12px' }}>THE MISSION</div>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 'clamp(1.5rem,3vw,2rem)', color: '#e8edf8', letterSpacing: '-0.02em' }}>Why we built this</h2>
            </motion.div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {MISSION.map((para, i) => (
                <motion.p key={i} initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(i * 0.07)} style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', lineHeight: 1.8, color: 'var(--on-surface-2)', borderLeft: '2px solid rgba(192,193,255,0.15)', paddingLeft: '20px' }}>
                  {para}
                </motion.p>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section style={{ padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,56px)', background: '#0d1017' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{ marginBottom: '40px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)', marginBottom: '12px' }}>PRINCIPLES</div>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 'clamp(1.5rem,3vw,2rem)', color: '#e8edf8', letterSpacing: '-0.02em' }}>What we stand for</h2>
            </motion.div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '16px' }} className="values-grid">
              {VALUES.map((v, i) => {
                const Icon = v.icon;
                return (
                  <motion.div key={v.n} initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(i * 0.07)}>
                    <div style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '28px 24px', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(192,193,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={16} color="var(--primary)" />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-4)' }}>{v.n}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.0625rem', color: '#e8edf8', marginBottom: '10px' }}>{v.title}</div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)', lineHeight: 1.7 }}>{v.body}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Stack */}
        <section style={{ padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,56px)', background: '#0a0d14' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{ marginBottom: '32px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)', marginBottom: '12px' }}>BUILT WITH</div>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 'clamp(1.5rem,3vw,2rem)', color: '#e8edf8', letterSpacing: '-0.02em' }}>The tech stack</h2>
            </motion.div>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0.06)} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {STACK.map(s => (
                <span key={s} style={{ padding: '7px 16px', borderRadius: '8px', background: 'rgba(192,193,255,0.06)', border: '1px solid rgba(192,193,255,0.12)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.02em' }}>{s}</span>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,56px)', background: '#0d1017' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)}>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(1.8rem,4vw,2.6rem)', color: '#e8edf8', letterSpacing: '-0.03em', marginBottom: '16px' }}>
                Ready to build?
              </h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', color: 'var(--on-surface-2)', lineHeight: 1.7, marginBottom: '32px' }}>
                Get your first API key in under 60 seconds. No subscription, no friction.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', borderRadius: '10px', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontWeight: 700, background: 'linear-gradient(135deg, #4edea3 0%, #3bc98e 100%)', color: '#003824', boxShadow: '0 4px 24px -6px rgba(78,222,163,0.4)', transition: 'filter 120ms' }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.07)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                >
                  Get a key now <ArrowRight size={15} />
                </Link>
                <a href="https://github.com/deepanshusharma007" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 24px', borderRadius: '10px', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--on-surface-2)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', transition: 'border-color 120ms, color 120ms' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#e8edf8'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--on-surface-2)'; }}
                >
                  <Github size={15} /> View GitHub
                </a>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
      <style>{`
        @media (max-width: 640px) { .values-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
