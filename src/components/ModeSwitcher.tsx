import React from 'react';
import { Hammer, PenLine } from 'lucide-react';

export type AppMode = 'builder' | 'editor';

interface ModeSwitcherProps {
  active: AppMode;
  onChange: (mode: AppMode) => void;
  className?: string;
}

/** The app's two primary surfaces: assemble from the question bank, or edit by hand. */
export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ active, onChange, className = '' }) => {
  const base =
    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer';

  return (
    <div
      className={`inline-flex items-center gap-0.5 p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg no-print ${className}`}
      role="tablist"
      aria-label="Switch between Builder and Editor"
    >
      <button
        role="tab"
        aria-selected={active === 'builder'}
        onClick={() => onChange('builder')}
        className={`${base} ${
          active === 'builder'
            ? 'bg-white text-black'
            : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
        }`}
        title="Builder — pick chapters and questions from the question bank"
      >
        <Hammer className="w-3 h-3" />
        <span>Builder</span>
      </button>
      <button
        role="tab"
        aria-selected={active === 'editor'}
        onClick={() => onChange('editor')}
        className={`${base} ${
          active === 'editor'
            ? 'bg-white text-black'
            : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
        }`}
        title="Editor — hand-edit the paper, sections, and preview"
      >
        <PenLine className="w-3 h-3" />
        <span>Editor</span>
      </button>
    </div>
  );
};
