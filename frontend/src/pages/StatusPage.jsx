import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, CheckCircle, AlertTriangle, RefreshCw, Wifi } from 'lucide-react';
import { statusAPI } from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, scaleIn, staggerContainer, viewport } from '../lib/motion';

// Semantic status colours — these are intentional semantic colours, not brand accents
const STATUS_CONFIG = {
  operational:    { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', dot: '#10b981', icon: CheckCircle,   label: 'Operational' },
  degraded:       { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', dot: '#fbbf24', icon: AlertTriangle, label: 'Degraded' },
  issues:         { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', dot: '#fbbf24', icon: AlertCircle,   label: 'Issues' },
  major_outage:   { color: '#fb7185', bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.25)', dot: '#fb7185', icon: AlertCircle,  label: 'Major Outage' },
  partial_outage: { color: '#fb7185', bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.25)', dot: '#fb7185', icon: AlertCircle,  label: 'Partial Outage' },
};

function getConfig(st) {
  return STATUS_CONFIG[st] || { color: 'var(--c-text-3)', bg: 'var(--c-raised)', border: 'var(--c-border)', dot: 'var(--c-border-hi)', icon: Activity, label: st || 'Unknown' };
}

const LEGEND = [
  { color: '#10b981', label: 'Operational' },
  { color: '#fbbf24', label: 'Issues / Degraded' },
  { color: '#fb7185', label: 'Outage' },
  { color: 'var(--c-border-hi)', label: 'Unknown' },
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ paddingTop: '120px', paddingBottom: '40px', paddingLeft: '20px', paddingRight: '20px' }}>
        <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show" className="max-w-3xl mx-auto">
          <motion.p variants={fadeUp} className="eyebrow mb-4">System Status</motion.p>
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', lineHeight: 1.1, marginBottom: '10px' }}>
            Platform Health
          </motion.h1>
          <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem' }}>
              Real-time provider health &middot; refreshes every 30s
            </p>
            {lastRefresh && (
              <p style={{ color: 'var(--c-text-3)', fontSize: '0.775rem' }}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </motion.div>
        </motion.div>
      </section>

      <section style={{ padding: '0 20px 80px', flex: 1 }}>
        <div className="max-w-3xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ height: '64px', background: 'var(--c-surface)', borderRadius: '10px', border: '1px solid var(--c-border)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : !status ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#fb7185', fontSize: '0.875rem' }}>Failed to load status data.</div>
          ) : (
            <>
              {/* Overall */}
              <motion.div variants={fadeUp} initial="hidden" animate="show"
                style={{
                  background: 'var(--c-surface)', border: `1px solid ${overall.border}`,
                  borderRadius: '10px', padding: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                <div>
                  <p style={{ color: 'var(--c-text-3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '2px' }}>Overall System</p>
                  <h2 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '0.95rem' }}>AIRent Platform</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '8px', background: overall.bg, border: `1px solid ${overall.border}` }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: overall.dot, animation: status.overall_status === 'operational' ? 'pulse 2s infinite' : 'none' }} />
                  <span style={{ fontSize: '0.825rem', fontWeight: 600, color: overall.color }}>{overall.label}</span>
                </div>
              </motion.div>

              {/* Providers */}
              <div>
                <motion.p variants={fadeUp} initial="hidden" animate="show"
                  style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '10px' }}>
                  Providers
                </motion.p>
                <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(status.providers).map(([provider, data]) => {
                    const cfg  = getConfig(data.status);
                    const Icon = cfg.icon;
                    return (
                      <motion.div key={provider} variants={scaleIn}
                        style={{ background: 'var(--c-surface)', border: `1px solid ${cfg.border}`, borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={16} style={{ color: cfg.color }} />
                          </div>
                          <div>
                            <h3 style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize' }}>{provider}</h3>
                            <p style={{ color: 'var(--c-text-3)', fontSize: '0.75rem', marginTop: '2px' }}>
                              Circuit: <span style={{ color: 'var(--c-text-2)' }}>{data.circuit_state}</span>
                              {' '}· Failures: <span style={{ color: 'var(--c-text-2)' }}>{data.recent_failures}</span>
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, animation: data.status === 'operational' ? 'pulse 2s infinite' : 'none' }} />
                          <span style={{ fontSize: '0.775rem', fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

              {/* Legend */}
              <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '12px' }}>Legend</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {LEGEND.map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.825rem', color: 'var(--c-text-2)' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                      {label}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Refresh */}
              <div style={{ textAlign: 'center' }}>
                <button onClick={loadStatus} className="btn btn-secondary" style={{ display: 'inline-flex', fontSize: '0.825rem' }}>
                  <RefreshCw size={14} /> Refresh Now
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
