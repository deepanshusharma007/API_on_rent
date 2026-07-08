import React from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-40px' };
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });

export function PolicyPage({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0d14' }}>
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

export function PolicyHero({ icon: Icon, badge, title, updated }) {
  return (
    <section style={{ paddingTop: 'clamp(88px,12vw,128px)', paddingBottom: 'clamp(40px,5vw,64px)', paddingLeft: 'clamp(20px,5vw,56px)', paddingRight: 'clamp(20px,5vw,56px)', background: '#0d1017' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <motion.div variants={fadeUp(0)} initial="hidden" animate="show" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '999px', border: '1px solid rgba(192,193,255,0.2)', background: 'rgba(192,193,255,0.05)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--primary)' }}>
            {Icon && <Icon size={11} />}
            {badge?.toUpperCase() || 'LEGAL'}
          </div>
        </motion.div>
        <motion.h1
          variants={fadeUp(0.06)} initial="hidden" animate="show"
          style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', color: '#e8edf8', marginBottom: '14px' }}
        >
          {title}
        </motion.h1>
        {updated && (
          <motion.span variants={fadeUp(0.12)} initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--on-surface-3)', letterSpacing: '0.08em' }}
          >
            LAST UPDATED: {updated?.toUpperCase()}
          </motion.span>
        )}
      </div>
    </section>
  );
}

export function PolicyBody({ children }) {
  return (
    <section style={{ flex: 1, padding: 'clamp(40px,6vw,72px) clamp(20px,5vw,56px) clamp(64px,8vw,96px)', background: '#0a0d14' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
        {children}
      </div>
    </section>
  );
}

export function PolicySection({ number, title, children }) {
  return (
    <motion.div
      variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
      id={`section-${number}`}
      style={{ scrollMarginTop: '96px', padding: '32px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: '20px', alignItems: 'start' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--on-surface-4)', letterSpacing: '0.04em', paddingTop: '5px' }}>
          {String(number).padStart(2, '0')}
        </span>
        <div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.0625rem', color: '#e8edf8', letterSpacing: '-0.02em', marginBottom: '16px' }}>
            {title}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--on-surface-2)' }}>
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Highlight({ children }) {
  return <strong style={{ color: '#e8edf8', fontWeight: 600 }}>{children}</strong>;
}

export function PolicyLink({ href, children }) {
  return (
    <a href={href} style={{ color: 'var(--secondary)', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'rgba(78,222,163,0.35)', transition: 'text-decoration-color 120ms' }}
      onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--secondary)'}
      onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'rgba(78,222,163,0.35)'}
    >
      {children}
    </a>
  );
}

export function BulletList({ items }) {
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: '10px', alignItems: 'start' }}>
          <span style={{ marginTop: '10px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--secondary)', display: 'block', flexShrink: 0 }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function SummaryBox({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
      {items.map(({ icon: Icon, label, sub }) => (
        <div key={label} style={{ padding: '20px', background: '#111520', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', textAlign: 'center' }}>
          {Icon && <Icon size={18} style={{ color: 'var(--secondary)', margin: '0 auto 10px', display: 'block' }} />}
          <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.875rem', color: '#e8edf8', letterSpacing: '-0.01em', marginBottom: '4px' }}>{label}</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.775rem', color: 'var(--on-surface-3)', lineHeight: 1.5 }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}
