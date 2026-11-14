import React from 'react';
import { Moon, Sun } from 'lucide-react';

export type AppTheme = 'light' | 'dark';

interface ThemeToggleButtonProps {
  theme: AppTheme;
  onToggle: () => void;
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  theme,
  onToggle,
  showLabel = false,
  className = '',
}) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap shrink-0 ${
        showLabel ? 'px-3 py-1.5 text-xs font-medium' : 'p-2'
      } bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-200 ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 shrink-0" />
      )}
      {showLabel && <span>{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  );
};
