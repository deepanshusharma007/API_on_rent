import React, { useEffect, useRef, useState } from 'react';
import { useAuthConfig } from '../lib/authConfig';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let gsiPromise = null;

/** Load Google Identity Services once per page load. */
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => { gsiPromise = null; reject(new Error('load failed')); };
      document.head.appendChild(script);
    });
  }
  return gsiPromise;
}

const fallbackStyle = {
  width: '100%', padding: '13px', borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
  cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 500,
  color: '#e8edf8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
};

/**
 * Official "Sign in with Google" button. Calls onCredential(idToken) after the user
 * picks an account; the backend verifies the token. The OAuth client ID comes from
 * VITE_GOOGLE_CLIENT_ID if set at build time, otherwise from the backend (GOOGLE_CLIENT_ID
 * via GET /auth/config). If neither is set, or Google's script can't load, shows a button
 * that explains why instead of pretending to work.
 */
export default function GoogleSignInButton({ onCredential, onError, text = 'continue_with', disabled = false }) {
  const { loading: configLoading, config, error: configError } = useAuthConfig();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || config?.google_client_id || '';
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [scriptStatus, setScriptStatus] = useState('loading');
  useEffect(() => { callbackRef.current = onCredential; });

  let status = scriptStatus;
  if (!clientId) status = configLoading ? 'loading' : (configError ? 'failed' : 'unconfigured');

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callbackRef.current?.(response.credential),
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        const width = Math.min(Math.max(containerRef.current.offsetWidth || 340, 200), 400);
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard', theme: 'filled_black', size: 'large', shape: 'rectangular',
          text, logo_alignment: 'center', width,
        });
        setScriptStatus('ready');
      })
      .catch(() => { if (!cancelled) setScriptStatus('failed'); });
    return () => { cancelled = true; };
  }, [clientId, text]);

  const explain = () => onError?.(
    status === 'unconfigured'
      ? "Google sign-in isn't configured yet. Please use email instead."
      : "Couldn't load Google sign-in. Check your connection or ad blocker, or use email instead."
  );

  return (
    <div style={{ position: 'relative', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      {(status === 'unconfigured' || status === 'failed') && (
        <button type="button" onClick={explain} style={fallbackStyle}>
          <GoogleMark /> Continue with Google
        </button>
      )}
      {status === 'loading' && (
        <div style={{ ...fallbackStyle, cursor: 'default', color: 'rgba(255,255,255,0.4)' }} aria-busy="true">
          <GoogleMark /> Loading Google sign-in…
        </div>
      )}
      <div
        ref={containerRef}
        data-testid="google-button-slot"
        style={{ display: status === 'ready' ? 'flex' : 'none', justifyContent: 'center', minHeight: status === 'ready' ? '44px' : 0 }}
      />
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
