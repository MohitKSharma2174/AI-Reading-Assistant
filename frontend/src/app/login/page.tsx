'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Sparkles, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { loginUser, signupUser } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'signup') {
        await signupUser(email.trim(), password);
        setSuccess('Account created! Redirecting to library...');
      } else {
        await loginUser(email.trim(), password);
        setSuccess('Logged in successfully! Redirecting...');
      }

      setTimeout(() => {
        router.push('/');
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2 font-sans bg-slate-950 text-slate-100">
      
      {/* 1. LEFT SIDE - Editorial Branding Panel */}
      <div className="relative hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 border-r border-slate-800/60 overflow-hidden select-none">
        {/* Subtle background glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <BookOpen className="w-5 h-5 text-slate-100" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-slate-100 leading-none">
              Inkwell
            </span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">
              AI Reading Assistant
            </span>
          </div>
        </div>

        {/* Middle Hero Statement */}
        <div className="my-auto max-w-lg z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Groq Llama-3 Powered Editorial Workspace</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-serif font-black tracking-tight leading-tight text-slate-100">
            Read deeply. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-300">
              Understand instantly.
            </span>
          </h1>

          <p className="text-slate-400 text-sm leading-relaxed font-normal">
            Inkwell cleans cluttered web pages, builds distraction-free reader columns, and provides instant AI summaries and passage tutors.
          </p>

          {/* Testimonial card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm space-y-2">
            <p className="text-xs italic text-slate-300 leading-relaxed">
              "Inkwell transformed how I digest technical articles and research. The instant Groq passage tutor is invaluable."
            </p>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              — Editorial Reader Community
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="z-10 text-xs text-slate-600 flex items-center justify-between border-t border-slate-850 pt-6">
          <span>© 2026 Inkwell Inc.</span>
          <span>Privacy & Terms</span>
        </div>
      </div>

      {/* 2. RIGHT SIDE - Authentication Form Panel */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 bg-slate-950 relative">
        <div className="max-w-md w-full space-y-8">
          
          {/* Mobile Header Logo */}
          <div className="flex md:hidden items-center justify-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md">
              <BookOpen className="w-4.5 h-4.5 text-slate-100" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-100">
              Inkwell
            </span>
          </div>

          {/* Toggle Tabs (Sign In / Sign Up) */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                mode === 'login'
                  ? 'bg-indigo-600 text-slate-100 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                mode === 'signup'
                  ? 'bg-indigo-600 text-slate-100 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form Header */}
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Start reading smarter'}
            </h2>
            <p className="text-slate-400 text-xs">
              {mode === 'login' 
                ? 'Enter your credentials to access your saved library.' 
                : 'Create your personal account to ingest and annotate articles.'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-950/30 border border-red-900/50 rounded-2xl text-red-300 text-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 p-3.5 bg-emerald-950/30 border border-emerald-900/50 rounded-2xl text-emerald-300 text-xs animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Email Address
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="reader@domain.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 text-slate-100 font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Reader' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Hint */}
          <div className="text-center pt-4 border-t border-slate-900">
            <span className="text-[11px] text-slate-500">
              Default system account: <code className="text-indigo-400 font-mono">fresh_user@inkwell.local</code> / <code className="text-indigo-400 font-mono">securepassword123</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
