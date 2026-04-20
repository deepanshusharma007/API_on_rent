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
  major_outage:    { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-400',     icon: AlertCircle,     label: 'Major Outage' },
  partial_outage:  { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-400',     icon: AlertCircle,     label: 'Partial Outage' },
};

function getConfig(st) {
  return STATUS_CONFIG[st] || { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', dot: 'bg-gray-400', icon: Activity, label: st || 'Unknown' };
}

const LEGEND = [
  { color: 'bg-emerald-400', label: 'Operational' },
  { color: 'bg-amber-400',   label: 'Issues / Degraded' },
  { color: 'bg-red-400',     label: 'Outage' },
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
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-10 px-5 text-center">
        <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show"
          className="max-w-2xl mx-auto">
          <motion.div variants={fadeUp} className="w-12 h-12 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
            <Wifi className="w-6 h-6 text-violet-400" />
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">
            System <span className="text-violet-400">Status</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-gray-500 text-sm">
            Real-time provider health monitoring · refreshes every 30 s
          </motion.p>
          {lastRefresh && (
            <motion.p variants={fadeUp} className="text-gray-700 text-xs mt-1.5">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </motion.p>
          )}
        </motion.div>
      </section>

      <section className="px-5 pb-20 flex-1">
        <div className="max-w-3xl mx-auto space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => <div key={n} className="h-16 bg-[#111] rounded-lg animate-pulse border border-white/[0.04]" />)}
            </div>
          ) : !status ? (
            <div className="text-center py-20 text-red-400 text-sm">Failed to load status data.</div>
          ) : (
            <>
              {/* Overall */}
              <motion.div variants={fadeUp} initial="hidden" animate="show"
                className={`bg-[#111] border ${overall.border} rounded-lg p-5 flex items-center justify-between`}>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold mb-0.5">Overall System</p>
                  <h2 className="text-white font-bold text-base">AIRent Platform</h2>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${overall.bg} border ${overall.border}`}>
                  <span className={`w-2 h-2 rounded-full ${overall.dot} ${status.overall_status === 'operational' ? 'animate-pulse' : ''}`} />
                  <span className={`text-sm font-semibold ${overall.color}`}>{overall.label}</span>
                </div>
              </motion.div>

              {/* Providers */}
              <div>
                <motion.p variants={fadeUp} initial="hidden" animate="show"
                  className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-3">Providers</motion.p>
                <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
                  className="space-y-2">
                  {Object.entries(status.providers).map(([provider, data]) => {
                    const cfg = getConfig(data.status);
                    const Icon = cfg.icon;
                    return (
                      <motion.div key={provider} variants={scaleIn}
                        className={`bg-[#111] border ${cfg.border} rounded-lg p-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                          </div>
                          <div>
                            <h3 className="text-white font-medium capitalize text-sm">{provider}</h3>
                            <p className="text-gray-600 text-xs mt-0.5">
                              Circuit: <span className="text-gray-500">{data.circuit_state}</span>
                              {' '}· Failures: <span className="text-gray-500">{data.recent_failures}</span>
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${cfg.bg} border ${cfg.border}`}>
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
                className="bg-[#111] border border-white/[0.08] rounded-lg p-4">
                <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-3">Legend</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {LEGEND.map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2 text-sm text-gray-400">
                      <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                      {label}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Refresh button */}
              <div className="text-center">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={loadStatus}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111] border border-white/[0.08] hover:border-white/[0.14] text-gray-400 hover:text-white rounded-lg text-sm transition-all">
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
