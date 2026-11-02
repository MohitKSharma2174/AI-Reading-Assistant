'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BookOpen, Library, Plus, BookMarked, User as UserIcon, LogOut,
  Sun, Moon, Eye, BookText, Search
} from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { openCommandPalette } from './CommandPalette';

interface SidebarProps {
  onIngestClick?: () => void;
  onSelectTag?: (tag: string | null) => void;
}

export default function Sidebar({ onIngestClick, onSelectTag }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  // If on landing ('/') or login ('/login'), DO NOT render main App Sidebar.
  // Return a minimal header instead: A simple top bar with AARC logo on the left
  // and a Login button on the right (only if on '/').
  if (pathname === '/' || pathname === '/login') {
    return (
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-foreground/5 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* AARC Logo on the left */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
              <BookOpen className="w-4 h-4 text-slate-100" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-foreground text-sm tracking-tight leading-none">
                AARC
              </span>
              <span className="text-[8px] text-foreground/45 font-bold uppercase tracking-widest mt-0.5">
                Editorial Reader
              </span>
            </div>
          </Link>

          {/* Login button on the right (if on '/') */}
          <div className="flex items-center gap-4">
            {pathname === '/' && (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity shadow-sm"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Main App Sidebar for dashboard, vocabulary, and authenticated views
  return (
    <aside className="w-64 bg-foreground/[0.02] border-r border-foreground/5 flex flex-col h-full shrink-0 select-none">
      {/* Header Title */}
      <div className="p-6 border-b border-foreground/5">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
            <BookOpen className="w-4.5 h-4.5 text-slate-100" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-foreground text-base tracking-tight leading-none">
              AARC
            </span>
            <span className="text-[9px] text-foreground/45 font-bold uppercase tracking-widest mt-0.5">
              Reading Companion
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 py-6 px-4 space-y-7 overflow-y-auto">
        {/* Global Search Trigger */}
        <div>
          <button
            type="button"
            onClick={() => openCommandPalette()}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground/60 bg-foreground/5 hover:bg-foreground/10 rounded-md transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Search...</span>
            <span className="ml-auto text-xs opacity-50">Ctrl K</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest px-3 block mb-2">
            Discover
          </span>
          <Link 
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2 font-semibold rounded-xl text-sm transition-colors cursor-pointer ${
              pathname === '/dashboard'
                ? 'bg-indigo-600/10 text-indigo-400 font-bold'
                : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            <Library className="w-4 h-4 text-indigo-500" />
            <span>Library</span>
          </Link>
          <Link 
            href="/vocabulary"
            className={`flex items-center gap-3 px-3 py-2 font-semibold rounded-xl text-sm transition-colors cursor-pointer ${
              pathname === '/vocabulary'
                ? 'bg-indigo-600/10 text-indigo-400 font-bold'
                : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            <BookText className="w-4 h-4 text-indigo-500" />
            <span>Vocabulary</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              if (onIngestClick) {
                onIngestClick();
              } else {
                window.location.href = '/dashboard';
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 font-semibold rounded-xl text-sm transition-colors text-left cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-500" />
            <span>Ingest Link</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest px-3 block mb-2">
            Saved Archives
          </span>
          <button 
            type="button"
            onClick={() => {
              if (onSelectTag) {
                onSelectTag(null);
              } else {
                window.location.href = '/dashboard';
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 font-semibold rounded-xl text-sm transition-colors text-left cursor-pointer"
          >
            <BookMarked className="w-4 h-4 text-indigo-500" />
            <span>All Articles</span>
          </button>
        </div>
      </div>

      {/* Bottom Theme Selector Dock */}
      <div className="p-3 border-t border-foreground/5 bg-foreground/[0.015]">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-[10px] font-bold text-foreground/45 uppercase tracking-widest">
            Theme
          </span>
          <span className="text-[10px] font-semibold text-foreground/40 capitalize">
            {theme}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 bg-foreground/[0.03] border border-foreground/10 rounded-xl">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-background text-foreground shadow-2xs font-bold border border-foreground/15'
                : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5 border border-transparent'
            }`}
            title="Light theme"
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('sepia')}
            className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              theme === 'sepia'
                ? 'bg-[#F5EFE6] text-[#3B2F2F] shadow-2xs font-bold border border-[#3B2F2F]/20'
                : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5 border border-transparent'
            }`}
            title="Sepia theme"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Sepia</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900 text-slate-100 shadow-2xs font-bold border border-slate-700'
                : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5 border border-transparent'
            }`}
            title="Dark theme"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Bottom User Profile & Logout Section */}
      <div className="p-4 border-t border-foreground/5 bg-foreground/[0.01] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-bold shrink-0">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-foreground truncate">
              {user ? user.email.split('@')[0] : 'System Reader'}
            </span>
            <span className="text-[9px] text-foreground/45 truncate">
              {user ? user.email : 'Online'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="p-1.5 hover:bg-red-500/10 text-foreground/40 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
          title="Log Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

