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
  { icon: Zap,         iconColor: 'text-yellow-400',  title: 'Instant Access',          desc: 'API key delivered in seconds after payment. No waiting, no approvals, no KYC.' },
  { icon: Shield,      iconColor: 'text-emerald-400',  title: 'Secure & Isolated',       desc: 'IP-pinned keys, PII masking, prompt safety filters, and AI pre-scan on every request.' },
  { icon: Clock,       iconColor: 'text-sky-400',      title: 'Time-bound Plans',        desc: 'Pay for a rental window — 15 min to 7 days. Keys auto-expire, zero cleanup needed.' },
  { icon: Code2,       iconColor: 'text-violet-400',   title: 'OpenAI-Compatible',       desc: 'Drop in your virtual key to any OpenAI SDK. No code changes whatsoever.' },
  { icon: Globe,       iconColor: 'text-pink-400',     title: 'Multi-Model',             desc: 'GPT-4o, Claude 3.5, Gemini 1.5 Pro — switch models with one parameter.' },
  { icon: BarChart3,   iconColor: 'text-orange-400',   title: 'Real-time Analytics',     desc: 'Token usage, cache hit rate, and cost tracked live in your dashboard.' },
  { icon: RefreshCcw,  iconColor: 'text-teal-400',     title: 'Semantic Caching',        desc: 'Similar prompts return cached responses — saving up to 40% of your token balance.' },
  { icon: Layers,      iconColor: 'text-indigo-400',   title: 'Provider Fallback',       desc: 'If one AI provider is down we auto-route to the next. You never see an outage.' },
  { icon: Lock,        iconColor: 'text-red-400',      title: 'Cost Protection',         desc: 'Spending limits and circuit breakers prevent any unexpected overages.' },
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

export default function LandingPage() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 60]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] overflow-x-hidden">
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-5 overflow-hidden">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-4xl mx-auto text-center pt-24 pb-16"
        >
          {/* Badge */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="show"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-sm font-medium mb-8"
          >
            <Sparkles className="w-3.5 h-3.5" />
            GPT-4o · Claude 3.5 · Gemini — all on one virtual key
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6"
          >
            Rent AI APIs{' '}
            <br className="hidden sm:block" />
            <span className="text-violet-400">by the hour</span>
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
            className="flex flex-col sm:flex-row gap-3 justify-center mb-14"
          >
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/register')}
              className="px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 justify-center"
            >
              Start building free <ArrowRight className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/pricing')}
              className="px-8 py-3.5 border border-white/[0.12] hover:bg-white/[0.04] text-gray-300 hover:text-white font-semibold rounded-lg transition-all"
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
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <t.icon className="w-4 h-4 text-gray-500" />
                {t.label}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        >
          <span className="text-gray-700 text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-6 bg-gradient-to-b from-gray-700 to-transparent" />
        </motion.div>
      </section>

      {/* ── CODE PREVIEW ─────────────────────────────────────────── */}
      <section className="section-padding border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer(0.15)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid md:grid-cols-2 gap-10 items-center"
          >
            <motion.div variants={fadeLeft}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-violet-500/20 bg-violet-500/5 text-violet-400 text-xs font-medium mb-4">
                <Terminal className="w-3.5 h-3.5" /> Drop-in replacement
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                Zero code changes.<br />
                <span className="text-violet-400">Just swap the key.</span>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                AIRent is 100% compatible with the OpenAI SDK. Change two lines —
                the API key and base URL — and you're done. Works with Python, Node.js,
                cURL, or any HTTP client.
              </p>
              <Link to="/register" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium transition-colors text-sm">
                Try it now <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Code block */}
            <motion.div variants={fadeRight}>
              <div className="rounded-lg overflow-hidden border border-white/[0.08] bg-[#111]">
                {/* Mac-style top bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  <span className="ml-3 text-gray-600 text-xs font-mono">quickstart.py</span>
                </div>
                <pre className="p-5 text-sm font-mono leading-relaxed overflow-x-auto text-gray-300">
                  {CODE.split('\n').map((line, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="select-none text-gray-700 w-5 text-right shrink-0 text-xs mt-0.5">{i + 1}</span>
                      <span className={
                        line.includes('#') ? 'text-gray-600' :
                        line.includes('import') || line.includes('print') ? 'text-violet-400' :
                        line.includes('"') || line.includes("'") ? 'text-emerald-400' :
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
      <section className="section-padding bg-[#111] border-y border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
            className="text-center mb-12"
          >
            <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-3">Simple process</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Up and running in <span className="text-violet-400">3 minutes</span>
            </h2>
            <p className="text-gray-500 text-base">From signup to your first AI response.</p>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.12)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            {STEPS.map((s, i) => (
              <motion.div key={s.n} variants={scaleIn} className="relative group">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+44px)] right-[-20px] h-px bg-white/[0.06]" />
                )}
                <div className="text-center p-5 rounded-lg bg-[#1a1a1a] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200">
                  <div className="w-14 h-14 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-violet-400 font-black text-sm">{s.n}</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2 text-sm">{s.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
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
            className="text-center mb-12"
          >
            <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-3">Built right</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Everything you need,<br />
              <span className="text-violet-400">nothing you don't</span>
            </h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
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
                className="p-5 rounded-lg bg-[#111] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-default"
              >
                <div className={`w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center mb-3 ${f.iconColor}`}>
                  <f.icon className="w-4 h-4" />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1.5">{f.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PRICING TEASER ───────────────────────────────────────── */}
      <section className="section-padding bg-[#111] border-y border-white/[0.05]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
          >
            <motion.p variants={fadeUp} className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-3">Pricing</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-white mb-3">
              Simple, <span className="text-violet-400">transparent</span> pricing
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-base mb-6">
              One-time payments per model and duration. No subscriptions. No hidden fees.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-2 justify-center mb-8">
              {['15 min', '1 hour', '6 hours', '24 hours'].map(d => (
                <span key={d} className="px-3 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-lg text-gray-400 text-sm">
                  {d}
                </span>
              ))}
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/marketplace"
                className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors">
                Browse Marketplace <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/[0.12] hover:bg-white/[0.04] text-gray-300 hover:text-white font-semibold rounded-lg transition-all">
                View pricing details <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="section-padding">
        <div className="max-w-3xl mx-auto">
          <motion.div
            variants={scaleIn} initial="hidden" whileInView="show" viewport={viewport}
            className="rounded-lg overflow-hidden border border-white/[0.08] bg-[#111]"
          >
            <div className="px-8 py-14 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Ready to build?
              </h2>
              <p className="text-gray-400 text-base mb-8 max-w-lg mx-auto">
                Create your account in 30 seconds. No credit card required to sign up.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/register')}
                className="px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
              >
                Get your API key now <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
