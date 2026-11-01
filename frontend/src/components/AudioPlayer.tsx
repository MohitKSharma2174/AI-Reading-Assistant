'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  articleText: string;
  className?: string;
  onHighlight: (charIndex: number, charLength: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 2] as const;

export default function AudioPlayer({
  articleText,
  className = '',
  onHighlight,
  onPlayingChange,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Keep references to latest callbacks so effects/handlers never trigger render cascades
  const onHighlightRef = useRef(onHighlight);
  const onPlayingChangeRef = useRef(onPlayingChange);

  useEffect(() => {
    onHighlightRef.current = onHighlight;
    onPlayingChangeRef.current = onPlayingChange;
  });

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

  const togglePlay = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const synth = window.speechSynthesis;

    // If speaking and paused, resume
    if (synth.speaking && (synth.paused || !isPlaying)) {
      synth.resume();
      setIsPlaying(true);
      onPlayingChangeRef.current?.(true);
    }
    // If playing, pause
    else if (synth.speaking && isPlaying) {
      synth.pause();
      setIsPlaying(false);
      onPlayingChangeRef.current?.(false);
      onHighlightRef.current?.(-1, 0);
    }
    // If not speaking at all, start new utterance
    else {
      if (!articleText || !articleText.trim()) return;

      synth.cancel();
      onHighlightRef.current?.(-1, 0);

      const utterance = new SpeechSynthesisUtterance(articleText);
      utterance.rate = playbackRate;
      utteranceRef.current = utterance;

      utterance.onboundary = (e) => {
        if (e.name === 'word') {
          const charLen =
            e.charLength !== undefined && e.charLength > 0
              ? e.charLength
              : (articleText.slice(e.charIndex).match(/^\S+/)?.[0]?.length ?? 0);
          onHighlightRef.current?.(e.charIndex, charLen);
        }
      };

      utterance.onend = () => {
        setIsPlaying(false);
        onPlayingChangeRef.current?.(false);
        utteranceRef.current = null;
        onHighlightRef.current?.(-1, 0);
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.error('Speech synthesis error:', e);
        }
        setIsPlaying(false);
        onPlayingChangeRef.current?.(false);
        utteranceRef.current = null;
        onHighlightRef.current?.(-1, 0);
      };

      synth.speak(utterance);
      setIsPlaying(true);
      onPlayingChangeRef.current?.(true);
    }
  };

  const changeSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate as (typeof SPEED_OPTIONS)[number]);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % SPEED_OPTIONS.length;
    const nextRate = SPEED_OPTIONS[nextIndex];

    setPlaybackRate(nextRate);

    // Update utterance.rate if currently playing
    if (utteranceRef.current && typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
      utteranceRef.current.rate = nextRate;
    }
  };

  return (
    <div
      className={`sticky top-6 z-40 flex w-fit ml-auto mb-6 items-center gap-3 px-4 py-2 rounded-full shadow-sm border backdrop-blur-md transition-colors duration-300 bg-background/80 border-foreground/10 text-foreground text-sm ${className}`.trim()}
      role="region"
      aria-label="Read Aloud Audio Player"
    >
      {/* Audio Icon & Indicator */}
      <div className="flex items-center gap-1.5 text-foreground/70 select-none">
        <Volume2
          className={`w-4 h-4 transition-colors ${isPlaying ? 'text-foreground animate-pulse' : 'text-foreground/40'}`}
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
        title={isPlaying ? 'Pause' : 'Play'}
        className="p-1.5 rounded-full hover:bg-foreground/5 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      <div className="h-4 w-px bg-foreground/10" aria-hidden="true" />

      {/* Speed Toggle Button with FastForward */}
      <button
        type="button"
        onClick={changeSpeed}
        aria-label={`Playback speed: ${playbackRate}x`}
        title={`Playback rate: ${playbackRate}x`}
        className="px-2 py-1 rounded-full hover:bg-foreground/5 transition-colors flex items-center gap-1 text-xs font-bold select-none cursor-pointer tabular-nums"
      >
        <FastForward className="w-3.5 h-3.5" />
        <span>{playbackRate}x</span>
      </button>
    </div>
  );
}
