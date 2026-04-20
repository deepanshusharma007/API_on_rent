import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Key, BarChart3, AlertTriangle, Package, ArrowLeft,
  Plus, Trash2, RefreshCw, DollarSign, Zap, TrendingUp,
  Shield, Download, Loader2, Activity, CheckCircle, XCircle,
  Pencil, Save, X as XIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../api/client';
import Navbar from '../components/Navbar';
import { fadeUp, staggerContainer, scaleIn, viewport } from '../lib/motion';

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: BarChart3 },
  { id: 'users',      label: 'Users',      icon: Users },
  { id: 'plans',      label: 'Plans',      icon: Package },
  { id: 'keys',       label: 'API Keys',   icon: Key },
  { id: 'analytics',  label: 'Analytics',  icon: TrendingUp },
  { id: 'alerts',     label: 'Alerts',     icon: AlertTriangle },
];

const STAT_COLORS = {
  violet:  { ring: 'ring-violet-500/20',  bg: 'bg-violet-500/10',  icon: 'text-violet-400',  val: 'text-violet-300' },
  emerald: { ring: 'ring-emerald-500/20', bg: 'bg-emerald-500/10', icon: 'text-emerald-400', val: 'text-emerald-300' },
  sky:     { ring: 'ring-sky-500/20',     bg: 'bg-sky-500/10',     icon: 'text-sky-400',     val: 'text-sky-300' },
  amber:   { ring: 'ring-amber-500/20',   bg: 'bg-amber-500/10',   icon: 'text-amber-400',   val: 'text-amber-300' },
  rose:    { ring: 'ring-rose-500/20',    bg: 'bg-rose-500/10',    icon: 'text-rose-400',    val: 'text-rose-300' },
};

function StatCard({ icon: Icon, label, value, color = 'violet', sub }) {
  const c = STAT_COLORS[color];
  return (
    <motion.div variants={scaleIn} className={`p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] ring-1 ${c.ring}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <span className="text-gray-500 text-sm">{label}</span>
      </div>
      <div className="text-3xl font-black text-white mb-1">{value}</div>
      {sub && <div className="text-xs text-gray-600">{sub}</div>}
    </motion.div>
  );
}

const tableHead = 'text-left px-5 py-3.5 text-xs text-gray-600 font-semibold uppercase tracking-wider border-b border-white/[0.05]';
const tableCell = 'px-5 py-4 text-sm border-b border-white/[0.03]';
const inputCls  = 'w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 text-sm transition-all';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const adminFetch = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const res = await fetch(`${base}/admin${url}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    });
    if (!res.ok) { const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` })); throw new Error(err.detail); }
    return res.json();
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [s, u, a, al] = await Promise.allSettled([
      adminFetch('/stats'), adminFetch('/users'),
      adminFetch('/analytics?hours=24'), adminFetch('/spending-alerts'),
    ]);
    if (s.status  === 'fulfilled') setStats(s.value);
    if (u.status  === 'fulfilled') setUsers(u.value.users || []);
    if (a.status  === 'fulfilled') setAnalytics(a.value);
    if (al.status === 'fulfilled') setAlerts(al.value.alerts || []);
    setLoading(false);
  };

  // ── OVERVIEW ──
  const OverviewTab = () => (
    <div className="space-y-6">
      <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Total Users"     value={stats?.total_users  || 0}                          color="sky" />
        <StatCard icon={Activity}    label="Active Rentals"  value={stats?.active_rentals || 0}                         color="emerald" />
        <StatCard icon={Package}     label="Total Rentals"   value={stats?.total_rentals || 0}                          color="violet" />
        <StatCard icon={DollarSign}  label="Revenue"         value={`$${(stats?.total_revenue || 0).toFixed(2)}`}       color="amber" />
      </motion.div>
      {analytics && (
        <motion.div variants={fadeUp} initial="hidden" animate="show"
          className="glass-card border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Last 24 h Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Revenue',       val: `$${analytics.revenue_usd?.toFixed(2)}`,       color: 'text-emerald-400' },
              { label: 'Provider Cost', val: `$${analytics.provider_cost_usd?.toFixed(2)}`, color: 'text-rose-400' },
              { label: 'Profit',        val: `$${analytics.profit_usd?.toFixed(2)}`,         color: analytics.profit_usd >= 0 ? 'text-emerald-400' : 'text-rose-400' },
              { label: 'Cache Hit',     val: `${analytics.cache_hit_rate?.toFixed(1)}%`,     color: 'text-violet-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <div className="text-xs text-gray-600 mb-1.5">{label}</div>
                <div className={`text-xl font-black ${color}`}>{val}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );

  // ── USERS ──
  const UsersTab = () => {
    const act = async (id, action) => {
      try { await adminFetch(`/users/${id}/${action}`, { method: 'POST' }); toast.success(`User ${action}d`); loadData(); }
      catch (e) { toast.error(e.message); }
    };
    return (
      <div className="glass-card border border-white/[0.06] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead><tr>
            {['ID', 'Email', 'Role', 'Status', 'Rentals', 'Actions'].map(h => <th key={h} className={tableHead}>{h}</th>)}
          </tr></thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                <td className={tableHead + ' font-mono text-gray-600 border-0 py-4'}># {user.id}</td>
                <td className={tableCell + ' text-white'}>{user.email}</td>
                <td className={tableCell}>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${user.role === 'admin' ? 'text-violet-400 bg-violet-500/10 border-violet-500/20' : 'text-sky-400 bg-sky-500/10 border-sky-500/20'}`}>{user.role}</span>
                </td>
                <td className={tableCell}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className={`text-xs ${user.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>{user.is_active ? 'Active' : 'Suspended'}</span>
                  </div>
                </td>
                <td className={tableCell + ' text-gray-500'}>{user.rental_count}</td>
                <td className={tableCell}>
                  {user.role !== 'admin' && (
                    user.is_active
                      ? <button onClick={() => act(user.id, 'suspend')} className="px-3 py-1.5 text-xs rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all">Suspend</button>
                      : <button onClick={() => act(user.id, 'activate')} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all">Activate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── PLANS ──
  const PlansTab = () => {
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const DURATION_PRESETS = [
    { label: '15 min',  minutes: 15,   emoji: '⚡', tokens: 50_000,     price: 0.99,  rpm: 60 },
    { label: '30 min',  minutes: 30,   emoji: '🕐', tokens: 100_000,    price: 1.99,  rpm: 60 },
    { label: '1 hour',  minutes: 60,   emoji: '🌙', tokens: 200_000,    price: 3.99,  rpm: 60 },
    { label: '1 day',   minutes: 1440, emoji: '☀️', tokens: 2_000_000,  price: 24.99, rpm: 60 },
  ];

  const blankForm = { duration_minutes: 60, duration_label: '1 hour', price: 3.99, token_cap: 200000, rpm_limit: 60, name: '1 Hour Access', description: '' };
  const [form, setForm] = useState(blankForm);

  const applyPreset = (preset) => {
    setForm({
      duration_minutes: preset.minutes,
      duration_label:   preset.label,
      price:            preset.price,
      token_cap:        preset.tokens,
      rpm_limit:        preset.rpm,
      name:             `${preset.label} Access`,
      description:      `${preset.label} access to all available AI models`,
    });
  };

  useEffect(() => { adminFetch('/plans').then(setPlans).catch(() => {}); }, []);
  const refresh = () => adminFetch('/plans').then(setPlans).catch(() => {});

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Plan name is required'); return; }
    try {
      await adminFetch('/plans', { method: 'POST', body: JSON.stringify({ ...form, model_id: null, drain_rate_multiplier: 1.0 }) });
      toast.success('Plan created');
      setShowForm(false);
      setForm(blankForm);
      refresh();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    try { await adminFetch(`/plans/${id}`, { method: 'DELETE' }); toast.success('Plan deactivated'); refresh(); }
    catch (e) { toast.error(e.message); }
  };

  const activePlans   = plans.filter(p => p.is_active);
  const inactivePlans = plans.filter(p => !p.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-white font-bold">Rental Plans</h3>
          <p className="text-gray-600 text-xs mt-0.5">Duration-based plans — one key gives access to all active AI models.</p>
        </div>
        <motion.button whileHover={{ scale: 1.04 }} onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 rounded-xl text-sm transition-all">
          <Plus className="w-4 h-4" />New Plan
        </motion.button>
      </div>

      {/* Tip */}
      <div className="glass-card border border-violet-500/10 bg-violet-500/5 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
        <span className="text-violet-400 font-semibold">How plans work:</span> Each plan gives the user a virtual key valid for the chosen duration.
        The key works with <strong className="text-gray-300">all active AI providers</strong> (OpenAI, Gemini, Anthropic).
        Expensive models consume tokens faster via their drain rate — no separate plans needed per model.
      </div>

      {/* ── Create form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="glass-card border border-violet-500/20 bg-violet-500/5 rounded-2xl p-6 space-y-5">
            <p className="text-xs text-violet-400 uppercase tracking-widest font-semibold">Create a new rental plan</p>

            {/* Duration picker */}
            <div>
              <label className="block text-xs text-gray-500 mb-2.5 uppercase tracking-wider font-semibold">Duration</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DURATION_PRESETS.map(d => (
                  <button key={d.label} onClick={() => applyPreset(d)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.duration_minutes === d.minutes
                        ? 'bg-violet-500/15 border-violet-500/40 ring-1 ring-violet-500/30 text-white'
                        : 'glass-card border-white/[0.06] hover:border-white/[0.14] text-gray-400'
                    }`}>
                    <div className="text-lg mb-1">{d.emoji}</div>
                    <div className="text-xs font-bold">{d.label}</div>
                    <div className="text-gray-600 text-[10px] mt-0.5">{d.tokens >= 1_000_000 ? `${(d.tokens/1_000_000).toFixed(1)}M` : `${(d.tokens/1000).toFixed(0)}K`} tokens</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Editable fields */}
            <div>
              <label className="block text-xs text-gray-500 mb-2.5 uppercase tracking-wider font-semibold">Customise</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'name',      label: 'Plan Name',   type: 'text' },
                  { key: 'price',     label: 'Price (USD)', type: 'number', step: 0.01 },
                  { key: 'token_cap', label: 'Token Cap',   type: 'number' },
                  { key: 'rpm_limit', label: 'RPM Limit',   type: 'number' },
                ].map(f => (
                  <div key={f.key} className={f.key === 'name' ? 'col-span-2' : ''}>
                    <label className="block text-[10px] text-gray-600 mb-1 uppercase tracking-wider">{f.label}</label>
                    <input type={f.type} step={f.step} value={form[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: f.type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                      className={inputCls} />
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border bg-violet-500/10 border-violet-500/30 text-violet-300">
              <strong>{form.name || 'Unnamed plan'}</strong>
              <span className="opacity-60">· ₹{form.price} · {form.token_cap >= 1_000_000 ? `${(form.token_cap/1_000_000).toFixed(1)}M` : `${(form.token_cap/1000).toFixed(0)}K`} tokens · {form.duration_label}</span>
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleCreate}
              className="px-7 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-500/20">
              Create Plan
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active plans ── */}
      {plans.length === 0 ? (
        <div className="glass-card border border-white/[0.06] rounded-2xl py-16 text-center">
          <Package className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">No plans yet. Create one above.</p>
          <p className="text-gray-700 text-xs mt-1">Tip: create one plan per duration (15 min, 30 min, 1 hour, 1 day).</p>
        </div>
      ) : (
        <div className="glass-card border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead><tr>
              {['Duration', 'Name', 'Price', 'Tokens', 'RPM', 'Status', ''].map((h, i) => (
                <th key={i} className={tableHead}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {plans.map(plan => (
                <tr key={plan.id} className={`border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors ${!plan.is_active ? 'opacity-40' : ''}`}>
                  <td className={tableCell}>
                    <span className="text-white font-bold text-sm">{plan.duration_label || `${plan.duration_minutes} min`}</span>
                  </td>
                  <td className={tableCell + ' text-gray-400 text-xs'}>{plan.name}</td>
                  <td className={tableCell}>
                    <span className="text-emerald-400 font-bold">₹{plan.price}</span>
                  </td>
                  <td className={tableCell + ' text-gray-500 text-xs'}>
                    {plan.token_cap >= 1_000_000 ? `${(plan.token_cap/1_000_000).toFixed(1)}M` : `${(plan.token_cap/1000).toFixed(0)}K`}
                  </td>
                  <td className={tableCell + ' text-gray-600 text-xs'}>{plan.rpm_limit}</td>
                  <td className={tableCell}>
                    {plan.is_active
                      ? <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Active</span>
                      : <span className="text-rose-400 text-xs flex items-center gap-1"><XCircle className="w-3 h-3" />Off</span>}
                  </td>
                  <td className={tableCell}>
                    {plan.is_active && (
                      <button onClick={() => handleDelete(plan.id)}
                        className="p-1.5 text-gray-600 hover:text-rose-400 transition-colors" title="Deactivate">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

  // ── API KEYS ──
  const KeysTab = () => {
    const [keys, setKeys] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ provider: 'openai', api_key: '' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ provider: '', is_active: true });

    // Each supported provider with display metadata
    const PROVIDERS = [
      { id: 'openai',    label: 'OpenAI',    models: ['GPT-4o', 'GPT-4o Mini'],              color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/20' },
      { id: 'gemini',    label: 'Google',    models: ['Gemini 1.5 Pro', 'Gemini 1.5 Flash'], color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
      { id: 'anthropic', label: 'Anthropic', models: ['Claude 3.5 Sonnet'],                  color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    ];

    const loadKeys = () => adminFetch('/provider-keys').then(d => setKeys(d.keys || [])).catch(() => {});
    useEffect(() => { loadKeys(); }, []);

    const handleAdd = async () => {
      if (!form.api_key.trim()) { toast.error('Please enter an API key'); return; }
      try {
        await adminFetch('/provider-keys', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success(`${form.provider} key added — models now available`);
        setShowForm(false);
        setForm({ provider: 'openai', api_key: '' });
        loadKeys();
      } catch (e) { toast.error(e.message); }
    };

    const startEdit = (k) => {
      setEditingId(k.id);
      setEditForm({ provider: k.provider, is_active: k.is_active });
    };

    const handleSaveEdit = async (id) => {
      try {
        await adminFetch(`/provider-keys/${id}`, {
          method: 'PUT',
          body: JSON.stringify(editForm),
        });
        toast.success('Key updated');
        setEditingId(null);
        loadKeys();
      } catch (e) { toast.error(e.message); }
    };

    const handleDelete = async (id, providerLabel) => {
      try {
        await adminFetch(`/provider-keys/${id}`, { method: 'DELETE' });
        toast.success(`Key removed — ${providerLabel} models hidden if no keys remain`);
        loadKeys();
      } catch (e) { toast.error(e.message); }
    };

    // Group keys by provider for the availability overview
    const keysByProvider = keys.reduce((acc, k) => {
      if (!acc[k.provider]) acc[k.provider] = [];
      acc[k.provider].push(k);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        {/* ── Provider availability overview ── */}
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-3">
            Provider Availability — models are shown to users only when their provider has ≥ 1 active key
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PROVIDERS.map(p => {
              const providerKeys = keysByProvider[p.id] || [];
              const activeCount  = providerKeys.filter(k => k.is_active).length;
              const isLive       = activeCount > 0;
              return (
                <motion.div key={p.id} variants={scaleIn}
                  className={`glass-card rounded-2xl p-4 border transition-all ${
                    isLive ? `${p.border} ${p.bg}` : 'border-rose-500/20 bg-rose-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold text-sm ${isLive ? p.color : 'text-rose-400'}`}>{p.label}</span>
                    <div className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${
                      isLive ? `${p.bg} ${p.border} ${p.color}` : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-current animate-pulse' : 'bg-rose-400'}`} />
                      {isLive ? `${activeCount} key${activeCount > 1 ? 's' : ''} active` : 'No keys — hidden'}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{p.models.join(' · ')}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Add key button ── */}
        <div className="flex justify-between items-center">
          <h3 className="text-white font-bold">All Keys</h3>
          <motion.button whileHover={{ scale: 1.04 }} onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 rounded-xl text-sm transition-all">
            <Plus className="w-4 h-4" />Add Key
          </motion.button>
        </div>

        {/* ── Add key form ── */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="glass-card border border-violet-500/20 bg-violet-500/5 rounded-2xl p-6 space-y-4">
              <p className="text-xs text-violet-400 uppercase tracking-widest font-semibold">Add Provider API Key</p>

              {/* Provider selector */}
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Provider</label>
                <div className="flex gap-2">
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => setForm({ ...form, provider: p.id })}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        form.provider === p.id
                          ? `${p.bg} ${p.border} ${p.color}`
                          : 'glass-card border-white/[0.06] text-gray-500 hover:text-gray-300'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* API key */}
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                  API Key for {PROVIDERS.find(p => p.id === form.provider)?.label}
                </label>
                <div className="flex gap-3">
                  <input type="text" placeholder={
                    form.provider === 'openai' ? 'sk-...' :
                    form.provider === 'anthropic' ? 'sk-ant-...' : 'AIza...'
                  } value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })}
                    className={inputCls + ' font-mono flex-1'} />
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleAdd}
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-semibold whitespace-nowrap shadow-lg shadow-violet-500/20">
                    Add Key
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Keys table ── */}
        {keys.length === 0 ? (
          <div className="glass-card border border-white/[0.06] rounded-2xl py-16 text-center">
            <Key className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">No provider keys yet. Add one above to enable AI models.</p>
          </div>
        ) : (
          <div className="glass-card border border-white/[0.06] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead><tr>
                {['Provider', 'Key (masked)', 'Usage', 'Status', 'Actions'].map((h, i) => (
                  <th key={i} className={tableHead}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {keys.map(k => {
                  const pMeta   = PROVIDERS.find(p => p.id === k.provider);
                  const isEditing = editingId === k.id;
                  return (
                    <tr key={k.id} className={`transition-colors ${isEditing ? 'bg-violet-500/5' : 'hover:bg-white/[0.02]'}`}>

                      {/* Provider — editable */}
                      <td className={tableCell}>
                        {isEditing ? (
                          <div className="flex gap-1.5">
                            {PROVIDERS.map(p => {
                              const active = editForm.provider === p.id;
                              return (
                                <button key={p.id}
                                  onClick={() => setEditForm({ ...editForm, provider: p.id, model_name: '' })}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${
                                    active
                                      ? `${p.bg} ${p.border} ${p.color}`
                                      : 'bg-white/[0.03] border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20'
                                  }`}>
                                  {p.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs border font-semibold ${pMeta?.color || 'text-gray-400'} ${pMeta?.bg || ''} ${pMeta?.border || 'border-white/10'}`}>
                            {pMeta?.label || k.provider}
                          </span>
                        )}
                      </td>

                      <td className={tableCell + ' font-mono text-gray-400 text-xs'}>{k.key_preview}</td>
                      <td className={tableCell + ' text-gray-500'}>{k.usage_count} calls</td>

                      {/* Status — toggleable when editing */}
                      <td className={tableCell}>
                        {isEditing ? (
                          <button onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-semibold transition-all ${
                              editForm.is_active
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}>
                            {editForm.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {editForm.is_active ? 'Active' : 'Inactive'}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {k.is_active
                              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              : <XCircle    className="w-3.5 h-3.5 text-rose-400" />}
                            <span className={`text-xs ${k.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {k.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className={tableCell}>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={() => handleSaveEdit(k.id)}
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors" title="Save">
                                <Save className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors" title="Cancel">
                                <XIcon className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(k)}
                                className="p-1.5 text-gray-600 hover:text-violet-400 transition-colors" title="Edit">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(k.id, pMeta?.label || k.provider)}
                                className="p-1.5 text-gray-600 hover:text-rose-400 transition-colors" title="Delete key">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ── ANALYTICS ──
  const AnalyticsTab = () => {
    const handleExport = async () => {
      try {
        const response = await adminAPI.getExportCsv(24);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url; link.setAttribute('download', 'analytics_export.csv');
        document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
      } catch { toast.error('Failed to export CSV'); }
    };
    if (!analytics) return <div className="text-gray-500 py-12 text-center">No analytics data yet.</div>;
    return (
      <div className="space-y-5">
        <div className="flex justify-end">
          <motion.button whileHover={{ scale: 1.04 }} onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 rounded-xl text-sm transition-all">
            <Download className="w-4 h-4" />Export CSV
          </motion.button>
        </div>
        <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={DollarSign}  label="Revenue (24h)"    value={`$${analytics.revenue_usd?.toFixed(2)}`}      color="emerald" />
          <StatCard icon={Zap}         label="Provider Cost"    value={`$${analytics.provider_cost_usd?.toFixed(2)}`} color="rose" />
          <StatCard icon={TrendingUp}  label="Profit Margin"    value={`${analytics.profit_margin_pct?.toFixed(1)}%`} color="violet" />
        </motion.div>
        <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard icon={Shield} label="Requests" value={analytics.total_requests} color="sky"
            sub={`${analytics.cached_requests} cached (${analytics.cache_hit_rate?.toFixed(1)}%)`} />
          <StatCard icon={Zap} label="Tokens Used" value={`${(analytics.total_tokens_used / 1000).toFixed(1)}K`} color="amber"
            sub={`${(analytics.tokens_saved_by_cache / 1000).toFixed(1)}K saved by cache`} />
        </motion.div>
        {analytics.per_model?.length > 0 && (
          <div className="glass-card border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <h3 className="text-white font-bold text-sm">Per-Model Breakdown</h3>
            </div>
            <table className="w-full">
              <thead><tr>
                {['Model', 'Requests', 'Tokens', 'Cost'].map((h, i) => (
                  <th key={h} className={tableHead + (i > 0 ? ' text-right' : '')}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {analytics.per_model.map((m, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className={tableCell + ' text-white'}>{m.model}</td>
                    <td className={tableCell + ' text-gray-400 text-right'}>{m.requests}</td>
                    <td className={tableCell + ' text-gray-400 text-right'}>{(m.tokens / 1000).toFixed(1)}K</td>
                    <td className={tableCell + ' text-gray-400 text-right'}>${m.cost_usd.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ── ALERTS ──
  const AlertsTab = () => (
    <div className="glass-card border border-white/[0.06] rounded-2xl overflow-hidden">
      {alerts.length === 0 ? (
        <div className="py-20 text-center">
          <Shield className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-600">No spending alerts yet</p>
        </div>
      ) : (
        <table className="w-full">
          <thead><tr>
            {['User', 'Amount', 'Window', 'Action', 'Time'].map(h => <th key={h} className={tableHead}>{h}</th>)}
          </tr></thead>
          <tbody>
            {alerts.map(alert => (
              <tr key={alert.id} className="hover:bg-white/[0.02]">
                <td className={tableCell + ' text-white'}>{alert.user_email}</td>
                <td className={tableCell + ' text-rose-400 font-bold'}>₹{alert.amount_usd.toFixed(2)}</td>
                <td className={tableCell + ' text-gray-500'}>{alert.window_minutes} min</td>
                <td className={tableCell}>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${alert.was_suspended ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                    {alert.was_suspended ? 'Suspended' : 'Warned'}
                  </span>
                </td>
                <td className={tableCell + ' text-gray-600 text-xs'}>{new Date(alert.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const TAB_MAP = { overview: OverviewTab, users: UsersTab, plans: PlansTab, keys: KeysTab, analytics: AnalyticsTab, alerts: AlertsTab };
  const ActiveTab = TAB_MAP[activeTab];

  if (loading) return (
    <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#07070f]">
      <Navbar />

      {/* Header */}
      <section className="relative pt-36 pb-8 px-5 overflow-hidden">
        <div className="blob-3 top-0 right-0 opacity-25" />
        <div className="absolute inset-0 grid-pattern opacity-15" />
        <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show"
          className="relative max-w-6xl mx-auto flex items-end justify-between flex-wrap gap-4">
          <motion.div variants={fadeUp}>
            <p className="text-violet-400 text-sm font-semibold tracking-widest uppercase mb-2">Admin</p>
            <h1 className="text-4xl font-black text-white mb-1">Control Panel</h1>
            <p className="text-gray-500 text-sm">Platform management & analytics</p>
          </motion.div>
          <motion.button variants={fadeUp} onClick={loadData} whileHover={{ scale: 1.04 }}
            className="flex items-center gap-2 px-4 py-2.5 glass-card border border-white/[0.08] hover:border-white/[0.16] text-gray-400 hover:text-white rounded-xl text-sm transition-all">
            <RefreshCw className="w-4 h-4" />Refresh
          </motion.button>
        </motion.div>
      </section>

      {/* Tabs */}
      <section className="px-5 pb-6">
        <div className="max-w-6xl mx-auto overflow-x-auto">
          <div className="flex gap-1.5 p-1.5 glass-card border border-white/[0.06] rounded-2xl w-fit min-w-full sm:min-w-0">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-violet-500/20 text-white border border-violet-500/30'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="px-5 pb-16 flex-1">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}>
              <ActiveTab />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
