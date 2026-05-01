import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Key, BarChart3, AlertTriangle, Package,
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

// Colour sets for stat cards — emerald is primary, others are semantic
const STAT_COLORS = {
  emerald: { bg: 'rgba(16,185,129,0.08)', icon: '#10b981', val: '#34d399' },
  sky:     { bg: 'rgba(56,189,248,0.08)', icon: '#38bdf8', val: '#7dd3fc' },
  amber:   { bg: 'rgba(251,191,36,0.08)', icon: '#fbbf24', val: '#fde68a' },
  rose:    { bg: 'rgba(251,113,133,0.08)', icon: '#fb7185', val: '#fda4af' },
};

function StatCard({ icon: Icon, label, value, color = 'emerald', sub }) {
  const c = STAT_COLORS[color] || STAT_COLORS.emerald;
  return (
    <motion.div variants={scaleIn} style={{
      padding: '20px', borderRadius: '10px',
      background: 'var(--c-surface)', border: '1px solid var(--c-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color: c.icon }} />
        </div>
        <span style={{ color: 'var(--c-text-3)', fontSize: '0.825rem' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', marginBottom: sub ? '4px' : 0 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--c-text-3)' }}>{sub}</div>}
    </motion.div>
  );
}

const thStyle = { textAlign: 'left', padding: '10px 16px', fontSize: '0.7rem', color: 'var(--c-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--c-border)' };
const tdStyle = { padding: '12px 16px', fontSize: '0.825rem', borderBottom: '1px solid var(--c-border)' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', background: 'var(--c-raised)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats,     setStats]     = useState(null);
  const [users,     setUsers]     = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [alerts,    setAlerts]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  const adminFetch = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    const base  = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const res   = await fetch(`${base}/admin${url}`, {
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

  // ── OVERVIEW ──────────────────────────────────────────────────────────────────
  const OverviewTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}      label="Total Users"    value={stats?.total_users   || 0}                          color="sky" />
        <StatCard icon={Activity}   label="Active Rentals" value={stats?.active_rentals || 0}                          color="emerald" />
        <StatCard icon={Package}    label="Total Rentals"  value={stats?.total_rentals  || 0}                          color="sky" />
        <StatCard icon={DollarSign} label="Revenue"        value={`₹${(stats?.total_revenue || 0).toFixed(2)}`}        color="amber" />
      </motion.div>
      {analytics && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" style={{
          background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '20px',
        }}>
          <h3 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Last 24 h Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Revenue',       val: `₹${analytics.revenue_usd?.toFixed(2)}`,       color: '#10b981' },
              { label: 'Provider Cost', val: `₹${analytics.provider_cost_usd?.toFixed(2)}`, color: '#fb7185' },
              { label: 'Profit',        val: `₹${analytics.profit_usd?.toFixed(2)}`,         color: analytics.profit_usd >= 0 ? '#10b981' : '#fb7185' },
              { label: 'Cache Hit',     val: `${analytics.cache_hit_rate?.toFixed(1)}%`,     color: 'var(--c-accent)' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ padding: '16px', borderRadius: '8px', background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{val}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );

  // ── USERS ──────────────────────────────────────────────────────────────────────
  const UsersTab = () => {
    const act = async (id, action) => {
      try { await adminFetch(`/users/${id}/${action}`, { method: 'POST' }); toast.success(`User ${action}d`); loadData(); }
      catch (e) { toast.error(e.message); }
    };
    return (
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {['ID', 'Email', 'Role', 'Status', 'Rentals', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
          </tr></thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ transition: 'background 100ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--c-raised)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--c-text-3)', fontSize: '0.75rem' }}># {user.id}</td>
                <td style={{ ...tdStyle, color: 'var(--c-text)' }}>{user.email}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', border: '1px solid',
                    background: user.role === 'admin' ? 'var(--c-accent-bg)' : 'rgba(56,189,248,0.08)',
                    borderColor: user.role === 'admin' ? 'var(--c-accent-border)' : 'rgba(56,189,248,0.25)',
                    color: user.role === 'admin' ? 'var(--c-accent-hi)' : '#7dd3fc',
                  }}>{user.role}</span>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: user.is_active ? '#10b981' : '#fb7185' }} />
                    <span style={{ fontSize: '0.775rem', color: user.is_active ? '#10b981' : '#fb7185' }}>
                      {user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </td>
                <td style={{ ...tdStyle, color: 'var(--c-text-3)' }}>{user.rental_count}</td>
                <td style={tdStyle}>
                  {user.role !== 'admin' && (
                    user.is_active
                      ? <button onClick={() => act(user.id, 'suspend')} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: '#fb7185', cursor: 'pointer' }}>Suspend</button>
                      : <button onClick={() => act(user.id, 'activate')} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-border)', color: 'var(--c-accent-hi)', cursor: 'pointer' }}>Activate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── PLANS ──────────────────────────────────────────────────────────────────────
  const PlansTab = () => {
    const [plans, setPlans] = useState([]);
    const [showForm, setShowForm] = useState(false);

    const DURATION_PRESETS = [
      { label: '15 min',  minutes: 15,   tokens: 50_000,    price: 0.99,  rpm: 60 },
      { label: '30 min',  minutes: 30,   tokens: 100_000,   price: 1.99,  rpm: 60 },
      { label: '1 hour',  minutes: 60,   tokens: 200_000,   price: 3.99,  rpm: 60 },
      { label: '1 day',   minutes: 1440, tokens: 2_000_000, price: 24.99, rpm: 60 },
    ];

    const blankForm = { duration_minutes: 60, duration_label: '1 hour', price: 3.99, token_cap: 200000, rpm_limit: 60, name: '1 Hour Access', description: '' };
    const [form, setForm] = useState(blankForm);

    const applyPreset = (preset) => setForm({
      duration_minutes: preset.minutes, duration_label: preset.label,
      price: preset.price, token_cap: preset.tokens, rpm_limit: preset.rpm,
      name: `${preset.label} Access`,
      description: `${preset.label} access to all available AI models`,
    });

    useEffect(() => { adminFetch('/plans').then(setPlans).catch(() => {}); }, []);
    const refresh = () => adminFetch('/plans').then(setPlans).catch(() => {});

    const handleCreate = async () => {
      if (!form.name.trim()) { toast.error('Plan name is required'); return; }
      try {
        await adminFetch('/plans', { method: 'POST', body: JSON.stringify({ ...form, model_id: null, drain_rate_multiplier: 1.0 }) });
        toast.success('Plan created'); setShowForm(false); setForm(blankForm); refresh();
      } catch (e) { toast.error(e.message); }
    };

    const handleDelete = async (id) => {
      try { await adminFetch(`/plans/${id}`, { method: 'DELETE' }); toast.success('Plan deactivated'); refresh(); }
      catch (e) { toast.error(e.message); }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '0.95rem' }}>Rental Plans</h3>
            <p style={{ color: 'var(--c-text-3)', fontSize: '0.775rem', marginTop: '2px' }}>Duration-based plans — one key gives access to all active AI models.</p>
          </div>
          <button onClick={() => setShowForm(v => !v)} className="btn btn-primary" style={{ fontSize: '0.825rem' }}>
            <Plus size={14} /> New Plan
          </button>
        </div>

        {/* Info tip */}
        <div style={{ background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-border)', borderRadius: '8px', padding: '14px 16px', fontSize: '0.8rem', color: 'var(--c-text-2)', lineHeight: 1.6 }}>
          <span style={{ color: 'var(--c-accent-hi)', fontWeight: 600 }}>How plans work: </span>
          Each plan gives the user a virtual key valid for the chosen duration. The key works with all active AI providers (OpenAI, Gemini, Anthropic). Expensive models consume tokens faster via their drain rate — no separate plans needed per model.
        </div>

        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-accent-border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ color: 'var(--c-accent)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Create a new rental plan</p>

              {/* Duration presets */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '10px' }}>Duration</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DURATION_PRESETS.map(d => (
                    <button key={d.label} onClick={() => applyPreset(d)}
                      style={{
                        padding: '12px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                        background: form.duration_minutes === d.minutes ? 'var(--c-accent-bg)' : 'var(--c-raised)',
                        border: `1px solid ${form.duration_minutes === d.minutes ? 'var(--c-accent-border)' : 'var(--c-border)'}`,
                        transition: 'all 150ms',
                      }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--c-text)', marginBottom: '2px' }}>{d.label}</div>
                      <div style={{ color: 'var(--c-text-3)', fontSize: '0.7rem' }}>{d.tokens >= 1_000_000 ? `${(d.tokens/1_000_000).toFixed(1)}M` : `${(d.tokens/1000).toFixed(0)}K`} tokens</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fields */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '10px' }}>Customise</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'name',      label: 'Plan Name',   type: 'text' },
                    { key: 'price',     label: 'Price (INR)', type: 'number', step: 0.01 },
                    { key: 'token_cap', label: 'Token Cap',   type: 'number' },
                    { key: 'rpm_limit', label: 'RPM Limit',   type: 'number' },
                  ].map(f => (
                    <div key={f.key} className={f.key === 'name' ? 'col-span-2' : ''}>
                      <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{f.label}</label>
                      <input type={f.type} step={f.step} value={form[f.key]}
                        onChange={e => setForm({ ...form, [f.key]: f.type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'var(--c-accent)'}
                        onBlur={e  => e.target.style.borderColor = 'var(--c-border)'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '6px 12px', borderRadius: '6px', fontSize: '0.775rem',
                background: 'var(--c-accent-bg)', border: '1px solid var(--c-accent-border)', color: 'var(--c-accent-hi)',
              }}>
                <strong>{form.name || 'Unnamed plan'}</strong>
                <span style={{ opacity: 0.7 }}>· ₹{form.price} · {form.token_cap >= 1_000_000 ? `${(form.token_cap/1_000_000).toFixed(1)}M` : `${(form.token_cap/1000).toFixed(0)}K`} tokens · {form.duration_label}</span>
              </div>

              <div>
                <button onClick={handleCreate} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>Create Plan</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        {plans.length === 0 ? (
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '64px 20px', textAlign: 'center' }}>
            <Package size={36} style={{ color: 'var(--c-border-hi)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem' }}>No plans yet. Create one above.</p>
          </div>
        ) : (
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Duration', 'Name', 'Price', 'Tokens', 'RPM', 'Status', ''].map((h, i) => (
                  <th key={i} style={thStyle}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id} style={{ opacity: plan.is_active ? 1 : 0.4, transition: 'background 100ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--c-raised)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, color: 'var(--c-text)', fontWeight: 700 }}>{plan.duration_label || `${plan.duration_minutes} min`}</td>
                    <td style={{ ...tdStyle, color: 'var(--c-text-2)', fontSize: '0.775rem' }}>{plan.name}</td>
                    <td style={tdStyle}><span style={{ color: 'var(--c-accent)', fontWeight: 700 }}>₹{plan.price}</span></td>
                    <td style={{ ...tdStyle, color: 'var(--c-text-3)', fontSize: '0.775rem' }}>
                      {plan.token_cap >= 1_000_000 ? `${(plan.token_cap/1_000_000).toFixed(1)}M` : `${(plan.token_cap/1000).toFixed(0)}K`}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--c-text-3)', fontSize: '0.775rem' }}>{plan.rpm_limit}</td>
                    <td style={tdStyle}>
                      {plan.is_active
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.775rem' }}><CheckCircle size={12} />Active</span>
                        : <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fb7185', fontSize: '0.775rem' }}><XCircle size={12} />Off</span>}
                    </td>
                    <td style={tdStyle}>
                      {plan.is_active && (
                        <button onClick={() => handleDelete(plan.id)} style={{ padding: '4px', color: 'var(--c-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#fb7185'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--c-text-3)'}>
                          <Trash2 size={14} />
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

  // ── API KEYS ──────────────────────────────────────────────────────────────────
  const KeysTab = () => {
    const [keys, setKeys] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ provider: 'openai', api_key: '' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ provider: '', is_active: true });

    const PROVIDERS = [
      { id: 'openai',    label: 'OpenAI',    models: ['GPT-4o', 'GPT-4o Mini'],              accent: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)' },
      { id: 'gemini',    label: 'Google',    models: ['Gemini 1.5 Pro', 'Gemini 1.5 Flash'], accent: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.3)' },
      { id: 'anthropic', label: 'Anthropic', models: ['Claude 3.5 Sonnet'],                  accent: '#fb923c', bg: 'rgba(251,146,60,0.08)',   border: 'rgba(251,146,60,0.3)' },
    ];

    const loadKeys = () => adminFetch('/provider-keys').then(d => setKeys(d.keys || [])).catch(() => {});
    useEffect(() => { loadKeys(); }, []);

    const handleAdd = async () => {
      if (!form.api_key.trim()) { toast.error('Please enter an API key'); return; }
      try {
        await adminFetch('/provider-keys', { method: 'POST', body: JSON.stringify(form) });
        toast.success(`${form.provider} key added`);
        setShowForm(false); setForm({ provider: 'openai', api_key: '' }); loadKeys();
      } catch (e) { toast.error(e.message); }
    };

    const startEdit = (k) => { setEditingId(k.id); setEditForm({ provider: k.provider, is_active: k.is_active }); };

    const handleSaveEdit = async (id) => {
      try { await adminFetch(`/provider-keys/${id}`, { method: 'PUT', body: JSON.stringify(editForm) }); toast.success('Key updated'); setEditingId(null); loadKeys(); }
      catch (e) { toast.error(e.message); }
    };

    const handleDelete = async (id, providerLabel) => {
      try { await adminFetch(`/provider-keys/${id}`, { method: 'DELETE' }); toast.success(`Key removed — ${providerLabel} models hidden if no keys remain`); loadKeys(); }
      catch (e) { toast.error(e.message); }
    };

    const keysByProvider = keys.reduce((acc, k) => { if (!acc[k.provider]) acc[k.provider] = []; acc[k.provider].push(k); return acc; }, {});

    const getP = (id) => PROVIDERS.find(p => p.id === id);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Provider availability */}
        <div>
          <p style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '12px' }}>
            Provider Availability — models shown to users only when ≥ 1 active key
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PROVIDERS.map(p => {
              const provKeys   = keysByProvider[p.id] || [];
              const active     = provKeys.filter(k => k.is_active).length;
              const isLive     = active > 0;
              return (
                <motion.div key={p.id} variants={scaleIn} style={{
                  borderRadius: '10px', padding: '16px',
                  background: isLive ? p.bg : 'rgba(251,113,133,0.06)',
                  border: `1px solid ${isLive ? p.border : 'rgba(251,113,133,0.25)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isLive ? p.accent : '#fb7185' }}>{p.label}</span>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px',
                      background: isLive ? p.bg : 'rgba(251,113,133,0.08)',
                      border: `1px solid ${isLive ? p.border : 'rgba(251,113,133,0.25)'}`,
                      color: isLive ? p.accent : '#fb7185',
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', animation: isLive ? 'pulse 2s infinite' : 'none' }} />
                      {isLive ? `${active} key${active > 1 ? 's' : ''} active` : 'No keys — hidden'}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--c-text-3)' }}>{p.models.join(' · ')}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Add key button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '0.95rem' }}>All Keys</h3>
          <button onClick={() => setShowForm(v => !v)} className="btn btn-primary" style={{ fontSize: '0.825rem' }}>
            <Plus size={14} /> Add Key
          </button>
        </div>

        {/* Add key form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-accent-border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--c-accent)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Add Provider API Key</p>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Provider</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => setForm({ ...form, provider: p.id })}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        background: form.provider === p.id ? p.bg : 'var(--c-raised)',
                        border: `1px solid ${form.provider === p.id ? p.border : 'var(--c-border)'}`,
                        color: form.provider === p.id ? p.accent : 'var(--c-text-3)',
                        transition: 'all 150ms',
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  API Key for {PROVIDERS.find(p => p.id === form.provider)?.label}
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text"
                    placeholder={form.provider === 'openai' ? 'sk-...' : form.provider === 'anthropic' ? 'sk-ant-...' : 'AIza...'}
                    value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })}
                    style={{ ...inputStyle, fontFamily: 'monospace', flex: 1 }}
                    onFocus={e => e.target.style.borderColor = 'var(--c-accent)'}
                    onBlur={e  => e.target.style.borderColor = 'var(--c-border)'}
                  />
                  <button onClick={handleAdd} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Add Key</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keys table */}
        {keys.length === 0 ? (
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', padding: '64px 20px', textAlign: 'center' }}>
            <Key size={36} style={{ color: 'var(--c-border-hi)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem' }}>No provider keys yet. Add one above to enable AI models.</p>
          </div>
        ) : (
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Provider', 'Key (masked)', 'Usage', 'Status', 'Actions'].map((h, i) => (
                  <th key={i} style={thStyle}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {keys.map(k => {
                  const pMeta   = getP(k.provider);
                  const isEditing = editingId === k.id;
                  return (
                    <tr key={k.id} style={{ background: isEditing ? 'var(--c-raised)' : 'transparent', transition: 'background 100ms' }}
                      onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = 'var(--c-raised)'; }}
                      onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = 'transparent'; }}>

                      <td style={tdStyle}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {PROVIDERS.map(p => (
                              <button key={p.id}
                                onClick={() => setEditForm({ ...editForm, provider: p.id })}
                                style={{
                                  padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                  background: editForm.provider === p.id ? p.bg : 'var(--c-raised)',
                                  border: `1px solid ${editForm.provider === p.id ? p.border : 'var(--c-border)'}`,
                                  color: editForm.provider === p.id ? p.accent : 'var(--c-text-3)',
                                }}>
                                {p.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span style={{
                            padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                            background: pMeta?.bg || 'var(--c-raised)',
                            border: `1px solid ${pMeta?.border || 'var(--c-border)'}`,
                            color: pMeta?.accent || 'var(--c-text-3)',
                          }}>
                            {pMeta?.label || k.provider}
                          </span>
                        )}
                      </td>

                      <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--c-text-2)', fontSize: '0.775rem' }}>{k.key_preview}</td>
                      <td style={{ ...tdStyle, color: 'var(--c-text-3)' }}>{k.usage_count} calls</td>

                      <td style={tdStyle}>
                        {isEditing ? (
                          <button onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                              background: editForm.is_active ? 'rgba(16,185,129,0.08)' : 'rgba(251,113,133,0.08)',
                              border: `1px solid ${editForm.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(251,113,133,0.3)'}`,
                              color: editForm.is_active ? '#10b981' : '#fb7185',
                            }}>
                            {editForm.is_active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                            {editForm.is_active ? 'Active' : 'Inactive'}
                          </button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {k.is_active ? <CheckCircle size={13} style={{ color: '#10b981' }} /> : <XCircle size={13} style={{ color: '#fb7185' }} />}
                            <span style={{ fontSize: '0.775rem', color: k.is_active ? '#10b981' : '#fb7185' }}>
                              {k.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isEditing ? (
                            <>
                              <button onClick={() => handleSaveEdit(k.id)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#10b981' }}><Save size={14} /></button>
                              <button onClick={() => setEditingId(null)}    style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-3)' }}><XIcon size={14} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(k)}
                                style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-3)' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--c-accent)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--c-text-3)'}><Pencil size={13} /></button>
                              <button onClick={() => handleDelete(k.id, pMeta?.label || k.provider)}
                                style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-3)' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#fb7185'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--c-text-3)'}><Trash2 size={13} /></button>
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

  // ── ANALYTICS ──────────────────────────────────────────────────────────────────
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
    if (!analytics) return <div style={{ color: 'var(--c-text-3)', padding: '48px', textAlign: 'center' }}>No analytics data yet.</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleExport} className="btn btn-secondary" style={{ fontSize: '0.825rem' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
        <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={DollarSign} label="Revenue (24h)"  value={`₹${analytics.revenue_usd?.toFixed(2)}`}      color="emerald" />
          <StatCard icon={Zap}        label="Provider Cost"  value={`₹${analytics.provider_cost_usd?.toFixed(2)}`} color="rose" />
          <StatCard icon={TrendingUp} label="Profit Margin"  value={`${analytics.profit_margin_pct?.toFixed(1)}%`} color="amber" />
        </motion.div>
        <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard icon={Shield} label="Requests"   value={analytics.total_requests} color="sky"
            sub={`${analytics.cached_requests} cached (${analytics.cache_hit_rate?.toFixed(1)}%)`} />
          <StatCard icon={Zap}    label="Tokens Used" value={`${(analytics.total_tokens_used / 1000).toFixed(1)}K`} color="emerald"
            sub={`${(analytics.tokens_saved_by_cache / 1000).toFixed(1)}K saved by cache`} />
        </motion.div>
        {analytics.per_model?.length > 0 && (
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)' }}>
              <h3 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '0.875rem' }}>Per-Model Breakdown</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Model', 'Requests', 'Tokens', 'Cost'].map((h, i) => (
                  <th key={h} style={{ ...thStyle, textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {analytics.per_model.map((m, i) => (
                  <tr key={i} style={{ transition: 'background 100ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--c-raised)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, color: 'var(--c-text)' }}>{m.model}</td>
                    <td style={{ ...tdStyle, color: 'var(--c-text-2)', textAlign: 'right' }}>{m.requests}</td>
                    <td style={{ ...tdStyle, color: 'var(--c-text-2)', textAlign: 'right' }}>{(m.tokens / 1000).toFixed(1)}K</td>
                    <td style={{ ...tdStyle, color: 'var(--c-text-2)', textAlign: 'right' }}>₹{m.cost_usd.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ── ALERTS ──────────────────────────────────────────────────────────────────────
  const AlertsTab = () => (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '10px', overflow: 'hidden' }}>
      {alerts.length === 0 ? (
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <Shield size={36} style={{ color: 'var(--c-border-hi)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--c-text-3)' }}>No spending alerts yet</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {['User', 'Amount', 'Window', 'Action', 'Time'].map(h => <th key={h} style={thStyle}>{h}</th>)}
          </tr></thead>
          <tbody>
            {alerts.map(alert => (
              <tr key={alert.id} style={{ transition: 'background 100ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--c-raised)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ ...tdStyle, color: 'var(--c-text)' }}>{alert.user_email}</td>
                <td style={{ ...tdStyle, color: '#fb7185', fontWeight: 700 }}>₹{alert.amount_usd.toFixed(2)}</td>
                <td style={{ ...tdStyle, color: 'var(--c-text-3)' }}>{alert.window_minutes} min</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', border: '1px solid',
                    background: alert.was_suspended ? 'rgba(251,113,133,0.08)' : 'rgba(251,191,36,0.08)',
                    borderColor: alert.was_suspended ? 'rgba(251,113,133,0.25)' : 'rgba(251,191,36,0.25)',
                    color: alert.was_suspended ? '#fb7185' : '#fbbf24',
                  }}>
                    {alert.was_suspended ? 'Suspended' : 'Warned'}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: 'var(--c-text-3)', fontSize: '0.75rem' }}>{new Date(alert.created_at).toLocaleString()}</td>
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
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} style={{ color: 'var(--c-accent)', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Navbar />

      {/* Header */}
      <section style={{ paddingTop: '120px', paddingBottom: '24px', paddingLeft: '20px', paddingRight: '20px' }}>
        <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show"
          className="max-w-6xl mx-auto flex items-end justify-between flex-wrap gap-4">
          <motion.div variants={fadeUp}>
            <p className="eyebrow mb-2">Admin</p>
            <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', marginBottom: '4px' }}>Control Panel</h1>
            <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem' }}>Platform management & analytics</p>
          </motion.div>
          <motion.button variants={fadeUp} onClick={loadData} className="btn btn-secondary" style={{ fontSize: '0.825rem' }}>
            <RefreshCw size={14} /> Refresh
          </motion.button>
        </motion.div>
      </section>

      {/* Tabs */}
      <section style={{ paddingLeft: '20px', paddingRight: '20px', paddingBottom: '20px' }}>
        <div className="max-w-6xl mx-auto" style={{ overflowX: 'auto' }}>
          <div style={{
            display: 'inline-flex', gap: '4px', padding: '4px',
            background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '8px',
            minWidth: '100%',
          }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '6px', fontSize: '0.775rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap',
                  border: '1px solid',
                  background:  activeTab === tab.id ? 'var(--c-accent-bg)'     : 'transparent',
                  borderColor: activeTab === tab.id ? 'var(--c-accent-border)' : 'transparent',
                  color:       activeTab === tab.id ? 'var(--c-accent-hi)'     : 'var(--c-text-3)',
                  transition: 'all 150ms',
                }}>
                <tab.icon size={13} />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: '0 20px 80px', flex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <ActiveTab />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
