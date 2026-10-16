import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import PasswordStrength from '../components/PasswordStrength';
import { meetsPasswordPolicy } from '../lib/passwordPolicy';
import AuthShell, { FormMessage, Spinner } from '../components/AuthShell';
import { inputStyle, labelStyle, primaryButtonStyle } from '../lib/authStyles';

/** Token arrives in the URL fragment (#token=...), so it is never sent to servers or in Referer. */
function readToken() {
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
  return fromHash || new URLSearchParams(window.location.search).get('token') || '';
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const resetPassword = useAuthStore(s => s.resetPassword);
  const [token] = useState(readToken);
  useEffect(() => {
    // Drop the token from the address bar and history once it is in memory
    if (window.location.hash || window.location.search) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkInvalid, setLinkInvalid] = useState(!token);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!meetsPasswordPolicy(password)) { setError('Use at least 8 characters, including a letter and a number.'); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);
    if (result.success) {
      toast.success('Password updated. Please sign in.');
      navigate('/login');
    } else {
      setError(result.error);
      if (result.linkInvalid) setLinkInvalid(true);
    }
  };

  if (linkInvalid) {
    return (
      <AuthShell title="Link expired" subtitle="Password reset">
        <FormMessage>{error || 'This reset link is invalid or has expired. Please request a new one.'}</FormMessage>
        <Link to="/forgot-password" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Request a new link →</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="You'll be signed out of other devices.">
      <form onSubmit={handleSubmit}>
        <FormMessage>{error}</FormMessage>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="reset-password" style={labelStyle}>NEW PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input id="reset-password" type={showPass ? 'text' : 'password'} autoComplete="new-password" required
              value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" style={inputStyle}
              aria-describedby="reset-strength" />
            <button type="button" onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>
              {showPass ? <Eye size={15} /> : <Lock size={15} />}
            </button>
          </div>
          <div id="reset-strength"><PasswordStrength password={password} /></div>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="reset-confirm" style={labelStyle}>CONFIRM PASSWORD</label>
          <input id="reset-confirm" type={showPass ? 'text' : 'password'} autoComplete="new-password" required
            value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={inputStyle} />
        </div>
        <button type="submit" disabled={loading} style={primaryButtonStyle(loading)}>
          {loading ? <Spinner /> : 'Update password'}
        </button>
      </form>
    </AuthShell>
  );
}
