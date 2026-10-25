import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, CheckCircle2, Zap, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import GoogleSignInButton from '../components/GoogleSignInButton';
import PasswordStrength from '../components/PasswordStrength';
import { meetsPasswordPolicy } from '../lib/passwordPolicy';
import { useAuthConfig, emailUnavailableMessage } from '../lib/authConfig';
import { FormMessage } from '../components/AuthShell';

const EASE = [0.22, 1, 0.36, 1];
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });

const PERKS = [
  'Virtual key in under 60 seconds',
  'Access OpenAI, Anthropic and Google',
  'No subscriptions — pay per rental in INR',
];

const inputStyle = {
  width: '100%', padding: '13px 40px 13px 16px',
  background: 'rgba(18,58,44,0.05)',
  border: '1px solid rgba(18,58,44,0.18)',
  borderRadius: '10px', outline: 'none',
  fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface)',
  boxSizing: 'border-box', transition: 'border-color 150ms',
};

const labelStyle = {
  display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem',
  fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(18,58,44,0.5)',
  marginBottom: '8px',
};

const linkButtonStyle = {
  background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', color: 'var(--primary)',
};

const focusOn = e => { e.target.style.borderColor = 'rgba(18,58,44,0.35)'; };
const focusOff = e => { e.target.style.borderColor = 'rgba(18,58,44,0.18)'; };

const STEPS = { email: 1, code: 2, password: 3 };

function formatSeconds(total) {
  const s = Math.max(0, Math.ceil(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Current time, re-rendering every second while active (for the code countdowns).
 *  Returns [now, refresh]; call refresh() right after starting a new countdown. */
function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return [now, () => setNow(Date.now())];
}

export default function Register() {
  const [step,            setStep]            = useState('email');
  const [email,           setEmail]           = useState('');
  const [code,            setCode]            = useState('');
  const [signupToken,     setSignupToken]     = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [expiresAt,       setExpiresAt]       = useState(0);
  const [resendAt,        setResendAt]        = useState(0);
  const [bannerUp,        setBannerUp]        = useState(() => sessionStorage.getItem('banner_dismissed') !== 'true');
  const navigate = useNavigate();
  const { requestSignupOtp, verifySignupOtp, completeSignup, googleLogin } = useAuthStore();
  const { config } = useAuthConfig();
  const emailUnavailable = config?.email_enabled === false;
  const [now, refreshNow] = useNow(step === 'code' || resendAt !== 0);

  useEffect(() => {
    const id = setInterval(() => setBannerUp(sessionStorage.getItem('banner_dismissed') !== 'true'), 200);
    return () => clearInterval(id);
  }, []);

  const resendIn = (resendAt - now) / 1000;
  const expiresIn = (expiresAt - now) / 1000;

  const sendCode = async () => {
    setError('');
    setLoading(true);
    const result = await requestSignupOtp(email.trim());
    setLoading(false);
    if (result.success) {
      setStep('code');
      setCode('');
      setExpiresAt(Date.now() + result.expires_in * 1000);
      setResendAt(Date.now() + result.resend_after * 1000);
      refreshNow();
      toast.success('Verification code sent');
    } else {
      setError(result.error);
      if (result.retryAfter) { setResendAt(Date.now() + result.retryAfter * 1000); refreshNow(); }
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    sendCode();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from the email.'); return; }
    if (expiresIn <= 0) { setError('This code has expired. Please request a new code.'); return; }
    setLoading(true);
    const result = await verifySignupOtp(email.trim(), code);
    setLoading(false);
    if (result.success) {
      setSignupToken(result.signupToken);
      setStep('password');
    } else {
      setError(result.error);
      if (result.mustRestart) setCode('');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!meetsPasswordPolicy(password)) { setError('Use at least 8 characters, including a letter and a number.'); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setLoading(true);
    const result = await completeSignup(signupToken, password);
    setLoading(false);
    if (result.success) {
      toast.success('Welcome to AIRent!');
      navigate('/dashboard');
    } else {
      setError(result.error);
      if (result.mustRestart) {
        setSignupToken('');
        setPassword('');
        setConfirmPassword('');
        setStep('email');
      }
    }
  };

  const handleGoogle = async (credential) => {
    setError('');
    setLoading(true);
    const result = await googleLogin(credential);
    setLoading(false);
    if (result.success) {
      toast.success('Welcome to AIRent!');
      navigate('/dashboard');
    } else {
      setError(result.error);
      toast.error(result.error);
    }
  };

  const changeEmail = () => {
    setError('');
    setCode('');
    setStep('email');
  };

  const submitButton = (label, color = 'green', blocked = false) => {
    const green = color === 'green';
    return (
      <button type="submit" disabled={loading || blocked} style={{
        width: '100%', padding: '14px', borderRadius: '999px', border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        background: loading ? 'rgba(86,111,8,0.2)' : (green ? 'var(--secondary)' : 'var(--primary)'),
        color: loading ? 'rgba(18,58,44,0.5)' : (green ? 'var(--on-secondary)' : 'var(--on-primary)'),
        fontFamily: 'var(--font-body)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        opacity: loading ? 0.7 : (blocked ? 0.45 : 1), transition: 'filter 150ms',
      }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.07)'; }}
        onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
      >
        {loading
          ? <span aria-hidden="true" style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'var(--on-secondary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
          : <>{label} <Zap size={16} fill="currentColor" /></>}
      </button>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-alt)', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>

      {bannerUp && <div style={{ height: '40px', flexShrink: 0 }} />}

      {/* Dot-grid */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(18,58,44,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '400px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(86,111,8,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Status text */}
      <div className="auth-deco" style={{ position: 'fixed', top: '20px', left: '24px', zIndex: 2, fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', lineHeight: 1.7, color: 'rgba(18,58,44,0.25)', letterSpacing: '0.04em', pointerEvents: 'none' }}>
        AUTH_MODULE_v1.0.2 // NEW_ACCOUNT_FLOW<br />
        STATUS: INITIALIZING_IDENTITY
      </div>
      <div className="auth-deco" style={{ position: 'fixed', bottom: '20px', right: '24px', zIndex: 2, fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', lineHeight: 1.7, color: 'rgba(18,58,44,0.2)', letterSpacing: '0.04em', textAlign: 'right', pointerEvents: 'none' }}>
        ENCRYPTION: AES-256-GCM<br />NODE: IN-MUM-01
      </div>

      {/* Navbar */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(20px,4vw,40px)', height: '56px', borderBottom: '1px solid rgba(18,58,44,0.07)' }}>
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
          <Link to="/login" style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(18,58,44,0.6)', textDecoration: 'none' }}>Login</Link>
          <Link to="/register" style={{ padding: '7px 18px', borderRadius: '999px', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, background: 'var(--primary)', color: 'var(--on-primary)' }}>Sign Up</Link>
        </div>
      </nav>

      {/* Main */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          <motion.div variants={fadeUp(0.04)} initial="hidden" animate="show" style={{
            background: 'rgba(255,252,245,0.94)', border: '1px solid rgba(18,58,44,0.14)',
            borderRadius: '16px', padding: 'clamp(28px,5vw,40px)', backdropFilter: 'blur(12px)',
          }}>
            <div style={{ marginBottom: '28px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.08em', color: 'rgba(18,58,44,0.45)', marginBottom: '10px' }}>
                STEP {STEPS[step]} OF 3
              </p>
              <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 500, fontSize: 'clamp(2rem,5vw,2.8rem)', lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--on-surface)', marginBottom: '8px' }}>
                {step === 'email' && <>Join the<br />Network</>}
                {step === 'code' && <>Check your<br />email</>}
                {step === 'password' && <>Create your<br />password</>}
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface-2)', lineHeight: 1.5 }}>
                {step === 'email' && 'Free account. First rental in 60 seconds.'}
                {step === 'code' && <>Enter the 6-digit code we sent to <strong style={{ color: 'var(--on-surface)' }}>{email.trim()}</strong>.</>}
                {step === 'password' && <>Email verified: <strong style={{ color: 'var(--on-surface)' }}>{email.trim()}</strong></>}
              </p>
            </div>

            {step === 'email' && (
              <>
                {/* Perks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                  {PERKS.map(p => (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={14} color="var(--secondary)" style={{ flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.825rem', color: 'var(--on-surface-2)' }}>{p}</span>
                    </div>
                  ))}
                </div>

                <GoogleSignInButton text="signup_with" disabled={loading} onCredential={handleGoogle}
                  onError={msg => { setError(msg); toast.error(msg); }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(18,58,44,0.12)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(18,58,44,0.3)' }}>OR SIGN UP WITH EMAIL</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(18,58,44,0.12)' }} />
                </div>

                <form onSubmit={handleEmailSubmit}>
                  <FormMessage>{error || (emailUnavailable ? emailUnavailableMessage(config) : '')}</FormMessage>
                  <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="signup-email" style={labelStyle}>SYSTEM.USER_EMAIL</label>
                    <div style={{ position: 'relative' }}>
                      <input id="signup-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com" required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
                      <Mail size={15} aria-hidden="true" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(18,58,44,0.34)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                  {submitButton(resendIn > 0 ? `Send code (${formatSeconds(resendIn)})` : 'Send verification code', 'green', emailUnavailable)}
                </form>
              </>
            )}

            {step === 'code' && (
              <form onSubmit={handleVerify}>
                <FormMessage>{error}</FormMessage>
                <div style={{ marginBottom: '12px' }}>
                  <label htmlFor="signup-code" style={labelStyle}>VERIFICATION CODE</label>
                  <input id="signup-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6}
                    value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456" required autoFocus aria-describedby="signup-code-help"
                    style={{ ...inputStyle, padding: '13px 16px', fontFamily: 'var(--font-mono)', fontSize: '1.4rem', letterSpacing: '0.5em', textAlign: 'center' }}
                    onFocus={focusOn} onBlur={focusOff} />
                </div>
                <p id="signup-code-help" aria-live="polite" style={{ fontSize: '0.8rem', color: expiresIn > 0 ? 'rgba(18,58,44,0.45)' : 'var(--error)', marginBottom: '20px', lineHeight: 1.5 }}>
                  {expiresIn > 0 ? `Code expires in ${formatSeconds(expiresIn)}.` : 'This code has expired. Request a new one below.'}
                  {' '}If you already have an account with this email, we've sent sign-in options instead.
                </p>
                {submitButton('Verify email', 'purple')}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', fontSize: '0.85rem' }}>
                  <button type="button" onClick={changeEmail} style={{ ...linkButtonStyle, color: 'rgba(18,58,44,0.6)' }}>← Use a different email</button>
                  <button type="button" onClick={sendCode} disabled={loading || resendIn > 0}
                    style={{ ...linkButtonStyle, opacity: resendIn > 0 ? 0.5 : 1, cursor: resendIn > 0 ? 'default' : 'pointer' }}>
                    {resendIn > 0 ? `Resend code in ${formatSeconds(resendIn)}` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handleCreate}>
                <FormMessage>{error}</FormMessage>
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="signup-password" style={labelStyle}>SYSTEM.ACCESS_KEY</label>
                  <div style={{ position: 'relative' }}>
                    <input id="signup-password" type={showPass ? 'text' : 'password'} autoComplete="new-password" value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required autoFocus
                      aria-describedby="signup-strength" style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
                    <button type="button" onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'Hide password' : 'Show password'} aria-pressed={showPass}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(18,58,44,0.45)', lineHeight: 1 }}>
                      {showPass ? <Eye size={15} /> : <Lock size={15} />}
                    </button>
                  </div>
                  <div id="signup-strength"><PasswordStrength password={password} /></div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label htmlFor="signup-confirm" style={labelStyle}>CONFIRM.ACCESS_KEY</label>
                  <input id="signup-confirm" type={showPass ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required style={inputStyle}
                    onFocus={focusOn} onBlur={focusOff} />
                </div>

                {submitButton('Create account')}
              </form>
            )}

            <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'rgba(18,58,44,0.45)', marginTop: '24px' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
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
