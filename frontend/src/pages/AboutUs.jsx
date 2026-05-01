import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Heart, Code2, Globe, Github, Linkedin } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeLeft, fadeRight, scaleIn, staggerContainer, viewport } from '../lib/motion';

const STATS = [
  { value: '₹0',    label: 'Hidden fees'       },
  { value: '3',     label: 'AI providers'       },
  { value: '99.9%', label: 'Uptime target'      },
  { value: '< 10s', label: 'Key delivery time'  },
];

const VALUES = [
  { icon: Zap,    title: 'Speed first',         desc: 'Your key arrives before you finish your coffee. Activation takes under 10 seconds end-to-end.' },
  { icon: Shield, title: 'Security by default', desc: 'IP-pinned keys, PII masking, and prompt safety checks on every single API request — always.' },
  { icon: Heart,  title: 'Developer-first',     desc: 'Every detail — from the OpenAI-compatible endpoint to the live dashboard — built by a dev, for devs.' },
  { icon: Globe,  title: 'Made for India',      desc: 'Pay in INR via UPI. No forex fees, no enterprise lock-in. Just build what you want, when you want.' },
];

const STACK = ['FastAPI', 'React', 'PostgreSQL', 'Redis', 'LiteLLM', 'Docker', 'Framer Motion', 'Tailwind CSS'];

export default function AboutUs() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ paddingTop: '120px', paddingBottom: '80px', paddingLeft: '20px', paddingRight: '20px' }}>
        <div className="max-w-3xl mx-auto">
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show">
            <motion.p variants={fadeUp} className="eyebrow mb-5">Our Story</motion.p>
            <motion.h1
              variants={fadeUp}
              style={{ fontSize: 'clamp(2.2rem,5vw,3.8rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', lineHeight: 1.1, marginBottom: '24px' }}
            >
              Making AI accessible<br />for every developer.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="prose-width"
              style={{ color: 'var(--c-text-2)', fontSize: '1.05rem', lineHeight: 1.75 }}
            >
              AIRent was born from frustration. Every time I needed to prototype with a frontier model,
              I hit rate limits, billing delays, or annual contracts. So I built the tool I always wanted —
              a marketplace to rent AI API access by the hour.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Stats — horizontal rule style, not cards */}
      <section style={{ borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface)', padding: '48px 20px' }}>
        <motion.div
          variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
          className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {STATS.map(s => (
            <motion.div key={s.label} variants={scaleIn} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', marginBottom: '6px' }}>{s.value}</div>
              <div style={{ color: 'var(--c-text-3)', fontSize: '0.825rem' }}>{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Mission */}
      <section style={{ padding: '96px 20px', background: 'var(--c-bg)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport} className="grid md:grid-cols-2 gap-16 items-start">
            <motion.div variants={fadeLeft}>
              <p className="eyebrow mb-5">Mission</p>
              <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)', lineHeight: 1.2, marginBottom: '24px' }}>
                AI shouldn't need<br />a corporate budget.
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Independent developers, students, and small teams deserve the same access to frontier models as Fortune 500 companies.',
                  'AIRent flips the model. Instead of paying for what you might use, you pay for exactly what you do use — in a time window you control.',
                  'I handle billing complexity, provider rate-limiting, fallback routing, and cost protection so you can focus on shipping.',
                ].map((p, i) => (
                  <p key={i} className="prose-width" style={{ color: 'var(--c-text-2)', fontSize: '0.925rem', lineHeight: 1.75 }}>{p}</p>
                ))}
              </div>
            </motion.div>

            {/* Values — list, not card grid */}
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

      {/* Founder */}
      <section style={{ padding: '96px 20px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} style={{ marginBottom: '48px' }}>
            <p className="eyebrow mb-4">The team</p>
            <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--c-text)' }}>One person. Big mission.</h2>
          </motion.div>

          <motion.div variants={scaleIn} initial="hidden" whileInView="show" viewport={viewport}>
            <div
              className="card"
              style={{ maxWidth: '400px', padding: '32px', textAlign: 'center' }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'var(--c-raised)', border: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.8rem', fontWeight: 800, color: 'var(--c-text)' }}>
                D
              </div>
              <h3 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>Deepanshu Sharma</h3>
              <p style={{ color: 'var(--c-accent)', fontSize: '0.825rem', fontWeight: 600, marginBottom: '16px' }}>Founder & Solo Developer</p>
              <p className="prose-width mx-auto" style={{ color: 'var(--c-text-3)', fontSize: '0.825rem', lineHeight: 1.7, marginBottom: '20px' }}>
                Built the entire stack — backend, frontend, payments, and infrastructure —
                driven by one goal: making frontier AI affordable for every developer.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '20px' }}>
                {['FastAPI', 'React', 'PostgreSQL', 'Redis', 'Docker'].map(tech => (
                  <span key={tech} style={{ padding: '3px 10px', borderRadius: '4px', background: 'var(--c-raised)', border: '1px solid var(--c-border)', color: 'var(--c-text-3)', fontSize: '0.75rem' }}>
                    {tech}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
        </div>
      </section>

      {/* Tech stack */}
      <section style={{ padding: '80px 20px', background: 'var(--c-bg)' }}>
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
            <p className="eyebrow mb-4">Tech stack</p>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--c-text)', marginBottom: '8px' }}>Built on modern open-source</h2>
            <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem', marginBottom: '28px' }}>Production-tested, open-source stack from top to bottom.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {STACK.map(tech => (
                <span
                  key={tech}
                  style={{ padding: '6px 14px', borderRadius: '6px', background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text-2)', fontSize: '0.875rem', cursor: 'default', transition: 'border-color 150ms, color 150ms' }}
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
