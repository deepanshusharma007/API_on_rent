import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Clock, Zap, TrendingUp, Copy, Activity, History,
  FileText, CheckCircle, ShoppingBag, FlaskConical, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceAPI, invoiceAPI, paymentAPI } from '../api/client';
import CountdownTimer from '../components/CountdownTimer';
import TokenProgressBar from '../components/TokenProgressBar';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fadeUp, scaleIn, staggerContainer, viewport } from '../lib/motion';

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');

const TABS = [
  { id: 'active',  label: 'Active Rentals', icon: Activity },
  { id: 'history', label: 'Rental History',  icon: History },
];

function StatChip({ icon: Icon, label, value, color = 'violet' }) {
  const colors = {
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    sky:     'text-sky-400 bg-sky-500/10 border-sky-500/20',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  return (
    <div className={`flex flex-col gap-1 p-3 rounded-lg border ${colors[color]}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-70">
        <Icon className="w-3.5 h-3.5" />{label}
      </div>
      <div className="text-lg font-black text-white">{value}</div>
    </div>
  );
}

function RentalCard({ rental, isHistory, onExpire, onCopy, onInvoice }) {
  return (
    <motion.div
      variants={scaleIn}
      className={`bg-[#111] rounded-lg p-5 border transition-all ${
        isHistory ? 'border-white/[0.06] opacity-70' : 'border-white/[0.08] hover:border-white/[0.14]'
      }`}
    >
      {/* Status + Plan */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${rental.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${rental.status === 'active' ? 'text-emerald-400' : 'text-gray-500'}`}>
            {rental.status}
          </span>
        </div>
        {rental.plan_name && (
          <span className="text-xs text-gray-600 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded">
            {rental.plan_name}
          </span>
        )}
      </div>

      {/* Virtual Key */}
      <div className="mb-4">
        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wider font-medium">Virtual API Key</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/[0.06] font-mono text-xs text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
            {rental.virtual_key}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => !isHistory && onCopy(rental.virtual_key)}
            disabled={isHistory}
            className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-all disabled:opacity-30"
          >
            <Copy className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {isHistory ? (
          <StatChip icon={Clock}     label="Expired"   value={new Date(rental.expires_at).toLocaleDateString()} color="sky" />
        ) : (
          <CountdownTimer
            ttlSeconds={rental.ttl_seconds}
            expiresAt={rental.expires_at}
            onExpire={() => onExpire(rental.id)}
            size="md"
          />
        )}
        <StatChip icon={Zap}       label={isHistory ? 'Tokens Used' : 'Tokens Left'}
          value={`${((isHistory ? rental.tokens_used : rental.tokens_remaining) / 1000).toFixed(1)}K`}
          color={isHistory ? 'sky' : 'violet'} />
        <StatChip icon={TrendingUp} label="Total Cap"  value={`${((rental.tokens_used + rental.tokens_remaining) / 1000).toFixed(1)}K`} color="emerald" />
        <StatChip icon={Key}        label="Requests"   value={rental.requests_made} color="amber" />
      </div>

      {/* Progress */}
      <div className="mb-4">
        <TokenProgressBar
          used={rental.tokens_used}
          remaining={rental.tokens_remaining}
          size={isHistory ? 'sm' : 'md'}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {rental.created_at && (
          <span className="text-xs text-gray-700">
            {new Date(rental.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
        <button
          onClick={() => onInvoice(rental.id)}
          className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors ml-auto"
        >
          <FileText className="w-3.5 h-3.5" />Receipt
        </button>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [activeRentals, setActiveRentals] = useState([]);
  const [historyRentals, setHistoryRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const wsRefs = useRef({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    if (searchParams.get('payment') === 'success' && orderId) {
      setPaymentSuccess(true);
      toast.success('Payment successful! Your rental will activate shortly.');
      paymentAPI.verifyOrder(orderId).catch(() => {});
    }
    loadRentals();
    const interval = setInterval(loadRentals, 30000);
    return () => {
      clearInterval(interval);
      Object.values(wsRefs.current).forEach(ws => ws.close());
    };
  }, []);

  const connectWebSocket = (rentalId) => {
    if (wsRefs.current[rentalId]) return;
    const token = localStorage.getItem('auth_token');
    const ws = new WebSocket(`${WS_BASE}/ws/usage/${rentalId}?token=${token}`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'usage_update') {
          setActiveRentals(prev => prev.map(r =>
            r.id === rentalId ? { ...r, tokens_used: data.tokens_used, tokens_remaining: data.tokens_remaining } : r
          ));
        } else if (data.type === 'rental_expired') {
          handleRentalExpire(rentalId);
        } else if (data.type === 'spending_alert') {
          toast.error(`Spending alert: ₹${data.amount_usd.toFixed(2)} in ${data.window_minutes} min`);
        }
      } catch {}
    };
    ws.onerror = () => ws.close();
    ws.onclose = () => { delete wsRefs.current[rentalId]; };
    wsRefs.current[rentalId] = ws;
  };

  const loadRentals = async () => {
    try {
      const activeResponse = await marketplaceAPI.getActiveRentals();
      setActiveRentals(activeResponse.data);
      activeResponse.data.forEach(r => connectWebSocket(r.id));
      try {
        const token = localStorage.getItem('auth_token');
        const histRes = await fetch('http://localhost:8000/api/rentals/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (histRes.ok) setHistoryRentals(await histRes.json());
      } catch { setHistoryRentals([]); }
    } catch {
      toast.error('Failed to load rentals');
    } finally {
      setLoading(false);
    }
  };

  const handleRentalExpire = (rentalId) => {
    setActiveRentals(prev => prev.filter(r => r.id !== rentalId));
    loadRentals();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('API key copied!');
  };

  const handleViewInvoice = async (rentalId) => {
    try {
      const response = await invoiceAPI.getInvoiceHtml(rentalId);
      const blob = new Blob([response.data], { type: 'text/html' });
      window.open(window.URL.createObjectURL(blob), '_blank');
    } catch { toast.error('Failed to load invoice'); }
  };

  const currentRentals = activeTab === 'active' ? activeRentals : historyRentals;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-6 px-5">
        <motion.div
          variants={staggerContainer(0.1)} initial="hidden" animate="show"
          className="max-w-5xl mx-auto"
        >
          {/* Payment success */}
          <AnimatePresence>
            {paymentSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 flex items-center gap-3 px-4 py-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25"
              >
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-emerald-300 font-semibold text-sm">Payment confirmed!</p>
                  <p className="text-emerald-400/70 text-xs">Your rental is being activated — it will appear below in a few seconds.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={fadeUp} className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-2">Dashboard</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">My Rentals</h1>
              <p className="text-gray-500 text-sm">Manage and monitor your AI API rentals</p>
            </div>
            <div className="flex gap-2">
              <Link to="/playground" className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-white/[0.08] hover:border-white/[0.14] text-gray-300 hover:text-white rounded-lg text-sm transition-all">
                <FlaskConical className="w-4 h-4" />Playground
              </Link>
              <Link to="/marketplace" className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-semibold transition-colors">
                <ShoppingBag className="w-4 h-4" />Buy Plan
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Tabs */}
      <section className="px-5 pb-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-1 p-1 bg-[#111] border border-white/[0.06] rounded-lg w-fit">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-violet-500/20 text-white border border-violet-500/30'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'active' && activeRentals.length > 0 && (
                  <span className="ml-1 w-5 h-5 flex items-center justify-center bg-violet-500/30 text-violet-300 rounded-full text-[10px] font-bold">
                    {activeRentals.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="px-5 pb-16 flex-1">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map(n => <div key={n} className="h-72 bg-[#111] rounded-lg animate-pulse border border-white/[0.04]" />)}
              </motion.div>
            ) : currentRentals.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-center py-20">
                <div className="w-16 h-16 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-violet-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">
                  {activeTab === 'active' ? 'No active rentals' : 'No rental history'}
                </h3>
                <p className="text-gray-600 mb-6 text-sm">
                  {activeTab === 'active' ? 'Purchase a plan to get your virtual API key instantly.' : 'Your past rentals will appear here.'}
                </p>
                {activeTab === 'active' && (
                  <Link to="/marketplace"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors">
                    <ShoppingBag className="w-4 h-4" />Browse Plans
                  </Link>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                variants={staggerContainer(0.07)} initial="hidden" animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {currentRentals.map(rental => (
                  <RentalCard
                    key={rental.id}
                    rental={rental}
                    isHistory={activeTab === 'history'}
                    onExpire={handleRentalExpire}
                    onCopy={copyToClipboard}
                    onInvoice={handleViewInvoice}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <Footer />
    </div>
  );
}
