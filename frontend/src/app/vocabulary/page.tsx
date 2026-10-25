'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, Library, Plus, BookMarked, User as UserIcon, LogOut,
  Sun, Moon, Eye, BookText, Trash2, RefreshCw, AlertCircle, Search, 
  Sparkles, Bookmark, ArrowRight, X, Globe, BarChart2
} from 'lucide-react';
import { getVocabulary, deleteVocabulary, VocabularyItem } from '../../lib/api';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import UrlInputBar from '../../components/UrlInputBar';

export default function VocabularyPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();

  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Ingest Modal state (consistent with other pages)
  const [isIngestOpen, setIsIngestOpen] = useState(false);

  // Protect Route: Redirect to /login if unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleManualSync = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getVocabulary();
      setVocabulary(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load vocabulary items.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (isAuthenticated) {
      getVocabulary()
        .then((data) => {
          if (!ignore) {
            setVocabulary(Array.isArray(data) ? data : []);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            const msg = err instanceof Error ? err.message : 'Failed to load vocabulary items.';
            setError(msg);
            setLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [isAuthenticated]);

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this word from your vocabulary?')) return;

    setDeletingId(id);
    try {
      await deleteVocabulary(id);
      setVocabulary((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete vocabulary word.';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredVocabulary = useMemo(() => {
    if (!searchQuery.trim()) return vocabulary;
    const q = searchQuery.toLowerCase();
    return vocabulary.filter(
      (item) =>
        item.word.toLowerCase().includes(q) ||
        item.definition.toLowerCase().includes(q)
    );
  }, [vocabulary, searchQuery]);

  return (
    <div className="flex h-screen bg-background text-foreground font-sans transition-colors duration-300 overflow-hidden">
      
      {/* 1. LEFT SIDEBAR (Mirrors Library page, Vocabulary highlighted as active) */}
      <aside className="w-64 bg-foreground/[0.02] border-r border-foreground/5 flex flex-col h-full shrink-0 select-none">
        {/* Header Title */}
        <div className="p-6 border-b border-foreground/5">
          <Link href="/" className="flex items-center gap-2.5 group">
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
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest px-3 block mb-2">
              Discover
            </span>
            <Link 
              href="/"
              className="flex items-center gap-3 px-3 py-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              <Library className="w-4 h-4 text-indigo-500" />
              <span>Library</span>
            </Link>
            <Link 
              href="/vocabulary"
              className="flex items-center gap-3 px-3 py-2 bg-indigo-600/10 text-indigo-400 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              <BookText className="w-4 h-4" />
              <span>Vocabulary</span>
            </Link>
            <button
              onClick={() => setIsIngestOpen(true)}
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
            <Link 
              href="/"
              className="flex items-center gap-3 px-3 py-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              <BookMarked className="w-4 h-4 text-indigo-500" />
              <span>All Articles</span>
            </Link>
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
            onClick={logout}
            className="p-1.5 hover:bg-red-500/10 text-foreground/40 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. CENTER CANVAS */}
      <main className="flex-1 flex flex-col h-full bg-background overflow-y-auto">
        <div className="max-w-[840px] w-full mx-auto px-6 py-12 md:py-16 flex flex-col">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8 pb-6 border-b border-foreground/10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-foreground leading-none">
                Vocabulary
              </h2>
              <p className="text-foreground/45 text-xs font-bold uppercase tracking-widest mt-2">
                Your saved jargon and AI definitions.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualSync}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground/60 hover:text-indigo-400 border border-foreground/10 rounded-md transition-colors cursor-pointer"
                title="Refresh vocabulary list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Search bar & quick filter */}
          {vocabulary.length > 0 && (
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter saved words or definitions..."
                  className="w-full bg-foreground/[0.02] border border-foreground/10 rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-foreground/40 hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/40 shrink-0">
                {filteredVocabulary.length} {filteredVocabulary.length === 1 ? 'Word' : 'Words'}
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-950/10 border border-red-900/30 rounded-2xl text-red-400 mb-8">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              <p className="text-foreground/40 text-xs font-bold uppercase tracking-widest">
                Loading Vocabulary...
              </p>
            </div>
          ) : vocabulary.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-foreground/10 rounded-2xl p-8 max-w-md mx-auto mt-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center mb-4 text-indigo-400">
                <BookText className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-foreground/90 text-lg">
                No Vocabulary Saved
              </h3>
              <p className="text-foreground/50 text-xs mt-1.5 max-w-xs leading-relaxed">
                Highlight words in any article to build your vocabulary.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                <span>Read Articles in Library</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : filteredVocabulary.length === 0 ? (
            /* Search filter yielded no results */
            <div className="text-center py-16 text-foreground/50 text-xs">
              No vocabulary items match &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            /* Notion-Style Vocabulary Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVocabulary.map((item) => (
                <div
                  key={item.id}
                  className="bg-foreground/[0.02] border border-foreground/10 rounded-xl p-5 hover:border-indigo-500/30 hover:bg-foreground/[0.035] transition-all duration-200 group relative flex flex-col justify-between shadow-2xs"
                >
                  {/* Top row: Word and Delete Button */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <h3 className="font-bold text-base sm:text-lg text-foreground capitalize tracking-tight leading-snug">
                        {item.word}
                      </h3>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="p-1.5 text-foreground/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer shrink-0 disabled:opacity-50"
                        title="Delete from vocabulary"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Definition */}
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line font-normal">
                      {item.definition}
                    </p>
                  </div>

                  {/* Card Footer: Metadata chip */}
                  <div className="mt-4 pt-3 border-t border-foreground/5 flex items-center justify-between text-[10px] text-foreground/40 font-medium">
                    <span className="flex items-center gap-1">
                      <Bookmark className="w-3 h-3 text-indigo-400/80" />
                      <span>Saved Definition</span>
                    </span>
                    {item.created_at && (
                      <span className="text-[9px] uppercase tracking-wider text-foreground/35">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 3. RIGHT SIDEBAR */}
      <aside className="w-80 bg-foreground/[0.02] text-foreground border-l border-foreground/5 hidden lg:flex flex-col h-full shrink-0 p-6 overflow-y-auto select-none space-y-8">
        <div>
          <h3 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            Vocabulary Stats
          </h3>
          <div className="grid grid-cols-2 gap-3.5 bg-background border border-foreground/10 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[20px] font-black text-foreground font-mono">
                {vocabulary.length}
              </span>
              <span className="text-[9px] font-bold text-foreground/50 uppercase tracking-wider">
                Total Words
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-black text-foreground font-mono">
                {new Set(vocabulary.map((v) => v.word.charAt(0).toUpperCase())).size}
              </span>
              <span className="text-[9px] font-bold text-foreground/50 uppercase tracking-wider">
                Unique Initials
              </span>
            </div>
          </div>
        </div>

        {/* Jargon Buster Guide Card */}
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 space-y-2.5 text-foreground/80 shadow-sm">
          <h4 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 fill-indigo-400/25" />
            How to Build Vocabulary
          </h4>
          <p className="text-xs text-foreground/60 leading-relaxed">
            While reading any article, simply select a technical word or phrase. The Jargon Buster Magic Tooltip will explain it with AI.
          </p>
          <p className="text-xs text-foreground/60 leading-relaxed">
            Tap the <Bookmark className="w-3 h-3 inline text-indigo-400 mx-0.5" /> Bookmark icon inside the tooltip to save the explanation straight into this review notebook.
          </p>
        </div>
      </aside>

      {/* URL INGEST MODAL DIALOG */}
      {isIngestOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-scaleUp text-slate-100">
            <button 
              onClick={() => setIsIngestOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-6">
              <h3 className="font-extrabold text-base text-slate-200 flex items-center gap-2">
                <Globe className="w-4.5 h-4.5 text-indigo-400" />
                Ingest New Content
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Paste any standard Web article URL or YouTube video link to scrape, clean, and analyze it.
              </p>
            </div>

            <UrlInputBar onIngestSuccess={() => {
              setIsIngestOpen(false);
              router.push('/');
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
