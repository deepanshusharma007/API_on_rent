import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

/**
 * Countdown timer component with per-second updates and urgency colours.
 * Props:
 *   ttlSeconds — initial TTL in seconds
 *   expiresAt  — ISO date string (fallback)
 *   onExpire   — callback when hits zero
 *   size       — "sm" | "md" | "lg"
 */
function initialRemaining(ttlSeconds, expiresAt) {
  if (typeof ttlSeconds === 'number' && ttlSeconds > 0) return ttlSeconds;
  if (expiresAt) {
    const diff = Math.floor((new Date(expiresAt + 'Z').getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  }
  return 0;
}

export default function CountdownTimer({ ttlSeconds, expiresAt, onExpire, size = 'md' }) {
  const [remaining, setRemaining] = useState(() => initialRemaining(ttlSeconds, expiresAt));

  // Restart from a fresh TTL when the caller passes one (state adjusted during render, not in an effect)
  const [seenTtl, setSeenTtl] = useState(ttlSeconds);
  if (ttlSeconds !== seenTtl) {
    setSeenTtl(ttlSeconds);
    if (typeof ttlSeconds === 'number' && ttlSeconds > 0) setRemaining(ttlSeconds);
  }

  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; });

  // Tick once a second while there is time left
  const running = remaining > 0;
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setRemaining(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Fire onExpire once, when a running timer reaches zero
  const hadTime = useRef(remaining > 0);
  useEffect(() => {
    if (remaining > 0) hadTime.current = true;
    else if (hadTime.current) { hadTime.current = false; onExpireRef.current?.(); }
  }, [remaining]);

  const hours   = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const pad = n => String(n).padStart(2, '0');

  const isExpired  = remaining <= 0;
  const isCritical = remaining > 0 && remaining <= 60;
  const isWarning  = remaining > 60 && remaining <= 300;

  const color  = isExpired ? 'text-red-700'   : isCritical ? 'text-red-700'   : isWarning ? 'text-amber-700'   : 'text-[#566f08]';
  const bg     = isExpired ? 'bg-red-500/10'   : isCritical ? 'bg-red-500/10'   : isWarning ? 'bg-amber-500/10'   : 'bg-[#bfe23a]/25';
  const border = isExpired ? 'border-red-500/20' : isCritical ? 'border-red-500/20' : isWarning ? 'border-amber-500/20' : 'border-[#566f08]/35';
  const pulse  = isCritical ? 'animate-pulse' : '';

  const sizeMap = {
    sm: { text: 'text-lg',   icon: 'w-3 h-3', label: 'text-xs', pad: 'p-3' },
    md: { text: 'text-2xl',  icon: 'w-4 h-4', label: 'text-xs', pad: 'p-4' },
    lg: { text: 'text-4xl',  icon: 'w-5 h-5', label: 'text-sm', pad: 'p-6' },
  };
  const s = sizeMap[size] || sizeMap.md;

  return (
    <div className={`${bg} border ${border} rounded-lg ${s.pad} ${pulse}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className={`${s.icon} ${color}`} />
        <span className={`${s.label} uppercase tracking-wider font-semibold ${color} opacity-80`}>
          {isExpired ? 'Expired' : 'Time Left'}
        </span>
      </div>
      <div className={`${s.text} font-black font-mono ${color} leading-none`}>
        {isExpired ? 'Expired' : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
      </div>
    </div>
  );
}
