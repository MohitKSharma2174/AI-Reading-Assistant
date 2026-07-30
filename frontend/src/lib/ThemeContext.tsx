'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeType = 'light' | 'sepia' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>('dark');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai_reader_theme') as ThemeType | null;
      if (saved && (saved === 'light' || saved === 'sepia' || saved === 'dark')) {
        setThemeState(saved);
      }
    } catch (_) {}
    setMounted(true);
  }, []);

  // Update theme class on HTML element when theme changes
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    root.classList.remove('light', 'sepia', 'dark');
    root.classList.add(theme);

    try {
      localStorage.setItem('ai_reader_theme', theme);
    } catch (_) {}
  }, [theme, mounted]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
