import React from 'react';
import { Hammer, PenLine, SlidersHorizontal } from 'lucide-react';

export type AppMode = 'auto' | 'builder' | 'editor';

interface ModeSwitcherProps {
  active: AppMode;
  onChange: (mode: AppMode) => void;
  className?: string;
}

/** The app's creation modes: weighted/AI blueprint generator, manual question bank, or editor. */
export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ active, onChange, className = '' }) => {
  const base =
    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0';

  return (
    <div
      className={`inline-flex items-center gap-0.5 p-0.5 bg-neutral-100 border border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 rounded-lg no-print ${className}`}
      role="tablist"
      aria-label="Switch creation mode"
    >
      <button
        role="tab"
        aria-selected={active === 'auto'}
        onClick={() => onChange('auto')}
        className={`${base} ${
          active === 'auto'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
            : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900'
        }`}
        title="Auto Blueprint — select chapters, section counts, and AI or weighted selection"
      >
        <SlidersHorizontal className="w-3 h-3 shrink-0" />
        <span>Auto Paper</span>
      </button>
      <button
        role="tab"
        aria-selected={active === 'builder'}
        onClick={() => onChange('builder')}
        className={`${base} ${
          active === 'builder'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
            : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900'
        }`}
        title="Question Bank — manually pick individual questions from chapters"
      >
        <Hammer className="w-3 h-3 shrink-0" />
        <span>Builder</span>
      </button>
      <button
        role="tab"
        aria-selected={active === 'editor'}
        onClick={() => onChange('editor')}
        className={`${base} ${
          active === 'editor'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
            : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900'
        }`}
        title="Editor — hand-edit the paper, sections, and live preview"
      >
        <PenLine className="w-3 h-3 shrink-0" />
        <span>Editor</span>
      </button>
    </div>
  );
};
