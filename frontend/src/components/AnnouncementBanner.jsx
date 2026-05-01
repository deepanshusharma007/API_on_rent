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
      background: '#92400e',        /* warm amber-800 — readable, not too loud */
      borderBottom: '1px solid #78350f',
      height: '36px',
      display: 'flex', alignItems: 'center', overflow: 'hidden',
    }}>
      {/* Scrolling track */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div className="marquee-banner" style={{ alignItems: 'center' }}>
          {items.map((msg, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '0 40px', whiteSpace: 'nowrap',
              fontSize: '0.75rem', fontWeight: 600, color: '#fef3c7',
              letterSpacing: '0.01em',
            }}>
              <Zap size={12} style={{ flexShrink: 0, color: '#fbbf24' }} />
              {msg}
            </span>
          ))}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0, height: '100%', padding: '0 12px',
          background: 'none', border: 'none', borderLeft: '1px solid #78350f',
          color: '#fef3c7', cursor: 'pointer', display: 'flex', alignItems: 'center',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <X size={13} />
      </button>
    </div>
  );
}
