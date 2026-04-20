import React from 'react';
import { Zap } from 'lucide-react';

/**
 * Token progress bar with colour-coded urgency.
 * Props: used, remaining, label, size ("sm"|"md")
 */
export default function TokenProgressBar({ used = 0, remaining = 0, label, size = 'md' }) {
  const total    = used + remaining;
  const usagePct = total > 0 ? (used / total) * 100 : 0;

  const barColor  = usagePct >= 90 ? 'from-red-500 to-red-600'
                  : usagePct >= 70 ? 'from-amber-500 to-orange-500'
                  : 'from-violet-500 to-violet-600';
  const textColor = usagePct >= 90 ? 'text-red-400'
                  : usagePct >= 70 ? 'text-amber-400'
                  : 'text-violet-400';

  const isSm = size === 'sm';

  return (
    <div>
      <div className={`flex justify-between ${isSm ? 'text-xs' : 'text-sm'} mb-2`}>
        <div className="flex items-center gap-1.5 text-gray-500">
          <Zap className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span className="uppercase tracking-wider text-xs font-semibold">{label || 'Token Usage'}</span>
        </div>
        <span className={`text-xs font-bold ${textColor}`}>{usagePct.toFixed(1)}%</span>
      </div>
      <div className={`${isSm ? 'h-1.5' : 'h-2'} bg-white/[0.06] rounded-full overflow-hidden`}>
        <div
          className={`h-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out rounded-full`}
          style={{ width: `${Math.min(usagePct, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1.5 text-gray-600">
        <span>{(used / 1000).toFixed(1)}K used</span>
        <span>{(remaining / 1000).toFixed(1)}K left</span>
      </div>
    </div>
  );
}
