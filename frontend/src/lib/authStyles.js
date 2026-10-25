// Shared styles for the auth pages (same look as Login/Register).

export const inputStyle = {
  width: '100%', padding: '13px 40px 13px 16px',
  background: 'rgba(18,58,44,0.05)',
  border: '1px solid rgba(18,58,44,0.18)',
  borderRadius: '10px', outline: 'none',
  fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface)',
  boxSizing: 'border-box', transition: 'border-color 150ms',
};

export const labelStyle = {
  display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem',
  fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(18,58,44,0.5)',
  marginBottom: '8px',
};

export function primaryButtonStyle(loading) {
  return {
    width: '100%', padding: '14px', borderRadius: '999px', border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    background: loading ? 'rgba(18,58,44,0.2)' : 'var(--primary)',
    color: loading ? 'rgba(18,58,44,0.5)' : 'var(--on-primary)',
    fontFamily: 'var(--font-body)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    opacity: loading ? 0.7 : 1, transition: 'filter 150ms',
  };
}
