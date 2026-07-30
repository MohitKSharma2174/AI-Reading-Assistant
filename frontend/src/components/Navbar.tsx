'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import UrlInputBar from './UrlInputBar';
import NetworkStatus from './NetworkStatus';

interface NavbarProps {
  onIngestSuccess?: () => void;
}

export default function Navbar({ onIngestSuccess }: NavbarProps) {
  return (
    <nav className="w-full bg-background/70 backdrop-blur-xl border-b border-foreground/5 sticky top-0 z-40 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-4 md:h-16 gap-4">
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8.5 h-8.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
              <BookOpen className="w-4 h-4 text-slate-100" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-foreground text-base tracking-tight transition-colors duration-200">
                AI Reader
              </span>
              <span className="text-[9px] text-foreground/40 font-bold uppercase tracking-widest -mt-0.5">
                Editorial
              </span>
            </div>
          </Link>

          {/* Ingestion Search Bar */}
          <div className="w-full md:max-w-md">
            <UrlInputBar onIngestSuccess={onIngestSuccess} />
          </div>

          {/* Network Status Badge */}
          <div className="flex items-center shrink-0">
            <NetworkStatus />
          </div>
        </div>
      </div>
    </nav>
  );
}
