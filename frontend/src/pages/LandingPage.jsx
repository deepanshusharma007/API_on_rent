import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Zap, Shield, Clock, Code2, ArrowRight,
  Globe, Server, TrendingUp, Lock, RefreshCcw, Cpu,
  Sparkles, Terminal, BarChart3, Layers
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeIn, fadeLeft, fadeRight, staggerContainer, scaleIn, viewport } from '../lib/motion';

/* ─── Features ──────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Zap,         color: 'from-yellow-500/20 to-yellow-500/5',  border: 'hover:border-yellow-500/30', iconColor: 'text-yellow-400', title: 'Instant Access',          desc: 'API key delivered in seconds after payment. No waiting, no approvals, no KYC.' },
  { icon: Shield,      color: 'from-emerald-500/20 to-emerald-500/5', border: 'hover:border-emerald-500/30', iconColor: 'text-emerald-400', title: 'Secure & Isolated',       desc: 'IP-pinned keys, PII masking, prompt safety filters, and AI pre-scan on every request.' },
  { icon: Clock,       color: 'from-sky-500/20 to-sky-500/5',         border: 'hover:border-sky-500/30',     iconColor: 'text-sky-400',     title: 'Time-bound Plans',        desc: 'Pay for a rental window — 15 min to 7 days. Keys auto-expire, zero cleanup needed.' },
  { icon: Code2,       color: 'from-violet-500/20 to-violet-500/5',   border: 'hover:border-violet-500/30',  iconColor: 'text-violet-400',  title: 'OpenAI-Compatible',       desc: 'Drop in your virtual key to any OpenAI SDK. No code changes whatsoever.' },
  { icon: Globe,       color: 'from-pink-500/20 to-pink-500/5',       border: 'hover:border-pink-500/30',    iconColor: 'text-pink-400',    title: 'Multi-Model',             desc: 'GPT-4o, Claude 3.5, Gemini 1.5 Pro — switch models with one parameter.' },
  { icon: BarChart3,   color: 'from-orange-500/20 to-orange-500/5',   border: 'hover:border-orange-500/30',  iconColor: 'text-orange-400',  title: 'Real-time Analytics',     desc: 'Token usage, cache hit rate, and cost tracked live in your dashboard.' },
  { icon: RefreshCcw,  color: 'from-teal-500/20 to-teal-500/5',       border: 'hover:border-teal-500/30',    iconColor: 'text-teal-400',    title: 'Semantic Caching',        desc: 'Similar prompts return cached responses — saving up to 40% of your token balance.' },
  { icon: Layers,      color: 'from-indigo-500/20 to-indigo-500/5',   border: 'hover:border-indigo-500/30',  iconColor: 'text-indigo-400',  title: 'Provider Fallback',       desc: 'If one AI provider is down we auto-route to the next. You never see an outage.' },
  { icon: Lock,        color: 'from-rose-500/20 to-rose-500/5',       border: 'hover:border-rose-500/30',    iconColor: 'text-rose-400',    title: 'Cost Protection',         desc: 'Spending limits and circuit breakers prevent any unexpected overages.' },
];

/* ─── Steps ─────────────────────────────────────────────────────── */
const STEPS = [
  { n: '01', title: 'Pick a Plan',    desc: 'Choose a token cap and rental duration that fits your project.' },
  { n: '02', title: 'Pay Securely',   desc: 'One-time via Cashfree — UPI, cards, net banking, wallets.' },
  { n: '03', title: 'Get Your Key',   desc: 'A virtual API key is instantly shown in your dashboard and emailed to you.' },
  { n: '04', title: 'Start Building', desc: 'Use any OpenAI SDK with your virtual key. Tokens tracked in real time.' },
];

/* ─── Trust ─────────────────────────────────────────────────────── */
const TRUST = [
  { icon: Lock,       label: 'Cashfree Secured' },
  { icon: RefreshCcw, label: 'Semantic Caching' },
  { icon: Server,     label: '99.9% Uptime Target' },
  { icon: Shield,     label: 'AI Safety Filter' },
];

/* ─── Code snippet preview ──────────────────────────────────────── */
const CODE = `import openai

client = openai.OpenAI(
  api_key="airent_sk_xxxxxxxxxxxx",  # your virtual key
  base_url="https://api.airent.dev/v1"
)

response = client.chat.completions.create(
  model="gpt-4o",
  messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`;

/* ─── Pricing card ──────────────────────────────────────────────── */
/* ─── Main ──────────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 80]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <div className="min-h-screen flex flex-col bg-[#07070f] overflow-x-hidden">
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-5 overflow-hidden">
        {/* Background blobs */}
        <div className="blob-1 top-[-100px] left-[-100px]" />
        <div className="blob-2 top-[20%] right-[-80px]" />
        <div className="blob-3 bottom-[10%] left-[30%]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 grid-pattern opacity-40" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-5xl mx-auto text-center pt-24 pb-16"
        >
          {/* Badge */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="show"
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8 backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            GPT-4o · Claude 3.5 · Gemini — all on one virtual key
            <Sparkles className="w-4 h-4 animate-pulse" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[1.05] tracking-tight mb-6"
          >
            Rent AI APIs{' '}
            <br className="hidden sm:block" />
            <span className="shimmer-text">by the hour</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            No annual subscriptions. No credit-card hoops. Purchase a time-bound virtual API key,
            use any AI model, and pay only for what you actually need.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-14"
          >
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/register')}
              className="relative px-8 py-4 rounded-2xl font-bold text-white text-lg overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all group-hover:from-violet-500 group-hover:to-fuchsia-500" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10" />
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 blur-xl opacity-40 group-hover:opacity-70 transition-opacity -z-10" />
              <span className="relative flex items-center gap-2">
                Start building free <ArrowRight className="w-5 h-5" />
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/pricing')}
              className="px-8 py-4 rounded-2xl font-semibold text-white text-lg glass-card border border-white/[0.08] hover:border-white/20 transition-all"
            >
              View pricing
            </motion.button>
          </motion.div>

          {/* Trust bar */}
          <motion.div
            variants={staggerContainer(0.08, 0.4)} initial="hidden" animate="show"
            className="flex flex-wrap justify-center gap-5"
          >
            {TRUST.map(t => (
              <motion.div
                key={t.label} variants={fadeUp}
                className="flex items-center gap-2 text-sm text-gray-500"
              >
                <t.icon className="w-4 h-4 text-violet-400" />
                {t.label}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        >
          <span className="text-gray-600 text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-gray-600 to-transparent" />
        </motion.div>
      </section>

      {/* ── CODE PREVIEW ─────────────────────────────────────────── */}
      <section className="section-padding">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer(0.15)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid md:grid-cols-2 gap-10 items-center"
          >
            <motion.div variants={fadeLeft}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-5">
                <Terminal className="w-3.5 h-3.5" /> Drop-in replacement
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-5 leading-tight">
                Zero code changes.<br />
                <span className="gradient-text">Just swap the key.</span>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                AIRent is 100% compatible with the OpenAI SDK. Change two lines —
                the API key and base URL — and you're done. Works with Python, Node.js,
                cURL, or any HTTP client.
              </p>
              <Link to="/register" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Try it now <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Code block */}
            <motion.div variants={fadeRight} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0d0d1a]">
                {/* Mac-style top bar */}
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 text-gray-600 text-xs font-mono">quickstart.py</span>
                </div>
                <pre className="p-5 text-sm font-mono leading-relaxed overflow-x-auto text-gray-300">
                  {CODE.split('\n').map((line, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="select-none text-gray-700 w-5 text-right shrink-0 text-xs mt-0.5">{i + 1}</span>
                      <span className={
                        line.includes('#') ? 'text-gray-600' :
                        line.includes('import') || line.includes('print') ? 'text-violet-400' :
                        line.includes('"') || line.includes("'") ? 'text-emerald-300' :
                        line.includes('=') ? 'text-sky-300' :
                        'text-gray-300'
                      }>{line || ' '}</span>
                    </div>
                  ))}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="section-padding bg-white/[0.015] border-y border-white/[0.05] relative overflow-hidden">
        <div className="blob-2 top-0 right-0 opacity-50" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
            className="text-center mb-16"
          >
            <p className="text-violet-400 text-sm font-semibold tracking-widest uppercase mb-3">Simple process</p>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              Up and running in <span className="gradient-text">3 minutes</span>
            </h2>
            <p className="text-gray-500 text-lg">From signup to your first AI response.</p>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.12)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4"
          >
            {STEPS.map((s, i) => (
              <motion.div key={s.n} variants={scaleIn} className="relative group">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+44px)] right-[-20px] h-px">
                    <div className="h-full bg-gradient-to-r from-violet-500/40 to-transparent" />
                  </div>
                )}
                <div className="relative text-center p-6 rounded-2xl glass-card border border-white/[0.06] hover:border-violet-500/20 transition-all duration-300 group-hover:bg-white/[0.04]">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4 group-hover:from-violet-600/30 transition-all">
                    <span className="text-violet-400 font-black text-lg">{s.n}</span>
                  </div>
                  <h3 className="text-white font-bold mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="section-padding">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
            className="text-center mb-16"
          >
            <p className="text-violet-400 text-sm font-semibold tracking-widest uppercase mb-3">Built right</p>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              Everything you need,<br />
              <span className="gradient-text">nothing you don't</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Enterprise-grade infrastructure without the enterprise price tag.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.07)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {FEATURES.map(f => (
              <motion.div
                key={f.title} variants={fadeUp}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-2xl bg-gradient-to-br ${f.color} border border-white/[0.06] ${f.border} transition-all duration-300 cursor-default`}
              >
                <div className={`w-11 h-11 rounded-xl bg-white/[0.05] flex items-center justify-center mb-4 ${f.iconColor}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PRICING TEASER ───────────────────────────────────────── */}
      <section className="section-padding bg-white/[0.015] border-y border-white/[0.05] relative overflow-hidden">
        <div className="blob-1 bottom-[-200px] left-[-100px] opacity-40" />
        <div className="max-w-3xl mx-auto relative text-center">
          <motion.div
            variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
          >
            <motion.p variants={fadeUp} className="text-violet-400 text-sm font-semibold tracking-widest uppercase mb-3">Pricing</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-black text-white mb-4">
              Simple, <span className="gradient-text">transparent</span> pricing
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg mb-6">
              One-time payments per model and duration. No subscriptions. No hidden fees.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 justify-center mb-8">
              {['15 min', '1 hour', '6 hours', '24 hours'].map(d => (
                <span key={d} className="px-4 py-2 glass-card border border-white/[0.08] rounded-xl text-gray-400 text-sm">
                  {d}
                </span>
              ))}
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link to="/marketplace"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-fuchsia-500 transition-all">
                  Browse Marketplace <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link to="/pricing"
                  className="inline-flex items-center gap-2 px-7 py-3.5 glass-card border border-white/[0.10] text-gray-300 hover:text-white font-semibold rounded-xl transition-all">
                  View pricing details <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="section-padding">
        <div className="max-w-3xl mx-auto">
          <motion.div
            variants={scaleIn} initial="hidden" whileInView="show" viewport={viewport}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-purple-600/20 to-fuchsia-600/20" />
            <div className="absolute inset-0 grid-pattern opacity-30" />
            <div className="blob-2 top-[-50px] right-[-50px] opacity-60" />

            <div className="relative px-8 py-16 md:py-20 text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                className="text-5xl mb-5"
              >
                🚀
              </motion.div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                Ready to build?
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-lg mx-auto">
                Create your account in 30 seconds. No credit card required to sign up.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/register')}
                className="relative px-10 py-4 rounded-2xl font-bold text-white text-lg overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 group-hover:from-violet-500 group-hover:to-fuchsia-500 transition-all" />
                <div className="absolute -inset-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 blur-2xl opacity-50 group-hover:opacity-80 transition-opacity -z-10" />
                <span className="relative flex items-center gap-2 mx-auto w-fit">
                  Get your API key now <ArrowRight className="w-5 h-5" />
                </span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
