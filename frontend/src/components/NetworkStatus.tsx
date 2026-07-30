'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-semibold rounded-full select-none shadow-sm hover:border-slate-700/80 transition-colors">
        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Online</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/20 border border-amber-900/50 text-[11px] text-amber-300 font-semibold rounded-full select-none shadow-sm animate-pulse">
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
      <span>Offline Mode</span>
    </div>
  );
}
