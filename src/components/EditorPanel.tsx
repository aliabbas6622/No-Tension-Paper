import React, { useState } from 'react';
import {
  ENGLISH_SECTION_B_SUBSECTIONS,
  ExamPaper,
  ExamHeader,
  ExamSection,
  HeaderElementStyles,
  Question,
  QuestionType,
  TextFontKey,
} from '../types/exam';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Code2,
  BookOpen,
  SplitSquareVertical,
  X,
} from 'lucide-react';
import { FONT_OPTIONS } from '../services/paperStyles';
import { QuestionBankReplaceModal } from './QuestionBankReplaceModal';

interface EditorPanelProps {
  paper: ExamPaper;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  onUpdateHeader: (header: Partial<ExamHeader>) => void;
  onUpdateSection: (sectionId: string, updated: Partial<ExamSection>) => void;
  onDeleteSection: (sectionId: string) => void;
  onReorderQuestions: (sectionId: string, fromIndex: number, toIndex: number) => void;
  onAddQuestion: (sectionId: string, type: QuestionType, subsection?: string) => void;
  onUpdateQuestion: (sectionId: string, questionId: string, updated: Partial<Question>) => void;
  onDeleteQuestion: (sectionId: string, questionId: string) => void;
  onDuplicateQuestion: (sectionId: string, questionId: string) => void;
  onRenumberQuestions: (sectionId: string, style: 'roman' | 'decimal' | 'alpha') => void;
  excludedQuestionTexts?: string[];
  onOpenMassJson: () => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  paper,
  activeSectionId,
  onSelectSection,
  onUpdateHeader,
  onUpdateSection,
  onDeleteSection,
  onReorderQuestions,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onRenumberQuestions,
  excludedQuestionTexts = [],
  onOpenMassJson,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Record<string, boolean>>({});
  const [questionToReplace, setQuestionToReplace] = useState<Question | null>(null);
  const [newSubsectionInput, setNewSubsectionInput] = useState('');

  const activeSection = paper.sections.find((s) => s.id === activeSectionId);

  const formatShortSubLabel = (label: string): string => {
    const parenMatch = label.match(/\(([^)]+)\)\s*$/);
    if (parenMatch) return parenMatch[1];
    return label.replace(/^Sub-Section\s+[IVX]+\s*/i, '').trim() || label;
  };

  const toggleExpand = (id: string) => {
    setExpandedQuestionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const collapseAll = () => {
    setExpandedQuestionIds({});
  };

  const expandAll = () => {
    if (!activeSection) return;
    const all: Record<string, boolean> = {};
    activeSection.questions.forEach((q) => {
      all[q.id] = true;
    });
    setExpandedQuestionIds(all);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    // Drag from the grip handle, but show the whole question card as the
    // drag preview so the gesture still reads as "moving the question".
    const card = (e.currentTarget as HTMLElement).closest('[data-question-card]');
    if (card) {
      e.dataTransfer.setDragImage(card as Element, 24, 20);
    }
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || !activeSection) return;
    if (draggedIndex !== targetIndex) {
      onReorderQuestions(activeSection.id, draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Header Editor View
  if (activeSectionId === 'header' || !activeSection) {
    const { header } = paper;
    return (
      <div className="h-full overflow-y-auto p-4 sm:p-5 space-y-4 bg-white text-neutral-900 dark:bg-black dark:text-white">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              Exam Header & Metadata
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Formatted intermediate exam title block
            </p>
          </div>
        </div>

        {/* Header Fields in compact monochrome layout */}
        <div className="space-y-3 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Examination Title (Line 1)
            </label>
            <input
              type="text"
              value={header.examinationTitle}
              onChange={(e) => onUpdateHeader({ examinationTitle: e.target.value })}
              placeholder="INTERMEDIATE EXAMINATION 2026-27"
              className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Month & Session (Line 2)
              </label>
              <input
                type="text"
                value={header.examinationMonth}
                onChange={(e) => onUpdateHeader({ examinationMonth: e.target.value })}
                placeholder="EXAMINATION MONTH: OCT-25"
                className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Group (Line 3)
              </label>
              <input
                type="text"
                value={header.groupName}
                onChange={(e) => onUpdateHeader({ groupName: e.target.value })}
                placeholder="COMPUTER SCIENCE GROUP"
                className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Subject Title (Line 4)
            </label>
            <input
              type="text"
              value={header.subjectTitle}
              onChange={(e) => onUpdateHeader({ subjectTitle: e.target.value })}
              placeholder="SUBJECT: COMPUTER PAPER II"
              className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-bold text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
            />
          </div>
        </div>

        {/* Metadata Row: Date, Duration, Max Marks */}
        <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2.5">
          <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Metadata Details
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">Date</label>
              <input
                type="text"
                value={header.date}
                onChange={(e) => onUpdateHeader({ date: e.target.value })}
                placeholder="12-10-2025"
                className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">Duration</label>
              <input
                type="text"
                value={header.duration}
                onChange={(e) => onUpdateHeader({ duration: e.target.value })}
                placeholder="2 Hour"
                className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">Max Marks</label>
              <input
                type="text"
                value={header.maxMarks}
                onChange={(e) => onUpdateHeader({ maxMarks: e.target.value })}
                placeholder="50"
                className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-xs font-bold text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
              />
            </div>
          </div>
        </div>

        {/* Optional Institution, Paper Code & General Instructions */}
        <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Optional Details &amp; Instructions
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">
                Board / Institution Name
              </label>
              <input
                type="text"
                value={header.institutionName || ''}
                onChange={(e) => onUpdateHeader({ institutionName: e.target.value })}
                placeholder="e.g. Board of Intermediate and Secondary Education"
                className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">Paper Code</label>
              <input
                type="text"
                value={header.paperCode || ''}
                onChange={(e) => onUpdateHeader({ paperCode: e.target.value })}
                placeholder="e.g. CS-201"
                className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">
              General Instructions (one per line)
            </label>
            <textarea
              rows={3}
              value={(header.generalInstructions || []).join('\n')}
              onChange={(e) =>
                onUpdateHeader({
                  generalInstructions: e.target.value
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Attempt all sections carefully."
              className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg p-2 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
            />
          </div>
        </div>

        {/* Per-Heading Fonts */}
        <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Fonts for Each Heading
            </div>
            <span className="text-[10px] text-neutral-500">
              Or click any text on Preview
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(
              [
                { key: 'examinationTitle', label: 'Examination Title' },
                { key: 'examinationMonth', label: 'Month & Session' },
                { key: 'groupName', label: 'Group Name' },
                { key: 'subjectTitle', label: 'Subject Title' },
                { key: 'institutionName', label: 'Board / Institution' },
                { key: 'paperCode', label: 'Paper Code' },
              ] as Array<{ key: keyof HeaderElementStyles; label: string }>
            ).map((item) => {
              const currentFont = header.styles?.[item.key]?.fontFamily || '';
              return (
                <div key={item.key}>
                  <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">
                    {item.label}
                  </label>
                  <select
                    value={currentFont}
                    onChange={(e) => {
                      const nextFont = e.target.value
                        ? (e.target.value as TextFontKey)
                        : undefined;
                      const prevStyles = header.styles || {};
                      const prevEntry = prevStyles[item.key] || {};
                      onUpdateHeader({
                        styles: {
                          ...prevStyles,
                          [item.key]: {
                            ...prevEntry,
                            fontFamily: nextFont,
                          },
                        },
                      });
                    }}
                    className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-[11px] text-neutral-900 dark:text-white focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                  >
                    <option value="">Default Heading Font</option>
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.shortLabel}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Section Editor View
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5 space-y-4 bg-white text-neutral-900 dark:bg-black dark:text-white">
      {/* Section Settings Header */}
      <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Section Info
          </div>
          <div className="flex items-center gap-3">
            {/* Mass JSON Trigger in header */}
            <button
              onClick={onOpenMassJson}
              className="text-[11px] text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white flex items-center gap-1 transition cursor-pointer"
              title="Bulk import or export questions as JSON"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>JSON Bulk Tool</span>
            </button>

            {paper.sections.length > 1 && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete ${activeSection.name}?`)) {
                    onDeleteSection(activeSection.id);
                  }
                }}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Section</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">Title</label>
            <input
              type="text"
              value={activeSection.name}
              onChange={(e) => onUpdateSection(activeSection.id, { name: e.target.value })}
              placeholder='SECTION "A"'
              className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">Subtitle</label>
            <input
              type="text"
              value={activeSection.subtitle}
              onChange={(e) => onUpdateSection(activeSection.id, { subtitle: e.target.value })}
              placeholder="(MULTIPLE CHOICE QUESTIONS)"
              className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">Marks Badge</label>
            <input
              type="text"
              value={activeSection.marksBadge}
              onChange={(e) => onUpdateSection(activeSection.id, { marksBadge: e.target.value })}
              placeholder="10 Marks"
              className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-2.5 py-1 text-xs font-bold text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">
            Section Instruction / Note
          </label>
          <input
            type="text"
            value={activeSection.instruction}
            onChange={(e) => onUpdateSection(activeSection.id, { instruction: e.target.value })}
            placeholder="Q1 Choose the best answer for each from the given options"
            className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-neutral-200 dark:border-neutral-800">
          <div>
            <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">
              Section Heading Font
            </label>
            <select
              value={activeSection.styles?.title?.fontFamily || ''}
              onChange={(e) => {
                const fontFamily = e.target.value
                  ? (e.target.value as TextFontKey)
                  : undefined;
                const prevStyles = activeSection.styles || {};
                onUpdateSection(activeSection.id, {
                  styles: {
                    ...prevStyles,
                    title: { ...(prevStyles.title || {}), fontFamily },
                    subtitle: { ...(prevStyles.subtitle || {}), fontFamily },
                    subsectionHeading: {
                      ...(prevStyles.subsectionHeading || {}),
                      fontFamily,
                    },
                  },
                });
              }}
              className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-2 py-1 text-[11px] text-neutral-900 dark:text-white focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
            >
              <option value="">Default Heading Font</option>
              {FONT_OPTIONS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.shortLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="w-full flex items-center justify-between gap-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-2.5 py-1 text-[11px] cursor-pointer">
              <span className="text-neutral-700 dark:text-neutral-300 font-medium truncate">
                Start on new page
              </span>
              <input
                type="checkbox"
                checked={
                  typeof activeSection.startOnNewPage === 'boolean'
                    ? activeSection.startOnNewPage
                    : paper.settings?.newPagePerSection === true
                }
                disabled={paper.sections[0]?.id === activeSection.id}
                onChange={(e) =>
                  onUpdateSection(activeSection.id, {
                    startOnNewPage: e.target.checked,
                  })
                }
                title={
                  paper.sections[0]?.id === activeSection.id
                    ? 'First section always starts on page 1'
                    : 'Start this section on a fresh page'
                }
                className="w-3.5 h-3.5 accent-neutral-900 dark:accent-white cursor-pointer disabled:opacity-40"
              />
            </label>
          </div>
        </div>

        {/* Sub-Section Containers Configuration (e.g. Prose, Poem, Grammar for English Section B) */}
        {(() => {
          const definedSubs = activeSection.subsections || [];
          const existingQuestionSubs = Array.from(
            new Set(
              activeSection.questions
                .map((q) => (q.subsection || '').trim())
                .filter(Boolean)
            )
          );
          const allSectionSubs = Array.from(new Set([...definedSubs, ...existingQuestionSubs]));
          const hasAllEnglishSectionB = ENGLISH_SECTION_B_SUBSECTIONS.every((sub) =>
            allSectionSubs.some(
              (existing) => existing.toLowerCase() === sub.toLowerCase()
            )
          );

          const handleEnableEnglishSubsections = () => {
            const merged = Array.from(
              new Set([...allSectionSubs, ...ENGLISH_SECTION_B_SUBSECTIONS])
            );
            onUpdateSection(activeSection.id, { subsections: merged });
          };

          const handleAddCustomSubsection = () => {
            const cleaned = newSubsectionInput.trim();
            if (!cleaned) return;
            if (!allSectionSubs.some((s) => s.toLowerCase() === cleaned.toLowerCase())) {
              onUpdateSection(activeSection.id, {
                subsections: [...allSectionSubs, cleaned],
              });
            }
            setNewSubsectionInput('');
          };

          const handleRemoveSubsection = (subToRemove: string) => {
            const nextList = allSectionSubs.filter((s) => s !== subToRemove);
            onUpdateSection(activeSection.id, {
              subsections: nextList.length > 0 ? nextList : undefined,
            });
          };

          return (
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Sub-Section Containers ({allSectionSubs.length})
                </span>
                {!hasAllEnglishSectionB && (
                  <button
                    type="button"
                    onClick={handleEnableEnglishSubsections}
                    className="px-2 py-0.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 text-[10px] font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1 transition cursor-pointer"
                    title="Split this section into Prose, Poem, and Grammar containers"
                  >
                    <SplitSquareVertical className="w-3 h-3" />
                    <span>Split Prose · Poem · Grammar</span>
                  </button>
                )}
              </div>

              {allSectionSubs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {allSectionSubs.map((sub) => {
                    const count = activeSection.questions.filter(
                      (q) => (q.subsection || '').trim() === sub
                    ).length;
                    return (
                      <span
                        key={sub}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 text-[10px] font-medium text-neutral-800 dark:text-neutral-200"
                      >
                        <span>{formatShortSubLabel(sub)}</span>
                        <span className="font-mono text-[9px] text-neutral-500">
                          ({count})
                        </span>
                        {count === 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubsection(sub)}
                            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                            title={`Remove empty ${sub} container`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newSubsectionInput}
                  onChange={(e) => setNewSubsectionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomSubsection();
                    }
                  }}
                  placeholder="Add container (e.g. Sub-Section IV (Drama))"
                  className="flex-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-lg px-2.5 py-1 text-[11px] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSubsection}
                  disabled={!newSubsectionInput.trim()}
                  className="px-2.5 py-1 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 text-[11px] font-medium text-neutral-800 dark:text-neutral-200 disabled:opacity-40 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Questions Bar with Low Density Controls */}
      <div className="flex items-center justify-between gap-2 pt-1 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
            Questions ({activeSection.questions.length})
          </span>
          <span className="text-[10px] text-neutral-500 hidden sm:inline">
            Drag handle to reorder
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Renumber utilities */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md p-0.5 text-[10px]">
            <button
              onClick={() => onRenumberQuestions(activeSection.id, 'roman')}
              className="px-1.5 py-0.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded transition cursor-pointer"
              title="Renumber as i., ii., iii."
            >
              i, ii
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">|</span>
            <button
              onClick={() => onRenumberQuestions(activeSection.id, 'decimal')}
              className="px-1.5 py-0.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded transition cursor-pointer"
              title="Renumber as 1., 2., 3."
            >
              1, 2
            </button>
          </div>

          {/* Expand/Collapse All */}
          <button
            onClick={Object.keys(expandedQuestionIds).length > 0 ? collapseAll : expandAll}
            className="text-[11px] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900 transition px-2 py-0.5 rounded cursor-pointer"
          >
            {Object.keys(expandedQuestionIds).length > 0 ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Question Accordion List (Grouped by Prose / Poem / Grammar Sub-Section Containers when defined) */}
      {(() => {
        const containerNames = Array.from(
          new Set([
            ...(activeSection.subsections || []).map((s) => s.trim()).filter(Boolean),
            ...activeSection.questions
              .map((q) => (q.subsection || '').trim())
              .filter(Boolean),
          ])
        );

        const renderQuestionCard = (q: Question, index: number) => {
          const isExpanded = !!expandedQuestionIds[q.id];
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={q.id}
              data-question-card
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className={`rounded-xl border transition-all duration-100 ${
                isDragging
                  ? 'opacity-30 border-neutral-900 bg-neutral-100 dark:border-white dark:bg-neutral-900'
                  : isDragOver
                  ? 'border-neutral-900 bg-neutral-100 dark:border-white dark:bg-neutral-900'
                  : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700'
              }`}
            >
              {/* Question Row (Compact Summary) */}
              <div className="p-2.5 flex items-center gap-2">
                {/* Drag Handle */}
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab active:cursor-grabbing p-1 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white rounded transition select-none"
                  title="Drag and drop to rearrange"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Expand / Collapse Chevron */}
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="p-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition cursor-pointer"
                  title={isExpanded ? 'Collapse' : 'Expand question'}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Number */}
                <input
                  type="text"
                  value={q.number}
                  onChange={(e) =>
                    onUpdateQuestion(activeSection.id, q.id, { number: e.target.value })
                  }
                  className="w-8 text-center bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded py-0.5 text-xs font-bold text-neutral-900 dark:text-white focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                />

                {/* Question Summary Text (Click to expand) */}
                <div
                  onClick={() => toggleExpand(q.id)}
                  className="flex-1 min-w-0 text-xs text-neutral-900 dark:text-white truncate cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition"
                  title="Click to expand/edit question"
                >
                  {q.text || 'Empty question prompt...'}
                </div>

                {/* Marks tag */}
                <span className="text-[10px] text-neutral-600 dark:text-neutral-400 font-mono px-1.5 py-0.5 rounded bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shrink-0">
                  {q.marks || 1} M
                </span>

                {/* Subsection tag */}
                {q.subsection && (
                  <span
                    className="hidden sm:inline text-[9px] font-medium text-neutral-700 dark:text-neutral-300 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shrink-0 truncate max-w-[110px]"
                    title={`Sub-section: ${q.subsection}`}
                  >
                    {formatShortSubLabel(q.subsection)}
                  </span>
                )}

                {/* Question Type tag */}
                <span className="text-[9px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-200/80 dark:bg-neutral-900 shrink-0">
                  {q.type}
                </span>

                {/* Answer Key Badge if present */}
                {q.answerKey && (
                  <span
                    className="text-[9px] text-neutral-900 dark:text-white px-1.5 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 shrink-0 font-mono truncate max-w-[90px]"
                    title={`Answer Key: ${q.answerKey}`}
                  >
                    Key: {q.answerKey}
                  </span>
                )}

                {/* Up/Down buttons for accessibility */}
                <div className="flex items-center shrink-0">
                  <button
                    disabled={index === 0}
                    onClick={() => onReorderQuestions(activeSection.id, index, index - 1)}
                    className="p-1 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white disabled:opacity-20 transition cursor-pointer"
                    title="Move Up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    disabled={index === activeSection.questions.length - 1}
                    onClick={() => onReorderQuestions(activeSection.id, index, index + 1)}
                    className="p-1 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white disabled:opacity-20 transition cursor-pointer"
                    title="Move Down"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Replace from Question Bank */}
                <button
                  onClick={() => setQuestionToReplace(q)}
                  className="p-1 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white transition cursor-pointer"
                  title="Replace from question bank"
                  aria-label={`Replace question ${q.number} from question bank`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDuplicateQuestion(activeSection.id, q.id)}
                  className="p-1 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white transition cursor-pointer"
                  title="Duplicate question"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDeleteQuestion(activeSection.id, q.id)}
                  className="p-1 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white transition cursor-pointer"
                  title="Delete question"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Expanded Question Form */}
              {isExpanded && (
                <div className="p-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black space-y-3 rounded-b-xl text-xs">
                  <div>
                    <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">
                      Full Question Text
                    </label>
                    <textarea
                      rows={2}
                      value={q.text}
                      onChange={(e) =>
                        onUpdateQuestion(activeSection.id, q.id, { text: e.target.value })
                      }
                      placeholder="Enter question text..."
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg p-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">Marks</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={q.marks ?? 1}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            onUpdateQuestion(activeSection.id, q.id, { marks: 0 });
                            return;
                          }
                          const parsed = parseInt(raw, 10);
                          if (!Number.isNaN(parsed)) {
                            onUpdateQuestion(activeSection.id, q.id, {
                              marks: Math.max(0, Math.min(100, parsed)),
                            });
                          }
                        }}
                        onBlur={() => {
                          if (!q.marks || q.marks < 1) {
                            onUpdateQuestion(activeSection.id, q.id, { marks: 1 });
                          }
                        }}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-900 dark:text-white focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">Type</label>
                      <select
                        value={q.type}
                        onChange={(e) => {
                          const newType = e.target.value as QuestionType;
                          const updates: Partial<Question> = { type: newType };
                          if (newType === 'mcq' && (!q.options || q.options.length === 0)) {
                            updates.options = [
                              { id: 'opt-a-' + Date.now(), label: '(a)', text: 'Option A' },
                              { id: 'opt-b-' + Date.now(), label: '(b)', text: 'Option B' },
                              { id: 'opt-c-' + Date.now(), label: '(c)', text: 'Option C' },
                              { id: 'opt-d-' + Date.now(), label: '(d)', text: 'Option D' },
                            ];
                            updates.optionColumns = 2;
                          }
                          onUpdateQuestion(activeSection.id, q.id, updates);
                        }}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-900 dark:text-white focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                      >
                        <option value="mcq">MCQ</option>
                        <option value="short">Short Answer</option>
                        <option value="detailed">Detailed / Long</option>
                      </select>
                    </div>
                    {q.type === 'mcq' && (
                      <div>
                        <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">
                          MCQ Columns
                        </label>
                        <select
                          value={q.optionColumns || 2}
                          onChange={(e) =>
                            onUpdateQuestion(activeSection.id, q.id, {
                              optionColumns: Number(e.target.value) as 2 | 4,
                            })
                          }
                          className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-900 dark:text-white focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                        >
                          <option value="2">2 Columns (Board Style)</option>
                          <option value="4">4 Columns</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Optional Sub-Section Group */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-neutral-600 dark:text-neutral-400">
                      Sub-Section Container
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(
                        new Set([...ENGLISH_SECTION_B_SUBSECTIONS, ...containerNames])
                      ).map((subOption) => (
                        <button
                          key={subOption}
                          type="button"
                          onClick={() =>
                            onUpdateQuestion(activeSection.id, q.id, {
                              subsection: q.subsection === subOption ? undefined : subOption,
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border transition cursor-pointer ${
                            q.subsection === subOption
                              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white'
                              : 'bg-neutral-50 text-neutral-600 border-neutral-300 hover:border-neutral-500 dark:bg-neutral-950 dark:text-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-600'
                          }`}
                        >
                          {formatShortSubLabel(subOption)}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      list={`subsection-presets-${activeSection.id}`}
                      value={q.subsection || ''}
                      onChange={(e) =>
                        onUpdateQuestion(activeSection.id, q.id, {
                          subsection: e.target.value || undefined,
                        })
                      }
                      placeholder="e.g. Sub-Section I (Prose), Sub-Section II (Poem), Sub-Section III (Grammar)"
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                    />
                    <datalist id={`subsection-presets-${activeSection.id}`}>
                      {Array.from(
                        new Set([...ENGLISH_SECTION_B_SUBSECTIONS, ...containerNames])
                      ).map((subOption) => (
                        <option key={subOption} value={subOption} />
                      ))}
                    </datalist>
                  </div>

                  {/* MCQ Options Editor */}
                  {q.type === 'mcq' && q.options && (
                    <div className="space-y-1.5 pt-1 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                        Options (a, b, c, d)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={opt.id} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={opt.label}
                              onChange={(e) => {
                                const newOptions = [...q.options!];
                                newOptions[optIdx] = { ...opt, label: e.target.value };
                                onUpdateQuestion(activeSection.id, q.id, { options: newOptions });
                              }}
                              className="w-8 text-center bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded py-1 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                            />
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const newOptions = [...q.options!];
                                newOptions[optIdx] = { ...opt, text: e.target.value };
                                onUpdateQuestion(activeSection.id, q.id, { options: newOptions });
                              }}
                              placeholder={`Option ${opt.label}`}
                              className="flex-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Answer Key Input */}
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                    <label className="block text-[10px] text-neutral-600 dark:text-neutral-400 mb-1">
                      Answer Key / Model Solution
                    </label>
                    <input
                      type="text"
                      value={q.answerKey || ''}
                      onChange={(e) =>
                        onUpdateQuestion(activeSection.id, q.id, { answerKey: e.target.value })
                      }
                      placeholder="e.g. (b) Only two values"
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-neutral-900 dark:focus:border-white"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        };

        if (containerNames.length > 0) {
          const indexedQuestions = activeSection.questions.map((q, index) => ({ q, index }));
          const unassigned = indexedQuestions.filter(
            ({ q }) => !q.subsection || !containerNames.includes(q.subsection.trim())
          );

          return (
            <div className="space-y-3">
              {containerNames.map((subTitle) => {
                const subItems = indexedQuestions.filter(
                  ({ q }) => (q.subsection || '').trim() === subTitle
                );
                const subMarks = subItems.reduce((sum, { q }) => sum + (q.marks || 0), 0);
                const shortTitle = formatShortSubLabel(subTitle);

                return (
                  <div
                    key={subTitle}
                    data-subsection-container={shortTitle}
                    className="rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black overflow-hidden"
                  >
                    <div className="px-3 py-2 bg-neutral-100/90 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-black text-[10px] font-bold uppercase tracking-wider shrink-0">
                          {shortTitle}
                        </span>
                        <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                          {subTitle}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                          {subItems.length} Qs • {subMarks} M
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onAddQuestion(activeSection.id, 'short', subTitle)}
                          className="px-2 py-1 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                          title={`Add Short Question to ${shortTitle}`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Short</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddQuestion(activeSection.id, 'mcq', subTitle)}
                          className="px-1.5 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 text-[10px] font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
                          title={`Add MCQ to ${shortTitle}`}
                        >
                          +MCQ
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddQuestion(activeSection.id, 'detailed', subTitle)}
                          className="px-1.5 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 text-[10px] font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
                          title={`Add Detailed Question to ${shortTitle}`}
                        >
                          +Long
                        </button>
                      </div>
                    </div>

                    <div className="p-2 space-y-2">
                      {subItems.length === 0 ? (
                        <div className="py-3 px-2 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-[11px] text-neutral-500">
                          No questions in {shortTitle} container yet. Click <span className="font-semibold text-neutral-800 dark:text-neutral-200">+ Short</span> above to add one.
                        </div>
                      ) : (
                        subItems.map(({ q, index }) => renderQuestionCard(q, index))
                      )}
                    </div>
                  </div>
                );
              })}

              {unassigned.length > 0 && (
                <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black overflow-hidden">
                  <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                      Unassigned Questions ({unassigned.length})
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Expand a question to assign it to a container
                    </span>
                  </div>
                  <div className="p-2 space-y-2">
                    {unassigned.map(({ q, index }) => renderQuestionCard(q, index))}
                  </div>
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-2">
            {activeSection.questions.map((q, index) => renderQuestionCard(q, index))}
          </div>
        );
      })()}

      {/* Add Question & JSON Mass Add Buttons */}
      <div className="pt-2 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => onAddQuestion(activeSection.id, 'mcq')}
            className="flex-1 py-2 px-3 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold text-xs rounded-lg dark:hover:bg-neutral-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white dark:text-black" />
            <span>Add MCQ</span>
          </button>
          <button
            onClick={() => onAddQuestion(activeSection.id, 'short')}
            className="flex-1 py-2 px-3 bg-neutral-100 border border-neutral-300 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white font-medium text-xs rounded-lg dark:hover:bg-neutral-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>Add Short</span>
          </button>
          <button
            onClick={() => onAddQuestion(activeSection.id, 'detailed')}
            className="flex-1 py-2 px-3 bg-neutral-100 border border-neutral-300 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white font-medium text-xs rounded-lg dark:hover:bg-neutral-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>Add Detailed</span>
          </button>
        </div>

        {/* Mass JSON Question Button */}
        <button
          onClick={onOpenMassJson}
          className="w-full py-2 px-3 bg-neutral-50 border border-neutral-300 hover:border-neutral-400 text-neutral-900 dark:bg-neutral-950 dark:border-neutral-800 dark:hover:border-neutral-700 dark:text-white font-medium text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
          title="Import or export multiple questions via JSON"
        >
          <Code2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
          <span>Mass Add / Export Questions via JSON</span>
        </button>
      </div>
      {questionToReplace && (
        <QuestionBankReplaceModal
          paper={paper}
          question={questionToReplace}
          excludedQuestionTexts={excludedQuestionTexts}
          onClose={() => setQuestionToReplace(null)}
          onReplace={(replacement) =>
            onUpdateQuestion(activeSection.id, questionToReplace.id, replacement)
          }
        />
      )}
    </div>
  );
};
