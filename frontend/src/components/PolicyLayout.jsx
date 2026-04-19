/**
 * Shared layout wrapper for all policy pages (Privacy, Terms, Refund).
 * Provides the hero, sticky TOC, and animated section rendering.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import { fadeUp, staggerContainer, viewport } from '../lib/motion';

export function PolicyHero({ icon: Icon, iconColor, iconBg, badge, title, updated }) {
  return (
    <section className="relative pt-36 pb-14 px-5 text-center overflow-hidden">
      <div className="blob-2 top-[-60px] left-1/2 -translate-x-1/2 opacity-40" />
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <motion.div
        variants={staggerContainer(0.1)} initial="hidden" animate="show"
        className="relative max-w-2xl mx-auto"
      >
        <motion.div variants={fadeUp}
          className={`w-14 h-14 rounded-2xl ${iconBg} border flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`w-7 h-7 ${iconColor}`} />
        </motion.div>
        <motion.div variants={fadeUp}
          className="inline-block px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] text-gray-400 text-xs font-medium mb-5">
          {badge}
        </motion.div>
        <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
          {title}
        </motion.h1>
        <motion.p variants={fadeUp} className="text-gray-600 text-sm">
          Last updated: {updated}
        </motion.p>
      </motion.div>
    </section>
  );
}

export function PolicySection({ number, title, children }) {
  return (
    <motion.div
      variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
      className="scroll-mt-24"
      id={`section-${number}`}
    >
      <div className="flex items-start gap-4 mb-4">
        <span className="shrink-0 w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold">
          {number}
        </span>
        <h2 className="text-xl font-bold text-white pt-1">{title}</h2>
      </div>
      <div className="ml-12 space-y-3 text-gray-400 text-[15px] leading-relaxed">
        {children}
      </div>
    </motion.div>
  );
}

export function PolicyPage({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#07070f]">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

export function PolicyBody({ sections, children }) {
  return (
    <section className="py-12 px-5">
      <div className="max-w-3xl mx-auto">
        <div className="glass-card border border-white/[0.06] rounded-3xl p-8 md:p-12 space-y-10">
          {children}
        </div>
      </div>
    </section>
  );
}

export function Highlight({ children }) {
  return <strong className="text-white font-semibold">{children}</strong>;
}

export function PolicyLink({ href, children }) {
  return (
    <a href={href} className="text-violet-400 hover:text-violet-300 underline underline-offset-4 transition-colors">
      {children}
    </a>
  );
}

export function BulletList({ items }) {
  return (
    <ul className="space-y-2 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function SummaryBox({ items }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      {items.map(({ icon: Icon, label, sub, color, bg, border }) => (
        <div key={label} className={`p-5 rounded-2xl bg-gradient-to-br ${bg} border ${border} text-center`}>
          <Icon className={`w-7 h-7 ${color} mx-auto mb-2`} />
          <p className="text-white font-semibold text-sm mb-1">{label}</p>
          <p className="text-gray-500 text-xs">{sub}</p>
        </div>
      ))}
    </div>
  );
}
