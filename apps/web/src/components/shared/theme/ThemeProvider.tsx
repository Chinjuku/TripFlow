import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Theme, ThemeContextValue } from '@/types/theme';

export const THEME_STORAGE_KEY = 'trip-flow-theme';
const DEFAULT_THEME: Theme = 'system';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored as Theme;
  } catch {
    /* storage disabled - fall through */
  }
  return DEFAULT_THEME;
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  const isDark = 
    theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  root.classList.add('theme-switching');
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';

  const manifestEl = document.querySelector('link[rel="manifest"]');
  if (manifestEl) {
    manifestEl.setAttribute('href', isDark ? '/manifest.json' : '/manifest-light.json');
  }

  const themeColorEls = document.querySelectorAll('meta[name="theme-color"]');
  themeColorEls.forEach((el) => {
    el.setAttribute('content', isDark ? '#0f172a' : '#ffffff');
  });
  
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      root.classList.remove('theme-switching');
    });
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* incognito or storage disabled - ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    // Cycle: light -> dark -> system -> light
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
  }, [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
