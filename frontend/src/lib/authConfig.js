import { useEffect, useState } from 'react';
import { authAPI } from '../api/client';

let pending = null;

/** Sign-in options from the backend (GET /auth/config), fetched once per page load. */
export function loadAuthConfig() {
  if (!pending) {
    pending = authAPI.getConfig()
      .then(r => r.data)
      .catch(err => { pending = null; throw err; });
  }
  return pending;
}

/** { loading, config: { email_enabled, google_client_id } | null, error } */
export function useAuthConfig() {
  const [state, setState] = useState({ loading: true, config: null, error: false });
  useEffect(() => {
    let cancelled = false;
    loadAuthConfig()
      .then(config => { if (!cancelled) setState({ loading: false, config, error: false }); })
      .catch(() => { if (!cancelled) setState({ loading: false, config: null, error: true }); });
    return () => { cancelled = true; };
  }, []);
  return state;
}

/** Notice shown when the server can't send email. Only suggests Google if Google is actually available. */
export function emailUnavailableMessage(config, { reset = false } = {}) {
  const googleAvailable = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID || config?.google_client_id);
  const what = reset ? 'Password reset is' : 'Email sign-up is';
  const next = googleAvailable
    ? (reset ? 'If you signed up with Google, use "Continue with Google" on the sign-in page.' : 'Please use Google sign-in, or try again later.')
    : 'Please try again later.';
  return `${what} temporarily unavailable on this server (email delivery isn't set up yet). ${next}`;
}
