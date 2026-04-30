import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Heart, Code2, Globe, Github } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeLeft, fadeRight, scaleIn, staggerContainer, viewport } from '../lib/motion';

const STATS = [
  { value: '₹0',    label: 'Hidden fees',      color: '#34d399' },
  { value: '3',     label: 'AI providers',      color: '#38bdf8' },
  { value: '99.9%', label: 'Uptime target',     color: '#a78bfa' },
  { value: '∞',     label: 'Passion for devs',  color: '#f472b6' },
];

const VALUES = [
  { icon: Zap,    color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  title: 'Speed first',         desc: 'Your key arrives before you finish your coffee. Activation takes under 10 seconds.' },
  { icon: Shield, color: '#34d399', bg: 'rgba(52,211,153,0.08)',  title: 'Security by default', desc: 'IP-pinned keys, PII masking, prompt safety — on every single request, always.' },
  { icon: Heart,  color: '#f472b6', bg: 'rgba(244,114,182,0.08)', title: 'Dev-first design',    desc: 'Every detail — from the OpenAI-compatible endpoint to the live dashboard — built by a dev for devs.' },
  { icon: Globe,  color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  title: 'Made for India',      desc: 'Pay in INR via UPI. No forex fees, no enterprise lock-in. Just build what you want.' },
];

const STACK = ['FastAPI', 'React', 'PostgreSQL', 'Redis', 'LiteLLM', 'Docker', 'Framer Motion', 'Tailwind CSS'];

export default function AboutUs() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-20 px-5 text-center mesh-hero">
        <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show" className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} className="mb-6 flex justify-center">
            <span className="label-pill">Our Story</span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="text-[clamp(2.2rem,5vw,4rem)] font-black text-[#f0eefa] leading-tight tracking-tight mb-6"
          >
            Making AI accessible<br />
            <span className="gradient-text">for every developer</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-[#8e8ca4] text-base leading-relaxed max-w-2xl mx-auto">
            AIRent was born out of frustration. Every time I needed to prototype with a frontier model,
            I hit rate limits, billing delays, or annual contracts. So I built the tool I always wanted —
            a marketplace to rent AI API access by the hour.
          </motion.p>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-14 px-5" style={{ background: 'var(--bg-surface)', borderTop: '1px solid rgba(255,255,255,0.055)', borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
        <motion.div
          variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
          className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {STATS.map(s => (
            <motion.div key={s.label} variants={scaleIn} className="text-center">
              <div className="text-4xl md:text-5xl font-black mb-2" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[#52505f] text-sm">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Mission */}
      <section className="py-24 px-5" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer(0.12)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid md:grid-cols-2 gap-14 items-start"
          >
            <motion.div variants={fadeLeft}>
              <span className="label-pill mb-6 inline-flex">Mission</span>
              <h2 className="text-[clamp(1.7rem,3vw,2.5rem)] font-bold text-[#f0eefa] mb-6 leading-tight tracking-tight">
                AI shouldn't require<br />
                <span className="gradient-text">a corporate budget</span>
              </h2>
              <div className="space-y-4 text-[#8e8ca4] text-sm leading-relaxed">
                <p>Independent developers, students, researchers, and small teams deserve the same access to frontier models as Fortune 500 companies.</p>
                <p>AIRent flips the model. Instead of paying for what you <em>might</em> use, you pay for exactly what you <em>do</em> use — in a window you control.</p>
                <p>I handle the billing complexity, provider rate-limiting, fallback routing, and cost protection so you can focus on shipping.</p>
              </div>
            </motion.div>

            <motion.div variants={fadeRight} className="grid grid-cols-2 gap-3">
              {VALUES.map(v => (
                <div
                  key={v.title}
                  className="p-5 rounded-2xl transition-all duration-200"
                  style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3.5" style={{ background: v.bg }}>
                    <v.icon className="w-4 h-4" style={{ color: v.color }} />
                  </div>
                  <h4 className="text-[#f0eefa] font-semibold text-sm mb-1.5">{v.title}</h4>
                  <p className="text-[#52505f] text-xs leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Founder */}
      <section className="py-24 px-5" style={{ background: 'var(--bg-surface)', borderTop: '1px solid rgba(255,255,255,0.055)', borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} className="text-center mb-14">
            <span className="label-pill mb-5 inline-flex">The team</span>
            <h2 className="text-[clamp(1.7rem,3vw,2.5rem)] font-bold text-[#f0eefa] tracking-tight">One person. Big mission.</h2>
          </motion.div>

          <motion.div variants={scaleIn} initial="hidden" whileInView="show" viewport={viewport} className="max-w-sm mx-auto">
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            >
              <div
                className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center text-white font-black text-4xl"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}
              >D</div>
              <h3 className="text-[#f0eefa] font-bold text-xl mb-1">Deepanshu Sharma</h3>
              <p className="text-violet-400 text-sm font-medium mb-5">Founder & Solo Developer</p>
              <p className="text-[#52505f] text-sm leading-relaxed mb-6">
                Built the entire stack — backend APIs, frontend UI, payments, and infrastructure —
                driven by one goal: making frontier AI affordable for every developer.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {['FastAPI', 'React', 'PostgreSQL', 'Redis', 'Docker'].map(tech => (
                  <span key={tech} className="px-2.5 py-1 text-xs rounded-lg text-[#52505f]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {tech}
                  </span>
                ))}
              </div>
              <a
                href="https://github.com/deepanshusharma007" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 16px rgba(124,58,237,0.25)' }}
              >
                <Github className="w-4 h-4" /> GitHub Profile
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-20 px-5" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
            <Code2 className="w-8 h-8 text-violet-500 mx-auto mb-5" />
            <h2 className="text-2xl font-bold text-[#f0eefa] mb-2 tracking-tight">Built on modern open-source</h2>
            <p className="text-[#52505f] text-sm mb-8">Production-tested, open-source stack from top to bottom.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {STACK.map(tech => (
                <span
                  key={tech}
                  className="px-4 py-2 text-sm rounded-xl text-[#8e8ca4] hover:text-[#f0eefa] transition-colors cursor-default"
                  style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
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
