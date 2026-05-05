import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Zap, Shield, Heart, Globe, Github, Linkedin } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeLeft, fadeRight, scaleIn, staggerContainer, viewport } from '../lib/motion';

const VALUES = [
  { icon: Zap,    title: 'Speed first',         desc: 'Your key arrives before you finish your coffee. Activation takes under 10 seconds end-to-end.' },
  { icon: Shield, title: 'Security by default', desc: 'IP-pinned keys, PII masking, and prompt safety checks on every single API request, always.' },
  { icon: Heart,  title: 'Developer-first',     desc: 'Every detail, from the OpenAI-compatible endpoint to the live token dashboard, built by a dev, for devs.' },
  { icon: Globe,  title: 'Made for India',      desc: 'Pay in INR via UPI. No forex fees, no enterprise lock-in. Just build what you want, when you want.' },
];

const STACK = ['FastAPI', 'React', 'PostgreSQL', 'Redis', 'LiteLLM', 'Docker', 'Framer Motion', 'Tailwind CSS'];

export default function AboutUs() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Helmet>
        <title>About &mdash; AIRent | Built by a Developer, for Developers</title>
        <meta name="description" content="AIRent is a one-person SaaS by Deepanshu Sharma. Rent AI APIs by the hour, GPT-4o, Claude, Gemini. No subscriptions, pay in INR." />
        <link rel="canonical" href="https://airent.dev/about" />
      </Helmet>
      <Navbar />

      {/* ── Hero ── */}
      <section style={{ paddingTop: '120px', paddingBottom: '80px', paddingLeft: '20px', paddingRight: '20px' }}>
        <div className="max-w-3xl mx-auto">
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show">
            <motion.p variants={fadeUp} className="eyebrow mb-5">Our Story</motion.p>
            <motion.h1 variants={fadeUp} style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 800,
              letterSpacing: '-0.035em', color: 'var(--c-text)', lineHeight: 1.05, marginBottom: '24px',
            }}>
              Making AI accessible<br />for every developer.
            </motion.h1>
            <motion.p variants={fadeUp} style={{
              color: 'var(--c-text-2)', fontSize: '1.05rem', lineHeight: 1.75, maxWidth: '600px',
            }}>
              AIRent was born from frustration. Every time I needed to prototype with a frontier model,
              I hit rate limits, billing delays, or annual contracts. So I built the tool I always wanted:
              a marketplace to rent AI API access by the hour.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Origin blockquote ── */}
      <section style={{ padding: '0 20px 80px' }}>
        <div className="max-w-3xl mx-auto">
          <motion.blockquote
            variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
            style={{
              margin: 0,
              padding: '32px 36px',
              background: 'var(--c-surface)',
              border: '1px solid var(--c-border)',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            <p style={{
              color: 'var(--c-text-2)', fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
              lineHeight: 1.75, fontStyle: 'italic', marginBottom: '24px',
              maxWidth: '600px',
            }}>
              "I was building a side project at 1 AM and needed GPT-4o for a single test.
              The cheapest option was $20 minimum, required a card, and took 10 minutes to set up.
              I gave up that night. AIRent is the answer to that moment."
            </p>
            <footer style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'var(--c-raised)', border: '1px solid var(--c-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 800, color: 'var(--c-text)', flexShrink: 0,
              }}>
                D
              </div>
              <div>
                <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.875rem' }}>Deepanshu Sharma</div>
                <div style={{ color: 'var(--c-text-3)', fontSize: '0.75rem' }}>Founder, AIRent</div>
              </div>
            </footer>
          </motion.blockquote>
        </div>
      </section>

      {/* ── Mission + Values ── */}
      <section style={{ padding: '80px 20px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid md:grid-cols-2 gap-16 items-start"
          >
            <motion.div variants={fadeLeft}>
              <p className="eyebrow mb-5">Mission</p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)', lineHeight: 1.2, marginBottom: '24px' }}>
                AI shouldn't need<br />a corporate budget.
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Independent developers, students, and small teams deserve the same access to frontier models as Fortune 500 companies.',
                  'AIRent flips the model. Instead of paying for what you might use, you pay for exactly what you do use, in a time window you control.',
                  'I handle billing complexity, provider rate-limiting, fallback routing, and cost protection so you can focus on shipping.',
                ].map((p, i) => (
                  <p key={i} style={{ color: 'var(--c-text-2)', fontSize: '0.925rem', lineHeight: 1.75, maxWidth: '520px' }}>{p}</p>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeRight} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {VALUES.map(v => (
                <div key={v.title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, marginTop: '2px' }}>
                    <v.icon size={16} style={{ color: 'var(--c-accent)' }} />
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '5px' }}>{v.title}</h4>
                    <p style={{ color: 'var(--c-text-3)', fontSize: '0.825rem', lineHeight: 1.65 }}>{v.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Founder ── */}
      <section style={{ padding: '96px 20px', background: 'var(--c-bg)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer(0.08)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid md:grid-cols-2 gap-16 items-center"
          >
            <motion.div variants={fadeLeft}>
              <p className="eyebrow mb-5">The team</p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)', lineHeight: 1.2, marginBottom: '20px' }}>
                One person.<br />Big mission.
              </h2>
              <p style={{ color: 'var(--c-text-2)', fontSize: '0.925rem', lineHeight: 1.75, maxWidth: '440px', marginBottom: '20px' }}>
                Built the entire stack from backend API to payment integration to the UI you're reading right now.
                Solo, in India, with genuine care for every developer who hits the same walls I did.
              </p>
              <p style={{ color: 'var(--c-text-3)', fontSize: '0.85rem', lineHeight: 1.65, maxWidth: '440px' }}>
                When AIRent has 1000 users, it will still feel like it was made by a person who knows your name.
                That's the plan.
              </p>
            </motion.div>

            <motion.div variants={fadeRight}>
              <div style={{
                background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                borderRadius: '12px', padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '10px',
                  background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', fontWeight: 800, color: 'var(--c-accent)',
                  marginBottom: '20px',
                }}>
                  D
                </div>
                <h3 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>Deepanshu Sharma</h3>
                <p style={{ color: 'var(--c-accent)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '20px', letterSpacing: '0.02em' }}>
                  Founder &amp; Solo Developer
                </p>
                <p style={{ color: 'var(--c-text-3)', fontSize: '0.825rem', lineHeight: 1.7, marginBottom: '24px' }}>
                  Built the entire stack, backend, frontend, payments, and infrastructure,
                  driven by one goal: making frontier AI affordable for every developer in India.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                  {STACK.slice(0, 5).map(tech => (
                    <span key={tech} style={{
                      padding: '3px 10px', borderRadius: '4px',
                      background: 'var(--c-raised)', border: '1px solid var(--c-border)',
                      color: 'var(--c-text-3)', fontSize: '0.75rem',
                    }}>
                      {tech}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a
                    href="https://github.com/deepanshusharma007" target="_blank" rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.825rem', padding: '8px 16px' }}
                  >
                    <Github size={14} /> GitHub
                  </a>
                  <a
                    href="https://www.linkedin.com/in/deepanshu-sharma-354154157/" target="_blank" rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.825rem', padding: '8px 16px' }}
                  >
                    <Linkedin size={14} /> LinkedIn
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section style={{ padding: '80px 20px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)' }}>
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
            <p className="eyebrow mb-4">Tech stack</p>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--c-text)', marginBottom: '8px' }}>
              Built on modern open-source
            </h2>
            <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem', marginBottom: '28px', lineHeight: 1.65 }}>
              Production-tested, open-source stack from top to bottom.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {STACK.map(tech => (
                <span
                  key={tech}
                  style={{
                    padding: '6px 14px', borderRadius: '6px',
                    background: 'var(--c-raised)', border: '1px solid var(--c-border)',
                    color: 'var(--c-text-2)', fontSize: '0.875rem',
                    cursor: 'default', transition: 'border-color 150ms, color 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-border-hi)'; e.currentTarget.style.color = 'var(--c-text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.color = 'var(--c-text-2)'; }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
