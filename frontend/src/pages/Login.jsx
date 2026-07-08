import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Zap, Github } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const EASE = [0.22, 1, 0.36, 1];
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });

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
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: '#0b1120', position: 'relative', overflow: 'hidden',
      fontFamily: 'var(--font-body)',
    }}>

      {/* Dot-grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(192,193,255,0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Subtle center glow */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '600px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(100,100,220,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Top-left status text */}
      <div style={{
        position: 'fixed', top: '20px', left: '24px', zIndex: 2,
        fontFamily: 'var(--font-mono)', fontSize: '0.65rem', lineHeight: 1.7,
        color: 'rgba(192,193,255,0.25)', letterSpacing: '0.04em',
        pointerEvents: 'none',
      }}>
        AUTH_MODULE_v1.0.2 // SECURE_HANDSHAKE<br />
        STATUS: LISTENING_FOR_CREDENTIALS
      </div>

      {/* Bottom-right node info */}
      <div style={{
        position: 'fixed', bottom: '20px', right: '24px', zIndex: 2,
        fontFamily: 'var(--font-mono)', fontSize: '0.65rem', lineHeight: 1.7,
        color: 'rgba(192,193,255,0.2)', letterSpacing: '0.04em',
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
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
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
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>Login</span>
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
            background: 'rgba(13,18,30,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: 'clamp(28px,5vw,40px)',
            backdropFilter: 'blur(12px)',
          }}>

            {/* Heading */}
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{
                fontFamily: 'var(--font-head)', fontWeight: 800,
                fontSize: 'clamp(1.8rem,4vw,2.4rem)', lineHeight: 1.1,
                letterSpacing: '-0.03em', color: '#e8edf8', marginBottom: '8px',
              }}>
                Welcome Back,<br />Architect
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface-2)' }}>
                Access your compute dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{
                  display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                  fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(192,193,255,0.5)',
                  marginBottom: '8px',
                }}>SYSTEM.USER_EMAIL</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="dev@air-ent.io" required
                    style={{
                      width: '100%', padding: '13px 40px 13px 16px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px', outline: 'none',
                      fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#e8edf8',
                      boxSizing: 'border-box', transition: 'border-color 150ms',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(192,193,255,0.35)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                  <Mail size={15} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                    fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(192,193,255,0.5)',
                  }}>SYSTEM.ACCESS_KEY</label>
                  <button type="button" style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700,
                    letterSpacing: '0.06em', color: 'rgba(192,193,255,0.4)',
                    transition: 'color 120ms', padding: 0,
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(192,193,255,0.4)'}
                  >
                    FORGOT?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    style={{
                      width: '100%', padding: '13px 40px 13px 16px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px', outline: 'none',
                      fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#e8edf8',
                      boxSizing: 'border-box', transition: 'border-color 150ms',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(192,193,255,0.35)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                  <button
                    type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.25)', lineHeight: 1, transition: 'color 120ms' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                  >
                    {showPass ? <Eye size={15} /> : <Lock size={15} />}
                  </button>
                </div>
              </div>

              {/* Authenticate button */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? 'rgba(192,193,255,0.2)' : 'linear-gradient(135deg, #8083ff 0%, #c0c1ff 100%)',
                  color: loading ? 'rgba(255,255,255,0.4)' : '#0b0066',
                  fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'filter 150ms, opacity 150ms', opacity: loading ? 0.7 : 1,
                  boxShadow: loading ? 'none' : '0 4px 24px -6px rgba(192,193,255,0.4)',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
              >
                {loading ? (
                  <span style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0b0066', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                ) : (
                  <>Authenticate <Zap size={16} fill="currentColor" /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.2)' }}>OR OAUTH2_PROVIDER</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            </div>

            {/* GitHub button */}
            <button
              type="button"
              onClick={() => toast('GitHub OAuth coming soon')}
              style={{
                width: '100%', padding: '13px',
                borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 500,
                color: '#e8edf8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'background 150ms, border-color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              <Github size={16} /> Continue with GitHub
            </button>

            {/* Footer */}
            <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(255,255,255,0.35)', marginTop: '24px' }}>
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
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
