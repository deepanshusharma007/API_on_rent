import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, HelpCircle, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { marketplaceAPI, providersAPI } from '../api/client';
import { fadeUp, scaleIn, staggerContainer, viewport } from '../lib/motion';
import { getProviderMeta, PROVIDER_META } from '../lib/providerMeta.jsx';

const INCLUSIONS = [
  'All supported AI models',
  'Real-time token dashboard',
  'OpenAI-compatible endpoint',
  'Semantic response caching',
  'IP-pinned key security',
  'PII masking on all prompts',
  'HTML invoice & receipt',
  'Email delivery of your key',
];

const FAQS = [
  { q: 'Can I switch models within one rental?', a: "Yes — each plan gives access to all active AI providers. Your virtual key works with OpenAI, Gemini, and Anthropic models for the duration you chose." },
  { q: 'What if my tokens run out before the time expires?', a: 'Your key stops accepting requests. Buy a new plan instantly — it activates as a separate rental alongside your existing one.' },
  { q: 'Is there a free trial?', a: 'Sign up free and explore the dashboard. Full API access requires a paid plan.' },
  { q: 'Do unused tokens roll over?', a: 'No — both token balance and rental window expire at the end of the period. No rollovers.' },
  { q: 'How do drain rates work?', a: 'Expensive models consume tokens faster. A 10x model burns through the same token plan 10x quicker than a 1x model — giving you fewer but more powerful calls.' },
];

// ── Sliding provider card ─────────────────────────────────────────────────────
function ProviderSlide({ providerKey, tagline }) {
  const meta = getProviderMeta(providerKey);
  const { Logo, logoColor, name, bg, border, glow, accent } = meta;
  return (
    <div className={`flex-shrink-0 mx-3 w-56 p-6 rounded-2xl border ${bg} ${border} ${glow} backdrop-blur-xl flex flex-col items-center text-center`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bg} border ${border} mb-4`}>
        <Logo className={`w-8 h-8 ${logoColor}`} />
      </div>
      <div className="text-white font-bold text-base mb-1">{name || providerKey}</div>
      <div className={`text-xs ${accent} mb-4`}>{tagline}</div>
      <div className={`text-xs font-semibold ${accent} flex items-center gap-1.5`}>
        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        Available on Marketplace
      </div>
    </div>
  );
}

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [activeProviders, setActiveProviders] = useState([]);

  useEffect(() => {
    Promise.all([marketplaceAPI.getPlans(), providersAPI.getActiveProviders()])
      .then(([plansRes, providersRes]) => {
        setPlans(plansRes.data);
        setActiveProviders(providersRes.data.providers || []);
      })
      .catch(() => {});
  }, []);

  // For marquee: show active providers with logo/branding
  const slideProviders = activeProviders.length > 0 ? activeProviders : Object.keys(PROVIDER_META);
  const slideItems = [...slideProviders, ...slideProviders, ...slideProviders];

  // Build taglines for marquee from plans
  const providerTaglines = {};

  return (
    <div className="min-h-screen flex flex-col bg-[#07070f]">
      <Navbar />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 px-5 text-center overflow-hidden">
        <div className="blob-1 top-[-80px] left-1/2 -translate-x-1/2 opacity-60" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <motion.div
          variants={staggerContainer(0.1)} initial="hidden" animate="show"
          className="relative max-w-2xl mx-auto"
        >
          <motion.p variants={fadeUp}
            className="text-violet-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Transparent Pricing
          </motion.p>
          <motion.h1 variants={fadeUp}
            className="text-5xl md:text-7xl font-black text-white leading-tight mb-5">
            Pay for what{' '}
            <span className="gradient-text">you use</span>
          </motion.h1>
          <motion.p variants={fadeUp}
            className="text-gray-400 text-xl leading-relaxed mb-8">
            One-time payments. No subscriptions. Pick a provider, pick a duration — get instant API access.
          </motion.p>
          <motion.div variants={fadeUp}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Link to="/marketplace"
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/30 hover:from-violet-500 hover:to-fuchsia-500 transition-all text-base">
                <ShoppingBag className="w-5 h-5" />
                Browse &amp; Buy on Marketplace
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
          <motion.p variants={fadeUp} className="text-gray-700 text-xs mt-5">
            Powered by Cashfree · All major payment methods · Prices in INR
          </motion.p>
        </motion.div>
      </section>

      {/* ── Sliding provider strip ─────────────────────────────────────────── */}
      <section className="py-14 overflow-hidden relative">
        <div className="blob-2 top-0 left-1/2 -translate-x-1/2 opacity-30" />
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
          className="text-center mb-8 relative"
        >
          <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-2">Supported Providers</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            World-class AI, <span className="gradient-text">on demand</span>
          </h2>
          <p className="text-gray-500 text-sm mt-3 max-w-md mx-auto">
            Rent API access from the top three AI providers — no accounts, no API keys of your own needed.
          </p>
        </motion.div>

        {/* Marquee */}
        <div className="marquee-wrapper py-3">
          <div className="marquee-track">
            {slideItems.map((pid, i) => (
              <ProviderSlide key={`${pid}-${i}`} providerKey={pid} tagline={providerTaglines[pid] || ''} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Duration pricing cards ─────────────────────────────────────────── */}
      <section className="py-16 px-5">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
            className="text-center mb-12">
            <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-2">Simple Pricing</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Choose your duration</h2>
            <p className="text-gray-500 text-sm max-w-lg mx-auto">
              One plan gives access to all active AI models. Expensive models consume tokens faster — that's it.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {plans.length === 0
              ? [
                  { label: '15 min', emoji: '⚡', price: '~$0.99', tokens: '50K', desc: 'Quick test' },
                  { label: '30 min', emoji: '🕐', price: '~$1.99', tokens: '100K', desc: 'Short session' },
                  { label: '1 hour', emoji: '🌙', price: '~$3.99', tokens: '200K', desc: 'Work session', popular: true },
                  { label: '1 day',  emoji: '☀️', price: '~$24.99', tokens: '2M',  desc: 'Full day access' },
                ].map(tier => (
                  <motion.div key={tier.label} variants={scaleIn} whileHover={{ y: -6 }}
                    className="relative p-7 rounded-2xl border glass-card border-violet-500/20 flex flex-col">
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                        Most Popular
                      </div>
                    )}
                    <div className="text-3xl mb-3">{tier.emoji}</div>
                    <div className="text-white font-black text-xl mb-1">{tier.label}</div>
                    <div className="text-gray-500 text-xs mb-4">{tier.desc}</div>
                    <div className="text-3xl font-black text-white mb-0.5">{tier.price}</div>
                    <div className="text-gray-600 text-xs mb-5">one-time · {tier.tokens} tokens</div>
                    <div className="flex-1" />
                    <div className="text-xs text-violet-400 flex items-center gap-1.5 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />Buy on Marketplace
                    </div>
                  </motion.div>
                ))
              : plans.map(plan => {
                  const emojis = { 15: '⚡', 30: '🕐', 60: '🌙', 1440: '☀️' };
                  const descs  = { 15: 'Quick test', 30: 'Short session', 60: 'Work session', 1440: 'Full day access' };
                  const emoji  = emojis[plan.duration_minutes] || '⏱️';
                  const desc   = descs[plan.duration_minutes] || '';
                  const popular = plan.duration_minutes === 60;
                  return (
                    <motion.div key={plan.id} variants={scaleIn} whileHover={{ y: -6 }}
                      className={`relative p-7 rounded-2xl border flex flex-col ${popular ? 'bg-violet-500/10 border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.15)]' : 'glass-card border-white/[0.08]'}`}>
                      {popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                          Most Popular
                        </div>
                      )}
                      <div className="text-3xl mb-3">{emoji}</div>
                      <div className="text-white font-black text-xl mb-1">{plan.duration_label || `${plan.duration_minutes} min`}</div>
                      <div className="text-gray-500 text-xs mb-4">{desc}</div>
                      <div className="text-3xl font-black text-white mb-0.5">${plan.price}</div>
                      <div className="text-gray-600 text-xs mb-5">one-time · {plan.token_cap >= 1_000_000 ? `${(plan.token_cap/1_000_000).toFixed(1)}M` : `${(plan.token_cap/1000).toFixed(0)}K`} tokens</div>
                      <div className="flex-1" />
                      <div className={`text-xs flex items-center gap-1.5 font-medium ${popular ? 'text-violet-400' : 'text-gray-500'}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />Buy on Marketplace
                      </div>
                    </motion.div>
                  );
                })
            }
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
            className="flex flex-col items-center mt-10 gap-3">
            <p className="text-gray-600 text-sm text-center max-w-sm">
              All plans include access to every active AI provider. Select a duration on the Marketplace to buy.
            </p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/marketplace"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-fuchsia-500 transition-all">
                <ShoppingBag className="w-4 h-4" />Go to Marketplace<ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── What's included ────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-white/[0.015] border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
            className="text-center mb-10">
            <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-2">Every Plan Includes</p>
            <h2 className="text-3xl font-black text-white">Everything you need</h2>
          </motion.div>
          <motion.div
            variants={staggerContainer(0.07)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
          >
            {INCLUSIONS.map(item => (
              <motion.div key={item} variants={scaleIn}
                className="flex items-start gap-3 p-4 glass-card border border-white/[0.06] rounded-xl">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-2xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
            className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-3">Common questions</h2>
          </motion.div>
          <motion.div
            variants={staggerContainer(0.08)} initial="hidden" whileInView="show" viewport={viewport}
            className="space-y-3"
          >
            {FAQS.map((item, i) => (
              <motion.div key={i} variants={fadeUp}
                className="p-5 glass-card rounded-xl border border-white/[0.06]">
                <div className="flex gap-3">
                  <HelpCircle className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium text-sm mb-1.5">{item.q}</p>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
            className="text-center mt-6">
            <Link to="/faq" className="text-violet-400 hover:text-violet-300 text-sm transition-colors">
              View all FAQs →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Enterprise CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-white/[0.015] border-t border-white/[0.05]">
        <motion.div
          variants={scaleIn} initial="hidden" whileInView="show" viewport={viewport}
          className="max-w-2xl mx-auto text-center p-12 rounded-3xl relative overflow-hidden glass-card border border-violet-500/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-purple-600/5 to-fuchsia-600/10" />
          <div className="blob-3 top-0 right-0 opacity-50" />
          <div className="relative">
            <h2 className="text-2xl font-black text-white mb-3">Need a custom plan?</h2>
            <p className="text-gray-400 mb-7">High-volume usage, team access, or white-label integration? Let's talk.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link to="/contact"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-violet-500/25">
                  Talk to us <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link to="/marketplace"
                  className="inline-flex items-center gap-2 px-7 py-3.5 glass-card border border-white/[0.10] text-gray-300 hover:text-white font-semibold rounded-xl transition-all">
                  <ShoppingBag className="w-4 h-4" /> Browse Plans
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
