import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Zap, Shield, Clock, Code2, ArrowRight,
  Globe, Server, TrendingUp, Lock, RefreshCcw, Cpu,
  Sparkles, Terminal, BarChart3, Layers, CheckCircle2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeLeft, fadeRight, staggerContainer, scaleIn, viewport } from '../lib/motion';

const FEATURES = [
  { icon: Zap,        color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',   title: 'Instant Access',      desc: 'Virtual API key in your dashboard seconds after payment. No approvals, no KYC.' },
  { icon: Shield,     color: '#34d399', bg: 'rgba(52,211,153,0.08)',   title: 'Secure & Isolated',   desc: 'IP-pinned keys, PII masking, prompt safety filters and AI pre-scan on every call.' },
  { icon: Clock,      color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',   title: 'Time-bound Plans',    desc: 'Pay for a window — 15 min to 24 hours. Keys auto-expire, zero cleanup needed.' },
  { icon: Code2,      color: '#a78bfa', bg: 'rgba(167,139,250,0.08)',  title: 'OpenAI-Compatible',   desc: 'Drop your virtual key into any OpenAI SDK. Zero code changes, any language.' },
  { icon: Globe,      color: '#f472b6', bg: 'rgba(244,114,182,0.08)',  title: 'Multi-Model',         desc: 'GPT-4o · Claude 3.5 · Gemini 1.5 Pro — all on one key, switch with one param.' },
  { icon: BarChart3,  color: '#fb923c', bg: 'rgba(251,146,60,0.08)',   title: 'Live Analytics',      desc: 'Token usage, cache hit rate and estimated cost tracked in real time.' },
  { icon: RefreshCcw, color: '#2dd4bf', bg: 'rgba(45,212,191,0.08)',   title: 'Semantic Caching',    desc: 'Similar prompts return cached responses — saving up to 40% of your balance.' },
  { icon: Layers,     color: '#818cf8', bg: 'rgba(129,140,248,0.08)',  title: 'Auto Fallback',       desc: 'If one provider is down we re-route instantly. You never see a failure.' },
  { icon: Lock,       color: '#f87171', bg: 'rgba(248,113,113,0.08)',  title: 'Cost Protection',     desc: 'Hard spending limits and circuit breakers prevent any surprise overages.' },
];

const STEPS = [
  { n: '01', title: 'Pick a plan',    desc: 'Choose a token cap and rental window that fits your project.' },
  { n: '02', title: 'Pay securely',   desc: 'One-time via Cashfree — UPI, cards, net banking, wallets.' },
  { n: '03', title: 'Get your key',   desc: 'Virtual API key in your dashboard & email within seconds.' },
  { n: '04', title: 'Start building', desc: 'Drop it into any OpenAI SDK. Tokens tracked in real time.' },
];

const MODELS = ['GPT-4o', 'Claude 3.5', 'Gemini 1.5 Pro', 'GPT-4o mini', 'Gemini Flash', 'Claude Haiku'];

const CODE_LINES = [
  { text: 'import openai',                                              type: 'keyword' },
  { text: '',                                                           type: 'blank'   },
  { text: 'client = openai.OpenAI(',                                   type: 'default' },
  { text: '  api_key="airent_sk_xxxxxxxxxxxx",',                       type: 'string'  },
  { text: '  base_url="https://api.airent.dev/v1"',                    type: 'string'  },
  { text: ')',                                                          type: 'default' },
  { text: '',                                                           type: 'blank'   },
  { text: 'response = client.chat.completions.create(',                type: 'default' },
  { text: '  model="gpt-4o",',                                         type: 'string'  },
  { text: '  messages=[{"role": "user", "content": "Hello!"}]',        type: 'string'  },
  { text: ')',                                                          type: 'default' },
  { text: 'print(response.choices[0].message.content)',                type: 'keyword' },
];

const lineColor = (type) => {
  if (type === 'keyword') return '#a78bfa';
  if (type === 'string')  return '#34d399';
  if (type === 'blank')   return 'transparent';
  return '#c4c0d8';
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const heroY       = useTransform(scrollY, [0, 500], [0, 50]);
  const heroOpacity = useTransform(scrollY, [0, 380], [1, 0]);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: 'var(--bg-base)' }}>
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-5 overflow-hidden mesh-hero">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        {/* Side glow orbs */}
        <div className="absolute top-1/3 -left-32 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />
        <div className="absolute top-1/4 -right-32 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)' }} />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-5xl mx-auto text-center pt-28 pb-20 z-10"
        >
          {/* Badge */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-8 flex justify-center">
            <span className="label-pill">
              <Sparkles className="w-3 h-3" />
              GPT-4o · Claude 3.5 · Gemini — all on one virtual key
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: 0.08 }}
            className="text-[clamp(2.8rem,7vw,5.5rem)] font-black leading-[1.06] tracking-[-0.03em] text-[#f0eefa] mb-6"
          >
            Rent AI APIs<br />
            <span className="gradient-text">by the hour.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: 0.16 }}
            className="text-[clamp(1rem,2vw,1.2rem)] text-[#8e8ca4] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            No annual subscriptions. No credit-card hoops. Purchase a time-bound virtual key,
            pick any AI model, and pay only for what you actually use.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: 0.24 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-14"
          >
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(124,58,237,0.45)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/register')}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-white font-semibold rounded-xl text-sm"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 24px rgba(124,58,237,0.3)' }}
            >
              Start building free <ArrowRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/pricing')}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-[#8e8ca4] hover:text-[#f0eefa] font-semibold rounded-xl text-sm transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
            >
              View pricing
            </motion.button>
          </motion.div>

          {/* Trust chips */}
          <motion.div
            variants={staggerContainer(0.06, 0.32)} initial="hidden" animate="show"
            className="flex flex-wrap justify-center gap-3"
          >
            {['No subscription', 'Instant key', 'Pay in INR', 'OpenAI compatible'].map(t => (
              <motion.div
                key={t} variants={fadeUp}
                className="inline-flex items-center gap-1.5 text-xs text-[#52505f]"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
                {t}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-5 h-8 rounded-full flex items-start justify-center pt-1.5" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-1 h-2 rounded-full bg-violet-500 opacity-80" />
          </div>
        </motion.div>
      </section>

      {/* ── MODEL MARQUEE ─────────────────────────────────────────────── */}
      <div className="py-6 overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.055)', borderBottom: '1px solid rgba(255,255,255,0.055)', background: 'var(--bg-surface)' }}>
        <div className="flex overflow-hidden gap-0">
          <div className="marquee-track gap-10 px-5">
            {[...MODELS, ...MODELS].map((m, i) => (
              <span key={i} className="text-sm font-medium whitespace-nowrap px-6 text-[#52505f] flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 opacity-60 shrink-0" />
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── CODE PREVIEW ──────────────────────────────────────────────── */}
      <section className="py-24 px-5" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer(0.12)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid md:grid-cols-2 gap-14 items-center"
          >
            <motion.div variants={fadeLeft}>
              <span className="label-pill mb-5 inline-flex">
                <Terminal className="w-3 h-3" /> Drop-in replacement
              </span>
              <h2 className="text-[clamp(1.7rem,3.5vw,2.6rem)] font-bold text-[#f0eefa] mb-5 leading-tight tracking-tight">
                Zero code changes.<br />
                <span className="gradient-text">Just swap the key.</span>
              </h2>
              <p className="text-[#8e8ca4] leading-relaxed mb-8 text-sm">
                AIRent is 100% OpenAI SDK-compatible. Change two lines — the key and base URL —
                and you're accessing GPT-4o, Claude, or Gemini instantly.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors group"
              >
                Try it free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>

            {/* Code block */}
            <motion.div variants={fadeRight}>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.1)' }}
              >
                {/* Title bar */}
                <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 text-[#52505f] text-xs font-mono">quickstart.py</span>
                </div>
                {/* Code */}
                <div className="p-5 overflow-x-auto">
                  {CODE_LINES.map((line, i) => (
                    <div key={i} className="flex gap-4 font-mono text-xs leading-6">
                      <span className="select-none w-5 text-right shrink-0 text-[#2e2c3a]">{line.type !== 'blank' ? i + 1 : ''}</span>
                      <span style={{ color: lineColor(line.type) }}>{line.text || ' '}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="py-24 px-5" style={{ background: 'var(--bg-surface)', borderTop: '1px solid rgba(255,255,255,0.055)', borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} className="text-center mb-16">
            <span className="label-pill mb-5 inline-flex">Simple process</span>
            <h2 className="text-[clamp(1.7rem,3.5vw,2.6rem)] font-bold text-[#f0eefa] mb-4 tracking-tight">
              Up and running in <span className="gradient-text">3 minutes</span>
            </h2>
            <p className="text-[#8e8ca4] text-sm">From signup to your first AI response.</p>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {STEPS.map((s, i) => (
              <motion.div key={s.n} variants={scaleIn} className="relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-9 left-[calc(50%+44px)] right-[-16%] h-px"
                    style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.3), rgba(124,58,237,0.05))' }}
                  />
                )}
                <div
                  className="p-6 rounded-2xl h-full transition-all duration-200 group cursor-default"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}
                  >
                    <span className="text-violet-400 font-black text-xs">{s.n}</span>
                  </div>
                  <h3 className="text-[#f0eefa] font-semibold mb-2 text-sm">{s.title}</h3>
                  <p className="text-[#52505f] text-xs leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section className="py-24 px-5" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} className="text-center mb-16">
            <span className="label-pill mb-5 inline-flex">Built right</span>
            <h2 className="text-[clamp(1.7rem,3.5vw,2.6rem)] font-bold text-[#f0eefa] mb-4 tracking-tight">
              Enterprise infra,<br />
              <span className="gradient-text">indie-dev pricing.</span>
            </h2>
            <p className="text-[#8e8ca4] text-sm max-w-md mx-auto">
              Every feature that big teams pay thousands for — available to you for a few rupees.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.06)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {FEATURES.map(f => (
              <motion.div
                key={f.title} variants={fadeUp}
                className="p-5 rounded-2xl cursor-default group transition-all duration-200"
                style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.055)' }}
                whileHover={{ borderColor: 'rgba(255,255,255,0.11)', y: -2 }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: f.bg }}
                >
                  <f.icon className="w-4 h-4" style={{ color: f.color }} />
                </div>
                <h3 className="text-[#f0eefa] font-semibold text-sm mb-1.5">{f.title}</h3>
                <p className="text-[#52505f] text-xs leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-5 mesh-cta" style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}>
            <motion.h2 variants={fadeUp} className="text-[clamp(2rem,4vw,3rem)] font-black text-[#f0eefa] mb-4 tracking-tight leading-tight">
              Ready to ship<br />something great?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#8e8ca4] text-sm mb-10 max-w-md mx-auto leading-relaxed">
              Sign up in 30 seconds. No credit card required. Your first API call is minutes away.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(124,58,237,0.45)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/register')}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-white font-semibold rounded-xl text-sm"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 24px rgba(124,58,237,0.25)' }}
              >
                Get your API key <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/marketplace')}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-[#8e8ca4] hover:text-[#f0eefa] font-semibold rounded-xl text-sm transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
              >
                Browse marketplace
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
