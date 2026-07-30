'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Tag as TagIcon, Trash2, BookOpen, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import { getArticles, deleteArticle, Article } from '../lib/api';

export default function LibraryPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      {/* Dynamic Navbar */}
      <Navbar onIngestSuccess={() => fetchArticlesData(selectedTag)} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12">
        {/* Editorial Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-12 pb-6 border-b border-foreground/10 gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-foreground">
              Library
            </h2>
            <p className="text-foreground/45 text-xs font-bold uppercase tracking-widest mt-1">
              Curated Reader Ingestions
            </p>
          </div>
          <button
            onClick={() => fetchArticlesData(selectedTag)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground/60 hover:text-indigo-400 border border-foreground/10 rounded-md transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Feed
          </button>
        </div>

        {/* Dynamic Tag Filters Pill Bar */}
        {tagsList.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-hide border-b border-foreground/5">
            <span className="text-[10px] font-black uppercase tracking-wider text-foreground/40 mr-2 shrink-0">
              Filter by:
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 text-xs font-semibold rounded-md shrink-0 transition-colors ${
                selectedTag === null
                  ? 'bg-indigo-600/10 text-indigo-400 font-bold border border-indigo-500/20'
                  : 'bg-transparent text-foreground/50 hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              All Columns
            </button>
            {tagsList.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 text-xs font-semibold rounded-md shrink-0 capitalize transition-colors ${
                  selectedTag === tag
                    ? 'bg-indigo-600/10 text-indigo-400 font-bold border border-indigo-500/20'
                    : 'bg-transparent text-foreground/50 hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-950/10 border border-red-900/30 rounded-2xl text-red-400 mb-8 max-w-xl">
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
            <h3 className="font-serif font-bold text-foreground/80 text-base">Feed is empty</h3>
            <p className="text-foreground/40 text-xs mt-1">
              {selectedTag
                ? `No articles matched "${selectedTag}"`
                : 'Paste a link at the top to populate your reading feed.'}
            </p>
          </div>
        ) : (
          /* List Feed - Editorial Layout */
          <div className="flex flex-col">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/article/${article.id}`}
                className="group flex flex-col md:flex-row md:items-start justify-between py-8 border-b border-foreground/10 hover:border-indigo-500/30 transition-colors duration-200 relative gap-6"
              >
                {/* Left Card content: Header, Time, Summary */}
                <div className="flex-1 space-y-3.5">
                  <div className="flex items-baseline flex-wrap gap-3">
                    {/* Time */}
                    <div className="flex items-center gap-1 text-[10px] font-bold text-foreground/45 uppercase tracking-widest">
                      <Clock className="w-3 h-3 text-indigo-400/80" />
                      <span>{article.reading_time ? `${article.reading_time} MIN READ` : '1 MIN READ'}</span>
                    </div>

                    {/* Tags */}
                    {article.tags.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-foreground/30">•</span>
                        {article.tags.slice(0, 2).map((t) => (
                          <span
                            key={t.id}
                            className="text-[9px] font-black uppercase tracking-wider text-indigo-500/80"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-serif font-bold text-xl sm:text-2xl text-foreground group-hover:text-indigo-400 transition-colors duration-200 leading-tight">
                    {article.title}
                  </h3>

                  {/* Summary Bullets */}
                  {article.summary && article.summary.bullet_points.length > 0 ? (
                    <ul className="space-y-1.5 text-xs sm:text-sm text-foreground/60 max-w-2xl pl-4 list-disc marker:text-indigo-500/60 leading-relaxed">
                      {article.summary.bullet_points.slice(0, 2).map((bullet, idx) => (
                        <li key={idx} className="line-clamp-2">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs italic text-foreground/30">
                      AI processing is generating summary bullet points...
                    </p>
                  )}
                </div>

                {/* Right Card actions: Delete & arrow */}
                <div className="flex items-center gap-4 md:self-center shrink-0 justify-end">
                  <button
                    onClick={(e) => handleDelete(article.id, e)}
                    className="p-2 text-foreground/35 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors cursor-pointer"
                    title="Delete Article"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-foreground/20 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
