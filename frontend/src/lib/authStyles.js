// Shared styles for the auth pages (same look as Login/Register).

export const inputStyle = {
  width: '100%', padding: '13px 40px 13px 16px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', outline: 'none',
  fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#e8edf8',
  boxSizing: 'border-box', transition: 'border-color 150ms',
};

export const labelStyle = {
  display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
  fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(192,193,255,0.5)',
  marginBottom: '8px',
};

export function primaryButtonStyle(loading) {
  return {
    width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    background: loading ? 'rgba(192,193,255,0.2)' : 'linear-gradient(135deg, #8083ff 0%, #c0c1ff 100%)',
    color: loading ? 'rgba(255,255,255,0.4)' : '#0b0066',
    fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    opacity: loading ? 0.7 : 1, transition: 'filter 150ms',
  };
}
