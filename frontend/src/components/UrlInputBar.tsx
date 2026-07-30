'use client';

import React, { useState } from 'react';
import { Link, Loader2, Plus, AlertCircle, Check } from 'lucide-react';
import { ingestArticle } from '../lib/api';

interface UrlInputBarProps {
  onIngestSuccess?: () => void;
}

export default function UrlInputBar({ onIngestSuccess }: UrlInputBarProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Basic URL validation
    try {
      new URL(url);
    } catch (_) {
      setStatus('error');
      setErrorMessage('Please enter a valid absolute URL (e.g., https://example.com).');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      await ingestArticle(url.trim());
      setStatus('success');
      setUrl('');
      setTimeout(() => {
        setStatus('idle');
        if (onIngestSuccess) {
          onIngestSuccess();
        } else {
          window.location.reload();
        }
      }, 1500);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Failed to ingest URL.');
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="relative flex items-center w-full border-b border-slate-700/30 hover:border-slate-500/50 focus-within:border-indigo-500 transition-colors duration-200">
        <div className="absolute left-0 text-slate-500">
          <Link className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={status === 'loading'}
          placeholder="Ingest URL (Web URL or YouTube)..."
          className="w-full pl-7 pr-24 py-2.5 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === 'loading' || !url.trim()}
          className="absolute right-0 px-3.5 py-1 text-slate-400 hover:text-indigo-400 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading
            </>
          ) : status === 'success' ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Success
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              Ingest
            </>
          )}
        </button>
      </form>

      {/* Dynamic Feedback Display */}
      {status === 'error' && (
        <div className="mt-2 mx-1 flex items-start gap-2 px-3 py-2 bg-red-950/20 border border-red-900/30 rounded-xl text-red-300 text-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {status === 'success' && (
        <div className="mt-2 mx-1 flex items-center gap-2 px-3 py-2 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-emerald-300 text-xs animate-fadeIn">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>AI summary processing in background.</span>
        </div>
      )}
    </div>
  );
}
