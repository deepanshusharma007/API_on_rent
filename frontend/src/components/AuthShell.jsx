import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: 0.04 } } };

export function Spinner({ color = 'var(--on-primary)' }) {
  return <span aria-hidden="true" style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: color, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />;
}

/** Inline, screen-reader-announced message under a form. */
export function FormMessage({ kind = 'error', children }) {
  if (!children) return null;
  const color = kind === 'error' ? 'var(--error)' : 'var(--secondary)';
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} style={{
      margin: '0 0 16px', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', lineHeight: 1.5,
      color, background: kind === 'error' ? 'rgba(179,38,30,0.08)' : 'rgba(191,226,58,0.22)',
      border: `1px solid ${kind === 'error' ? 'rgba(179,38,30,0.25)' : 'rgba(86,111,8,0.35)'}`,
    }}>{children}</p>
  );
}

/** Same page chrome as the Login/Register pages, for the password pages. */
export default function AuthShell({ title, subtitle, children }) {
  const [bannerUp, setBannerUp] = useState(() => sessionStorage.getItem('banner_dismissed') !== 'true');
  useEffect(() => {
    const id = setInterval(() => setBannerUp(sessionStorage.getItem('banner_dismissed') !== 'true'), 200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-alt)', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>
      {bannerUp && <div style={{ height: '40px', flexShrink: 0 }} />}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(18,58,44,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '400px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(191,226,58,0.3) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(20px,4vw,40px)', height: '56px', borderBottom: '1px solid rgba(18,58,44,0.07)' }}>
        <Link to="/" style={{ textDecoration: 'none', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '1.6rem', lineHeight: 1, color: 'var(--on-surface)', padding: '8px 0' }}>
          AIRent
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/login" style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(18,58,44,0.6)', textDecoration: 'none', padding: '12px 4px' }}>Login</Link>
          <Link to="/register" style={{ padding: '12px 20px', borderRadius: '999px', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, background: 'var(--primary)', color: 'var(--on-primary)' }}>Sign Up</Link>
        </div>
      </nav>

      <main style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <motion.div variants={fadeUp} initial="hidden" animate="show" style={{
            background: 'rgba(255,252,245,0.94)', border: '1px solid rgba(18,58,44,0.14)',
            borderRadius: '16px', padding: 'clamp(24px,5vw,40px)', backdropFilter: 'blur(12px)',
          }}>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 500, fontSize: 'clamp(2rem,5vw,2.8rem)', lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--on-surface)', marginBottom: '8px' }}>{title}</h1>
              {subtitle && <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface-2)' }}>{subtitle}</p>}
            </div>
            {children}
          </motion.div>
        </div>
      </main>

    </div>
  );
}
