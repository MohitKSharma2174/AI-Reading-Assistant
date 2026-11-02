'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Sparkles, Headphones, BookOpen, ArrowRight, Check
} from 'lucide-react';
import HeroAnimator from '../components/HeroAnimator';
import Sidebar from '../components/Sidebar';

// Lucide-style Youtube Icon
function Youtube({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      className={className}
      {...props}
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <polygon points="10 15 15 12 10 9" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-indigo-500/30 font-sans transition-colors duration-300">
      
      {/* Minimal Navigation Header */}
      <Sidebar />

      {/* Hero Section */}
      <section className="text-center pt-32 pb-20 px-6">
        <HeroAnimator />

        <h1 className="text-5xl md:text-7xl font-serif tracking-tight mt-12 mb-6">Anything. Anywhere.<br/>Your Reading Companion.</h1>

        <p className="text-lg text-foreground/60 max-w-xl mx-auto mb-10 font-sans">
          AARC transforms cluttered web articles and hours of YouTube transcripts into a pure, AI-enhanced reading companion.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-3 rounded-full bg-foreground text-background font-medium hover:scale-105 transition-transform shadow-lg inline-flex items-center gap-2"
          >
            <span>Start Reading</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* The Feature Flow (Scroll Sections) */}
      <div className="max-w-3xl mx-auto px-6 space-y-40 py-32">
        
        {/* Section 1: Universal Ingestion */}
        <section className="flex flex-col items-start border-l-2 border-foreground/10 pl-6 sm:pl-10 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mb-6 shadow-sm">
            <Youtube className="w-6 h-6" />
          </div>

          <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight mb-4 text-foreground">
            From URLs to pure text.
          </h2>

          <p className="text-lg text-foreground/60 leading-relaxed font-sans max-w-xl mb-8">
            Paste any article or a 3-hour YouTube podcast. Our Dual-Engine AI extracts the transcript and formats it instantly.
          </p>

          {/* Visual Editorial Preview Card */}
          <div className="w-full bg-foreground/[0.02] border border-foreground/10 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-foreground/10">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="font-mono text-xs text-foreground/50 truncate flex-1">
                youtube.com/watch?v=3-hour-deep-dive-podcast
              </div>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded-md">
                Dual-Engine AI
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-foreground text-base">Key Concepts & Chronological Chapters</span>
                <span className="text-[11px] font-mono text-foreground/40">100% Ad-Free</span>
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed font-serif">
                &ldquo;Every spoken phrase transcribed with high-accuracy timestamps, structured by dynamic headings and AI bulleted summaries.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Magic Tooltip */}
        <section className="flex flex-col items-start border-l-2 border-foreground/10 pl-6 sm:pl-10 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mb-6 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>

          <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight mb-4 text-foreground">
            Never hit a wall of jargon.
          </h2>

          <p className="text-lg text-foreground/60 leading-relaxed font-sans max-w-xl mb-8">
            Highlight any complex term for an instant ELI5 definition, automatically saved to your personal vocabulary builder.
          </p>

          {/* Visual Editorial Preview Card */}
          <div className="w-full bg-foreground/[0.02] border border-foreground/10 rounded-2xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
            <p className="text-sm sm:text-base font-serif text-foreground/80 leading-relaxed mb-4">
              Modern distributed consensus relies heavily on{" "}
              <span className="bg-amber-500/20 text-foreground font-semibold px-1.5 py-0.5 rounded border border-amber-500/40 relative">
                Byzantine Fault Tolerance
              </span>{" "}
              to safeguard transaction finality across asymmetric adversarial networks.
            </p>

            <div className="bg-background border border-foreground/15 rounded-xl p-4 shadow-md max-w-md mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  ELI5 Definition
                </span>
                <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" /> Saved to Vocabulary
                </span>
              </div>
              <p className="text-xs text-foreground/75 leading-relaxed font-sans">
                It means a computer network can still reach agreement even if some computers lie, fail, or try to disrupt the system.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Native Audio */}
        <section className="flex flex-col items-start border-l-2 border-foreground/10 pl-6 sm:pl-10 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-sm">
            <Headphones className="w-6 h-6" />
          </div>

          <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight mb-4 text-foreground">
            Listen anywhere.
          </h2>

          <p className="text-lg text-foreground/60 leading-relaxed font-sans max-w-xl mb-8">
            Turn any text into a seamless audio experience with native, zero-cost word tracking.
          </p>

          {/* Visual Editorial Preview Card */}
          <div className="w-full bg-foreground/[0.02] border border-foreground/10 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-foreground/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-slate-100 flex items-center justify-center shadow-xs">
                  <Headphones className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">Browser Speech Synthesis</span>
                  <span className="text-[10px] text-foreground/45">Karaoke Word-Tracking • 1.0x - 2.0x</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                Zero Cloud Cost
              </span>
            </div>

            {/* Karaoke simulated text highlighting */}
            <p className="text-base font-serif leading-loose text-foreground/50">
              <span className="bg-indigo-500/30 text-foreground px-1 py-0.5 rounded font-medium">
                The reading companion that follows your eyes and ears
              </span>{" "}
              without demanding extra subscriptions or burning expensive cloud TTS quotas.
            </p>
          </div>
        </section>

      </div>

      {/* Editorial Footer */}
      <footer className="border-t border-foreground/10 py-16 px-6 bg-foreground/[0.01]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-slate-100">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-foreground">AARC Reading Companion</p>
              <p className="text-xs text-foreground/40">Distraction-free, ad-free editorial reading.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-foreground/60">
            <Link href="/dashboard" className="hover:text-foreground transition-colors font-medium">
              Open Dashboard
            </Link>
            <Link href="/vocabulary" className="hover:text-foreground transition-colors font-medium">
              Vocabulary
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
