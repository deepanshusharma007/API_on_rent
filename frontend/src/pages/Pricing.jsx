import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, HelpCircle, ShoppingBag, Sparkles } from 'lucide-react';
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
  { q: 'Can I switch models within one rental?',             a: "Yes — each plan unlocks all active providers. Specify the model per-request." },
  { q: 'What if tokens run out before time expires?',         a: 'Your key pauses. Buy a new plan instantly — it activates alongside the existing one.' },
  { q: 'Is there a free trial?',                             a: 'Sign up free and explore the dashboard. API access requires a paid plan.' },
  { q: 'Do unused tokens roll over?',                        a: 'No — both token balance and rental window expire at end of the period. No rollovers.' },
  { q: 'How do drain rates work?',                           a: 'Expensive models consume tokens faster. GPT-4o costs 10× more credits than Gemini Flash per call.' },
];

function ProviderSlide({ providerKey }) {
  const meta = getProviderMeta(providerKey);
  const { Logo, logoColor, name, bg, border, accent } = meta;
  return (
    <div
      className="flex-shrink-0 mx-3 w-52 p-5 rounded-2xl flex flex-col items-center text-center"
      style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} border ${border} mb-3`}>
        <Logo className={`w-7 h-7 ${logoColor}`} />
      </div>
      <div className="text-[#f0eefa] font-semibold text-sm mb-1">{name || providerKey}</div>
      <div className={`text-xs ${accent} flex items-center gap-1.5 mt-1`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        Available
      </div>
    </div>
  );
}

const TIER_META = {
  15:   { emoji: '⚡', label: '15 min', desc: 'Quick prototype' },
  30:   { emoji: '🕐', label: '30 min', desc: 'Short session'   },
  60:   { emoji: '🌙', label: '1 hour', desc: 'Work session',  popular: true },
  1440: { emoji: '☀️', label: '24 hrs', desc: 'Full day access' },
};

const FALLBACK_TIERS = [
  { duration_minutes: 15,   price: '49',  token_cap: 20000 },
  { duration_minutes: 30,   price: '89',  token_cap: 40000 },
  { duration_minutes: 60,   price: '149', token_cap: 80000 },
  { duration_minutes: 1440, price: '499', token_cap: 1200000 },
];

export default function Pricing() {
  const [plans, setPlans]               = useState([]);
  const [activeProviders, setProviders] = useState([]);

  useEffect(() => {
    Promise.all([marketplaceAPI.getPlans(), providersAPI.getActiveProviders()])
      .then(([plansRes, providersRes]) => {
        setPlans(plansRes.data);
        setProviders(providersRes.data.providers || []);
      })
      .catch(() => {});
  }, []);

  const displayPlans   = plans.length > 0 ? plans : FALLBACK_TIERS;
  const slideProviders = activeProviders.length > 0 ? activeProviders : Object.keys(PROVIDER_META);
  const slideItems     = [...slideProviders, ...slideProviders, ...slideProviders];

  const formatTokens = (n) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}K`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-16 px-5 text-center mesh-hero">
        <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show" className="max-w-2xl mx-auto">
          <motion.div variants={fadeUp} className="mb-5 flex justify-center">
            <span className="label-pill">Transparent Pricing</span>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-[clamp(2.2rem,5vw,4rem)] font-black text-[#f0eefa] leading-tight tracking-tight mb-5">
            Pay for what <span className="gradient-text">you use.</span><br />Nothing more.
          </motion.h1>
          <motion.p variants={fadeUp} className="text-[#8e8ca4] text-base leading-relaxed mb-8">
            One-time payments. No subscriptions. Pick a duration — get instant access to all AI models.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-white font-semibold rounded-xl transition-all"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 24px rgba(124,58,237,0.3)' }}
            >
              <ShoppingBag className="w-4 h-4" />
              Browse &amp; Buy on Marketplace
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} className="text-[#2e2c3a] text-xs mt-4">
            Powered by Cashfree · All major payment methods · Prices in INR
          </motion.p>
        </motion.div>
      </section>

      {/* Provider marquee */}
      <section className="py-10 overflow-hidden" style={{ background: 'var(--bg-surface)', borderTop: '1px solid rgba(255,255,255,0.055)', borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} className="text-center mb-7 px-5">
          <span className="label-pill mb-4 inline-flex">Supported Providers</span>
          <h2 className="text-2xl font-bold text-[#f0eefa] tracking-tight">
            World-class AI, <span className="gradient-text">on demand</span>
          </h2>
          <p className="text-[#52505f] text-sm mt-2">Rent access — no personal API accounts needed.</p>
        </motion.div>
        <div className="flex overflow-hidden">
          <div className="marquee-track gap-0">
            {slideItems.map((pid, i) => (
              <ProviderSlide key={`${pid}-${i}`} providerKey={pid} />
            ))}
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="py-24 px-5" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} className="text-center mb-14">
            <span className="label-pill mb-5 inline-flex">Simple Pricing</span>
            <h2 className="text-[clamp(1.7rem,3vw,2.5rem)] font-bold text-[#f0eefa] mb-3 tracking-tight">Choose your duration</h2>
            <p className="text-[#52505f] text-sm max-w-md mx-auto">
              One plan unlocks all active AI models. Expensive models consume tokens faster — that's all.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {displayPlans.map(plan => {
              const meta    = TIER_META[plan.duration_minutes] || { emoji: '⏱️', label: `${plan.duration_minutes}m`, desc: '' };
              const popular = meta.popular;
              return (
                <motion.div
                  key={plan.id || plan.duration_minutes}
                  variants={scaleIn}
                  className="relative flex flex-col p-6 rounded-2xl transition-all"
                  style={{
                    background: popular ? 'rgba(124,58,237,0.08)' : 'var(--bg-surface)',
                    border: `1px solid ${popular ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: popular ? '0 0 40px rgba(124,58,237,0.12)' : 'none',
                  }}
                >
                  {popular && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-white text-[10px] font-bold rounded-full whitespace-nowrap"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
                    >
                      Most Popular
                    </div>
                  )}
                  <div className="text-2xl mb-3">{meta.emoji}</div>
                  <div className="text-[#f0eefa] font-bold text-lg mb-0.5">{plan.duration_label || meta.label}</div>
                  <div className="text-[#52505f] text-xs mb-4">{meta.desc}</div>
                  <div className="text-3xl font-black text-[#f0eefa] mb-0.5">
                    ₹{plan.price}
                  </div>
                  <div className="text-[#52505f] text-xs mb-6">one-time · {formatTokens(plan.token_cap)} tokens</div>
                  <div className="flex-1" />
                  <div className={`text-xs flex items-center gap-1.5 font-medium ${popular ? 'text-violet-400' : 'text-[#52505f]'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    Buy on Marketplace
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
            className="flex flex-col items-center mt-10 gap-3">
            <p className="text-[#52505f] text-sm text-center max-w-sm">
              All plans include access to every active AI provider. Select a duration on the Marketplace to buy.
            </p>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl text-sm"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 20px rgba(124,58,237,0.22)' }}
            >
              <ShoppingBag className="w-4 h-4" /> Go to Marketplace <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Inclusions */}
      <section className="py-20 px-5" style={{ background: 'var(--bg-surface)', borderTop: '1px solid rgba(255,255,255,0.055)', borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} className="text-center mb-10">
            <span className="label-pill mb-5 inline-flex">Every Plan Includes</span>
            <h2 className="text-2xl font-bold text-[#f0eefa] tracking-tight">Everything you need, included.</h2>
          </motion.div>
          <motion.div
            variants={staggerContainer(0.07)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3"
          >
            {INCLUSIONS.map(item => (
              <motion.div
                key={item} variants={scaleIn}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                <span className="text-[#8e8ca4] text-sm">{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-5" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-2xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#f0eefa] tracking-tight">Common questions</h2>
          </motion.div>
          <motion.div variants={staggerContainer(0.08)} initial="hidden" whileInView="show" viewport={viewport} className="space-y-2.5">
            {FAQS.map((item, i) => (
              <motion.div
                key={i} variants={fadeUp}
                className="p-5 rounded-xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex gap-3">
                  <HelpCircle className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[#f0eefa] font-medium text-sm mb-1.5">{item.q}</p>
                    <p className="text-[#52505f] text-sm leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} className="text-center mt-6">
            <Link to="/faq" className="text-violet-400 hover:text-violet-300 text-sm transition-colors">
              View all FAQs →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-20 px-5" style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
        <motion.div
          variants={scaleIn} initial="hidden" whileInView="show" viewport={viewport}
          className="max-w-lg mx-auto text-center p-10 rounded-2xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid rgba(124,58,237,0.2)', boxShadow: '0 0 60px rgba(124,58,237,0.08)' }}
        >
          <Sparkles className="w-8 h-8 text-violet-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#f0eefa] mb-2 tracking-tight">Need a custom plan?</h2>
          <p className="text-[#52505f] text-sm mb-7 leading-relaxed">High-volume usage, team access, or white-label integration? Let's talk.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl text-sm"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 16px rgba(124,58,237,0.22)' }}
            >
              Talk to us <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 text-[#8e8ca4] hover:text-[#f0eefa] font-semibold rounded-xl text-sm transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
            >
              <ShoppingBag className="w-4 h-4" /> Browse plans
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
