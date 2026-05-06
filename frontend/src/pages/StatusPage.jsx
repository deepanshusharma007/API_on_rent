import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { statusAPI } from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-40px' };
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });
const SP = { padding: 'clamp(64px,9vw,104px) clamp(20px,5vw,72px)' };
const MAX = { maxWidth: '760px', margin: '0 auto' };

const STATUS_CONFIG = {
  operational:    { color: 'oklch(72% 0.19 145)', bg: 'oklch(18% 0.04 145)', border: 'oklch(28% 0.08 145)', icon: CheckCircle,   label: 'Operational' },
  degraded:       { color: 'oklch(78% 0.16 80)',  bg: 'oklch(18% 0.04 80)',  border: 'oklch(28% 0.08 80)',  icon: AlertTriangle, label: 'Degraded' },
  issues:         { color: 'oklch(78% 0.16 80)',  bg: 'oklch(18% 0.04 80)',  border: 'oklch(28% 0.08 80)',  icon: AlertCircle,   label: 'Issues' },
  major_outage:   { color: 'oklch(68% 0.2 15)',   bg: 'oklch(18% 0.05 15)',  border: 'oklch(28% 0.1 15)',   icon: AlertCircle,   label: 'Major Outage' },
  partial_outage: { color: 'oklch(68% 0.2 15)',   bg: 'oklch(18% 0.05 15)',  border: 'oklch(28% 0.1 15)',   icon: AlertCircle,   label: 'Partial Outage' },
};

function getConfig(st) {
  return STATUS_CONFIG[st] || { color: 'var(--nb-text-3)', bg: 'var(--nb-raised)', border: 'var(--nb-border)', icon: Activity, label: st || 'Unknown' };
}

const LEGEND = [
  { color: 'oklch(72% 0.19 145)', label: 'Operational' },
  { color: 'oklch(78% 0.16 80)',  label: 'Issues / Degraded' },
  { color: 'oklch(68% 0.2 15)',   label: 'Outage' },
  { color: 'var(--nb-border-hi)', label: 'Unknown' },
];

export default function StatusPage() {
  const [status,      setStatus]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const response = await statusAPI.getStatus();
      setStatus(response.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Status fetch failed:', err);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const overall = status ? getConfig(status.overall_status) : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nb-bg)' }}>
      <Helmet>
        <title>Status — AIRent | Platform Health</title>
        <meta name="description" content="Real-time status of AIRent API providers. Check platform health and provider availability." />
        <link rel="canonical" href="https://airent.dev/status" />
      </Helmet>
      <Navbar />

      {/* ── Hero ── */}
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
        <div style={{ ...MAX, position: 'relative' }}>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
              <span style={{ width: '18px', height: '1px', background: 'var(--nb-green)', display: 'inline-block' }} />
              SYSTEM STATUS
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp(0.06)} initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2.4rem,6vw,4rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--nb-text)', lineHeight: 0.98, marginBottom: '20px' }}
          >
            Platform health.
          </motion.h1>
          <motion.div variants={fadeUp(0.12)} initial="hidden" animate="show"
            style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}
          >
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--nb-text-2)' }}>
              Real-time provider health &middot; refreshes every 30s
            </p>
            {lastRefresh && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--nb-text-3)', letterSpacing: '0.04em' }}>
                UPDATED {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Status content ── */}
      <section style={{ flex: 1, ...SP }}>
        <div style={{ ...MAX }}>
          {loading ? (
            <div style={{ border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ height: '72px', background: 'var(--nb-surface)', borderTop: n > 1 ? '1px solid var(--nb-border)' : 'none', animation: 'nb-pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : !status ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'oklch(68% 0.2 15)', letterSpacing: '0.08em' }}>FAILED TO LOAD STATUS DATA</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Overall */}
              <motion.div variants={fadeUp(0)} initial="hidden" animate="show"
                style={{ border: `1px solid ${overall.border}`, borderRadius: '4px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: overall.bg }}
              >
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '6px' }}>OVERALL SYSTEM</span>
                  <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: 'var(--nb-text)', letterSpacing: '-0.02em' }}>AIRent Platform</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: `1px solid ${overall.border}`, borderRadius: '2px', background: 'var(--nb-bg)' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: overall.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600, color: overall.color, letterSpacing: '0.06em' }}>{overall.label.toUpperCase()}</span>
                </div>
              </motion.div>

              {/* Providers */}
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '12px' }}>PROVIDERS</span>
                <div style={{ border: '1px solid var(--nb-border)', borderRadius: '4px', overflow: 'hidden' }}>
                  {Object.entries(status.providers).map(([provider, data], i) => {
                    const cfg = getConfig(data.status);
                    const Icon = cfg.icon;
                    return (
                      <motion.div key={provider} variants={fadeUp(i * 0.06)} initial="hidden" animate="show"
                        style={{
                          padding: '20px 24px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
                          borderTop: i > 0 ? '1px solid var(--nb-border)' : 'none',
                          background: 'var(--nb-surface)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '2px', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={14} style={{ color: cfg.color }} />
                          </div>
                          <div>
                            <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--nb-text)', letterSpacing: '-0.01em', textTransform: 'capitalize', marginBottom: '3px' }}>{provider}</h3>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', color: 'var(--nb-text-3)', letterSpacing: '0.04em' }}>
                              CIRCUIT: {data.circuit_state?.toUpperCase()} &middot; FAILURES: {data.recent_failures}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 12px', border: `1px solid ${cfg.border}`, borderRadius: '2px', background: cfg.bg }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600, color: cfg.color, letterSpacing: '0.06em' }}>{cfg.label.toUpperCase()}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
                style={{ border: '1px solid var(--nb-border)', borderRadius: '4px', padding: '20px 24px', background: 'var(--nb-surface)' }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '14px' }}>LEGEND</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                  {LEGEND.map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--nb-text-2)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Refresh */}
              <div style={{ textAlign: 'center' }}>
                <button onClick={loadStatus} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                  <RefreshCw size={13} /> Refresh now
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
      <style>{`@keyframes nb-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
