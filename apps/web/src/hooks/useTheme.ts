import { useEffect } from 'react';
import { useUIStore } from '@/store/ui.store';

export function useThemeInit() {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
}

export function useTheme() {
  const { theme, toggleTheme, setTheme } = useUIStore();
  return { theme, toggleTheme, setTheme, isDark: theme === 'dark' };
}
