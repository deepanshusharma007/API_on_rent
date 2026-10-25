import React from 'react';
import { passwordScore } from '../lib/passwordPolicy';

const LEVELS = [
  { label: 'Too weak', color: 'var(--error)' },
  { label: 'Weak', color: '#c2410c' },
  { label: 'Fair', color: '#a86400' },
  { label: 'Good', color: '#6f8b10' },
  { label: 'Strong', color: '#566f08' },
];

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const score = passwordScore(password);
  const level = LEVELS[score];
  const rules = [
    { ok: password.length >= 8, text: 'At least 8 characters' },
    { ok: /[A-Za-z]/.test(password) && /\d/.test(password), text: 'A letter and a number' },
  ];
  if (new TextEncoder().encode(password).length > 72) rules.push({ ok: false, text: 'At most 72 bytes' });

  return (
    <div style={{ marginTop: '10px' }} data-testid="password-strength">
      <div
        role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={score}
        aria-valuetext={level.label}
        style={{ display: 'flex', gap: '4px' }}
      >
        {[1, 2, 3, 4].map(i => (
          <span key={i} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            background: i <= score ? level.color : 'rgba(18,58,44,0.18)', transition: 'background 150ms',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem' }}>
        <span style={{ color: level.color, fontWeight: 600 }}>{level.label}</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', fontSize: '0.75rem' }}>
        {rules.map(r => (
          <li key={r.text} style={{ color: r.ok ? 'var(--secondary)' : 'rgba(18,58,44,0.45)' }}>
            {r.ok ? '✓' : '•'} {r.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
