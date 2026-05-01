import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from '../i18n';

/**
 * Language selector dropdown — shows flag + language name.
 * Persists choice to localStorage automatically via the i18n store.
 */
export default function LanguageSwitcher() {
  const { language, setLanguage, languages } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = languages.find(l => l.code === language) || languages[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '7px 12px', borderRadius: '7px',
          background: 'var(--c-raised)', border: '1px solid var(--c-border)',
          color: 'var(--c-text-2)', fontSize: '0.825rem', cursor: 'pointer',
          transition: 'border-color 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-border-hi)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border)'}
        title="Change language"
      >
        <Globe size={14} />
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.name}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: '8px', overflow: 'hidden', zIndex: 50, minWidth: '160px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 16px', fontSize: '0.875rem', cursor: 'pointer',
                background: language === lang.code ? 'var(--c-accent-bg)' : 'transparent',
                color: language === lang.code ? 'var(--c-accent-hi)' : 'var(--c-text-2)',
                border: 'none', textAlign: 'left', transition: 'background 100ms',
              }}
              onMouseEnter={e => { if (language !== lang.code) e.currentTarget.style.background = 'var(--c-raised)'; }}
              onMouseLeave={e => { if (language !== lang.code) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
              <span style={{ flex: 1 }}>{lang.name}</span>
              {language === lang.code && (
                <span style={{ color: 'var(--c-accent)', fontSize: '0.75rem' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
