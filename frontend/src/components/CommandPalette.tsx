'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, FileText, PlayCircle, X, Clock, Loader2 } from 'lucide-react';

export interface SearchResultItem {
  id: number;
  title: string;
  media_type?: string;
  reading_time?: number | null;
}

export function openCommandPalette() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  }
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Listen for Ctrl+K, Cmd+K, and Escape keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for custom trigger event from anywhere (e.g. sidebar button)
  useEffect(() => {
    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener('open-command-palette', handleCustomOpen);
    return () => window.removeEventListener('open-command-palette', handleCustomOpen);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced fetch search results when query changes
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('token') ||
              localStorage.getItem('aarc_token') ||
              localStorage.getItem('inkwell_token')
            : null;

        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('CommandPalette search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-background/50 backdrop-blur-sm animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-background border border-foreground/10 rounded-xl shadow-2xl overflow-hidden flex flex-col mx-4 animate-scaleUp"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-foreground/10 bg-foreground/[0.02]">
          <Search className="w-5 h-5 text-foreground/45 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library..."
            className="w-full bg-transparent text-foreground placeholder-foreground/40 text-sm focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />}
          {query && !loading && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 hover:bg-foreground/5 rounded text-foreground/40 hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-bold text-foreground/40 border border-foreground/15 rounded px-1.5 py-0.5 uppercase shrink-0">
            Esc
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-foreground/5">
          {query.trim() && !loading && results.length === 0 && (
            <div className="p-8 text-center text-foreground/40 text-xs">
              No matching articles or videos found for "{query}".
            </div>
          )}

          {!query.trim() && (
            <div className="p-6 text-center text-foreground/40 text-xs">
              Type keywords to search across titles, summaries, and transcripts.
            </div>
          )}

          {results.map((item) => {
            const isVideo = item.media_type === 'video';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/article/${item.id}`);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-foreground/5 transition-colors text-left group cursor-pointer"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isVideo
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}
                >
                  {isVideo ? <PlayCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-indigo-400 transition-colors truncate">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider ${
                        isVideo ? 'text-red-500' : 'text-indigo-400'
                      }`}
                    >
                      {isVideo ? 'Video' : 'Article'}
                    </span>
                    {item.reading_time ? (
                      <>
                        <span className="text-foreground/30 text-[9px]">•</span>
                        <span className="text-[10px] text-foreground/45 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.reading_time}m read
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

