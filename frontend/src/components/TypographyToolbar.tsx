'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sliders, ChevronDown, ChevronUp } from 'lucide-react';

export interface TypographyConfig {
  font: 'font-sans' | 'font-serif';
  sizeIndex: number;
  sizeClass: string;
  lineHeight: 'compact' | 'comfort' | 'loose';
  lineHeightClass: string;
  tracking: 'default' | 'wide';
  trackingClass: string;
  // Legacy compatibility fields
  size?: string;
  height?: string;
}

export const FONT_SIZE_STEPS = [
  { label: 'Small', class: 'text-sm md:text-base' },
  { label: 'Medium', class: 'text-base md:text-lg' },
  { label: 'Large', class: 'text-lg md:text-xl' },       // Default step
  { label: 'X-Large', class: 'text-xl md:text-2xl' },
  { label: '2X-Large', class: 'text-2xl md:text-3xl' },
] as const;

export const LINE_HEIGHT_MAP: Record<'compact' | 'comfort' | 'loose', string> = {
  compact: 'leading-normal',
  comfort: 'leading-relaxed',
  loose: 'leading-loose',
};

export const TRACKING_MAP: Record<'default' | 'wide', string> = {
  default: 'tracking-normal',
  wide: 'tracking-wide',
};

const TYPO_STORAGE_KEY = 'aarc_reader_typography_v3';

const DEFAULT_CONFIG: TypographyConfig = {
  font: 'font-sans',
  sizeIndex: 2,
  sizeClass: 'text-lg md:text-xl',
  lineHeight: 'loose',
  lineHeightClass: 'leading-loose',
  tracking: 'default',
  trackingClass: 'tracking-normal',
  size: 'text-lg md:text-xl',
  height: '2.0',
};

interface TypographyToolbarProps {
  onChange: (config: TypographyConfig) => void;
}

export default function TypographyToolbar({ onChange }: TypographyToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Store onChange in ref to prevent stale closures
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [config, setConfig] = useState<TypographyConfig>(DEFAULT_CONFIG);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TYPO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const validIndex = typeof parsed.sizeIndex === 'number' && parsed.sizeIndex >= 0 && parsed.sizeIndex < FONT_SIZE_STEPS.length
          ? parsed.sizeIndex
          : 2;
        const validLineHeight: 'compact' | 'comfort' | 'loose' =
          ['compact', 'comfort', 'loose'].includes(parsed.lineHeight) ? parsed.lineHeight : 'loose';
        const validTracking: 'default' | 'wide' =
          ['default', 'wide'].includes(parsed.tracking) ? parsed.tracking : 'default';
        const validFont: 'font-sans' | 'font-serif' =
          parsed.font === 'font-serif' ? 'font-serif' : 'font-sans';

        const loaded: TypographyConfig = {
          font: validFont,
          sizeIndex: validIndex,
          sizeClass: FONT_SIZE_STEPS[validIndex].class,
          lineHeight: validLineHeight,
          lineHeightClass: LINE_HEIGHT_MAP[validLineHeight],
          tracking: validTracking,
          trackingClass: TRACKING_MAP[validTracking],
          size: FONT_SIZE_STEPS[validIndex].class,
          height: validLineHeight === 'compact' ? '1.5' : validLineHeight === 'comfort' ? '1.75' : '2.0',
        };

        setConfig(loaded);
        onChangeRef.current(loaded);
      } else {
        onChangeRef.current(DEFAULT_CONFIG);
      }
    } catch (_) {
      onChangeRef.current(DEFAULT_CONFIG);
    }
  }, []);

  const updateConfig = (patch: Partial<TypographyConfig>) => {
    const updated: TypographyConfig = { ...config, ...patch };
    setConfig(updated);
    onChangeRef.current(updated);
    try {
      localStorage.setItem(TYPO_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  };

  const handleSizeChange = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= FONT_SIZE_STEPS.length) return;
    const sizeClass = FONT_SIZE_STEPS[newIndex].class;
    updateConfig({
      sizeIndex: newIndex,
      sizeClass,
      size: sizeClass,
    });
  };

  const handleLineHeightChange = (opt: 'compact' | 'comfort' | 'loose') => {
    updateConfig({
      lineHeight: opt,
      lineHeightClass: LINE_HEIGHT_MAP[opt],
      height: opt === 'compact' ? '1.5' : opt === 'comfort' ? '1.75' : '2.0',
    });
  };

  const handleTrackingChange = (opt: 'default' | 'wide') => {
    updateConfig({
      tracking: opt,
      trackingClass: TRACKING_MAP[opt],
    });
  };

  const handleFontChange = (font: 'font-sans' | 'font-serif') => {
    updateConfig({ font });
  };

  return (
    <div className="w-full">
      {/* Collapsible Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
          isOpen
            ? 'bg-foreground/10 border-foreground/20 text-foreground font-semibold shadow-xs'
            : 'bg-foreground/5 hover:bg-foreground/10 border-foreground/10 text-foreground/70 hover:text-foreground text-xs font-semibold'
        }`}
        title="Display & Typography Settings"
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-500" />
          <span className="text-xs">Adjust Display</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-foreground/50 transition-transform" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-foreground/40 transition-transform" />
        )}
      </button>

      {/* Collapsible Settings Popover Panel */}
      {isOpen && (
        <div className="mt-2.5 w-full bg-foreground/[0.03] border border-foreground/10 rounded-2xl p-3 space-y-4 animate-fadeIn text-foreground font-sans">
          
          {/* 1. Incremental Font Size (A- / A+) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-foreground/45 uppercase tracking-wider">
                Font Size
              </span>
              <span className="text-[10px] font-semibold text-foreground/40">
                {FONT_SIZE_STEPS[config.sizeIndex]?.label}
              </span>
            </div>
            <div className="flex items-center gap-2 p-1.5 bg-foreground/[0.03] border border-foreground/10 rounded-xl">
              <button
                type="button"
                disabled={config.sizeIndex === 0}
                onClick={() => handleSizeChange(config.sizeIndex - 1)}
                className="flex-1 py-1.5 rounded-lg border border-foreground/10 bg-background hover:bg-foreground/5 disabled:opacity-30 disabled:pointer-events-none text-foreground font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                title="Decrease Font Size (A-)"
              >
                <span className="text-xs font-extrabold">A</span>
                <span className="text-xs font-bold">−</span>
              </button>
              
              {/* Stepper Dots Indicator */}
              <div className="flex items-center gap-1.5 px-1.5" title={`Step ${config.sizeIndex + 1} of 5`}>
                {FONT_SIZE_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 rounded-full transition-all duration-200 ${
                      idx === config.sizeIndex
                        ? 'h-4 bg-indigo-500'
                        : idx < config.sizeIndex
                        ? 'h-2.5 bg-foreground/35'
                        : 'h-1.5 bg-foreground/15'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                disabled={config.sizeIndex === FONT_SIZE_STEPS.length - 1}
                onClick={() => handleSizeChange(config.sizeIndex + 1)}
                className="flex-1 py-1.5 rounded-lg border border-foreground/10 bg-background hover:bg-foreground/5 disabled:opacity-30 disabled:pointer-events-none text-foreground font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                title="Increase Font Size (A+)"
              >
                <span className="text-sm font-extrabold">A</span>
                <span className="text-xs font-bold">+</span>
              </button>
            </div>
          </div>

          {/* 2. Line Spacing (Compact, Comfort, Loose) */}
          <div>
            <span className="text-[10px] font-bold text-foreground/45 uppercase tracking-wider block mb-1.5">
              Line Spacing
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-foreground/[0.03] border border-foreground/10 rounded-xl">
              {(['compact', 'comfort', 'loose'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleLineHeightChange(opt)}
                  className={`py-1 text-[11px] font-semibold capitalize rounded-lg transition-all cursor-pointer ${
                    config.lineHeight === opt
                      ? 'bg-background text-foreground shadow-2xs border border-foreground/10 font-bold'
                      : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5 border border-transparent'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Character Spacing (Default, Wide) */}
          <div>
            <span className="text-[10px] font-bold text-foreground/45 uppercase tracking-wider block mb-1.5">
              Character Spacing
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-foreground/[0.03] border border-foreground/10 rounded-xl">
              {(['default', 'wide'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleTrackingChange(opt)}
                  className={`py-1 text-[11px] font-semibold capitalize rounded-lg transition-all cursor-pointer ${
                    config.tracking === opt
                      ? 'bg-background text-foreground shadow-2xs border border-foreground/10 font-bold'
                      : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5 border border-transparent'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Typeface (Clean Sans / Editorial Serif) */}
          <div>
            <span className="text-[10px] font-bold text-foreground/45 uppercase tracking-wider block mb-1.5">
              Typeface
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-foreground/[0.03] border border-foreground/10 rounded-xl">
              <button
                type="button"
                onClick={() => handleFontChange('font-sans')}
                className={`py-1 text-[11px] font-sans rounded-lg transition-all cursor-pointer ${
                  config.font === 'font-sans'
                    ? 'bg-background text-foreground shadow-2xs border border-foreground/10 font-bold'
                    : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5 border border-transparent'
                }`}
              >
                Sans
              </button>
              <button
                type="button"
                onClick={() => handleFontChange('font-serif')}
                className={`py-1 text-[11px] font-serif rounded-lg transition-all cursor-pointer ${
                  config.font === 'font-serif'
                    ? 'bg-background text-foreground shadow-2xs border border-foreground/10 font-bold'
                    : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5 border border-transparent'
                }`}
              >
                Serif
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
