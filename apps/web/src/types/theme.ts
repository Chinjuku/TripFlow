export type Theme = 'light' | 'dark';
export type ColorTheme = 'default' | 'yellow' | 'blue' | 'purple';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
}
