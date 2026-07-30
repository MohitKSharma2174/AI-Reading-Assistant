'use client';

import React, { useState, useEffect } from 'react';
import { Type, Settings, Sun, Moon, Eye } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

export interface TypographyConfig {
  theme: 'light' | 'sepia' | 'dark';
  font: 'font-sans' | 'font-serif' | 'font-mono';
  size: 'text-sm' | 'text-base' | 'text-lg' | 'text-xl' | 'text-2xl';
  height: '1.5' | '1.75' | '2.0'; // Standard float line-heights
}

interface TypographyToolbarProps {
  onChange: (config: TypographyConfig) => void;
}

export default function TypographyToolbar({ onChange }: TypographyToolbarProps) {
  const { setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<TypographyConfig>({
    theme: 'dark',
    font: 'font-serif',
    size: 'text-lg',
    height: '1.75',
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai_reader_typography');
      if (saved) {
        const parsed = JSON.parse(saved) as TypographyConfig;
        const merged = { ...config, ...parsed };
        setConfig(merged);
        setTheme(merged.theme);
        onChange(merged);
      } else {
        setTheme(config.theme);
        onChange(config);
      }
    } catch (_) {
      setTheme(config.theme);
      onChange(config);
    }
  }, []);

  const updateConfig = (newConfig: Partial<TypographyConfig>) => {
    const updated = { ...config, ...newConfig } as TypographyConfig;
    setConfig(updated);
    
    // Sync theme globally
    if (newConfig.theme) {
      setTheme(newConfig.theme);
    }

    onChange(updated);
    try {
      localStorage.setItem('ai_reader_typography', JSON.stringify(updated));
    } catch (_) {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1 bg-slate-905 hover:bg-slate-800 border border-slate-850 hover:text-slate-100 text-slate-400 text-xs font-semibold rounded-full transition-colors cursor-pointer"
        title="Typography Settings"
      >
        <Type className="w-3.5 h-3.5 text-indigo-400" />
        <span>Settings</span>
      </button>

      {isOpen && (
        <>
          {/* Overlay click to close */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 mt-2.5 w-72 bg-slate-900 border border-slate-850 rounded-2xl p-4 shadow-2xl z-50 animate-fadeIn text-slate-100 font-sans">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5 border-b border-slate-850 pb-2">
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              Reader Preferences
            </h4>

            {/* Global Theme Selector */}
            <div className="mb-4">
              <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">
                Color Palette
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => updateConfig({ theme: 'light' })}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                    config.theme === 'light'
                      ? 'bg-slate-100 text-slate-950 border-indigo-500'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Light
                </button>
                <button
                  onClick={() => updateConfig({ theme: 'sepia' })}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                    config.theme === 'sepia'
                      ? 'bg-[#f4ebd0] text-[#3e2c00] border-amber-600'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Sepia
                </button>
                <button
                  onClick={() => updateConfig({ theme: 'dark' })}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                    config.theme === 'dark'
                      ? 'bg-indigo-600 text-slate-100 border-indigo-500'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Dark
                </button>
              </div>
            </div>

            {/* Font Family Selector */}
            <div className="mb-4">
              <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">
                Typeface
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => updateConfig({ font: 'font-serif' })}
                  className={`py-1.5 rounded-lg text-xs font-serif font-bold border transition-colors cursor-pointer ${
                    config.font === 'font-serif'
                      ? 'bg-slate-800 text-slate-100 border-slate-700'
                      : 'bg-slate-950 border-slate-855 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Serif
                </button>
                <button
                  onClick={() => updateConfig({ font: 'font-sans' })}
                  className={`py-1.5 rounded-lg text-xs font-sans font-bold border transition-colors cursor-pointer ${
                    config.font === 'font-sans'
                      ? 'bg-slate-800 text-slate-100 border-slate-700'
                      : 'bg-slate-950 border-slate-855 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sans
                </button>
                <button
                  onClick={() => updateConfig({ font: 'font-mono' })}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                    config.font === 'font-mono'
                      ? 'bg-slate-800 text-slate-100 border-slate-700'
                      : 'bg-slate-950 border-slate-855 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mono
                </button>
              </div>
            </div>

            {/* Font Size Selector */}
            <div className="mb-4">
              <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">
                Text Scale
              </span>
              <div className="flex items-center justify-between gap-1.5">
                {(['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'] as const).map((sz, idx) => (
                  <button
                    key={sz}
                    onClick={() => updateConfig({ size: sz })}
                    className={`px-3 py-1 rounded-md font-bold border transition-colors cursor-pointer ${
                      idx === 0 ? 'text-[10px]' : idx === 1 ? 'text-xs' : idx === 2 ? 'text-sm' : idx === 3 ? 'text-base' : 'text-lg'
                    } ${
                      config.size === sz 
                        ? 'bg-indigo-600 text-slate-100 border-indigo-500' 
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    A
                  </button>
                ))}
              </div>
            </div>

            {/* Line Height Selector */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">
                Line Spacing
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => updateConfig({ height: '1.5' })}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    config.height === '1.5'
                      ? 'bg-slate-800 text-slate-100 border-slate-700'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Compact
                </button>
                <button
                  onClick={() => updateConfig({ height: '1.75' })}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    config.height === '1.75'
                      ? 'bg-slate-800 text-slate-100 border-slate-700'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Comfortable
                </button>
                <button
                  onClick={() => updateConfig({ height: '2.0' })}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    config.height === '2.0'
                      ? 'bg-slate-800 text-slate-100 border-slate-700'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Loose
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
