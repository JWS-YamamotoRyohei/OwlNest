// Theme context for managing light/dark mode

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode, FullTheme, theme } from '../styles/themes';
import { STORAGE_KEYS } from '../constants';

interface ThemeContextType {
  currentTheme: FullTheme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return (saved as ThemeMode) || 'light';
  });

  const currentTheme = theme[themeMode];

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem(STORAGE_KEYS.THEME, mode);
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    // Apply theme to document root for CSS custom properties
    const root = document.documentElement;
    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--color-${key}`, value);
      }
    });
  }, [currentTheme]);

  const value: ThemeContextType = {
    currentTheme,
    themeMode,
    toggleTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};