import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import useAuthStore from '../store/authStore';
import AuthShell, { FormMessage, Spinner } from '../components/AuthShell';
import { inputStyle, labelStyle, primaryButtonStyle } from '../lib/authStyles';
import { useAuthConfig, emailUnavailableMessage } from '../lib/authConfig';

export default function ForgotPassword() {
  const forgotPassword = useAuthStore(s => s.forgotPassword);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const { config } = useAuthConfig();
  const emailUnavailable = config?.email_enabled === false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await forgotPassword(email.trim());
    setLoading(false);
    if (result.success) setSentTo(email.trim());
    else setError(result.error);
  };

  if (sentTo) {
    return (
      <AuthShell title="Check your inbox" subtitle="Password reset">
        <FormMessage kind="success">
          If an account exists for <strong>{sentTo}</strong>, we've sent a link to reset your password.
          The link expires in 30 minutes and can be used once.
        </FormMessage>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
          Didn't get it? Check spam, or wait a minute and{' '}
          <button type="button" onClick={() => setSentTo('')}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary)', cursor: 'pointer', font: 'inherit' }}>
            try again
          </button>.
        </p>
        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>← Back to sign in</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your account email and we'll send you a reset link.">
      <form onSubmit={handleSubmit} noValidate={false}>
        <FormMessage>{error || (emailUnavailable ? emailUnavailableMessage(config, { reset: true }) : '')}</FormMessage>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="forgot-email" style={labelStyle}>EMAIL</label>
          <div style={{ position: 'relative' }}>
            <input id="forgot-email" type="email" autoComplete="email" required value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
            <Mail size={15} aria-hidden="true" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
          </div>
        </div>
        <button type="submit" disabled={loading || emailUnavailable} style={{ ...primaryButtonStyle(loading), ...(emailUnavailable ? { opacity: 0.45, cursor: 'not-allowed' } : {}) }}>
          {loading ? <Spinner /> : 'Send reset link'}
        </button>
      </form>
      <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.35)', marginTop: '24px' }}>
        Remembered it? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
      </p>
    </AuthShell>
  );
}
