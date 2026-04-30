import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { fadeUp, staggerContainer } from '../lib/motion';

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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--c-bg)' }}
    >
      <motion.div
        variants={staggerContainer(0.08)} initial="hidden" animate="show"
        style={{ width: '100%', maxWidth: '380px' }}
      >
        {/* Logo */}
        <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '36px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '20px' }}>
            <img src="/logo.png" alt="AIRent" style={{ width: '32px', height: '32px', objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(250,180,0,0.4))' }} />
            <span style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '1rem' }}>
              AI<span style={{ color: 'var(--c-accent)' }}>Rent</span>
            </span>
          </Link>
          <h1 style={{ color: 'var(--c-text)', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem' }}>Sign in to your account</p>
        </motion.div>

        {/* Card */}
        <motion.div
          variants={fadeUp}
          style={{
            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
            borderRadius: '12px', padding: '28px',
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: 'var(--c-text-2)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '8px' }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)', pointerEvents: 'none' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="field" style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: 'var(--c-text-2)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '8px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)', pointerEvents: 'none' }} />
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="field" style={{ paddingLeft: '36px', paddingRight: '40px' }}
                />
                <button
                  type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.9rem' }}
            >
              {loading
                ? <span style={{ width: '16px', height: '16px', border: '2px solid rgba(2,44,34,0.3)', borderTopColor: '#022c22', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                : <><span>Sign in</span><ArrowRight size={15} /></>
              }
            </button>
          </form>

          <div style={{ height: '1px', background: 'var(--c-border)', margin: '20px 0' }} />
          <p style={{ textAlign: 'center', color: 'var(--c-text-3)', fontSize: '0.85rem' }}>
            No account yet?{' '}
            <Link to="/register" style={{ color: 'var(--c-accent)', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={e => e.target.style.color = 'var(--c-accent-hi)'}
              onMouseLeave={e => e.target.style.color = 'var(--c-accent)'}>
              Create one free
            </Link>
          </p>
        </motion.div>

        <motion.p variants={fadeUp} style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.8rem', color: 'var(--c-text-3)' }}>
          <Link to="/" style={{ color: 'var(--c-text-3)', textDecoration: 'none' }}
            onMouseEnter={e => e.target.style.color = 'var(--c-text-2)'}
            onMouseLeave={e => e.target.style.color = 'var(--c-text-3)'}>
            ← Back to home
          </Link>
        </motion.p>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
