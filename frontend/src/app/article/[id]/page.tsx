'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Clock, Tag as TagIcon, Sparkles, BookOpen, AlertCircle, 
  RefreshCw, Highlighter, MessageSquare, Trash2, X, ChevronRight, ChevronLeft 
} from 'lucide-react';
import { 
  getArticle, getHighlights, createHighlight, deleteHighlight, 
  Article, Highlight 
} from '../../../lib/api';
import TypographyToolbar, { TypographyConfig } from '../../../components/TypographyToolbar';

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const idStr = params.id as string;
  const id = parseInt(idStr, 10);

  const [article, setArticle] = useState<Article | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Typography Config (persisted via TypographyToolbar)
  const [typoConfig, setTypoConfig] = useState<TypographyConfig>({
    theme: 'dark',
    font: 'font-serif',
    size: 'text-lg',
    height: '1.75',
  });

  // Text Selection and Tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  
  // Note Modal State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');

  // Sidebar Panel State
  const [showSidebar, setShowSidebar] = useState(false);

  const fetchArticleDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const art = await getArticle(id);
      setArticle(art);
      
      const hlList = await getHighlights(id);
      setHighlights(hlList);
    } catch (err: any) {
      setError(err.message || 'Failed to load article.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isNaN(id)) {
      setError('Invalid ID');
      setLoading(false);
      return;
    }
    fetchArticleDetails();
  }, [id]);

  // Selection Handler
  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const text = selection.toString().trim();
    if (text.length > 2) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setTooltipPos({
          x: rect.left + window.scrollX + rect.width / 2,
          y: rect.top + window.scrollY - 45
        });
        setSelectedText(text);
        setShowTooltip(true);
      } catch (_) {}
    } else {
      setShowTooltip(false);
    }
  };

  // Close tooltip on document clicks where selection is collapsed
  useEffect(() => {
    const handleDocumentClick = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const triggerHighlightOnly = async () => {
    if (!selectedText) return;
    try {
      const newHl = await createHighlight(id, {
        selected_text: selectedText,
        color: 'yellow'
      });
      setHighlights((prev) => [...prev, newHl]);
      window.getSelection()?.removeAllRanges();
      setShowTooltip(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create highlight.');
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedText) return;

    try {
      const newHl = await createHighlight(id, {
        selected_text: selectedText,
        note: noteText.trim() || undefined,
        color: selectedColor
      });
      setHighlights((prev) => [...prev, newHl]);
      window.getSelection()?.removeAllRanges();
      setNoteText('');
      setShowNoteModal(false);
      setShowTooltip(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save note.');
    }
  };

  const handleDeleteHighlight = async (hlId: number) => {
    if (!confirm('Delete this highlight?')) return;
    try {
      await deleteHighlight(hlId);
      setHighlights((prev) => prev.filter((h) => h.id !== hlId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete highlight.');
    }
  };

  // Highlights Paragraph Parser
  const renderParagraphWithHighlights = (paragraphText: string) => {
    const matchingHighlights = highlights.filter((h) => 
      paragraphText.includes(h.selected_text)
    );

    if (matchingHighlights.length === 0) {
      return paragraphText;
    }

    const sorted = [...matchingHighlights].sort((a, b) => b.selected_text.length - a.selected_text.length);
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = sorted.map((h) => escapeRegExp(h.selected_text));
    const regex = new RegExp(`(${patterns.join('|')})`, 'g');

    const parts = paragraphText.split(regex);
    return (
      <>
        {parts.map((part, index) => {
          const match = sorted.find((h) => h.selected_text === part);
          if (match) {
            let colorClass = 'bg-yellow-400/30 text-foreground border-b border-yellow-500/80';
            if (match.color === 'pink') colorClass = 'bg-pink-400/30 text-foreground border-b border-pink-500/80';
            if (match.color === 'green') colorClass = 'bg-emerald-400/30 text-foreground border-b border-emerald-500/80';
            if (match.color === 'blue') colorClass = 'bg-sky-400/30 text-foreground border-b border-sky-500/80';

            return (
              <mark
                key={index}
                className={`${colorClass} px-0.5 rounded cursor-pointer relative group transition-colors duration-150`}
                title={match.note || undefined}
              >
                {part}
                {match.note && (
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:block w-56 p-3.5 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl shadow-2xl z-30 font-sans pointer-events-none leading-relaxed">
                    <span className="font-bold text-[9px] text-indigo-400 block uppercase tracking-wider mb-1">
                      Annotation Note
                    </span>
                    {match.note}
                  </span>
                )}
              </mark>
            );
          }
          return part;
        })}
      </>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-3 font-sans transition-colors duration-300">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-foreground/45 text-xs font-bold uppercase tracking-widest">Loading article view...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 font-sans transition-colors duration-300">
        <div className="max-w-md w-full text-center bg-foreground/5 border border-foreground/10 rounded-2xl p-8 shadow-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground">Reader loading failed</h3>
          <p className="text-foreground/60 text-sm mt-2 mb-6">{error || 'Article not found.'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold rounded-full text-sm transition-colors duration-200 shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300 relative">
      {/* Editorial Header Menu */}
      <header className="w-full bg-background/80 border-b border-foreground/10 backdrop-blur-md sticky top-0 z-40 py-3.5 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-foreground/50 hover:text-foreground text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Library</span>
          </Link>
          
          <div className="flex items-center gap-3">
            {/* Highlights Sidebar Toggle */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex items-center gap-1 px-3 py-1 bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 hover:text-foreground text-foreground/75 text-xs font-semibold rounded-full transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Notes ({highlights.length})</span>
            </button>

            {/* Typography Controls Toolbar */}
            <TypographyToolbar onChange={(conf) => setTypoConfig(conf)} />

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-foreground/5 border border-foreground/10 text-[11px] text-foreground/50 font-semibold rounded-full">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Reader Mode
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative">
        <main 
          onMouseUp={handleSelection}
          className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 md:py-16"
        >
          <article className="flex flex-col">
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3.5 mb-4">
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5" />
                <span>{article.reading_time ? `${article.reading_time} MIN READ` : '1 MIN READ'}</span>
              </div>
              <span className="text-foreground/30 text-xs">•</span>
              <a
                href={article.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-foreground/45 hover:text-indigo-400 uppercase tracking-wider transition-colors"
              >
                View Source URL
              </a>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight leading-tight text-foreground mb-6">
              {article.title}
            </h1>

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-8 pb-6 border-b border-foreground/10">
                <TagIcon className="w-3.5 h-3.5 text-foreground/40" />
                {article.tags.map((t) => (
                  <span
                    key={t.id}
                    className="px-2 py-0.5 border border-foreground/10 text-[10px] text-foreground/70 rounded-md font-semibold tracking-wider uppercase capitalize"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            )}

            {/* AI TL;DR Summary Box */}
            {article.summary && article.summary.bullet_points.length > 0 && (
              <div className="bg-foreground/[0.03] border border-foreground/10 rounded-2xl p-6 sm:p-8 mb-10 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4 text-indigo-400">
                  <Sparkles className="w-4.5 h-4.5 fill-indigo-400/20" />
                  <h4 className="font-extrabold text-xs sm:text-sm tracking-wider uppercase">
                    AI TL;DR Summary
                  </h4>
                </div>
                
                <ul className="space-y-3.5 text-foreground/85 text-sm sm:text-base pl-5 list-disc marker:text-indigo-500/80 leading-relaxed">
                  {article.summary.bullet_points.map((bullet, idx) => (
                    <li key={idx}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Article Content Container with inline styles for Spacing (Line Height) */}
            <div 
              className={`max-w-none ${typoConfig.font} ${typoConfig.size} text-foreground/80 antialiased`}
              style={{ lineHeight: parseFloat(typoConfig.height) }}
            >
              {article.clean_content ? (
                article.clean_content.split('\n\n').map((paragraph, index) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;
                  
                  return (
                    <p key={index} className="mb-6 font-sans">
                      {renderParagraphWithHighlights(trimmed)}
                    </p>
                  );
                })
              ) : (
                <p className="italic text-foreground/30">No content available.</p>
              )}
            </div>
          </article>
        </main>

        {/* Highlights & Notes Sidebar Panel */}
        {showSidebar && (
          <aside className="w-80 bg-background border-l border-foreground/10 shrink-0 h-[calc(100vh-53px)] sticky top-[53px] z-30 flex flex-col animate-slideIn">
            <div className="p-4 border-b border-foreground/10 flex items-center justify-between bg-foreground/[0.01]">
              <h3 className="font-bold text-xs text-foreground/80 flex items-center gap-2 uppercase tracking-wider">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Notes & Highlights
              </h3>
              <button 
                onClick={() => setShowSidebar(false)}
                className="p-1 hover:bg-foreground/5 rounded-lg text-foreground/40 hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {highlights.length === 0 ? (
                <div className="text-center py-16 text-foreground/30 text-xs italic">
                  Select text within the article to create highlights and notes.
                </div>
              ) : (
                highlights.map((hl) => {
                  let dotColor = 'bg-yellow-400';
                  if (hl.color === 'pink') dotColor = 'bg-pink-400';
                  if (hl.color === 'green') dotColor = 'bg-emerald-400';
                  if (hl.color === 'blue') dotColor = 'bg-sky-400';

                  return (
                    <div 
                      key={hl.id} 
                      className="bg-foreground/[0.01] border border-foreground/10 rounded-xl p-3.5 relative group hover:border-foreground/20 transition-all duration-150"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                        <span className="text-[9px] text-foreground/45 font-bold uppercase tracking-wider">
                          Highlight
                        </span>
                        
                        <button
                          onClick={() => handleDeleteHighlight(hl.id)}
                          className="absolute top-2.5 right-2.5 p-1 text-foreground/30 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs italic text-foreground/60 border-l border-foreground/10 pl-2 mb-2 line-clamp-3 leading-relaxed">
                        "{hl.selected_text}"
                      </p>

                      {hl.note && (
                        <div className="mt-2.5 pt-2.5 border-t border-foreground/5">
                          <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest block mb-0.5">
                            Note annotation
                          </span>
                          <p className="text-xs text-foreground/80 font-medium leading-relaxed">
                            {hl.note}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Floating Selection Tooltip */}
      {showTooltip && (
        <div 
          style={{ 
            position: 'absolute', 
            left: `${tooltipPos.x}px`, 
            top: `${tooltipPos.y}px`,
            transform: 'translateX(-50%)'
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-2xl flex items-center gap-1.5 z-50 animate-scaleUp text-slate-100 font-sans"
        >
          <button
            onClick={triggerHighlightOnly}
            className="px-2.5 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>Highlight</span>
          </button>
          
          <div className="w-px h-5 bg-slate-850"></div>

          <button
            onClick={() => setShowNoteModal(true)}
            className="px-2.5 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-scaleUp text-slate-100">
            <button 
              onClick={() => setShowNoteModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-extrabold text-base text-slate-200 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Add Highlight Note
            </h3>

            <form onSubmit={handleAddNoteSubmit} className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  Selected Passage
                </span>
                <p className="text-xs italic text-slate-400 bg-slate-950 border border-slate-850 rounded-xl p-3 max-h-24 overflow-y-auto">
                  "{selectedText}"
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  Note
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Type notes or comments..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-100 placeholder-slate-650 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">
                  Highlight Color
                </span>
                <div className="flex items-center gap-3">
                  {['yellow', 'pink', 'green', 'blue'].map((color) => {
                    let cBg = 'bg-yellow-400';
                    if (color === 'pink') cBg = 'bg-pink-400';
                    if (color === 'green') cBg = 'bg-emerald-400';
                    if (color === 'blue') cBg = 'bg-sky-400';

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${cBg} ${
                          selectedColor === color ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-transparent rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-slate-100 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-md cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
