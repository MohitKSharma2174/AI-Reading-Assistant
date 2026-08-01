'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, Clock, Tag as TagIcon, Sparkles, BookOpen, AlertCircle, 
  RefreshCw, MessageSquare, Trash2, X, Library, BookMarked, User as UserIcon, Plus, 
  Globe, MessageCircle, Send, Check, LogOut 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  getArticle, getHighlights, createHighlight, deleteHighlight, askArticleAI, summarizePassageAI,
  Article, Highlight 
} from '../../../lib/api';
import TypographyToolbar, { TypographyConfig } from '../../../components/TypographyToolbar';
import UrlInputBar from '../../../components/UrlInputBar';
import { useTheme } from '../../../lib/ThemeContext';
import { useAuth } from '../../../context/AuthContext';

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  
  const idStr = params.id as string;
  const id = parseInt(idStr, 10);

  const [article, setArticle] = useState<Article | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ingest Modal state
  const [isIngestOpen, setIsIngestOpen] = useState(false);

  // Collapsible AI Sidebar state
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);

  // Typography Config (font/size/height only — theme is managed by ThemeContext)
  const [typoConfig, setTypoConfig] = useState<TypographyConfig>({
    font: 'font-serif',
    size: 'text-lg',
    height: '1.75',
  });

  // Text Selection and Tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  
  // Note/Summarize Modal State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [summarizeLoading, setSummarizeLoading] = useState(false);

  // Ask AI Modal State
  const [showAskAIModal, setShowAskAIModal] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

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

  // Protect Route: Redirect to /login if unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isNaN(id)) {
      setError('Invalid ID');
      setLoading(false);
      return;
    }
    if (isAuthenticated) {
      fetchArticleDetails();
    }
  }, [id, isAuthenticated]);

  // Selection Handler (Viewport-relative fixed positioning)
  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const text = selection.toString().trim();
    if (text.length > 2) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Calculate raw viewport coordinates (fixed positioning)
        setTooltipPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 45
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

  // Action: Summarize (opens Summarize/Note Modal with real Groq AI summary)
  const triggerSummarize = async () => {
    if (!selectedText) return;
    
    setNoteText('');
    setSelectedColor('yellow');
    setShowNoteModal(true);
    setShowTooltip(false);
    setIsAiSidebarOpen(true);
    setSummarizeLoading(true);

    try {
      const res = await summarizePassageAI(id, { context: selectedText });
      setNoteText(res.summary);
    } catch (err: any) {
      setNoteText(`[Summary failed: ${err.message || 'Could not generate summary.'}]`);
    } finally {
      setSummarizeLoading(false);
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
    } catch (err: any) {
      alert(err.message || 'Failed to save note.');
    }
  };

  // Action: Ask AI
  const triggerAskAI = () => {
    if (!selectedText) return;
    setAiQuestion('');
    setAiAnswer('');
    setShowAskAIModal(true);
    setShowTooltip(false);
    setIsAiSidebarOpen(true);
  };

  const handleAskAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim() || !selectedText) return;

    setAiLoading(true);
    setAiAnswer('');
    setAiError('');

    try {
      const result = await askArticleAI(id, {
        question: aiQuestion,
        context: selectedText,
      });
      setAiAnswer(result.answer);
    } catch (err: any) {
      setAiError(err.message || 'Failed to get AI response. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAIResponseAsNote = async () => {
    if (!selectedText || !aiAnswer) return;
    try {
      const combinedNote = `Q: ${aiQuestion}\nAI: ${aiAnswer}`;
      const newHl = await createHighlight(id, {
        selected_text: selectedText,
        note: combinedNote,
        color: 'blue'
      });
      setHighlights((prev) => [...prev, newHl]);
      window.getSelection()?.removeAllRanges();
      setShowAskAIModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save AI response.');
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

  // Paragraph highlights parser
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
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:block w-64 p-3.5 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl shadow-2xl z-30 font-sans pointer-events-none leading-relaxed">
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
    <div className="flex h-screen bg-background text-foreground font-sans transition-colors duration-300 overflow-hidden relative">
      
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
              className="flex items-center gap-3 px-3 py-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              <Library className="w-4 h-4 text-indigo-500" />
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
            <Link 
              href="/"
              className="flex items-center gap-3 px-3 py-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              <BookMarked className="w-4 h-4 text-indigo-500" />
              <span>All Articles</span>
            </Link>
          </div>

          {/* Settings Toolbar Popover (Typography settings is embedded in Left Navigation bar) */}
          <div className="space-y-1.5 pt-4 border-t border-foreground/5">
            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest px-3 block mb-2">
              Display Adjuster
            </span>
            <div className="px-2">
              <TypographyToolbar onChange={(conf) => setTypoConfig(conf)} />
            </div>
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

      {/* 2. CENTER CANVAS (Flex-1, Distraction-free reader text layout) */}
      <main 
        onMouseUp={handleSelection}
        className="flex-1 flex flex-col h-full bg-background overflow-y-auto"
      >
        <div className="max-w-[720px] w-full mx-auto px-6 py-12 md:py-16 flex flex-col">
          <article className="flex flex-col">
            {/* Source url meta */}
            <div className="flex flex-wrap items-center gap-3.5 mb-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
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
            <h1 className="text-3xl sm:text-4xl md:text-4xl font-serif font-black tracking-tight leading-tight text-foreground mb-8">
              {article.title}
            </h1>

            {/* Article Content Container with inline styles for Line Height override */}
            <div 
              className={`max-w-none ${typoConfig.font} ${typoConfig.size} text-foreground/80 antialiased`}
              style={{ lineHeight: parseFloat(typoConfig.height) }}
            >
              {article.clean_content ? (
                article.clean_content.split('\n\n').map((paragraph, index) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;
                  
                  return (
                    <p key={index} className="mb-6">
                      {renderParagraphWithHighlights(trimmed)}
                    </p>
                  );
                })
              ) : (
                <p className="italic text-foreground/30">No content available.</p>
              )}
            </div>
          </article>
        </div>
      </main>

      {/* 3. RIGHT SIDEBAR (350px, Dark Slate #1C1C1E theme, collapsible) */}
      {isAiSidebarOpen && (
        <aside className="w-80 bg-[#1C1C1E] text-slate-200 border-l border-slate-800 flex flex-col h-full shrink-0 overflow-y-auto select-none p-6 space-y-8 relative">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 fill-indigo-400/25" />
              AI Assistant Panel
            </h3>
            <button 
              onClick={() => setIsAiSidebarOpen(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Groq AI summary widget */}
          {article.summary && article.summary.bullet_points.length > 0 && (
            <div>
              <h3 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-indigo-400/25" />
                Groq AI Summary
              </h3>
              <ul className="space-y-3.5 text-xs text-slate-400 pl-4 list-disc marker:text-indigo-500/80 leading-relaxed">
                {article.summary.bullet_points.map((bullet, idx) => (
                  <li key={idx}>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags widget */}
          {article.tags.length > 0 && (
            <div>
              <h3 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5" />
                Topic Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((t) => (
                  <span
                    key={t.id}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-slate-900 border border-slate-800 text-slate-400"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Digital notebook annotations highlights lists */}
          <div>
            <h3 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Saved Highlights ({highlights.length})
            </h3>
            <div className="space-y-4">
              {highlights.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs italic border border-dashed border-slate-800 rounded-2xl p-4">
                  Select text in the reader canvas to highlight and ask AI questions.
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
                      className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 relative group hover:border-slate-700 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          Annotated Highlight
                        </span>
                        
                        <button
                          onClick={() => handleDeleteHighlight(hl.id)}
                          className="absolute top-3.5 right-3.5 p-1 text-slate-500 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs italic text-slate-400 border-l border-slate-800 pl-2 mb-2 line-clamp-3 leading-relaxed">
                        "{hl.selected_text}"
                      </p>

                      {hl.note && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80">
                          <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest block mb-0.5">
                            Notes / AI Responses
                          </span>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                            {hl.note}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Floating Action Button (FAB) to toggle AI Sidebar */}
      <button
        onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-slate-100 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-indigo-500/20"
        title="Toggle AI Summary & Notes"
      >
        {isAiSidebarOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {/* FLOATING TEXT SELECTION TOOLTIP */}
      {showTooltip && (
        <div 
          style={{ 
            position: 'fixed', 
            left: `${tooltipPos.x}px`, 
            top: `${tooltipPos.y}px`,
            transform: 'translateX(-50%)'
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-2xl flex items-center gap-1.5 z-50 animate-tooltipAppear text-slate-100 font-sans"
        >
          <button
            onClick={triggerSummarize}
            className="px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>📝 Summarize</span>
          </button>
          
          <div className="w-px h-5 bg-slate-800"></div>

          <button
            onClick={triggerAskAI}
            className="px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>💬 Ask AI</span>
          </button>
        </div>
      )}

      {/* SUMMARIZE / ADD NOTE DIALOG MODAL */}
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
              <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
              Summarize Selected Context
            </h3>

            <form onSubmit={handleAddNoteSubmit} className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  Selected Context
                </span>
                <p className="text-xs italic text-slate-400 bg-slate-950 border border-slate-850 rounded-xl p-3 max-h-24 overflow-y-auto">
                  "{selectedText}"
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between mb-1">
                  <span>AI Summary / Custom Note</span>
                  {summarizeLoading && (
                    <span className="text-indigo-400 flex items-center gap-1 normal-case font-semibold text-xs">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Generating Groq summary...
                    </span>
                  )}
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={summarizeLoading ? "Generating AI summary of passage..." : "Review or modify summary notes..."}
                  disabled={summarizeLoading}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-100 placeholder-slate-650 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50"
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
                  Save Highlight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASK AI DIALOG MODAL */}
      {showAskAIModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-scaleUp text-slate-100">
            <button 
              onClick={() => setShowAskAIModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-extrabold text-base text-slate-200 mb-4 flex items-center gap-2">
              <MessageCircle className="w-4.5 h-4.5 text-indigo-400" />
              Ask Inkwell Assist AI
            </h3>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  Selected Context
                </span>
                <p className="text-xs italic text-slate-400 bg-slate-950 border border-slate-850 rounded-xl p-3 max-h-20 overflow-y-auto">
                  "{selectedText}"
                </p>
              </div>

              {/* Chat question form */}
              <form onSubmit={handleAskAISubmit} className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Ask a question about this passage..."
                  className="flex-1 bg-slate-950 border border-slate-850 text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiQuestion.trim()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-slate-100 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {aiLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </form>

              {/* Error display */}
              {aiError && (
                <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-3 text-xs text-red-400 animate-fadeIn">
                  {aiError}
                </div>
              )}

              {/* AI Answer display */}
              {aiAnswer && (
                <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-2xl p-4 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                    <Sparkles className="w-3 h-3 fill-indigo-400/20" />
                    Inkwell AI Answer
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {aiAnswer}
                  </p>
                  <button
                    onClick={handleSaveAIResponseAsNote}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    Save to Notebook
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

            {/* Embed original UrlInputBar */}
            <UrlInputBar onIngestSuccess={() => {
              setIsIngestOpen(false);
              fetchArticleDetails();
            }} />
          </div>
        </div>
      )}

    </div>
  );
}
