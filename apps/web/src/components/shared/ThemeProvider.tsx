import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Theme, ColorTheme, ThemeContextValue } from '@/types/theme';

export const THEME_STORAGE_KEY = 'trip-flow-theme';
export const COLOR_THEME_STORAGE_KEY = 'trip-flow-color-theme';
const DEFAULT_THEME: Theme = 'light';
const DEFAULT_COLOR_THEME: ColorTheme = 'default';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* storage disabled - fall through */
  }
  return DEFAULT_THEME;
}

function readStoredColorTheme(): ColorTheme {
  if (typeof window === 'undefined') return DEFAULT_COLOR_THEME;
  try {
    const stored = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY);
    if (
      stored === 'default' ||
      stored === 'yellow' ||
      stored === 'blue' ||
      stored === 'purple'
    )
      return stored;
  } catch {
    /* storage disabled - fall through */
  }
  return DEFAULT_COLOR_THEME;
}

function applyTheme(theme: Theme, colorTheme: ColorTheme): void {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('theme-yellow', colorTheme === 'yellow');
  root.classList.toggle('theme-blue', colorTheme === 'blue');
  root.classList.toggle('theme-purple', colorTheme === 'purple');
  
  root.style.colorScheme = theme;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      root.classList.remove('theme-switching');
    });
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(readStoredColorTheme);

  useEffect(() => {
    applyTheme(theme, colorTheme);
  }, [theme, colorTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* incognito or storage disabled - ignore */
    }
  }, []);

  const setColorTheme = useCallback((next: ColorTheme) => {
    setColorThemeState(next);
    try {
      window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, next);
    } catch {
      /* incognito or storage disabled - ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      colorTheme,
      setColorTheme,
    }),
    [theme, setTheme, toggleTheme, colorTheme, setColorTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
