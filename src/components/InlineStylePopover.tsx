import React, { useEffect, useRef } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  FilePlus2,
  Italic,
  RotateCcw,
  Underline,
  X,
} from 'lucide-react';
import {
  TextAlignOption,
  TextElementStyle,
  TextFontKey,
} from '../types/exam';
import {
  FONT_OPTIONS,
  INK_COLOR_PRESETS,
  ResolvedTextStyle,
} from '../services/paperStyles';

export interface StylePopoverAnchor {
  top: number;
  left: number;
  bottom: number;
  width: number;
}

interface InlineStylePopoverProps {
  label: string;
  anchor: StylePopoverAnchor;
  resolvedStyle: ResolvedTextStyle;
  onChangeStyle: (patch: Partial<TextElementStyle>) => void;
  onResetStyle: () => void;
  onClose: () => void;
  supportsAlign?: boolean;
  textValue?: string;
  onChangeText?: (nextText: string) => void;
  textLabel?: string;
  // Optional section page-break toggle
  showSectionPageBreak?: boolean;
  sectionStartsOnNewPage?: boolean;
  onToggleSectionPageBreak?: (next: boolean) => void;
  // Optional MCQ column switcher
  showMcqColumns?: boolean;
  mcqColumns?: 1 | 2 | 4;
  onChangeMcqColumns?: (cols: 1 | 2 | 4) => void;
  // Optional apply-to-all action for questions
  onApplyToSectionQuestions?: () => void;
}

export const InlineStylePopover: React.FC<InlineStylePopoverProps> = ({
  label,
  anchor,
  resolvedStyle,
  onChangeStyle,
  onResetStyle,
  onClose,
  supportsAlign = true,
  textValue,
  onChangeText,
  textLabel = 'Text',
  showSectionPageBreak = false,
  sectionStartsOnNewPage = false,
  onToggleSectionPageBreak,
  showMcqColumns = false,
  mcqColumns = 2,
  onChangeMcqColumns,
  onApplyToSectionQuestions,
}) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (target.closest('[data-paper-editable]')) return;
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  const popoverWidth = 316;
  const estimatedHeight = 320;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const centeredLeft = anchor.left + anchor.width / 2 - popoverWidth / 2;
  const clampedLeft = Math.max(12, Math.min(vw - popoverWidth - 12, centeredLeft));

  const placeAbove = anchor.bottom + estimatedHeight + 16 > vh && anchor.top > estimatedHeight + 24;
  const clampedTop = placeAbove
    ? Math.max(12, anchor.top - estimatedHeight - 10)
    : Math.max(12, Math.min(vh - estimatedHeight - 12, anchor.bottom + 8));

  const stepFontSize = (delta: number) => {
    const next = Math.round((resolvedStyle.fontSizePt + delta) * 2) / 2;
    onChangeStyle({ fontSizePt: Math.max(7.5, Math.min(32, next)) });
  };

  return (
    <div
      ref={popoverRef}
      style={{ top: clampedTop, left: clampedLeft, width: popoverWidth }}
      className="no-print fixed z-50 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl text-neutral-900 dark:text-white overflow-hidden animate-in fade-in zoom-in-95 duration-100 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/70">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold truncate">{label}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onResetStyle}
            className="px-1.5 py-1 rounded text-[10px] font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition flex items-center gap-1 cursor-pointer"
            title="Reset formatting to default"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Close inspector (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5 text-xs">
        {/* Font Family + Size Row */}
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-7">
            <label className="block text-[10px] text-neutral-500 dark:text-neutral-400 mb-1">
              Font
            </label>
            <select
              value={resolvedStyle.fontFamily}
              onChange={(e) =>
                onChangeStyle({ fontFamily: e.target.value as TextFontKey })
              }
              className="w-full h-7 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-md px-2 text-[11px] text-neutral-900 dark:text-white focus:outline-hidden focus:border-neutral-900 dark:focus:border-white cursor-pointer"
            >
              {FONT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.shortLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-5">
            <label className="block text-[10px] text-neutral-500 dark:text-neutral-400 mb-1">
              Size (pt)
            </label>
            <div className="flex items-center h-7 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => stepFontSize(-0.5)}
                className="px-2 h-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-semibold cursor-pointer"
                title="Decrease font size"
              >
                -
              </button>
              <span className="flex-1 text-center text-[11px] font-mono tabular-nums">
                {resolvedStyle.fontSizePt}pt
              </span>
              <button
                type="button"
                onClick={() => stepFontSize(0.5)}
                className="px-2 h-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-semibold cursor-pointer"
                title="Increase font size"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Style & Alignment Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeStyle({ bold: !resolvedStyle.bold })}
              className={`w-7 h-7 rounded-md border flex items-center justify-center transition cursor-pointer ${
                resolvedStyle.bold
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800'
              }`}
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeStyle({ italic: !resolvedStyle.italic })}
              className={`w-7 h-7 rounded-md border flex items-center justify-center transition cursor-pointer ${
                resolvedStyle.italic
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800'
              }`}
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeStyle({ underline: !resolvedStyle.underline })}
              className={`w-7 h-7 rounded-md border flex items-center justify-center transition cursor-pointer ${
                resolvedStyle.underline
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800'
              }`}
              title="Underline"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeStyle({ uppercase: !resolvedStyle.uppercase })}
              className={`px-2 h-7 rounded-md border text-[10px] font-bold tracking-tight transition cursor-pointer ${
                resolvedStyle.uppercase
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800'
              }`}
              title="Toggle UPPERCASE"
            >
              AA
            </button>
          </div>

          {supportsAlign && (
            <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-900 p-0.5 rounded-md border border-neutral-200 dark:border-neutral-800">
              {(['left', 'center', 'right'] as TextAlignOption[]).map((align) => {
                const Icon =
                  align === 'left'
                    ? AlignLeft
                    : align === 'center'
                    ? AlignCenter
                    : AlignRight;
                return (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onChangeStyle({ align })}
                    className={`w-6 h-6 rounded flex items-center justify-center transition cursor-pointer ${
                      resolvedStyle.align === align
                        ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                    title={`Align ${align}`}
                  >
                    <Icon className="w-3 h-3" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tracking & Ink Color */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 p-0.5 rounded-md border border-neutral-200 dark:border-neutral-800">
            {(['normal', 'wide', 'wider'] as const).map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => onChangeStyle({ letterSpacing: sp })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize transition cursor-pointer ${
                  resolvedStyle.letterSpacing === sp
                    ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                {sp}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {INK_COLOR_PRESETS.map((c) => {
              const active = resolvedStyle.color.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onChangeStyle({ color: c.hex })}
                  title={c.label}
                  style={{ backgroundColor: c.hex }}
                  className={`w-4 h-4 rounded-full border transition cursor-pointer ${
                    active
                      ? 'ring-2 ring-neutral-900 dark:ring-white ring-offset-1 ring-offset-white dark:ring-offset-neutral-950 border-white'
                      : 'border-neutral-300 dark:border-neutral-700 hover:scale-110'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Optional Quick Text Input */}
        {typeof textValue === 'string' && onChangeText && (
          <div className="pt-1 border-t border-neutral-200 dark:border-neutral-800">
            <label className="block text-[10px] text-neutral-500 dark:text-neutral-400 mb-1">
              {textLabel}
            </label>
            <input
              type="text"
              value={textValue}
              onChange={(e) => onChangeText(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-md px-2 py-1 text-[11px] text-neutral-900 dark:text-white focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
            />
          </div>
        )}

        {/* Contextual: New Page Before Section */}
        {showSectionPageBreak && onToggleSectionPageBreak && (
          <label className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 cursor-pointer">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Start section on new page</span>
            </span>
            <input
              type="checkbox"
              checked={sectionStartsOnNewPage}
              onChange={(e) => onToggleSectionPageBreak(e.target.checked)}
              className="w-3.5 h-3.5 accent-neutral-900 dark:accent-white cursor-pointer"
            />
          </label>
        )}

        {/* Contextual: MCQ Columns */}
        {showMcqColumns && onChangeMcqColumns && (
          <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
              Option Columns
            </span>
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 p-0.5 rounded-md border border-neutral-200 dark:border-neutral-800">
              {([1, 2, 4] as const).map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => onChangeMcqColumns(cols)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                    mcqColumns === cols
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {cols} Col{cols > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contextual: Apply question style to all questions in section */}
        {onApplyToSectionQuestions && (
          <button
            type="button"
            onClick={onApplyToSectionQuestions}
            className="w-full py-1.5 px-2.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-[11px] font-medium transition cursor-pointer"
          >
            Apply style to all questions in section
          </button>
        )}
      </div>
    </div>
  );
};
