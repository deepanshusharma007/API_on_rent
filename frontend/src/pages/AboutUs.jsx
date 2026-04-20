import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Shield, Heart, Code2, Globe, Github } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeLeft, fadeRight, scaleIn, staggerContainer, viewport } from '../lib/motion';

const STATS = [
  { value: '$0',  label: 'Hidden fees',        color: 'from-emerald-500 to-teal-500' },
  { value: '3',   label: 'AI providers',        color: 'from-sky-500 to-blue-500' },
  { value: '99.9%',label: 'Uptime target',      color: 'from-violet-500 to-purple-500' },
  { value: '∞',  label: 'Passion for devs',    color: 'from-pink-500 to-rose-500' },
];

const VALUES = [
  { icon: Zap,    color: 'text-yellow-400', bg: 'from-yellow-500/15 to-yellow-500/5', border: 'border-yellow-500/20',  title: 'Speed over everything',  desc: "Your API key should be in your hands before you finish your coffee. The entire activation flow takes under 10 seconds." },
  { icon: Shield, color: 'text-emerald-400',bg: 'from-emerald-500/15 to-emerald-500/5',border:'border-emerald-500/20', title: 'Security first',           desc: "Keys are time-limited, IP-pinned, and PII-masked. Prompts are never stored and never will be." },
  { icon: Heart,  color: 'text-pink-400',   bg: 'from-pink-500/15 to-pink-500/5',     border: 'border-pink-500/20',   title: 'Built for developers',    desc: "Every feature — from the OpenAI-compatible endpoint to semantic cache — was designed by a developer for developers." },
  { icon: Globe,  color: 'text-sky-400',    bg: 'from-sky-500/15 to-sky-500/5',       border: 'border-sky-500/20',    title: 'Made for builders',       desc: "Pay in INR. No forex fees, no enterprise lock-in. Just build what you want, when you want." },
];

const STACK = ['FastAPI', 'React', 'PostgreSQL', 'Redis', 'LiteLLM', 'Docker', 'Framer Motion', 'Tailwind CSS'];

export default function AboutUs() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07070f]">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-5 text-center overflow-hidden">
        <div className="blob-1 top-[-100px] left-1/2 -translate-x-1/2 opacity-50" />
        <div className="absolute inset-0 grid-pattern opacity-25" />

        <motion.div
          variants={staggerContainer(0.1)} initial="hidden" animate="show"
          className="relative max-w-3xl mx-auto"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-7">
            <Cpu className="w-4 h-4" /> Our Story
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
            Making AI accessible{' '}
            <br className="hidden md:block" />
            <span className="gradient-text">for every developer</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-xl text-gray-400 leading-relaxed">
            AIRent was born out of frustration. Every time I needed to quickly prototype with a top-tier
            AI model, I had to navigate rate limits, billing delays, or annual contracts. So I built
            the tool I always wanted — a marketplace to rent AI API access by the hour.
          </motion.p>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-16 px-5 bg-white/[0.015] border-y border-white/[0.05]">
        <motion.div
          variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
          className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {STATS.map(s => (
            <motion.div key={s.label} variants={scaleIn} className="text-center">
              <div className={`text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${s.color} mb-2`}>
                {s.value}
              </div>
              <div className="text-gray-500 text-sm">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Mission */}
      <section className="py-24 px-5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer(0.15)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <motion.div variants={fadeLeft}>
              <p className="text-violet-400 text-sm font-semibold tracking-widest uppercase mb-4">Mission</p>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
                AI shouldn't require<br />
                <span className="gradient-text">a corporate budget</span>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-4">
                Independent developers, students, researchers, and small teams deserve the same
                access to frontier models as Fortune 500 companies.
              </p>
              <p className="text-gray-400 leading-relaxed mb-4">
                AIRent flips the model. Instead of paying for what you <em>might</em> use, you pay
                for exactly what you <em>do</em> use — in a time window you control.
              </p>
              <p className="text-gray-400 leading-relaxed">
                I handle the billing complexity, provider rate-limiting, fallback routing, and cost
                protection so you can focus on shipping products.
              </p>
            </motion.div>

            <motion.div variants={fadeRight} className="grid grid-cols-2 gap-4">
              {VALUES.map(v => (
                <motion.div
                  key={v.title}
                  whileHover={{ y: -4 }}
                  className={`p-5 rounded-2xl bg-gradient-to-br ${v.bg} border ${v.border} transition-all`}
                >
                  <div className={`w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center mb-3 ${v.color}`}>
                    <v.icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-white font-semibold text-sm mb-1.5">{v.title}</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">{v.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 px-5 bg-white/[0.015] border-y border-white/[0.05] relative overflow-hidden">
        <div className="blob-2 top-0 right-0 opacity-40" />
        <div className="max-w-4xl mx-auto relative">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} className="text-center mb-14">
            <p className="text-violet-400 text-sm font-semibold tracking-widest uppercase mb-3">The team</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">One person. Big mission.</h2>
            <p className="text-gray-500">Built entirely by a solo developer.</p>
          </motion.div>

          <motion.div
            variants={scaleIn} initial="hidden" whileInView="show" viewport={viewport}
            className="max-w-md mx-auto"
          >
            <motion.div
              whileHover={{ y: -6 }}
              className="glass-card border border-violet-500/20 rounded-3xl p-10 text-center relative overflow-hidden"
            >
              {/* Glow behind avatar */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-violet-600/20 rounded-full blur-3xl" />

              {/* Avatar */}
              <div className="relative w-28 h-28 mx-auto mb-6">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-60 animate-pulse-glow" />
                <div className="relative w-28 h-28 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-black text-5xl shadow-2xl">
                  D
                </div>
              </div>

              <h3 className="text-white font-black text-2xl mb-1">Deepanshu Sharma</h3>
              <p className="text-violet-400 font-medium mb-5">Founder & CEO</p>
              <p className="text-gray-500 text-sm leading-relaxed mb-7 max-w-xs mx-auto">
                Sole developer behind AIRent. Passionate about making AI accessible to every developer —
                built the entire stack from backend APIs to frontend UI, payments, and infrastructure.
              </p>

              {/* Stack badges */}
              <div className="flex flex-wrap gap-2 justify-center mb-7">
                {['FastAPI', 'React', 'PostgreSQL', 'Redis', 'Docker'].map(tech => (
                  <span key={tech} className="px-3 py-1 text-xs rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-400">
                    {tech}
                  </span>
                ))}
              </div>

              <motion.a
                href="https://github.com/deepanshusharma007"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl transition-all font-semibold text-sm shadow-lg shadow-violet-500/25"
              >
                <Github className="w-4 h-4" />
                View GitHub Profile
              </motion.a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
            <Code2 className="w-10 h-10 text-violet-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-3">Built on modern open-source</h2>
            <p className="text-gray-500 mb-8">Every component is production-tested and open source.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {STACK.map(tech => (
                <motion.span
                  key={tech}
                  whileHover={{ scale: 1.08, y: -2 }}
                  className="px-4 py-2 text-sm rounded-xl glass-card border border-white/[0.08] text-gray-300 hover:text-white hover:border-violet-500/30 transition-colors cursor-default"
                >
                  {tech}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
