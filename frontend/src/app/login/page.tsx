'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';

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
        setSuccess('Account created! Redirecting to dashboard...');
      } else {
        await loginUser(email.trim(), password);
        setSuccess('Logged in successfully! Redirecting...');
      }

      setTimeout(() => {
        router.push('/dashboard');
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 relative">
      {/* Minimal Header on /login */}
      <Sidebar />

      {/* Form Container */}
      <div className="w-full max-w-md p-8 bg-background border border-foreground/10 rounded-2xl shadow-sm">
        
        {/* Subtle Brand Logo Icon */}
        <div className="flex justify-center mb-6">
          <Link href="/" className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md hover:scale-105 transition-transform duration-200">
            <BookOpen className="w-5 h-5 text-slate-100" />
          </Link>
        </div>

        {/* Header Typography */}
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
            Welcome back to AARC
          </h2>
          <p className="text-xs text-foreground/60 mt-1.5 font-sans">
            {mode === 'login' 
              ? 'Enter your credentials to access your reading library.' 
              : 'Create your account to start reading and annotating.'}
          </p>
        </div>

        {/* Toggle Mode Tabs */}
        <div className="flex items-center p-1 bg-foreground/[0.04] border border-foreground/10 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-background text-foreground shadow-xs font-bold'
                : 'text-foreground/50 hover:text-foreground'
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
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'bg-background text-foreground shadow-xs font-bold'
                : 'text-foreground/50 hover:text-foreground'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs animate-fadeIn font-sans">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2.5 p-3.5 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs animate-fadeIn font-sans">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Input Form with standard sans-serif */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70 block">
              Email Address
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-foreground/40 pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reader@domain.com"
                className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-foreground/20 focus:border-foreground focus:ring-1 focus:ring-foreground rounded-xl text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70 block">
              Password
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-foreground/40 pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-transparent border border-foreground/20 focus:border-foreground focus:ring-1 focus:ring-foreground rounded-xl text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-foreground text-background font-medium rounded-xl text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-2"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Hint */}
        <div className="text-center pt-6 mt-6 border-t border-foreground/10 font-sans">
          <span className="text-[11px] text-foreground/40">
            Demo credentials: <code className="font-mono text-foreground/70">fresh_user@inkwell.local</code> / <code className="font-mono text-foreground/70">securepassword123</code>
          </span>
        </div>
      </div>
    </div>
  );
}
