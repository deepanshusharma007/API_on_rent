import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Shield, Heart, Code2, Globe, Github } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, fadeLeft, fadeRight, scaleIn, staggerContainer, viewport } from '../lib/motion';

const STATS = [
  { value: '₹0',   label: 'Hidden fees',      color: 'text-emerald-400' },
  { value: '3',    label: 'AI providers',      color: 'text-sky-400' },
  { value: '99.9%', label: 'Uptime target',    color: 'text-violet-400' },
  { value: '∞',   label: 'Passion for devs',  color: 'text-pink-400' },
];

const VALUES = [
  { icon: Zap,    color: 'text-yellow-400', title: 'Speed over everything',  desc: "Your API key should be in your hands before you finish your coffee. The entire activation flow takes under 10 seconds." },
  { icon: Shield, color: 'text-emerald-400', title: 'Security first',        desc: "Keys are time-limited, IP-pinned, and PII-masked. Prompts are never stored and never will be." },
  { icon: Heart,  color: 'text-pink-400',   title: 'Built for developers',  desc: "Every feature — from the OpenAI-compatible endpoint to semantic cache — was designed by a developer for developers." },
  { icon: Globe,  color: 'text-sky-400',    title: 'Made for builders',     desc: "Pay in INR. No forex fees, no enterprise lock-in. Just build what you want, when you want." },
];

const STACK = ['FastAPI', 'React', 'PostgreSQL', 'Redis', 'LiteLLM', 'Docker', 'Framer Motion', 'Tailwind CSS'];

export default function AboutUs() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-5 text-center">
        <motion.div
          variants={staggerContainer(0.1)} initial="hidden" animate="show"
          className="max-w-3xl mx-auto"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-violet-500/20 bg-violet-500/5 text-violet-400 text-sm font-medium mb-6">
            <Cpu className="w-4 h-4" /> Our Story
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-bold text-white leading-tight mb-5">
            Making AI accessible{' '}
            <br className="hidden md:block" />
            <span className="text-violet-400">for every developer</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-xl text-gray-400 leading-relaxed">
            AIRent was born out of frustration. Every time I needed to quickly prototype with a top-tier
            AI model, I had to navigate rate limits, billing delays, or annual contracts. So I built
            the tool I always wanted — a marketplace to rent AI API access by the hour.
          </motion.p>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-12 px-5 bg-[#111] border-y border-white/[0.05]">
        <motion.div
          variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport}
          className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {STATS.map(s => (
            <motion.div key={s.label} variants={scaleIn} className="text-center">
              <div className={`text-4xl md:text-5xl font-black ${s.color} mb-2`}>
                {s.value}
              </div>
              <div className="text-gray-500 text-sm">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Mission */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer(0.15)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <motion.div variants={fadeLeft}>
              <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-4">Mission</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 leading-tight">
                AI shouldn't require<br />
                <span className="text-violet-400">a corporate budget</span>
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

            <motion.div variants={fadeRight} className="grid grid-cols-2 gap-3">
              {VALUES.map(v => (
                <div
                  key={v.title}
                  className="p-5 rounded-lg bg-[#111] border border-white/[0.08] hover:border-white/[0.14] transition-all"
                >
                  <div className={`w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center mb-3 ${v.color}`}>
                    <v.icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-white font-semibold text-sm mb-1.5">{v.title}</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-5 bg-[#111] border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport} className="text-center mb-12">
            <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-3">The team</p>
            <h2 className="text-3xl font-bold text-white mb-2">One person. Big mission.</h2>
            <p className="text-gray-500 text-sm">Built entirely by a solo developer.</p>
          </motion.div>

          <motion.div
            variants={scaleIn} initial="hidden" whileInView="show" viewport={viewport}
            className="max-w-sm mx-auto"
          >
            <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg p-8 text-center">
              {/* Avatar */}
              <div className="w-20 h-20 mx-auto mb-5 rounded-lg bg-violet-600 flex items-center justify-center text-white font-black text-4xl">
                D
              </div>

              <h3 className="text-white font-bold text-xl mb-0.5">Deepanshu Sharma</h3>
              <p className="text-violet-400 text-sm font-medium mb-4">Founder & CEO</p>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-xs mx-auto">
                Sole developer behind AIRent. Passionate about making AI accessible to every developer —
                built the entire stack from backend APIs to frontend UI, payments, and infrastructure.
              </p>

              {/* Stack badges */}
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {['FastAPI', 'React', 'PostgreSQL', 'Redis', 'Docker'].map(tech => (
                  <span key={tech} className="px-2.5 py-1 text-xs rounded bg-white/[0.05] border border-white/[0.08] text-gray-400">
                    {tech}
                  </span>
                ))}
              </div>

              <a
                href="https://github.com/deepanshusharma007"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors font-semibold text-sm"
              >
                <Github className="w-4 h-4" />
                View GitHub Profile
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-16 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}>
            <Code2 className="w-8 h-8 text-violet-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Built on modern open-source</h2>
            <p className="text-gray-500 mb-7 text-sm">Every component is production-tested and open source.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {STACK.map(tech => (
                <span
                  key={tech}
                  className="px-4 py-2 text-sm rounded-lg bg-[#111] border border-white/[0.08] hover:border-white/[0.14] text-gray-400 hover:text-white transition-colors cursor-default"
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
