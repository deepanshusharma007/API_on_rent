import React, { useState } from 'react';
import { X, Zap } from 'lucide-react';

export default function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem('banner_dismissed') === 'true'
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('banner_dismissed', 'true');
    setDismissed(true);
  };

  const message = "If the app feels slow on first load, the backend is waking up from sleep (free tier) — takes up to 60 seconds. Thanks for your patience!";

  // Repeated enough times to guarantee seamless loop regardless of viewport width
  const items = Array(6).fill(message);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: '#d97706',        /* amber-600 — high visibility */
      borderBottom: '2px solid #b45309',
      height: '40px',
      display: 'flex', alignItems: 'center', overflow: 'hidden',
    }}>
      {/* Scrolling track */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div className="marquee-banner" style={{ alignItems: 'center' }}>
          {items.map((msg, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '0 48px', whiteSpace: 'nowrap',
              fontSize: '0.8rem', fontWeight: 700, color: '#1c1917',
              letterSpacing: '0.01em',
            }}>
              <Zap size={13} style={{ flexShrink: 0, color: '#78350f' }} />
              {msg}
              <span style={{ margin: '0 8px', color: '#78350f', fontWeight: 900 }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0, height: '100%', padding: '0 14px',
          background: 'none', border: 'none', borderLeft: '2px solid #b45309',
          color: '#1c1917', cursor: 'pointer', display: 'flex', alignItems: 'center',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.12)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <X size={14} />
      </button>
    </div>
  );
}
