import { useContext } from 'react';
import { ThemeContext } from '@/components/shared/theme/ThemeProvider';
import type { ThemeContextValue } from '@/types/theme';

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be used within a <ThemeProvider>');
  }
  return ctx;
}
