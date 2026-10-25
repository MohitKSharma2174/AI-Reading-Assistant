'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, Clock, Tag as TagIcon, Sparkles, BookOpen, AlertCircle, 
  RefreshCw, MessageSquare, Trash2, X, Library, BookMarked, User as UserIcon, Plus, 
  Globe, MessageCircle, Send, Check, LogOut, Sun, Moon, Eye, Bookmark, BookText 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  getArticle, getHighlights, createHighlight, deleteHighlight, askArticleAI, summarizePassageAI,
  explainText, saveVocabulary,
  Article, Highlight 
} from '../../../lib/api';
import TypographyToolbar, { TypographyConfig } from '../../../components/TypographyToolbar';
import UrlInputBar from '../../../components/UrlInputBar';
import { useTheme } from '../../../lib/ThemeContext';
import { useAuth } from '../../../context/AuthContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  context?: string;
}

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  
  const idStr = params.id as string;
  const id = parseInt(idStr, 10);

  const [article, setArticle] = useState<Article | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ingest Modal state
  const [isIngestOpen, setIsIngestOpen] = useState(false);

  // Typography Config (Font, Size, Line Height, Tracking)
  const [typoConfig, setTypoConfig] = useState<TypographyConfig>({
    font: 'font-sans',
    sizeIndex: 2,
    sizeClass: 'text-lg md:text-xl',
    lineHeight: 'loose',
    lineHeightClass: 'leading-loose',
    tracking: 'default',
    trackingClass: 'tracking-normal',
    size: 'text-lg md:text-xl',
    height: '2.0',
  });

  // Text Selection and Jargon Buster Magic Tooltip State
  interface TooltipState {
    visible: boolean;
    x: number;
    y: number;
    text: string;
    loading: boolean;
    result: string;
    error: string;
    saved: boolean;
  }

  const [tooltipState, setTooltipState] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    loading: false,
    result: '',
    error: '',
    saved: false,
  });
  const [selectedText, setSelectedText] = useState('');
  
  // Note/Summarize State
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [summarizeLoading, setSummarizeLoading] = useState(false);

  // Ask AI & Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const aiInputRef = useRef<HTMLInputElement>(null);

  // Active Highlight & Chat Mode state
  const activeHighlight = selectedText.trim();
  const isChatMode = Boolean(activeHighlight || chatHistory.length > 0);

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

  // Selection Handler for Jargon Buster Magic Tooltip
  const handleMouseUp = async (e: React.MouseEvent) => {
    // If clicked inside the magic tooltip itself, do not close or retrigger
    const target = e.target as HTMLElement | null;
    if (target?.closest('#magic-tooltip')) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setTooltipState((prev) => ({ ...prev, visible: false, saved: false }));
      return;
    }

    const rawText = selection.toString();
    const text = rawText.trim();
    if (!text) {
      setTooltipState((prev) => ({ ...prev, visible: false, saved: false }));
      return;
    }

    setSelectedText(text);

    // Strict character limit check (> 200 chars: show tooltip at cursor with error, DO NOT call backend)
    if (text.length > 200) {
      setTooltipState({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        text,
        loading: false,
        result: '',
        error: 'Selection too long. Highlight a specific word or short sentence.',
        saved: false,
      });
      return;
    }

    // <= 200 chars: Calculate bounding client rect to set coordinates just above the text
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const posX = rect.left + rect.width / 2;
      const posY = rect.top;

      setTooltipState({
        visible: true,
        x: posX,
        y: posY,
        text,
        loading: true,
        result: '',
        error: '',
        saved: false,
      });

      const res = await explainText(text);
      const explanation = typeof res === 'string' ? res : (res?.explanation || '');

      setTooltipState((prev) => {
        if (!prev.visible || prev.text !== text) return prev;
        return {
          ...prev,
          loading: false,
          result: explanation,
          error: '',
        };
      });
    } catch (err: any) {
      setTooltipState((prev) => {
        if (!prev.visible || prev.text !== text) return prev;
        return {
          ...prev,
          loading: false,
          result: '',
          error: err.message || 'Failed to explain text. Please try again.',
        };
      });
    }
  };

  // Close tooltip on document clicks where selection is collapsed
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('#magic-tooltip')) {
        return;
      }
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setTooltipState((prev) => ({ ...prev, visible: false, saved: false }));
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  // Action: Summarize selected text into Right Sidebar
  const triggerSummarize = async () => {
    if (!selectedText) return;
    
    setNoteText('');
    setSelectedColor('yellow');
    setTooltipState((prev) => ({ ...prev, visible: false, saved: false }));
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

  const handleAddNoteSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedText && !noteText) return;

    try {
      const newHl = await createHighlight(id, {
        selected_text: selectedText || (article ? article.title : 'Article Note'),
        note: noteText.trim() || undefined,
        color: selectedColor
      });
      setHighlights((prev) => [...prev, newHl]);
      window.getSelection()?.removeAllRanges();
      setNoteText('');
      setSelectedText('');
    } catch (err: any) {
      alert(err.message || 'Failed to save highlight.');
    }
  };

  // Action: Ask AI (focuses sidebar chat input with active passage)
  const triggerAskAI = () => {
    setTooltipState((prev) => ({ ...prev, visible: false, saved: false }));
    setTimeout(() => {
      aiInputRef.current?.focus();
    }, 100);
  };

  const handleAskAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;

    const currentQ = aiQuestion.trim();
    const currentCtx = selectedText;
    setAiQuestion('');
    setAiLoading(true);
    setAiError('');

    // Append user question to chat history
    setChatHistory((prev) => [...prev, { role: 'user', content: currentQ, context: currentCtx }]);

    try {
      const result = await askArticleAI(id, {
        question: currentQ,
        context: currentCtx || (article?.clean_content ? article.clean_content.slice(0, 2000) : ''),
      });
      setChatHistory((prev) => [...prev, { role: 'assistant', content: result.answer, context: currentCtx }]);
    } catch (err: any) {
      setAiError(err.message || 'Failed to get AI response. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveChatAnswerToNotebook = async (answer: string, context?: string) => {
    try {
      const newHl = await createHighlight(id, {
        selected_text: context || (article ? article.title : 'Article Q&A'),
        note: answer,
        color: 'blue'
      });
      setHighlights((prev) => [...prev, newHl]);
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
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedText(part);
                  if (match.note) {
                    setNoteText(match.note);
                  }
                }}
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
              className="flex items-center gap-3 px-3 py-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              <BookText className="w-4 h-4 text-indigo-500" />
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

      {/* 2. CENTER CANVAS (Flex-1, Distraction-free reader text layout) */}
      <main 
        onMouseUp={handleMouseUp}
        className="flex-1 flex flex-col h-full bg-background overflow-y-auto"
      >
        <div className="max-w-[720px] w-full mx-auto px-6 py-12 md:py-16 flex flex-col">
          <article 
            onMouseUp={handleMouseUp}
            className="flex flex-col"
          >
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
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 text-foreground font-serif">
              {article.title}
            </h1>

            {/* Article Content Container with clean, readable typography */}
            <div 
              className={`max-w-none ${typoConfig.font} ${typoConfig.sizeClass || 'text-lg md:text-xl'} ${typoConfig.lineHeightClass || 'leading-loose'} ${typoConfig.trackingClass || 'tracking-normal'} text-foreground/90 space-y-6 antialiased`}
            >
              {article.clean_content ? (
                article.clean_content.split('\n\n').map((paragraph, index) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;
                  
                  return (
                    <p key={index}>
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

      {/* 3. RIGHT SIDEBAR (Anchored Permanent AI Assistant & Notes Sidebar) */}
      <aside className="w-80 md:w-96 bg-foreground/[0.02] text-foreground border-l border-foreground/5 flex flex-col h-full shrink-0 select-none overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-foreground/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isChatMode ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-600/10 text-indigo-400'
            }`}>
              <Sparkles className="w-4 h-4 fill-current/25" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-foreground tracking-tight leading-none">
                AARC Assistant
              </h3>
              <span className="text-[9px] text-foreground/40 font-bold uppercase tracking-widest">
                {isChatMode ? 'Chat Mode Active' : 'AI Chat & Notes'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {activeHighlight && (
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Passage Active
              </span>
            )}
            {chatHistory.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setChatHistory([]);
                  setSelectedText('');
                  setAiError('');
                }}
                className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
                title="Reset chat to article summary"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Chat History & Annotations Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin flex flex-col">
          {/* Active Selected Passage Context Card */}
          {activeHighlight && (
            <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-3 text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Selected Passage Context
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedText('')}
                  className="text-[9px] text-foreground/40 hover:text-foreground font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <p className="text-foreground/70 italic text-[11px] leading-relaxed line-clamp-3">
                "{activeHighlight}"
              </p>
            </div>
          )}

          {/* Passage Summary Text Box */}
          {(summarizeLoading || noteText) && (
            <div className="bg-background border border-foreground/10 rounded-2xl p-3.5 space-y-2.5 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3 fill-indigo-400/25" />
                  Passage Summary
                </span>
                {summarizeLoading && (
                  <span className="text-indigo-400 flex items-center gap-1 text-[10px]">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Generating...
                  </span>
                )}
              </div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={summarizeLoading ? "Generating AI summary of passage..." : "Review or modify summary notes..."}
                disabled={summarizeLoading}
                rows={3}
                className="w-full bg-foreground/[0.03] border border-foreground/10 text-foreground placeholder-foreground/40 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs resize-none"
              />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
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
                        className={`w-4 h-4 rounded-full cursor-pointer transition-transform ${cBg} ${
                          selectedColor === color ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105 opacity-70'
                        }`}
                      />
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleAddNoteSubmit}
                  disabled={!noteText.trim()}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
                >
                  Save Highlight
                </button>
              </div>
            </div>
          )}

          {/* Chat Conversation History (Expands to take up the space where summary was) */}
          {chatHistory.length > 0 && (
            <div className="space-y-3 flex-1 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest block">
                  Conversation
                </span>
                <button
                  type="button"
                  onClick={() => setChatHistory([])}
                  className="text-[9px] font-bold uppercase tracking-wider text-foreground/35 hover:text-foreground/70 transition-colors cursor-pointer"
                >
                  Clear Chat
                </button>
              </div>
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-3.5 space-y-1.5 text-xs ${
                    msg.role === 'user'
                      ? 'bg-indigo-600/10 border border-indigo-500/20 ml-4'
                      : 'bg-background border border-foreground/10 mr-2 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">
                      {msg.role === 'user' ? 'You' : 'AARC AI'}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleSaveChatAnswerToNotebook(msg.content, msg.context)}
                        className="text-[9px] text-foreground/40 hover:text-indigo-400 flex items-center gap-1 font-bold uppercase tracking-wider cursor-pointer"
                        title="Save response to highlights notebook"
                      >
                        <Check className="w-2.5 h-2.5" />
                        Save Note
                      </button>
                    )}
                  </div>
                  {msg.context && msg.role === 'user' && (
                    <p className="text-[10px] text-foreground/45 italic line-clamp-1 border-l-2 border-indigo-400/40 pl-1.5">
                      "{msg.context}"
                    </p>
                  )}
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Active Highlight Empty Chat Prompt */}
          {chatHistory.length === 0 && activeHighlight && !noteText && !summarizeLoading && (
            <div className="bg-indigo-500/[0.04] border border-dashed border-indigo-500/20 rounded-2xl p-4 text-center space-y-2 animate-fadeIn">
              <div className="w-8 h-8 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-400 mx-auto">
                <MessageCircle className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-foreground/90">Passage Linked to Chat</p>
              <p className="text-[11px] text-foreground/50 leading-relaxed max-w-[220px] mx-auto">
                Ask a question about this selection below or choose an action.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={triggerSummarize}
                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  📝 Summarize
                </button>
                <button
                  type="button"
                  onClick={() => aiInputRef.current?.focus()}
                  className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  💬 Ask AI
                </button>
              </div>
            </div>
          )}

          {aiLoading && (
            <div className="flex items-center gap-2 p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl text-xs text-indigo-400 animate-fadeIn">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>AARC AI is thinking...</span>
            </div>
          )}
          {aiError && (
            <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-2xl text-xs text-red-400 animate-fadeIn">
              {aiError}
            </div>
          )}

          {/* Groq Article Executive Summary: ONLY visible if user has NOT highlighted text AND user has NOT started a chat */}
          {!activeHighlight && chatHistory.length === 0 && article?.summary && article.summary.bullet_points.length > 0 && (
            <div className="pt-2 border-t border-foreground/5 animate-fadeIn">
              <h3 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-indigo-400/25" />
                Article Executive Summary
              </h3>
              <ul className="space-y-2.5 text-xs text-foreground/70 pl-4 list-disc marker:text-indigo-500/80 leading-relaxed">
                {article.summary.bullet_points.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Topic Tags */}
          {article && article.tags.length > 0 && (
            <div>
              <h3 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5" />
                Topic Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((t) => (
                  <span
                    key={t.id}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-background border border-foreground/10 text-foreground/60"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Digital Notebook Annotations / Highlights */}
          <div>
            <h3 className="font-extrabold text-[10px] text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Saved Highlights ({highlights.length})
            </h3>
            {highlights.length === 0 ? (
              <div className="text-center py-6 text-foreground/40 text-xs italic border border-dashed border-foreground/10 rounded-2xl p-4">
                Select text in the reader canvas to summarize, ask AI, or highlight.
              </div>
            ) : (
              <div className="space-y-3">
                {highlights.map((hl) => {
                  let dotColor = 'bg-yellow-400';
                  if (hl.color === 'pink') dotColor = 'bg-pink-400';
                  if (hl.color === 'green') dotColor = 'bg-emerald-400';
                  if (hl.color === 'blue') dotColor = 'bg-sky-400';

                  return (
                    <div
                      key={hl.id}
                      className="bg-background border border-foreground/10 rounded-2xl p-3.5 relative group hover:border-foreground/20 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                        <span className="text-[9px] text-foreground/40 font-bold uppercase tracking-wider">
                          Annotated Highlight
                        </span>
                        <button
                          onClick={() => handleDeleteHighlight(hl.id)}
                          className="absolute top-3 right-3 p-1 text-foreground/30 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Delete Highlight"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs italic text-foreground/60 border-l border-foreground/15 pl-2 mb-1.5 line-clamp-3 leading-relaxed">
                        "{hl.selected_text}"
                      </p>
                      {hl.note && (
                        <div className="mt-2 pt-2 border-t border-foreground/5">
                          <p className="text-xs text-foreground/80 font-medium leading-relaxed whitespace-pre-line">
                            {hl.note}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Chat Input Bar */}
        <form onSubmit={handleAskAISubmit} className="p-3 border-t border-foreground/5 bg-background shrink-0 space-y-2">
          <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/10 rounded-2xl px-3 py-1.5 focus-within:border-indigo-500/50 transition-colors">
            <input
              ref={aiInputRef}
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder={activeHighlight ? "Ask about selected passage..." : "Ask AARC about this article..."}
              className="flex-1 bg-transparent text-foreground placeholder-foreground/40 text-xs focus:outline-none py-1"
              disabled={aiLoading}
            />
            <button
              type="submit"
              disabled={aiLoading || !aiQuestion.trim()}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-xl transition-colors disabled:opacity-40 cursor-pointer shadow-sm shrink-0"
              title="Send message"
            >
              {aiLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] text-foreground/40 font-medium truncate max-w-[200px]">
              {activeHighlight ? "Grounded on selection" : "Grounded on article"}
            </span>
            {activeHighlight && (
              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider shrink-0">
                Context Active
              </span>
            )}
          </div>
        </form>
      </aside>

      {/* JARGON BUSTER MAGIC TOOLTIP */}
      {tooltipState.visible && (
        <div 
          id="magic-tooltip"
          style={{ 
            left: tooltipState.x, 
            top: tooltipState.y - 10,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute z-50 max-w-sm bg-slate-900 text-slate-100 p-3 rounded-xl shadow-2xl border border-slate-700 text-sm animate-tooltipAppear -translate-x-1/2 -translate-y-full pointer-events-auto"
        >
          {tooltipState.loading && (
            <div className="flex items-center gap-2.5 py-1 px-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
              <span className="text-slate-300 font-medium text-xs animate-pulse">Analyzing...</span>
            </div>
          )}

          {!tooltipState.loading && tooltipState.error && (
            <p className="text-slate-400 text-xs leading-relaxed py-0.5">
              {tooltipState.error}
            </p>
          )}

          {!tooltipState.loading && !tooltipState.error && tooltipState.result && (
            <div className="relative pr-6">
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  await saveVocabulary(tooltipState.text, tooltipState.result);
                  setTooltipState((prev) => ({ ...prev, saved: true }));
                }}
                className={`absolute top-0 right-0 p-1 rounded-md transition-colors cursor-pointer ${
                  tooltipState.saved
                    ? 'text-indigo-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={tooltipState.saved ? 'Saved to Vocabulary' : 'Save to Vocabulary'}
              >
                <Bookmark className={`w-4 h-4 ${tooltipState.saved ? 'fill-indigo-500 text-indigo-500' : ''}`} />
              </button>
              <p className="text-slate-100 text-xs leading-relaxed whitespace-pre-line">
                {tooltipState.result}
              </p>
            </div>
          )}
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
