import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, CheckCircle2, Zap, Github } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const EASE = [0.22, 1, 0.36, 1];
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });

const PERKS = [
  'Virtual key in under 60 seconds',
  'Access OpenAI, Anthropic and Google',
  'No subscriptions — pay per rental in INR',
];

const inputStyle = {
  width: '100%', padding: '13px 40px 13px 16px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', outline: 'none',
  fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#e8edf8',
  boxSizing: 'border-box', transition: 'border-color 150ms',
};

const labelStyle = {
  display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
  fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(192,193,255,0.5)',
  marginBottom: '8px',
};

export default function Register() {
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const navigate = useNavigate();
  const register = useAuthStore(s => s.register);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 8)          { toast.error('Min. 8 characters required'); return; }
    setLoading(true);
    const result = await register(email, password);
    if (result.success) {
      toast.success('Account created! Sign in to continue.');
      navigate('/login');
    } else {
      toast.error(result.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0b1120', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>

      {/* Dot-grid */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(192,193,255,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '400px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(78,222,163,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Status text */}
      <div style={{ position: 'fixed', top: '20px', left: '24px', zIndex: 2, fontFamily: 'var(--font-mono)', fontSize: '0.65rem', lineHeight: 1.7, color: 'rgba(192,193,255,0.25)', letterSpacing: '0.04em', pointerEvents: 'none' }}>
        AUTH_MODULE_v1.0.2 // NEW_ACCOUNT_FLOW<br />
        STATUS: INITIALIZING_IDENTITY
      </div>
      <div style={{ position: 'fixed', bottom: '20px', right: '24px', zIndex: 2, fontFamily: 'var(--font-mono)', fontSize: '0.65rem', lineHeight: 1.7, color: 'rgba(192,193,255,0.2)', letterSpacing: '0.04em', textAlign: 'right', pointerEvents: 'none' }}>
        ENCRYPTION: AES-256-GCM<br />NODE: IN-MUM-01
      </div>

      {/* Navbar */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(20px,4vw,40px)', height: '56px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link to="/" style={{ textDecoration: 'none', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', color: '#e8edf8', letterSpacing: '-0.02em' }}>
          AI<span style={{ color: 'var(--primary)' }}>Rent</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {['Marketplace', 'Docs', 'Pricing', 'About'].map(l => (
            <Link key={l} to={`/${l.toLowerCase()}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 120ms' }}
              onMouseEnter={e => e.currentTarget.style.color = '#e8edf8'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >{l}</Link>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/login" style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Login</Link>
          <Link to="/register" style={{ padding: '7px 18px', borderRadius: '8px', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, background: 'var(--primary)', color: 'var(--on-primary)' }}>Sign Up</Link>
        </div>
      </nav>

      {/* Main */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          <motion.div variants={fadeUp(0.04)} initial="hidden" animate="show" style={{
            background: 'rgba(13,18,30,0.9)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: 'clamp(28px,5vw,40px)', backdropFilter: 'blur(12px)',
          }}>
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(1.8rem,4vw,2.4rem)', lineHeight: 1.1, letterSpacing: '-0.03em', color: '#e8edf8', marginBottom: '8px' }}>
                Join the<br />Network
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface-2)' }}>Free account. First rental in 60 seconds.</p>
            </div>

            {/* Perks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {PERKS.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={14} color="var(--secondary)" style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.825rem', color: 'var(--on-surface-2)' }}>{p}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>SYSTEM.USER_EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(192,193,255,0.35)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>SYSTEM.ACCESS_KEY</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(192,193,255,0.35)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>
                    {showPass ? <Eye size={15} /> : <Lock size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>CONFIRM.ACCESS_KEY</label>
                <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(192,193,255,0.35)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'rgba(78,222,163,0.2)' : 'linear-gradient(135deg, #2ab87a 0%, #4edea3 100%)',
                color: loading ? 'rgba(255,255,255,0.4)' : '#003824',
                fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 24px -6px rgba(78,222,163,0.4)',
                opacity: loading ? 0.7 : 1, transition: 'filter 150ms',
              }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
              >
                {loading
                  ? <span style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#003824', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  : <>Initialize Account <Zap size={16} fill="currentColor" /></>}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.2)' }}>OR OAUTH2_PROVIDER</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            </div>

            <button type="button" onClick={() => toast('GitHub OAuth coming soon')} style={{
              width: '100%', padding: '13px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 500,
              color: '#e8edf8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'background 150ms, border-color 150ms',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              <Github size={16} /> Continue with GitHub
            </button>

            <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(255,255,255,0.35)', marginTop: '24px' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
            </p>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
