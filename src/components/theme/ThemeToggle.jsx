import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const handleClick = () => {
    toggleTheme();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-8 h-8 rounded-full flex items-center justify-center select-none transition-colors relative"
      style={{ backgroundColor: 'var(--chip-bg)', border: '1px solid var(--border-subtle)' }}
      title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
    >
      <span className="pointer-events-none">
        {theme === 'dark' ? (
          <Sun className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <Moon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        )}
      </span>
    </button>
  );
}