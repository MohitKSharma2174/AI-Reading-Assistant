'use client';

import React, { useSyncExternalStore } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

function subscribeNetwork(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

const getNetworkSnapshot = () => navigator.onLine;
const getServerNetworkSnapshot = () => true;

export default function NetworkStatus() {
  const isOnline = useSyncExternalStore(
    subscribeNetwork,
    getNetworkSnapshot,
    getServerNetworkSnapshot
  );

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
