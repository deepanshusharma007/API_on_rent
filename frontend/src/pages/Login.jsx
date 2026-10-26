import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { FormMessage } from '../components/AuthShell';

const EASE = [0.22, 1, 0.36, 1];
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [remember, setRemember] = useState(false);
  const [error,    setError]    = useState('');
  const [bannerUp, setBannerUp] = useState(() => sessionStorage.getItem('banner_dismissed') !== 'true');
  const navigate = useNavigate();
  const login    = useAuthStore(s => s.login);
  const googleLogin = useAuthStore(s => s.googleLogin);

  useEffect(() => {
    const id = setInterval(() => setBannerUp(sessionStorage.getItem('banner_dismissed') !== 'true'), 200);
    return () => clearInterval(id);
  }, []);

  const finish = (result) => {
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid credentials');
      toast.error(result.error || 'Invalid credentials');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email.trim(), password, remember);
    setLoading(false);
    finish(result);
  };

  const handleGoogle = async (credential) => {
    setError('');
    setLoading(true);
    const result = await googleLogin(credential, remember);
    setLoading(false);
    finish(result);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-alt)', position: 'relative', overflow: 'hidden',
      fontFamily: 'var(--font-body)',
    }}>

      {bannerUp && <div style={{ height: '40px', flexShrink: 0 }} />}

      {/* Dot-grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(18,58,44,0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Subtle center glow */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '600px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(191,226,58,0.3) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Top-left status text */}
      <div className="auth-deco" style={{
        position: 'fixed', top: '20px', left: '24px', zIndex: 2,
        fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', lineHeight: 1.7,
        color: 'rgba(18,58,44,0.25)', letterSpacing: '0.04em',
        pointerEvents: 'none',
      }}>
        AUTH_MODULE_v1.0.2 // SECURE_HANDSHAKE<br />
        STATUS: LISTENING_FOR_CREDENTIALS
      </div>

      {/* Bottom-right node info */}
      <div className="auth-deco" style={{
        position: 'fixed', bottom: '20px', right: '24px', zIndex: 2,
        fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', lineHeight: 1.7,
        color: 'rgba(18,58,44,0.2)', letterSpacing: '0.04em',
        textAlign: 'right', pointerEvents: 'none',
      }}>
        ENCRYPTION: AES-256-GCM<br />
        NODE: IN-MUM-01
      </div>

      {/* Navbar strip */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,4vw,40px)', height: '56px',
        borderBottom: '1px solid rgba(18,58,44,0.07)',
      }}>
        <Link to="/" style={{ textDecoration: 'none', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '1.6rem', lineHeight: 1, color: 'var(--on-surface)' }}>
          AIRent
        </Link>
        <div className="auth-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {['Marketplace', 'Docs', 'Pricing', 'About'].map(l => (
            <Link key={l} to={`/${l.toLowerCase()}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(18,58,44,0.6)', textDecoration: 'none', transition: 'color 120ms' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(18,58,44,0.6)'}
            >{l}</Link>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(18,58,44,0.6)' }}>Login</span>
          <Link to="/register" style={{
            padding: '7px 18px', borderRadius: '8px', textDecoration: 'none',
            fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600,
            background: 'var(--primary)', color: 'var(--on-primary)',
            transition: 'filter 120ms',
          }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'none'}
          >Sign Up</Link>
        </div>
      </nav>

      {/* Main centered content */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Card */}
          <motion.div variants={fadeUp(0.04)} initial="hidden" animate="show" style={{
            background: 'rgba(255,252,245,0.94)',
            border: '1px solid rgba(18,58,44,0.14)',
            borderRadius: '16px',
            padding: 'clamp(28px,5vw,40px)',
            backdropFilter: 'blur(12px)',
          }}>

            {/* Heading */}
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{
                fontFamily: 'var(--font-head)', fontWeight: 500,
                fontSize: 'clamp(2rem,5vw,2.8rem)', lineHeight: 1,
                letterSpacing: '-0.02em', color: 'var(--on-surface)', marginBottom: '8px',
              }}>
                Welcome Back,<br />Architect
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface-2)' }}>
                Access your compute dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <FormMessage>{error}</FormMessage>
              {/* Email */}
              <div style={{ marginBottom: '18px' }}>
                <label htmlFor="login-email" style={{
                  display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem',
                  fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(18,58,44,0.5)',
                  marginBottom: '8px',
                }}>SYSTEM.USER_EMAIL</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="dev@air-ent.io" required
                    style={{
                      width: '100%', padding: '13px 40px 13px 16px',
                      background: 'rgba(18,58,44,0.05)',
                      border: '1px solid rgba(18,58,44,0.18)',
                      borderRadius: '10px', outline: 'none',
                      fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface)',
                      boxSizing: 'border-box', transition: 'border-color 150ms',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(18,58,44,0.35)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(18,58,44,0.18)'}
                  />
                  <Mail size={15} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(18,58,44,0.34)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label htmlFor="login-password" style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.6875rem',
                    fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(18,58,44,0.5)',
                  }}>SYSTEM.ACCESS_KEY</label>
                  <Link to="/forgot-password" style={{
                    textDecoration: 'none',
                    fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700,
                    letterSpacing: '0.06em', color: 'rgba(18,58,44,0.4)',
                    transition: 'color 120ms', padding: 0,
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(18,58,44,0.4)'}
                  >
                    FORGOT?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-password" autoComplete="current-password"
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    style={{
                      width: '100%', padding: '13px 40px 13px 16px',
                      background: 'rgba(18,58,44,0.05)',
                      border: '1px solid rgba(18,58,44,0.18)',
                      borderRadius: '10px', outline: 'none',
                      fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface)',
                      boxSizing: 'border-box', transition: 'border-color 150ms',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(18,58,44,0.35)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(18,58,44,0.18)'}
                  />
                  <button
                    type="button" onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'} aria-pressed={showPass}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(18,58,44,0.34)', lineHeight: 1, transition: 'color 120ms' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(18,58,44,0.6)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(18,58,44,0.34)'}
                  >
                    {showPass ? <Eye size={15} /> : <Lock size={15} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', cursor: 'pointer', fontSize: '0.85rem', color: 'rgba(18,58,44,0.7)' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  style={{ width: '15px', height: '15px', accentColor: 'var(--primary-dim)', cursor: 'pointer' }} />
                Remember me for 30 days
              </label>

              {/* Authenticate button */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: '999px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? 'rgba(18,58,44,0.2)' : 'var(--primary)',
                  color: loading ? 'rgba(18,58,44,0.5)' : 'var(--on-primary)',
                  fontFamily: 'var(--font-body)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'filter 150ms, opacity 150ms', opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
              >
                {loading ? (
                  <span style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'var(--on-primary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                ) : (
                  <>Authenticate <Zap size={16} fill="currentColor" /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(18,58,44,0.12)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(18,58,44,0.3)' }}>OR OAUTH2_PROVIDER</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(18,58,44,0.12)' }} />
            </div>

            {/* Google Sign-In */}
            <GoogleSignInButton text="signin_with" disabled={loading} onCredential={handleGoogle}
              onError={msg => { setError(msg); toast.error(msg); }} />

            {/* Footer */}
            <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(18,58,44,0.45)', marginTop: '24px' }}>
              New here?{' '}
              <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, transition: 'opacity 120ms' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Create account
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(18,58,44,0.3); }
      `}</style>
    </div>
  );
}
