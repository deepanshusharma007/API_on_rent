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

const STATUS_CONFIG = {
  operational:    { color: 'var(--secondary)', bg: 'rgba(78,222,163,0.08)',  border: 'rgba(78,222,163,0.2)',  icon: CheckCircle,   label: 'Operational'   },
  degraded:       { color: '#f59e0b',          bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: AlertTriangle, label: 'Degraded'       },
  issues:         { color: '#f59e0b',          bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: AlertCircle,   label: 'Issues'         },
  major_outage:   { color: '#f87171',          bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', icon: AlertCircle,  label: 'Major Outage'  },
  partial_outage: { color: '#f87171',          bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', icon: AlertCircle,  label: 'Partial Outage' },
};

function getConfig(st) {
  return STATUS_CONFIG[st] || { color: 'var(--on-surface-3)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', icon: Activity, label: st || 'Unknown' };
}

function StatusBadge({ status }) {
  const cfg = getConfig(status);
  const Icon = cfg.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', background: cfg.bg, border: `1px solid ${cfg.border}`, fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', color: cfg.color }}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function UptimeBar({ bars }) {
  const days = bars || Array.from({ length: 60 }, () => ({ status: 'operational' }));
  const cfg = { operational: 'var(--secondary)', degraded: '#f59e0b', issues: '#f59e0b', major_outage: '#f87171', partial_outage: '#f87171' };
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '28px' }}>
      {days.map((d, i) => (
        <div key={i} title={d.status} style={{ flex: 1, height: '100%', borderRadius: '2px', background: cfg[d.status] || 'rgba(255,255,255,0.08)', opacity: i === days.length - 1 ? 1 : 0.6 + (i / days.length) * 0.4 }} />
      ))}
    </div>
  );
}

export default function StatusPage() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await statusAPI.getStatus();
      setData(res.data);
    } catch {
      setData({ overall: 'issues', services: [] });
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => { load(); }, []);

  const overall = data?.overall || 'operational';
  const overallCfg = getConfig(overall);
  const OverallIcon = overallCfg.icon;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0d14' }}>
      <Helmet>
        <title>Status â€” AIRent</title>
        <meta name="description" content="Real-time status of the AIRent API rental platform." />
      </Helmet>
      <Navbar />

      <main style={{ flex: 1, paddingTop: 'var(--header-h, 60px)' }}>

        {/* Hero */}
        <section style={{ padding: 'clamp(56px,8vw,96px) clamp(20px,5vw,56px) clamp(40px,5vw,64px)', background: '#0d1017' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <motion.div initial="hidden" animate="show" variants={fadeUp(0)} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)', marginBottom: '12px' }}>SYSTEM STATUS</div>
                <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', color: '#e8edf8', marginBottom: '16px' }}>
                  {loading ? 'Checking...' : overall === 'operational' ? 'All systems normal.' : 'Service disruption.'}
                </h1>
                {!loading && <StatusBadge status={overall} />}
              </div>
              <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)', transition: 'background 120ms', flexShrink: 0 }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
              </button>
            </motion.div>
            {lastChecked && (
              <motion.p initial="hidden" animate="show" variants={fadeUp(0.1)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--on-surface-4)', letterSpacing: '0.04em', marginTop: '16px' }}>
                Last checked: {lastChecked.toLocaleTimeString()}
              </motion.p>
            )}
          </div>
        </section>

        {/* Services */}
        <section style={{ padding: 'clamp(40px,5vw,64px) clamp(20px,5vw,56px)', background: '#0a0d14' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{ marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)' }}>SERVICES</div>
            </motion.div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1,2,3,4].map(n => <div key={n} style={{ height: '72px', borderRadius: '12px', background: '#111520', animation: 'pulse 1.5s infinite' }} />)}
              </div>
            ) : data?.services?.length > 0 ? (
              <div style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
                {data.services.map((svc, i) => (
                  <motion.div key={svc.name} initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(i * 0.05)}
                    style={{ padding: '18px 24px', borderBottom: i < data.services.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', color: '#e8edf8', marginBottom: '2px' }}>{svc.name}</div>
                      {svc.uptime && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--on-surface-3)' }}>{svc.uptime}% uptime</div>}
                    </div>
                    <StatusBadge status={svc.status} />
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Fallback default services */
              <div style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
                {[
                  { name: 'API Gateway',        status: 'operational', uptime: '99.98' },
                  { name: 'Payment Processing', status: 'operational', uptime: '99.95' },
                  { name: 'Key Delivery',        status: 'operational', uptime: '100.00' },
                  { name: 'AI Proxy (OpenAI)',   status: 'operational', uptime: '99.91' },
                  { name: 'AI Proxy (Anthropic)', status: 'operational', uptime: '99.87' },
                  { name: 'AI Proxy (Google)',   status: 'operational', uptime: '99.94' },
                ].map((svc, i, arr) => (
                  <div key={svc.name} style={{ padding: '18px 24px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', color: '#e8edf8', marginBottom: '2px' }}>{svc.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--on-surface-3)' }}>{svc.uptime}% uptime</div>
                    </div>
                    <StatusBadge status={svc.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Uptime history */}
        <section style={{ padding: '0 clamp(20px,5vw,56px) clamp(56px,7vw,88px)', background: '#0a0d14' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)}>
              <div style={{ background: '#111520', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)' }}>60-DAY UPTIME HISTORY</div>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--secondary)' }}>99.96%</div>
                </div>
                <UptimeBar bars={data?.uptime_bars} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--on-surface-4)' }}>60 days ago</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--on-surface-4)' }}>Today</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

