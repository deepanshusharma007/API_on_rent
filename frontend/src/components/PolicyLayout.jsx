/**
 * Shared layout wrapper for all policy pages (Privacy, Terms, Refund).
 * Provides the hero, sticky TOC, and animated section rendering.
 */
import React from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import { fadeUp, staggerContainer, viewport } from '../lib/motion';

export function PolicyHero({ icon: Icon, iconColor, iconBg, badge, title, updated }) {
  return (
    <section style={{ paddingTop: '120px', paddingBottom: '56px', paddingLeft: '20px', paddingRight: '20px', textAlign: 'center' }}>
      <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show" className="max-w-2xl mx-auto">
        <motion.div variants={fadeUp}
          style={{
            width: '56px', height: '56px', borderRadius: '12px',
            background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
          <Icon size={24} style={{ color: 'var(--c-accent)' }} />
        </motion.div>
        <motion.div variants={fadeUp}
          style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: '20px',
            border: '1px solid var(--c-border)', background: 'var(--c-surface)',
            color: 'var(--c-text-3)', fontSize: '0.775rem', fontWeight: 500, marginBottom: '20px',
          }}>
          {badge}
        </motion.div>
        <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', lineHeight: 1.1, marginBottom: '12px' }}>
          {title}
        </motion.h1>
        <motion.p variants={fadeUp} style={{ color: 'var(--c-text-3)', fontSize: '0.875rem' }}>
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
      id={`section-${number}`}
      style={{ scrollMarginTop: '96px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
        <span style={{
          flexShrink: 0, width: '32px', height: '32px', borderRadius: '8px',
          background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--c-accent-hi)', fontSize: '0.75rem', fontWeight: 700,
        }}>
          {number}
        </span>
        <h2 style={{ color: 'var(--c-text)', fontSize: '1.1rem', fontWeight: 700, paddingTop: '6px' }}>{title}</h2>
      </div>
      <div style={{ marginLeft: '48px', display: 'flex', flexDirection: 'column', gap: '10px', color: 'var(--c-text-2)', fontSize: '0.9rem', lineHeight: 1.7 }}>
        {children}
      </div>
    </motion.div>
  );
}

export function PolicyPage({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

export function PolicyBody({ children }) {
  return (
    <section style={{ padding: '12px 20px 96px' }}>
      <div className="max-w-3xl mx-auto">
        <div style={{
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: '12px', padding: '32px 48px',
          display: 'flex', flexDirection: 'column', gap: '40px',
        }}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function Highlight({ children }) {
  return <strong style={{ color: 'var(--c-text)', fontWeight: 600 }}>{children}</strong>;
}

export function PolicyLink({ href, children }) {
  return (
    <a href={href} style={{ color: 'var(--c-accent)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
      {children}
    </a>
  );
}

export function BulletList({ items }) {
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ marginTop: '8px', width: '5px', height: '5px', borderRadius: '50%', background: 'var(--c-accent)', flexShrink: 0, display: 'inline-block' }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function SummaryBox({ items }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: '16px' }}>
      {items.map(({ icon: Icon, label, sub, color, bg, border }) => (
        <div key={label} style={{
          padding: '20px', borderRadius: '10px', textAlign: 'center',
          background: 'var(--c-raised)', border: '1px solid var(--c-border)',
        }}>
          <Icon size={28} style={{ color: 'var(--c-accent)', margin: '0 auto 8px' }} />
          <p style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}>{label}</p>
          <p style={{ color: 'var(--c-text-3)', fontSize: '0.775rem' }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}
