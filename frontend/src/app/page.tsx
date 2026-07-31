'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Clock, Tag as TagIcon, Trash2, BookOpen, AlertCircle, RefreshCw, 
  ChevronRight, Plus, Library, Sparkles, BookMarked, User, X, Globe, BarChart2 
} from 'lucide-react';
import { getArticles, deleteArticle, Article } from '../lib/api';
import UrlInputBar from '../components/UrlInputBar';
import { useTheme } from '../lib/ThemeContext';

export default function LibraryPage() {
  const { theme, setTheme } = useTheme();
  const [articles, setArticles] = useState<Article[]>([]);
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Ingest Modal state
  const [isIngestOpen, setIsIngestOpen] = useState(false);

  const fetchArticlesData = async (tagFilter: string | null = null) => {
    setLoading(true);
    setError('');
    try {
      const fetchedArticles = await getArticles(tagFilter || undefined);
      setArticles(fetchedArticles);

      // Extract unique tags
      if (!tagFilter) {
        const tags = new Set<string>();
        fetchedArticles.forEach((art) => {
          art.tags.forEach((t) => tags.add(t.name));
        });
        setTagsList(Array.from(tags));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load articles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticlesData(selectedTag);
  }, [selectedTag]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Remove this article from your library?')) return;

    try {
      await deleteArticle(id);
      setArticles((prev) => prev.filter((a) => a.id !== id));
      const remaining = articles.filter((a) => a.id !== id);
      const tags = new Set<string>();
      remaining.forEach((art) => {
        art.tags.forEach((t) => tags.add(t.name));
      });
      setTagsList(Array.from(tags));
    } catch (err: any) {
      alert(err.message || 'Failed to delete article.');
    }
  };

  // Metrics for Right Sidebar
  const totalReadingTime = articles.reduce((acc, art) => acc + (art.reading_time || 1), 0);
  const averageReadingTime = articles.length > 0 ? Math.round(totalReadingTime / articles.length) : 0;

  return (
    <div className="flex h-screen bg-background text-foreground font-sans transition-colors duration-300 overflow-hidden">
      
      {/* 1. LEFT SIDEBAR (250px, Light/Neutral Sidebar styling) */}
      <aside className="w-64 bg-foreground/[0.02] border-r border-foreground/5 flex flex-col h-full shrink-0 select-none">
        {/* Header Title */}
        <div className="p-6 border-b border-foreground/5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
              <BookOpen className="w-4.5 h-4.5 text-slate-100" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-foreground text-base tracking-tight leading-none">
                Inkwell
              </span>
              <span className="text-[9px] text-foreground/45 font-bold uppercase tracking-widest mt-0.5">
                AI Reading Hub
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
              className="flex items-center gap-3 px-3 py-2 bg-indigo-600/10 text-indigo-400 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              <Library className="w-4 h-4" />
              <span>Library</span>
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
            <button 
              onClick={() => setSelectedTag(null)}
              className="w-full flex items-center gap-3 px-3 py-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 font-semibold rounded-xl text-sm transition-colors text-left cursor-pointer"
            >
              <BookMarked className="w-4 h-4 text-indigo-500" />
              <span>All Articles</span>
            </button>
          </div>

          {/* Color Mode Shortcut inside Left Navigation */}
          <div className="space-y-1.5 pt-4 border-t border-foreground/5">
            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest px-3 block mb-2">
              Display Theme
            </span>
            <div className="grid grid-cols-3 gap-1 px-1">
              {(['light', 'sepia', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`py-1 text-[10px] font-bold uppercase rounded-md border transition-colors cursor-pointer ${
                    theme === t
                      ? 'bg-indigo-600 text-slate-100 border-indigo-500 shadow-sm'
                      : 'bg-transparent border-foreground/5 text-foreground/50 hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom User Profile Section */}
        <div className="p-4 border-t border-foreground/5 bg-foreground/[0.01] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-bold shrink-0">
            <User className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-foreground truncate">
              System Reader
            </span>
            <span className="text-[9px] text-foreground/45 truncate">
              ID: 0001 • Online
            </span>
          </div>
        </div>
      </aside>

      {/* 2. CENTER CANVAS (Flex-1, Reading columns feed list) */}
      <main className="flex-1 flex flex-col h-full bg-background overflow-y-auto">
        <div className="max-w-[720px] w-full mx-auto px-6 py-12 md:py-16 flex flex-col">
          {/* Header */}
          <div className="flex items-baseline justify-between mb-10 pb-6 border-b border-foreground/10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-foreground leading-none">
                Library Feed
              </h2>
              <p className="text-foreground/45 text-xs font-bold uppercase tracking-widest mt-2">
                Distraction-Free Editorial Columns
              </p>
            </div>
            <button
              onClick={() => fetchArticlesData(selectedTag)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground/60 hover:text-indigo-400 border border-foreground/10 rounded-md transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync Feed
            </button>
          </div>

          {/* Active Tag Filtering Alert Banner */}
          {selectedTag && (
            <div className="mb-6 flex items-center justify-between p-3.5 bg-indigo-600/5 border border-indigo-500/10 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-foreground/70">
                  Filtering columns by tag: <strong className="capitalize text-indigo-400">{selectedTag}</strong>
                </span>
              </div>
              <button 
                onClick={() => setSelectedTag(null)}
                className="text-foreground/40 hover:text-foreground text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-950/10 border border-red-900/30 rounded-2xl text-red-400 mb-8">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          {/* Loading Feed */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              <p className="text-foreground/40 text-xs font-bold uppercase tracking-widest">
                Fetching Columns...
              </p>
            </div>
          ) : articles.length === 0 ? (
            /* Empty Feed */
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-foreground/10 rounded-2xl p-8 max-w-md mx-auto mt-6">
              <BookOpen className="w-6 h-6 text-foreground/20 mb-3" />
              <h3 className="font-serif font-bold text-foreground/80 text-base">No Columns Ingested</h3>
              <p className="text-foreground/40 text-xs mt-1">
                Click "+ Ingest Link" in the left sidebar to add articles to your personal feed.
              </p>
            </div>
          ) : (
            /* Articles list in center canvas */
            <div className="flex flex-col">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/article/${article.id}`}
                  className="group flex flex-col py-8 border-b border-foreground/10 hover:border-indigo-500/20 transition-all duration-200 relative gap-3.5"
                >
                  <div className="flex items-baseline justify-between">
                    {/* Time */}
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-foreground/45 uppercase tracking-widest">
                      <Clock className="w-3 h-3 text-indigo-400/80" />
                      <span>{article.reading_time ? `${article.reading_time} MIN READ` : '1 MIN READ'}</span>
                    </div>

                    <button
                      onClick={(e) => handleDelete(article.id, e)}
                      className="p-1 text-foreground/30 hover:text-red-400 hover:bg-red-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                      title="Delete Article"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif font-bold text-xl sm:text-2xl text-foreground group-hover:text-indigo-400 transition-colors duration-200 leading-tight">
                    {article.title}
                  </h3>

                  {/* Summary Bullets */}
                  {article.summary && article.summary.bullet_points.length > 0 ? (
                    <ul className="space-y-1.5 text-xs sm:text-sm text-foreground/60 pl-4 list-disc marker:text-indigo-500/60 leading-relaxed max-w-2xl">
                      {article.summary.bullet_points.slice(0, 2).map((bullet, idx) => (
                        <li key={idx} className="line-clamp-2">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs italic text-foreground/30">
                      Processing AI summary tags in background...
                    </p>
                  )}

                  {/* Tags list */}
                  {article.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {article.tags.map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-0.5 border border-foreground/10 text-[9px] text-foreground/50 rounded-md font-bold uppercase tracking-wider"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="absolute right-0 bottom-8 translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                    <ChevronRight className="w-5 h-5 text-indigo-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 3. RIGHT SIDEBAR (350px, Dark Slate #1C1C1E theme) */}
      <aside className="w-80 bg-[#1C1C1E] text-slate-200 border-l border-slate-800 flex flex-col h-full shrink-0 p-6 overflow-y-auto select-none space-y-8">
        <div>
          <h3 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            Library Analytics
          </h3>
          <div className="grid grid-cols-2 gap-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[20px] font-black text-slate-100 font-mono">
                {articles.length}
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Total Columns
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-black text-slate-100 font-mono">
                {totalReadingTime}m
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Reading Load
              </span>
            </div>
          </div>
        </div>

        {/* Global Topics Tag Cloud */}
        {tagsList.length > 0 && (
          <div>
            <h3 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5" />
              Tag Explorer
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {tagsList.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-indigo-600 border-indigo-500 text-slate-100 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Platform Insight Widget */}
        <div className="bg-gradient-to-tr from-indigo-950/40 to-violet-950/20 border border-indigo-900/30 rounded-2xl p-5 space-y-2 text-slate-200 shadow-sm">
          <h4 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 fill-indigo-400/25" />
            Inkwell Assist
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Inkwell automatically parses details, fetches clean web/YouTube pages, strips trackers, and extracts main headings via Groq AI Llama-3.
          </p>
        </div>
      </aside>

      {/* URL INGEST MODAL DIALOG (Connects with UrlInputBar) */}
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

            {/* Embed original UrlInputBar */}
            <UrlInputBar onIngestSuccess={() => {
              setIsIngestOpen(false);
              fetchArticlesData(selectedTag);
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
