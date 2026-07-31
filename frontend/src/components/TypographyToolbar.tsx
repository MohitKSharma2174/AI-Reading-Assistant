'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Type, Settings, Sun, Moon, Eye } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

export interface TypographyConfig {
  font: 'font-sans' | 'font-serif' | 'font-mono';
  size: 'text-sm' | 'text-base' | 'text-lg' | 'text-xl' | 'text-2xl';
  height: '1.5' | '1.75' | '2.0';
}

const TYPO_STORAGE_KEY = 'ai_reader_typography_v2';

interface TypographyToolbarProps {
  onChange: (config: TypographyConfig) => void;
}

export default function TypographyToolbar({ onChange }: TypographyToolbarProps) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Store onChange in a ref so useEffect never captures a stale closure
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const [config, setConfig] = useState<TypographyConfig>({
    font: 'font-serif',
    size: 'text-lg',
    height: '1.75',
  });

  // Load persisted typography prefs on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TYPO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TypographyConfig;
        const merged: TypographyConfig = {
          font: parsed.font || 'font-serif',
          size: parsed.size || 'text-lg',
          height: parsed.height || '1.75',
        };
        setConfig(merged);
        onChangeRef.current(merged);
      } else {
        onChangeRef.current(config);
      }
    } catch (_) {
      onChangeRef.current(config);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateConfig = (newConfig: Partial<TypographyConfig>) => {
    const updated: TypographyConfig = { ...config, ...newConfig };
    setConfig(updated);
    onChange(updated);
    try {
      localStorage.setItem(TYPO_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 hover:text-foreground text-foreground/70 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        title="Reader Preferences"
      >
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-indigo-400" />
          <span>Adjust Display</span>
        </div>
        <Settings className={`w-3.5 h-3.5 text-foreground/40 transition-transform duration-200 ${isOpen ? 'rotate-90 text-indigo-400' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-2.5 w-full bg-foreground/[0.03] border border-foreground/10 rounded-2xl p-3 space-y-3.5 animate-fadeIn text-foreground font-sans">
          {/* Global Theme Selector */}
          <div>
            <span className="text-[10px] font-bold text-foreground/40 block mb-1.5 uppercase tracking-wide">
              Color Palette
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setTheme('light')}
                className={`py-1 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-indigo-600 text-slate-100 border-indigo-500 shadow-sm'
                    : 'bg-foreground/5 border-foreground/10 text-foreground/60 hover:text-foreground'
                }`}
              >
                <Sun className="w-3 h-3" />
                Light
              </button>
              <button
                onClick={() => setTheme('sepia')}
                className={`py-1 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                  theme === 'sepia'
                    ? 'bg-amber-600 text-slate-100 border-amber-500 shadow-sm'
                    : 'bg-foreground/5 border-foreground/10 text-foreground/60 hover:text-foreground'
                }`}
              >
                <Eye className="w-3 h-3" />
                Sepia
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`py-1 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-indigo-600 text-slate-100 border-indigo-500 shadow-sm'
                    : 'bg-foreground/5 border-foreground/10 text-foreground/60 hover:text-foreground'
                }`}
              >
                <Moon className="w-3 h-3" />
                Dark
              </button>
            </div>
          </div>

          {/* Font Family Selector */}
          <div>
            <span className="text-[10px] font-bold text-foreground/40 block mb-1.5 uppercase tracking-wide">
              Typeface
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => updateConfig({ font: 'font-serif' })}
                className={`py-1 rounded-md text-[11px] font-serif font-bold border transition-colors cursor-pointer ${
                  config.font === 'font-serif'
                    ? 'bg-indigo-600 text-slate-100 border-indigo-500 shadow-sm'
                    : 'bg-foreground/5 border-foreground/10 text-foreground/60 hover:text-foreground'
                }`}
              >
                Serif
              </button>
              <button
                onClick={() => updateConfig({ font: 'font-sans' })}
                className={`py-1 rounded-md text-[11px] font-sans font-bold border transition-colors cursor-pointer ${
                  config.font === 'font-sans'
                    ? 'bg-indigo-600 text-slate-100 border-indigo-500 shadow-sm'
                    : 'bg-foreground/5 border-foreground/10 text-foreground/60 hover:text-foreground'
                }`}
              >
                Sans
              </button>
              <button
                onClick={() => updateConfig({ font: 'font-mono' })}
                className={`py-1 rounded-md text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                  config.font === 'font-mono'
                    ? 'bg-indigo-600 text-slate-100 border-indigo-500 shadow-sm'
                    : 'bg-foreground/5 border-foreground/10 text-foreground/60 hover:text-foreground'
                }`}
              >
                Mono
              </button>
            </div>
          </div>

          {/* Font Size Selector */}
          <div>
            <span className="text-[10px] font-bold text-foreground/40 block mb-1.5 uppercase tracking-wide">
              Text Scale
            </span>
            <div className="flex items-center justify-between gap-1">
              {(['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'] as const).map((sz, idx) => (
                <button
                  key={sz}
                  onClick={() => updateConfig({ size: sz })}
                  className={`flex-1 py-1 rounded-md font-bold border transition-colors text-center cursor-pointer ${
                    idx === 0 ? 'text-[10px]' : idx === 1 ? 'text-xs' : idx === 2 ? 'text-xs' : idx === 3 ? 'text-sm' : 'text-base'
                  } ${
                    config.size === sz
                      ? 'bg-indigo-600 text-slate-100 border-indigo-500 shadow-sm'
                      : 'bg-foreground/5 border-foreground/10 text-foreground/60 hover:text-foreground'
                  }`}
                >
                  A
                </button>
              ))}
            </div>
          </div>

          {/* Line Height Selector */}
          <div>
            <span className="text-[10px] font-bold text-foreground/40 block mb-1.5 uppercase tracking-wide">
              Line Spacing
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => updateConfig({ height: '1.5' })}
                className={`py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                  config.height === '1.5'
                    ? 'bg-indigo-600 text-slate-100 border-indigo-500 shadow-sm'
                    : 'bg-foreground/5 border-foreground/10 text-foreground/60 hover:text-foreground'
                }`}
              >
                Compact
              </button>
              <button
                onClick={() => updateConfig({ height: '1.75' })}
                className={`py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                  config.height === '1.75'
                    ? 'bg-indigo-600 text-slate-100 border-indigo-500 shadow-sm'
                    : 'bg-foreground/5 border-foreground/10 text-foreground/60 hover:text-foreground'
                }`}
              >
                Comfort
              </button>
              <button
                onClick={() => updateConfig({ height: '2.0' })}
                className={`py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                  config.height === '2.0'
                    ? 'bg-indigo-600 text-slate-100 border-indigo-500 shadow-sm'
                    : 'bg-foreground/5 border-foreground/10 text-foreground/60 hover:text-foreground'
                }`}
              >
                Loose
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
