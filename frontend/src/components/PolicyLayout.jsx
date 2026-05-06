import React from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-40px' };
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });

export function PolicyPage({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nb-bg)' }}>
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

export function PolicyHero({ icon: Icon, badge, title, updated }) {
  return (
    <section
      className="nb-grid-hero"
      style={{
        paddingTop: 'clamp(120px,16vw,180px)',
        paddingBottom: 'clamp(48px,6vw,72px)',
        paddingLeft: 'clamp(20px,5vw,72px)',
        paddingRight: 'clamp(20px,5vw,72px)',
        borderBottom: '1px solid var(--nb-border)',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to bottom, transparent, var(--nb-bg))', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '760px', margin: '0 auto', position: 'relative' }}>
        <motion.div variants={fadeUp(0)} initial="hidden" animate="show">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
            <span style={{ width: '18px', height: '1px', background: 'var(--nb-green)', display: 'inline-block' }} />
            {badge?.toUpperCase() || 'LEGAL'}
          </span>
        </motion.div>
        <motion.h1
          variants={fadeUp(0.06)} initial="hidden" animate="show"
          style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2.4rem,6vw,4rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--nb-text)', lineHeight: 0.98, marginBottom: '20px' }}
        >
          {title}
        </motion.h1>
        <motion.span variants={fadeUp(0.12)} initial="hidden" animate="show"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--nb-text-3)', letterSpacing: '0.06em' }}
        >
          LAST UPDATED: {updated?.toUpperCase()}
        </motion.span>
      </div>
    </section>
  );
}

export function PolicyBody({ children }) {
  return (
    <section style={{ flex: 1, padding: 'clamp(48px,8vw,96px) clamp(20px,5vw,72px)' }}>
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
      style={{ scrollMarginTop: '96px', padding: '32px 0', borderTop: '1px solid var(--nb-border)' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: '20px', alignItems: 'start' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: 'var(--nb-text-4)', letterSpacing: '0.04em', paddingTop: '4px' }}>
          {String(number).padStart(2, '0')}
        </span>
        <div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: 'var(--nb-text)', letterSpacing: '-0.02em', marginBottom: '16px' }}>
            {title}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.75, color: 'var(--nb-text-2)' }}>
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Highlight({ children }) {
  return <strong style={{ color: 'var(--nb-text)', fontWeight: 600 }}>{children}</strong>;
}

export function PolicyLink({ href, children }) {
  return (
    <a href={href} style={{ color: 'var(--nb-green)', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'var(--nb-green-border)' }}
      onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--nb-green)'}
      onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'var(--nb-green-border)'}
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
          <span style={{ marginTop: '9px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--nb-green)', display: 'block', flexShrink: 0 }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function SummaryBox({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', background: 'var(--nb-grid)', border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
      {items.map(({ icon: Icon, label, sub }) => (
        <div key={label} style={{ padding: '20px', background: 'var(--nb-surface)', textAlign: 'center' }}>
          <Icon size={20} style={{ color: 'var(--nb-green)', margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--nb-text)', letterSpacing: '-0.01em', marginBottom: '4px' }}>{label}</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.775rem', color: 'var(--nb-text-3)', lineHeight: 1.5 }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}
