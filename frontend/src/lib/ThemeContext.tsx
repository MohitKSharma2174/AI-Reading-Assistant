'use client';

import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

type ThemeType = 'light' | 'sepia' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const THEME_STORAGE_KEY = 'ai_reader_theme';
const themeListeners = new Set<() => void>();

function getStoredTheme(): ThemeType {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'sepia' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Ignore storage read errors
  }
  return 'dark';
}

function getServerThemeSnapshot(): ThemeType {
  return 'dark';
}

function subscribeTheme(callback: () => void): () => void {
  themeListeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    themeListeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getStoredTheme,
    getServerThemeSnapshot
  );

  // Sync theme class on HTML element when theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'sepia', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeType) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage write errors
    }
    themeListeners.forEach((listener) => listener());
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
