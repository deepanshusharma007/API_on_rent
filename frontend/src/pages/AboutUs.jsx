import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Github, Linkedin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-60px' };
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: d } } });
const SP = { padding: 'clamp(64px,9vw,104px) clamp(20px,5vw,72px)' };
const MAX = { maxWidth: '1120px', margin: '0 auto' };

const VALUES = [
  { n: '01', title: 'Speed first',         body: 'Your key arrives before you finish your coffee. Activation takes under 10 seconds end-to-end.' },
  { n: '02', title: 'Security by default', body: 'IP-pinned keys, PII masking, and prompt safety checks on every single API request, always.' },
  { n: '03', title: 'Developer-first',     body: 'Every detail, from the OpenAI-compatible endpoint to the live token dashboard, built by a dev, for devs.' },
  { n: '04', title: 'Made for India',      body: 'Pay in INR via UPI. No forex fees, no enterprise lock-in. Just build what you want, when you want.' },
];

const STACK = ['FastAPI', 'React', 'PostgreSQL', 'Redis', 'LiteLLM', 'Docker', 'Framer Motion', 'Tailwind CSS'];

const MISSION_PARAS = [
  'Independent developers, students, and small teams deserve the same access to frontier models as Fortune 500 companies.',
  'AIRent flips the model. Instead of paying for what you might use, you pay for exactly what you do use, in a time window you control.',
  'I handle billing complexity, provider rate-limiting, fallback routing, and cost protection so you can focus on shipping.',
];

export default function AboutUs() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nb-bg)' }}>
      <Helmet>
        <title>About — AIRent | Built by a Developer, for Developers</title>
        <meta name="description" content="AIRent is a one-person SaaS by Deepanshu Sharma. Rent AI APIs by the hour — GPT-4o, Claude, Gemini. No subscriptions, pay in INR." />
        <link rel="canonical" href="https://airent.dev/about" />
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
              OUR STORY
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp(0.06)} initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2.8rem,7vw,5rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--nb-text)', lineHeight: 0.98, marginBottom: '28px' }}
          >
            Making AI accessible<br />
            <span style={{ color: 'var(--nb-text-2)' }}>for every developer.</span>
          </motion.h1>
          <motion.p
            variants={fadeUp(0.12)} initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', lineHeight: 1.75, color: 'var(--nb-text-2)', maxWidth: '48ch' }}
          >
            AIRent was born from frustration. Every time I needed to prototype with a frontier model,
            I hit rate limits, billing delays, or annual contracts. So I built the tool I always wanted.
          </motion.p>
        </div>
      </section>

      {/* ── Origin quote ── */}
      <section style={{ borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-surface)', ...SP }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '32px' }}>THE MOMENT IT STARTED</span>
            <blockquote style={{ margin: 0, padding: 0, border: 'none' }}>
              <p style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 'clamp(1.1rem,2.5vw,1.5rem)',
                color: 'var(--nb-text-2)',
                lineHeight: 1.68,
                marginBottom: '32px',
                maxWidth: '62ch',
              }}>
                "I was building a side project at 1 AM and needed GPT-4o for a single test.
                The cheapest option was $20 minimum, required a card, and took 10 minutes to set up.
                I gave up that night. AIRent is the answer to that moment."
              </p>
              <footer style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '2px', background: 'var(--nb-raised)', border: '1px solid var(--nb-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--nb-text-2)', flexShrink: 0 }}>D</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.875rem', color: 'var(--nb-text-2)' }}>Deepanshu Sharma</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--nb-text-3)', letterSpacing: '0.06em' }}>FOUNDER, AIRENT</div>
                </div>
              </footer>
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* ── Mission ── */}
      <section style={{ borderBottom: '1px solid var(--nb-border)', ...SP }}>
        <div style={{ ...MAX }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP} style={{ marginBottom: '40px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '18px' }}>MISSION</span>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(1.5rem,3vw,2.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--nb-text)', lineHeight: 1.15, maxWidth: '22ch' }}>
              AI shouldn't need a corporate budget.
            </h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }} className="about-grid">
            <div>
              {MISSION_PARAS.map((p, i) => (
                <motion.p key={i} variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
                  style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', lineHeight: 1.75, color: 'var(--nb-text-2)', marginBottom: '20px', maxWidth: '50ch' }}
                >{p}</motion.p>
              ))}
            </div>
            <div>
              {VALUES.map((v, i) => (
                <motion.div key={v.n} variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
                  style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '16px', padding: '20px 0', borderTop: '1px solid var(--nb-border)' }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-4)', letterSpacing: '0.04em', paddingTop: '3px' }}>{v.n}</span>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--nb-text)', letterSpacing: '-0.01em', marginBottom: '6px' }}>{v.title}</h3>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--nb-text-2)' }}>{v.body}</p>
                  </div>
                </motion.div>
              ))}
              <div style={{ borderTop: '1px solid var(--nb-border)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Founder ── */}
      <section style={{ borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-surface)', ...SP }}>
        <div style={{ ...MAX }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP} style={{ marginBottom: '40px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '18px' }}>THE TEAM</span>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(1.5rem,3vw,2.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--nb-text)', lineHeight: 1.15 }}>
              One person. Big mission.
            </h2>
          </motion.div>

          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'start' }}
            className="about-grid"
          >
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', lineHeight: 1.75, color: 'var(--nb-text-2)', marginBottom: '20px', maxWidth: '50ch' }}>
                Built the entire stack, from backend API to payment integration to the UI you're reading now.
                Solo, in India, with genuine care for every developer who hits the same walls I did.
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', lineHeight: 1.75, color: 'var(--nb-text-3)', maxWidth: '50ch' }}>
                When AIRent has 1000 users, it will still feel like it was made by a person who knows your name. That's the plan.
              </p>
            </div>

            <div style={{ background: 'var(--nb-raised)', border: '1px solid var(--nb-border)', borderRadius: '4px', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--nb-border)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '2px', background: 'var(--nb-green-bg)', border: '1px solid var(--nb-green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: 'var(--nb-green)', flexShrink: 0 }}>D</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--nb-text)', letterSpacing: '-0.01em' }}>Deepanshu Sharma</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--nb-green)', letterSpacing: '0.06em' }}>FOUNDER & SOLO DEVELOPER</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                {STACK.map(t => (
                  <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', padding: '3px 8px', border: '1px solid var(--nb-border)', borderRadius: '2px', color: 'var(--nb-text-3)', letterSpacing: '0.04em' }}>{t}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href="https://github.com/deepanshusharma007" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '7px 14px' }}>
                  <Github size={13} /> GitHub
                </a>
                <a href="https://www.linkedin.com/in/deepanshu-sharma-354154157/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '7px 14px' }}>
                  <Linkedin size={13} /> LinkedIn
                </a>
              </div>
            </div>
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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '16px' }}>START BUILDING</span>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(1.6rem,4vw,2.8rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--nb-text)', lineHeight: 1.1 }}>
                Your first key is 30 seconds away.
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary" style={{ padding: '10px 22px' }}>Get started <ArrowRight size={14} /></Link>
              <Link to="/contact" className="btn btn-secondary" style={{ padding: '10px 18px' }}>Get in touch</Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <style>{`
        @media (max-width: 680px) { .about-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
