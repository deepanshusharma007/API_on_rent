import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const EASE = [0.22, 1, 0.36, 1];
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6375rem',
  color: 'var(--nb-text-3)',
  letterSpacing: '0.08em',
  marginBottom: '6px',
};

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();
  const login    = useAuthStore(s => s.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nb-bg)', position: 'relative' }}>
      <div className="nb-grid-hero" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(40px,8vw,80px) 20px' }}>

        <motion.div variants={fadeUp(0)} initial="hidden" animate="show" style={{ marginBottom: '40px', textAlign: 'center' }}>
          <Link to="/" style={{ display: 'inline-block', textDecoration: 'none', marginBottom: '28px' }}>
            <span style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--nb-text)', letterSpacing: '-0.02em' }}>
              AI<span style={{ color: 'var(--nb-green)' }}>Rent</span>
            </span>
          </Link>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--nb-text)', lineHeight: 1.1, marginBottom: '8px' }}>
            Welcome back.
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--nb-text-2)' }}>Sign in to continue building.</p>
        </motion.div>

        <motion.div variants={fadeUp(0.08)} initial="hidden" animate="show"
          style={{ width: '100%', maxWidth: '400px', background: 'var(--nb-surface)', border: '1px solid var(--nb-border)', borderRadius: '4px', padding: '32px' }}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>EMAIL ADDRESS</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--nb-text-3)', pointerEvents: 'none' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="field" style={{ paddingLeft: '36px', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--nb-text-3)', pointerEvents: 'none' }} />
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="field" style={{ paddingLeft: '36px', paddingRight: '40px', borderRadius: '4px' }}
                />
                <button
                  type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--nb-text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.875rem' }}
            >
              {loading
                ? <span style={{ width: '14px', height: '14px', border: '2px solid rgba(2,44,34,0.3)', borderTopColor: '#02180e', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                : <><span>Sign in</span><ArrowRight size={14} /></>
              }
            </button>
          </form>

          <div style={{ height: '1px', background: 'var(--nb-border)', margin: '24px 0' }} />
          <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--nb-text-3)' }}>
            No account yet?{' '}
            <Link to="/register" style={{ color: 'var(--nb-green)', textDecoration: 'none', fontWeight: 500 }}>
              Create one free
            </Link>
          </p>
        </motion.div>

        <motion.p variants={fadeUp(0.14)} initial="hidden" animate="show"
          style={{ marginTop: '24px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--nb-text-3)', letterSpacing: '0.04em' }}
        >
          <Link to="/" style={{ color: 'var(--nb-text-3)', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text-2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-3)'}>
            ← BACK TO HOME
          </Link>
        </motion.p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
