import { useState, useEffect } from 'react';
import { useChartStore } from '../store/chartStore';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    // Reset canvas background so it picks up the new CSS --bg variable
    useChartStore.getState().updateSettings({ backgroundColor: '' });
  }, [isDark]);

  // Apply on first render too
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored) document.documentElement.setAttribute('data-theme', stored);
  }, []);

  return { isDark, toggle: () => setIsDark(d => !d) };
}
