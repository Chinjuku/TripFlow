import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_STORAGE_KEY = 'trip-flow-theme';
const DEFAULT_THEME: Theme = 'light';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* storage disabled — fall through */
  }
  return DEFAULT_THEME;
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  // Suppress CSS transitions for the duration of the swap so the theme
  // change is instant instead of cross-fading every `transition-colors`
  // on the page. Restored on the next frame.
  root.classList.add('theme-switching');
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
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
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* incognito or storage disabled — ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
