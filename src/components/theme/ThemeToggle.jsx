import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 rounded-full flex items-center justify-center select-none transition-colors"
      style={{ backgroundColor: 'var(--chip-bg)' }}
      title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      ) : (
        <Moon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      )}
    </button>
  );
}