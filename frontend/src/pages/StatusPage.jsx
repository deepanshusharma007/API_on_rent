import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, CheckCircle, AlertTriangle, RefreshCw, Wifi } from 'lucide-react';
import { statusAPI } from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, scaleIn, staggerContainer, viewport } from '../lib/motion';

const STATUS_CONFIG = {
  operational:     { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', icon: CheckCircle,     label: 'Operational' },
  degraded:        { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-400',   icon: AlertTriangle,   label: 'Degraded' },
  issues:          { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-400',   icon: AlertCircle,     label: 'Issues' },
  major_outage:    { color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    dot: 'bg-rose-400',    icon: AlertCircle,     label: 'Major Outage' },
  partial_outage:  { color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    dot: 'bg-rose-400',    icon: AlertCircle,     label: 'Partial Outage' },
};

function getConfig(st) {
  return STATUS_CONFIG[st] || { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', dot: 'bg-gray-400', icon: Activity, label: st || 'Unknown' };
}

const LEGEND = [
  { color: 'bg-emerald-400', label: 'Operational' },
  { color: 'bg-amber-400',   label: 'Issues / Degraded' },
  { color: 'bg-rose-400',    label: 'Outage' },
  { color: 'bg-gray-500',    label: 'Unknown' },
];

export default function StatusPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadStatus = async () => {
    try {
      const response = await statusAPI.getStatus();
      setStatus(response.data);
      setLastRefresh(new Date());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const overall = status ? getConfig(status.overall_status) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#07070f]">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 pb-12 px-5 text-center overflow-hidden">
        <div className="blob-2 top-[-60px] left-1/2 -translate-x-1/2 opacity-35" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show"
          className="relative max-w-2xl mx-auto">
          <motion.div variants={fadeUp} className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-6">
            <Wifi className="w-7 h-7 text-violet-400" />
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl font-black text-white mb-3 leading-tight">
            System <span className="gradient-text">Status</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-gray-500">
            Real-time provider health monitoring · refreshes every 30 s
          </motion.p>
          {lastRefresh && (
            <motion.p variants={fadeUp} className="text-gray-700 text-xs mt-2">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </motion.p>
          )}
        </motion.div>
      </section>

      <section className="px-5 pb-20 flex-1">
        <div className="max-w-3xl mx-auto space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(n => <div key={n} className="h-20 glass-card rounded-2xl animate-pulse border border-white/[0.04]" />)}
            </div>
          ) : !status ? (
            <div className="text-center py-20 text-rose-400">Failed to load status data.</div>
          ) : (
            <>
              {/* Overall */}
              <motion.div variants={fadeUp} initial="hidden" animate="show"
                className={`glass-card border ${overall.border} rounded-2xl p-6 flex items-center justify-between`}>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold mb-1">Overall System</p>
                  <h2 className="text-white font-black text-xl">AIRent Platform</h2>
                </div>
                <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl ${overall.bg} border ${overall.border}`}>
                  <span className={`w-2 h-2 rounded-full ${overall.dot} ${status.overall_status === 'operational' ? 'animate-pulse' : ''}`} />
                  <span className={`text-sm font-semibold ${overall.color}`}>{overall.label}</span>
                </div>
              </motion.div>

              {/* Providers */}
              <div>
                <motion.p variants={fadeUp} initial="hidden" animate="show"
                  className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-3">Providers</motion.p>
                <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
                  className="space-y-3">
                  {Object.entries(status.providers).map(([provider, data]) => {
                    const cfg = getConfig(data.status);
                    const Icon = cfg.icon;
                    return (
                      <motion.div key={provider} variants={scaleIn}
                        className={`glass-card border ${cfg.border} rounded-2xl p-5 flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${cfg.color}`} />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold capitalize text-sm">{provider}</h3>
                            <p className="text-gray-600 text-xs mt-0.5">
                              Circuit: <span className="text-gray-500">{data.circuit_state}</span>
                              {' '}· Failures: <span className="text-gray-500">{data.recent_failures}</span>
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${data.status === 'operational' ? 'animate-pulse' : ''}`} />
                          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

              {/* Legend */}
              <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
                className="glass-card border border-white/[0.06] rounded-2xl p-5">
                <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-4">Legend</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {LEGEND.map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2.5 text-sm text-gray-400">
                      <span className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
                      {label}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Refresh button */}
              <div className="text-center">
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={loadStatus}
                  className="inline-flex items-center gap-2 px-5 py-2.5 glass-card border border-white/[0.08] hover:border-white/[0.16] text-gray-400 hover:text-white rounded-xl text-sm transition-all">
                  <RefreshCw className="w-4 h-4" />Refresh Now
                </motion.button>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
