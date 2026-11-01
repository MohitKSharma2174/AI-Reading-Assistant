'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, Volume2, Check, ChevronDown, RotateCcw } from 'lucide-react';

interface AudioPlayerProps {
  articleText: string;
  className?: string;
  onHighlight: (charIndex: number, charLength: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type SpeedOption = (typeof SPEED_OPTIONS)[number];

export default function AudioPlayer({
  articleText,
  className = '',
  onHighlight,
  onPlayingChange,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<SpeedOption>(1);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentCharIndexRef = useRef<number>(0);
  const currentUtteranceOffsetRef = useRef<number>(0);
  const isSwitchingRateRef = useRef<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Keep references to latest callbacks so effects/handlers never trigger render cascades
  const onHighlightRef = useRef(onHighlight);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const playbackRateRef = useRef<SpeedOption>(playbackRate);
  playbackRateRef.current = playbackRate;

  useEffect(() => {
    onHighlightRef.current = onHighlight;
    onPlayingChangeRef.current = onPlayingChange;
  });

  // Close speed menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Stop audio ONLY when component unmounts (e.g., navigating away from article)
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        onHighlightRef.current?.(-1, 0);
        onPlayingChangeRef.current?.(false);
      }
    };
  }, []);

  // Internal helper to create and start an utterance from a given text offset and speed
  const startSpeech = (startOffset: number, speedRate: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;

    const safeText = articleText || '';
    if (!safeText.trim()) return;

    const clampedOffset = Math.max(0, Math.min(startOffset, safeText.length));
    const textToSpeak = safeText.slice(clampedOffset);
    if (!textToSpeak.trim()) {
      setIsPlaying(false);
      setIsPaused(false);
      onPlayingChangeRef.current?.(false);
      onHighlightRef.current?.(-1, 0);
      currentCharIndexRef.current = 0;
      currentUtteranceOffsetRef.current = 0;
      return;
    }

    currentUtteranceOffsetRef.current = clampedOffset;
    currentCharIndexRef.current = clampedOffset;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = speedRate;
    utteranceRef.current = utterance;

    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        const absoluteIndex = currentUtteranceOffsetRef.current + e.charIndex;
        currentCharIndexRef.current = absoluteIndex;

        const charLen =
          e.charLength !== undefined && e.charLength > 0
            ? e.charLength
            : (safeText.slice(absoluteIndex).match(/^\S+/)?.[0]?.length ?? 0);

        onHighlightRef.current?.(absoluteIndex, charLen);
      }
    };

    utterance.onend = () => {
      // If we are actively restarting utterance due to a rate change, ignore intermediate onend
      if (isSwitchingRateRef.current) return;

      setIsPlaying(false);
      setIsPaused(false);
      onPlayingChangeRef.current?.(false);
      utteranceRef.current = null;
      currentCharIndexRef.current = 0;
      currentUtteranceOffsetRef.current = 0;
      onHighlightRef.current?.(-1, 0);
    };

    utterance.onerror = (e) => {
      if (isSwitchingRateRef.current) return;
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.error('Speech synthesis error:', e);
      }
      setIsPlaying(false);
      setIsPaused(false);
      onPlayingChangeRef.current?.(false);
      utteranceRef.current = null;
      onHighlightRef.current?.(-1, 0);
    };

    synth.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
    onPlayingChangeRef.current?.(true);
  };

  // Play / Pause / Resume
  const togglePlay = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;

    // If speaking and paused, resume
    if (synth.speaking && isPaused) {
      synth.resume();
      setIsPaused(false);
      setIsPlaying(true);
      onPlayingChangeRef.current?.(true);
    }
    // If playing, pause
    else if (synth.speaking && isPlaying) {
      synth.pause();
      setIsPaused(true);
      setIsPlaying(false);
      onPlayingChangeRef.current?.(false);
    }
    // If stopped, start from beginning or resume from paused character
    else {
      synth.cancel();
      const startPos = isPaused && currentCharIndexRef.current > 0 ? currentCharIndexRef.current : 0;
      startSpeech(startPos, playbackRateRef.current);
    }
  };

  // Restart speech from the beginning
  const handleRestart = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    currentCharIndexRef.current = 0;
    currentUtteranceOffsetRef.current = 0;
    startSpeech(0, playbackRateRef.current);
  };

  // Dynamically change speed and restart active utterance seamlessly with new speed
  const applySpeed = (newRate: SpeedOption) => {
    setPlaybackRate(newRate);
    setIsMenuOpen(false);

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;

    // If currently speaking or active, restart speech seamlessly at the new speed from the exact current word
    if (synth.speaking && isPlaying) {
      isSwitchingRateRef.current = true;
      synth.cancel();

      // Small tick to ensure browser speech engine flushes cancellation before queueing new utterance
      setTimeout(() => {
        isSwitchingRateRef.current = false;
        startSpeech(currentCharIndexRef.current, newRate);
      }, 30);
    } else if (isPaused) {
      // If paused, prepare next start from the current position with new rate
      synth.cancel();
    }
  };

  // Cycle speed to next option
  const cycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % SPEED_OPTIONS.length;
    applySpeed(SPEED_OPTIONS[nextIndex]);
  };

  return (
    <div
      ref={menuRef}
      className={`sticky top-6 z-40 flex w-fit ml-auto mb-6 items-center gap-2.5 px-3.5 py-1.5 rounded-full shadow-md border backdrop-blur-md transition-colors duration-300 bg-background/90 border-foreground/10 text-foreground text-sm ${className}`.trim()}
      role="region"
      aria-label="Read Aloud Audio Player"
    >
      {/* Audio Icon & Indicator */}
      <div className="flex items-center gap-1.5 text-foreground/70 select-none">
        <Volume2
          className={`w-4 h-4 transition-colors ${isPlaying ? 'text-indigo-500 animate-pulse' : 'text-foreground/40'}`}
        />
        <span className="text-xs font-semibold tracking-wide hidden sm:inline">
          Read Aloud
        </span>
      </div>

      <div className="h-4 w-px bg-foreground/10" aria-hidden="true" />

      {/* Play / Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={!articleText || !articleText.trim()}
        aria-label={isPlaying ? 'Pause reading aloud' : 'Play reading aloud'}
        title={isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}
        className="p-1.5 rounded-full hover:bg-foreground/5 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-foreground/20" />}
      </button>

      {/* Restart Button (visible when actively playing or paused) */}
      {(isPlaying || isPaused) && (
        <button
          type="button"
          onClick={handleRestart}
          aria-label="Restart from beginning"
          title="Restart from beginning"
          className="p-1.5 rounded-full hover:bg-foreground/5 transition-colors cursor-pointer flex items-center justify-center text-foreground/60 hover:text-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="h-4 w-px bg-foreground/10" aria-hidden="true" />

      {/* Speed Selector Trigger Button & Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-label={`Current playback speed: ${playbackRate}x. Click to change speed.`}
          aria-expanded={isMenuOpen}
          title="Select reading speed"
          className="px-2.5 py-1 rounded-full hover:bg-foreground/5 active:bg-foreground/10 transition-colors flex items-center gap-1 text-xs font-bold select-none cursor-pointer tabular-nums border border-foreground/10 bg-foreground/[0.03]"
        >
          <FastForward className="w-3 h-3 text-indigo-500" />
          <span>{playbackRate}x</span>
          <ChevronDown className={`w-3 h-3 text-foreground/50 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Floating Speed Dropdown Menu */}
        {isMenuOpen && (
          <div
            className="absolute right-0 mt-2 w-32 py-1.5 rounded-xl bg-background border border-foreground/10 shadow-xl backdrop-blur-lg z-50 animate-fadeIn"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-foreground/40 uppercase">
              Reading Speed
            </div>
            {SPEED_OPTIONS.map((rate) => {
              const isSelected = playbackRate === rate;
              return (
                <button
                  key={rate}
                  type="button"
                  onClick={() => applySpeed(rate)}
                  role="menuitem"
                  className={`w-full px-3 py-1.5 text-xs font-medium flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-foreground/80 hover:bg-foreground/5 hover:text-foreground'
                  }`}
                >
                  <span>{rate}x</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
