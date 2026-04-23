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

  const message = "⚡ If the app feels slow or unresponsive, our backend is waking up from sleep (free tier). It takes up to 50–60 seconds on first load. We're upgrading soon — thanks for your patience!";

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black">
      <div className="relative flex items-center overflow-hidden h-9">
        {/* Scrolling marquee text */}
        <div className="flex-1 overflow-hidden">
          <div className="marquee-banner flex whitespace-nowrap">
            {[...Array(4)].map((_, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-8 text-xs font-semibold">
                <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                {message}
              </span>
            ))}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 px-3 h-full flex items-center hover:bg-black/10 transition-colors border-l border-black/10"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
