import React from 'react';
import { Zap } from 'lucide-react';

/**
 * Token progress bar with colour-coded urgency.
 * Props: used, remaining, label, size ("sm"|"md")
 */
export default function TokenProgressBar({ used = 0, remaining = 0, label, size = 'md' }) {
  const total    = used + remaining;
  const usagePct = total > 0 ? (used / total) * 100 : 0;

  // Urgency colours — emerald (normal) → amber → red
  const barColor  = usagePct >= 90 ? 'from-red-500 to-red-600'
                  : usagePct >= 70 ? 'from-amber-500 to-orange-500'
                  : 'from-emerald-500 to-emerald-600';
  const textColor = usagePct >= 90 ? '#f87171'
                  : usagePct >= 70 ? '#fbbf24'
                  : 'var(--c-accent)';

  const isSm = size === 'sm';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: isSm ? '0.7rem' : '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--c-text-3)' }}>
          <Zap size={isSm ? 11 : 12} />
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', fontWeight: 600 }}>
            {label || 'Token Usage'}
          </span>
        </div>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: textColor }}>{usagePct.toFixed(1)}%</span>
      </div>
      <div style={{ height: isSm ? '4px' : '6px', background: 'var(--c-raised)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--c-border)' }}>
        <div
          className={`h-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(usagePct, 100)}%`, borderRadius: '3px' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '5px', color: 'var(--c-text-3)' }}>
        <span>{(used / 1000).toFixed(1)}K used</span>
        <span>{(remaining / 1000).toFixed(1)}K left</span>
      </div>
    </div>
  );
}
