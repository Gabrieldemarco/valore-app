import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('velsoie-theme') as Theme | null;
      if (stored === 'dark' || stored === 'light') return stored;
    }
    return 'dark';
  });

  const applyTheme = (t: Theme) => {
    document.documentElement.setAttribute('data-theme', t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', t === 'dark' ? '#0a0a0c' : '#faf6f3');
    }
    localStorage.setItem('velsoie-theme', t);
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
