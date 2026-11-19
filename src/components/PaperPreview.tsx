import React, { useState, useCallback } from 'react';
import {
  ExamPaper,
  HeaderElementStyles,
  SectionElementStyles,
  TextElementStyle,
} from '../types/exam';
import {
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  Database,
  FilePlus2,
} from 'lucide-react';
import {
  doesSectionStartOnNewPage,
  getCssFontFamily,
  ResolvedTextStyle,
  resolvedStyleToCss,
  resolveEndOfPaperStyle,
  resolveHeaderElementStyle,
  resolveQuestionOptionsStyle,
  resolveQuestionStyle,
  resolveSectionElementStyle,
} from '../services/paperStyles';
import {
  InlineStylePopover,
  StylePopoverAnchor,
} from './InlineStylePopover';

interface PaperPreviewProps {
  paper: ExamPaper;
  onPrint: () => void;
  onUpdatePaper?: (paper: ExamPaper) => void;
  onOpenAIRefiner?: () => void;
  onBackToQuestionBank?: () => void;
}

type EditableTarget =
  | { kind: 'header'; key: keyof HeaderElementStyles; label: string }
  | {
      kind: 'section';
      sectionId: string;
      sectionIdx: number;
      key: keyof SectionElementStyles;
      label: string;
      subsectionTitle?: string;
    }
  | {
      kind: 'question';
      sectionId: string;
      questionId: string;
      label: string;
    }
  | {
      kind: 'options';
      sectionId: string;
      questionId: string;
      label: string;
    }
  | { kind: 'endOfPaper'; label: string };

interface ActiveSelection {
  target: EditableTarget;
  anchor: StylePopoverAnchor;
}

export const PaperPreview: React.FC<PaperPreviewProps> = ({
  paper,
  onPrint: _onPrint,
  onUpdatePaper,
  onOpenAIRefiner,
  onBackToQuestionBank,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copied, setCopied] = useState(false);
  const [showAnswerKeys, setShowAnswerKeys] = useState(false);
  const [selection, setSelection] = useState<ActiveSelection | null>(null);

  const { header, sections, settings } = paper;

  const totalAnswersInPaper = sections.reduce(
    (acc, sec) => acc + sec.questions.filter((q) => Boolean(q.answerKey)).length,
    0
  );

  const handleSelectTarget = useCallback(
    (e: React.MouseEvent<HTMLElement>, target: EditableTarget) => {
      if (!onUpdatePaper) return;
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      setSelection({
        target,
        anchor: {
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          width: rect.width,
        },
      });
    },
    [onUpdatePaper]
  );

  const isSelected = (predicate: (t: EditableTarget) => boolean): boolean =>
    Boolean(selection && predicate(selection.target));

  const editableClass = (selected: boolean) =>
    onUpdatePaper
      ? `print:outline-none print:bg-transparent transition-[outline,background-color] duration-100 rounded-[2px] cursor-pointer ${
          selected
            ? 'outline outline-1.5 outline-neutral-900 bg-neutral-100/70'
            : 'hover:outline hover:outline-1 hover:outline-dashed hover:outline-neutral-400/80'
        }`
      : '';

  const handleCopyText = () => {
    let text = `${header.examinationTitle}\n${header.examinationMonth}\n${header.groupName}\n${header.subjectTitle}\n`;
    text += `Date: ${header.date}   Duration: ${header.duration}   Max. Marks: ${header.maxMarks}\n`;
    text += '------------------------------------------------------------------\n\n';

    if (settings.showGeneralInstructions !== false && header.generalInstructions?.length) {
      text += `Instructions: ${header.generalInstructions.join(' | ')}\n\n`;
    }

    sections.forEach((sec) => {
      if (settings.showDividerMarker !== false) {
        text += '|\n';
      }
      text += `${sec.name}\n${sec.subtitle}    [ ${sec.marksBadge} ]\n`;
      if (settings.showSectionInstructions !== false && sec.instruction) {
        text += `${sec.instruction}\n\n`;
      }
      let prevSub = '';
      sec.questions.forEach((q) => {
        const currSub = (q.subsection || '').trim();
        if (currSub && currSub !== prevSub) {
          text += `${currSub}\n`;
          if (q.subsectionInstruction) {
            text += `${q.subsectionInstruction}\n`;
          }
          prevSub = currSub;
        }
        const marksStr =
          settings.showQuestionMarks !== false && q.marks && q.type !== 'mcq'
            ? ` (${q.marks} Marks)`
            : '';
        text += `${q.number} ${q.text}${marksStr}\n`;
        if (q.type === 'mcq' && q.options) {
          if (q.options.length === 4) {
            text += `  ${q.options[0].label} ${q.options[0].text}        ${q.options[2].label} ${q.options[2].text}\n`;
            text += `  ${q.options[1].label} ${q.options[1].text}        ${q.options[3].label} ${q.options[3].text}\n`;
          } else {
            q.options.forEach((opt) => {
              text += `  ${opt.label} ${opt.text}\n`;
            });
          }
        }
        if (showAnswerKeys && q.answerKey) {
          text += `  Answer: ${q.answerKey}\n`;
        }
        text += '\n';
      });
    });

    if (settings.showEndOfPaper !== false) {
      text += '*** END OF EXAMINATION PAPER ***\n';
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  // Resolve popover state for active selection
  const renderStylePopover = () => {
    if (!selection || !onUpdatePaper) return null;
    const { target, anchor } = selection;

    const commitPaper = (next: ExamPaper) => {
      onUpdatePaper({ ...next, updatedAt: new Date().toISOString() });
    };

    if (target.kind === 'header') {
      const resolved: ResolvedTextStyle = resolveHeaderElementStyle(paper, target.key);
      const patchHeaderStyle = (patch: Partial<TextElementStyle>) => {
        const prevStyles = paper.header.styles || {};
        commitPaper({
          ...paper,
          header: {
            ...paper.header,
            styles: {
              ...prevStyles,
              [target.key]: { ...(prevStyles[target.key] || {}), ...patch },
            },
          },
        });
      };
      const resetHeaderStyle = () => {
        const prevStyles = { ...(paper.header.styles || {}) };
        delete prevStyles[target.key];
        commitPaper({
          ...paper,
          header: { ...paper.header, styles: prevStyles },
        });
      };

      const editableFieldKey: Partial<
        Record<
          keyof HeaderElementStyles,
          'institutionName' | 'paperCode' | 'examinationTitle' | 'examinationMonth' | 'groupName' | 'subjectTitle'
        >
      > = {
        institutionName: 'institutionName',
        paperCode: 'paperCode',
        examinationTitle: 'examinationTitle',
        examinationMonth: 'examinationMonth',
        groupName: 'groupName',
        subjectTitle: 'subjectTitle',
      };
      const fieldProp = editableFieldKey[target.key];

      return (
        <InlineStylePopover
          label={target.label}
          anchor={anchor}
          resolvedStyle={resolved}
          supportsAlign={target.key !== 'metadataRow'}
          onChangeStyle={patchHeaderStyle}
          onResetStyle={resetHeaderStyle}
          onClose={() => setSelection(null)}
          textValue={fieldProp ? String(paper.header[fieldProp] || '') : undefined}
          onChangeText={
            fieldProp
              ? (val) =>
                  commitPaper({
                    ...paper,
                    header: { ...paper.header, [fieldProp]: val },
                  })
              : undefined
          }
        />
      );
    }

    if (target.kind === 'section') {
      const sec = paper.sections.find((s) => s.id === target.sectionId);
      if (!sec) return null;
      const resolved = resolveSectionElementStyle(paper, sec, target.key);
      const patchSectionStyle = (patch: Partial<TextElementStyle>) => {
        commitPaper({
          ...paper,
          sections: paper.sections.map((s) => {
            if (s.id !== sec.id) return s;
            const prevStyles = s.styles || {};
            return {
              ...s,
              styles: {
                ...prevStyles,
                [target.key]: { ...(prevStyles[target.key] || {}), ...patch },
              },
            };
          }),
        });
      };
      const resetSectionStyle = () => {
        commitPaper({
          ...paper,
          sections: paper.sections.map((s) => {
            if (s.id !== sec.id) return s;
            const prevStyles = { ...(s.styles || {}) };
            delete prevStyles[target.key];
            return { ...s, styles: prevStyles };
          }),
        });
      };

      const fieldMap: Partial<
        Record<keyof SectionElementStyles, 'name' | 'subtitle' | 'marksBadge' | 'instruction'>
      > = {
        title: 'name',
        subtitle: 'subtitle',
        marksBadge: 'marksBadge',
        instruction: 'instruction',
      };
      const secProp = fieldMap[target.key];
      const activeSubsectionTitle = target.subsectionTitle;

      return (
        <InlineStylePopover
          label={target.label}
          anchor={anchor}
          resolvedStyle={resolved}
          supportsAlign={target.key !== 'marksBadge'}
          onChangeStyle={patchSectionStyle}
          onResetStyle={resetSectionStyle}
          onClose={() => setSelection(null)}
          textValue={
            target.key === 'subsectionHeading'
              ? activeSubsectionTitle
              : secProp
              ? sec[secProp]
              : undefined
          }
          textLabel={
            target.key === 'subsectionHeading' ? 'Sub-Section Heading' : 'Text'
          }
          onChangeText={
            target.key === 'subsectionHeading' && activeSubsectionTitle !== undefined
              ? (val) => {
                  const prevTitle = activeSubsectionTitle;
                  commitPaper({
                    ...paper,
                    sections: paper.sections.map((s) =>
                      s.id !== sec.id
                        ? s
                        : {
                            ...s,
                            questions: s.questions.map((item) =>
                              (item.subsection || '').trim() === prevTitle.trim()
                                ? { ...item, subsection: val }
                                : item
                            ),
                          }
                    ),
                  });
                  setSelection((prev) =>
                    prev && prev.target.kind === 'section'
                      ? {
                          ...prev,
                          target: {
                            ...prev.target,
                            subsectionTitle: val,
                            label: val || 'Sub-Section Heading',
                          },
                        }
                      : prev
                  );
                }
              : secProp
              ? (val) =>
                  commitPaper({
                    ...paper,
                    sections: paper.sections.map((s) =>
                      s.id === sec.id ? { ...s, [secProp]: val } : s
                    ),
                  })
              : undefined
          }
          showSectionPageBreak={
            target.sectionIdx > 0 &&
            (target.key === 'title' || target.key === 'subtitle')
          }
          sectionStartsOnNewPage={doesSectionStartOnNewPage(
            sec,
            target.sectionIdx,
            settings
          )}
          onToggleSectionPageBreak={(next) =>
            commitPaper({
              ...paper,
              sections: paper.sections.map((s) =>
                s.id === sec.id ? { ...s, startOnNewPage: next } : s
              ),
            })
          }
        />
      );
    }

    if (target.kind === 'question') {
      const sec = paper.sections.find((s) => s.id === target.sectionId);
      const q = sec?.questions.find((item) => item.id === target.questionId);
      if (!sec || !q) return null;
      const resolved = resolveQuestionStyle(paper, sec, q);
      const patchQuestionStyle = (patch: Partial<TextElementStyle>) => {
        commitPaper({
          ...paper,
          sections: paper.sections.map((s) => {
            if (s.id !== sec.id) return s;
            return {
              ...s,
              questions: s.questions.map((item) =>
                item.id === q.id
                  ? { ...item, style: { ...(item.style || {}), ...patch } }
                  : item
              ),
            };
          }),
        });
      };
      const resetQuestionStyle = () => {
        commitPaper({
          ...paper,
          sections: paper.sections.map((s) => {
            if (s.id !== sec.id) return s;
            return {
              ...s,
              questions: s.questions.map((item) => {
                if (item.id !== q.id) return item;
                const { style: _removed, ...rest } = item;
                return rest;
              }),
            };
          }),
        });
      };
      const applyToSectionQuestions = () => {
        const appliedStyle: TextElementStyle = {
          fontFamily: resolved.fontFamily,
          fontSizePt: resolved.fontSizePt,
          bold: resolved.bold,
          italic: resolved.italic,
          underline: resolved.underline,
          uppercase: resolved.uppercase,
          align: resolved.align,
          letterSpacing: resolved.letterSpacing,
          color: resolved.color,
        };
        commitPaper({
          ...paper,
          sections: paper.sections.map((s) => {
            if (s.id !== sec.id) return s;
            return {
              ...s,
              styles: { ...(s.styles || {}), questionText: appliedStyle },
              questions: s.questions.map((item) => {
                const { style: _removed, ...rest } = item;
                return rest;
              }),
            };
          }),
        });
      };

      return (
        <InlineStylePopover
          label={target.label}
          anchor={anchor}
          resolvedStyle={resolved}
          onChangeStyle={patchQuestionStyle}
          onResetStyle={resetQuestionStyle}
          onClose={() => setSelection(null)}
          textValue={q.text}
          textLabel="Question Prompt"
          onChangeText={(val) =>
            commitPaper({
              ...paper,
              sections: paper.sections.map((s) =>
                s.id !== sec.id
                  ? s
                  : {
                      ...s,
                      questions: s.questions.map((item) =>
                        item.id === q.id ? { ...item, text: val } : item
                      ),
                    }
              ),
            })
          }
          onApplyToSectionQuestions={applyToSectionQuestions}
        />
      );
    }

    if (target.kind === 'options') {
      const sec = paper.sections.find((s) => s.id === target.sectionId);
      const q = sec?.questions.find((item) => item.id === target.questionId);
      if (!sec || !q) return null;
      const resolved = resolveQuestionOptionsStyle(paper, sec, q);
      const currentCols = (q.optionColumns ?? settings.mcqColumns ?? 2) as 1 | 2 | 4;

      const patchOptionsStyle = (patch: Partial<TextElementStyle>) => {
        commitPaper({
          ...paper,
          sections: paper.sections.map((s) =>
            s.id !== sec.id
              ? s
              : {
                  ...s,
                  questions: s.questions.map((item) =>
                    item.id === q.id
                      ? {
                          ...item,
                          optionsStyle: { ...(item.optionsStyle || {}), ...patch },
                        }
                      : item
                  ),
                }
          ),
        });
      };
      const resetOptionsStyle = () => {
        commitPaper({
          ...paper,
          sections: paper.sections.map((s) =>
            s.id !== sec.id
              ? s
              : {
                  ...s,
                  questions: s.questions.map((item) => {
                    if (item.id !== q.id) return item;
                    const { optionsStyle: _removed, ...rest } = item;
                    return rest;
                  }),
                }
          ),
        });
      };

      return (
        <InlineStylePopover
          label={target.label}
          anchor={anchor}
          resolvedStyle={resolved}
          supportsAlign={false}
          onChangeStyle={patchOptionsStyle}
          onResetStyle={resetOptionsStyle}
          onClose={() => setSelection(null)}
          showMcqColumns
          mcqColumns={currentCols}
          onChangeMcqColumns={(cols) =>
            commitPaper({
              ...paper,
              sections: paper.sections.map((s) =>
                s.id !== sec.id
                  ? s
                  : {
                      ...s,
                      questions: s.questions.map((item) =>
                        item.id === q.id ? { ...item, optionColumns: cols } : item
                      ),
                    }
              ),
            })
          }
        />
      );
    }

    if (target.kind === 'endOfPaper') {
      const resolved = resolveEndOfPaperStyle(paper);
      return (
        <InlineStylePopover
          label={target.label}
          anchor={anchor}
          resolvedStyle={resolved}
          onChangeStyle={(patch) =>
            commitPaper({
              ...paper,
              settings: {
                ...paper.settings,
                endOfPaperStyle: { ...(paper.settings.endOfPaperStyle || {}), ...patch },
              },
            })
          }
          onResetStyle={() =>
            commitPaper({
              ...paper,
              settings: {
                ...paper.settings,
                endOfPaperStyle: undefined,
              },
            })
          }
          onClose={() => setSelection(null)}
        />
      );
    }

    return null;
  };

  const instStyle = resolveHeaderElementStyle(paper, 'institutionName');
  const codeStyle = resolveHeaderElementStyle(paper, 'paperCode');
  const examTitleStyle = resolveHeaderElementStyle(paper, 'examinationTitle');
  const examMonthStyle = resolveHeaderElementStyle(paper, 'examinationMonth');
  const groupStyle = resolveHeaderElementStyle(paper, 'groupName');
  const subjectStyle = resolveHeaderElementStyle(paper, 'subjectTitle');
  const metaStyle = resolveHeaderElementStyle(paper, 'metadataRow');
  const genInstStyle = resolveHeaderElementStyle(paper, 'generalInstructions');
  const endStyle = resolveEndOfPaperStyle(paper);

  return (
    <div className="h-full flex flex-col bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-white min-w-0">
      {/* Ultra-Minimal Monochrome Preview Toolbar */}
      <div className="no-print h-10 px-3 sm:px-4 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 text-xs shrink-0 select-none overflow-x-auto">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-white inline-block"></span>
            <span className="hidden lg:inline">Real-Time Paper Preview</span>
            <span className="lg:hidden">Preview</span>
          </span>
          {onUpdatePaper && (
            <span className="hidden xl:inline text-[11px] text-neutral-400 dark:text-neutral-500">
              · Click any heading or text to format
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onUpdatePaper && (
            <button
              type="button"
              onClick={() =>
                onUpdatePaper({
                  ...paper,
                  settings: {
                    ...paper.settings,
                    newPagePerSection: !settings.newPagePerSection,
                  },
                  updatedAt: new Date().toISOString(),
                })
              }
              className={`px-2 py-1 rounded-md border transition flex items-center gap-1 text-[11px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                settings.newPagePerSection
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white'
                  : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-300'
              }`}
              title="Start each section on a new page"
            >
              <FilePlus2 className="w-3 h-3" />
              <span className="hidden sm:inline">Page / Section</span>
            </button>
          )}

          {onOpenAIRefiner && (
            <button
              type="button"
              onClick={onOpenAIRefiner}
              className="px-2.5 py-1 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition flex items-center gap-1 text-[11px] font-semibold cursor-pointer whitespace-nowrap shrink-0"
              title="Ask AI to edit, swap, or refine questions on this paper"
            >
              <Sparkles className="w-3 h-3" />
              <span>Edit with AI</span>
            </button>
          )}

          {onBackToQuestionBank && (
            <button
              type="button"
              onClick={onBackToQuestionBank}
              className="px-2.5 py-1 rounded-md border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-white transition flex items-center gap-1 text-[11px] font-medium cursor-pointer whitespace-nowrap shrink-0"
              title="Go back to Question Bank to reselect or replace questions"
            >
              <Database className="w-3 h-3" />
              <span>Question Bank</span>
            </button>
          )}

          {/* Answer Key Toggle Button (if paper has answer keys) */}
          {totalAnswersInPaper > 0 && (
            <button
              onClick={() => setShowAnswerKeys(!showAnswerKeys)}
              className={`p-1 px-2 rounded transition flex items-center gap-1 text-[11px] cursor-pointer whitespace-nowrap shrink-0 ${
                showAnswerKeys
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-300 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900 dark:border-neutral-800'
              }`}
              title="Toggle display of Answer Keys from curriculum"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Keys ({totalAnswersInPaper})</span>
            </button>
          )}

          {/* Copy Plaintext button */}
          <button
            onClick={handleCopyText}
            className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900 rounded transition flex items-center gap-1 text-[11px] cursor-pointer whitespace-nowrap shrink-0"
            title="Copy paper as text"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 rounded p-0.5 border border-neutral-200 dark:border-neutral-800 shrink-0">
            <button
              onClick={() => setZoomLevel((z) => Math.max(65, z - 10))}
              className="p-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded transition cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1 text-[10px] font-mono text-neutral-700 dark:text-neutral-300 tabular-nums">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
              className="p-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded transition cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Independent Paper Scroll Area */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start bg-neutral-100 dark:bg-neutral-950"
        onClick={() => setSelection(null)}
      >
        <div
          style={{ zoom: zoomLevel / 100 }}
          className="paper-zoom w-full max-w-[820px] pb-16"
        >
          {/* Printable White Exam Sheet */}
          <div
            id="printable-exam-paper"
            style={{ fontFamily: getCssFontFamily(settings.fontFamily) }}
            className="w-full min-h-[1050px] p-8 sm:p-12 rounded-sm shadow-2xl bg-white text-black border border-neutral-300"
          >
            {/* Optional Institution & Paper Code */}
            {(header.institutionName || header.paperCode) && (
              <div className="relative text-center mb-1 space-y-0.5">
                {header.institutionName && (
                  <div
                    data-paper-editable
                    onClick={(e) =>
                      handleSelectTarget(e, {
                        kind: 'header',
                        key: 'institutionName',
                        label: 'Institution Heading',
                      })
                    }
                    style={resolvedStyleToCss(instStyle)}
                    className={`px-1 ${editableClass(
                      isSelected((t) => t.kind === 'header' && t.key === 'institutionName')
                    )}`}
                  >
                    {header.institutionName}
                  </div>
                )}
                {header.paperCode && (
                  <div
                    data-paper-editable
                    onClick={(e) =>
                      handleSelectTarget(e, {
                        kind: 'header',
                        key: 'paperCode',
                        label: 'Paper Code',
                      })
                    }
                    style={resolvedStyleToCss(codeStyle)}
                    className={`px-1 ${editableClass(
                      isSelected((t) => t.kind === 'header' && t.key === 'paperCode')
                    )}`}
                  >
                    Paper Code: {header.paperCode}
                  </div>
                )}
              </div>
            )}

            {/* Header Titles */}
            <div className="space-y-1 mb-4">
              <div
                data-paper-editable
                onClick={(e) =>
                  handleSelectTarget(e, {
                    kind: 'header',
                    key: 'examinationTitle',
                    label: 'Examination Title',
                  })
                }
                style={resolvedStyleToCss(examTitleStyle)}
                className={`px-1 ${editableClass(
                  isSelected((t) => t.kind === 'header' && t.key === 'examinationTitle')
                )}`}
              >
                {header.examinationTitle || 'INTERMEDIATE EXAMINATION 2026-27'}
              </div>
              <div
                data-paper-editable
                onClick={(e) =>
                  handleSelectTarget(e, {
                    kind: 'header',
                    key: 'examinationMonth',
                    label: 'Examination Month / Session',
                  })
                }
                style={resolvedStyleToCss(examMonthStyle)}
                className={`px-1 ${editableClass(
                  isSelected((t) => t.kind === 'header' && t.key === 'examinationMonth')
                )}`}
              >
                {header.examinationMonth || 'EXAMINATION MONTH: OCT-25'}
              </div>
              <div
                data-paper-editable
                onClick={(e) =>
                  handleSelectTarget(e, {
                    kind: 'header',
                    key: 'groupName',
                    label: 'Group Heading',
                  })
                }
                style={resolvedStyleToCss(groupStyle)}
                className={`px-1 ${editableClass(
                  isSelected((t) => t.kind === 'header' && t.key === 'groupName')
                )}`}
              >
                {header.groupName || 'COMPUTER SCIENCE GROUP'}
              </div>
              <div
                data-paper-editable
                onClick={(e) =>
                  handleSelectTarget(e, {
                    kind: 'header',
                    key: 'subjectTitle',
                    label: 'Subject Heading',
                  })
                }
                style={resolvedStyleToCss(subjectStyle)}
                className={`pt-0.5 px-1 ${editableClass(
                  isSelected((t) => t.kind === 'header' && t.key === 'subjectTitle')
                )}`}
              >
                {header.subjectTitle || 'SUBJECT: COMPUTER PAPER II'}
              </div>
            </div>

            {/* Metadata Row: Date, Duration, Max Marks */}
            <div
              data-paper-editable
              onClick={(e) =>
                handleSelectTarget(e, {
                  kind: 'header',
                  key: 'metadataRow',
                  label: 'Metadata Row (Date / Duration / Marks)',
                })
              }
              style={resolvedStyleToCss(metaStyle, { includeTextAlign: false })}
              className={`flex items-center justify-between pt-2 pb-1 ${
                header.showDividerLine !== false ? 'border-b border-black' : ''
              } ${editableClass(
                isSelected((t) => t.kind === 'header' && t.key === 'metadataRow')
              )}`}
            >
              <div>Date: {header.date || '___'}</div>
              <div>Duration: {header.duration || '2 Hour'}</div>
              <div>Max. Marks: {header.maxMarks || '50'}</div>
            </div>

            {/* General Instructions (if enabled) */}
            {settings.showGeneralInstructions !== false &&
              header.generalInstructions &&
              header.generalInstructions.length > 0 && (
                <div
                  data-paper-editable
                  onClick={(e) =>
                    handleSelectTarget(e, {
                      kind: 'header',
                      key: 'generalInstructions',
                      label: 'General Instructions',
                    })
                  }
                  style={resolvedStyleToCss(genInstStyle)}
                  className={`my-3 border-b border-neutral-300 pb-2 px-1 ${editableClass(
                    isSelected((t) => t.kind === 'header' && t.key === 'generalInstructions')
                  )}`}
                >
                  <span className="font-bold not-italic">Instructions: </span>
                  {header.generalInstructions.join(' | ')}
                </div>
              )}

            {/* Sections */}
            <div className="mt-6 space-y-8">
              {sections.map((section, secIdx) => {
                const startsNewPage = doesSectionStartOnNewPage(section, secIdx, settings);
                const titleStyle = resolveSectionElementStyle(paper, section, 'title');
                const subtitleStyle = resolveSectionElementStyle(paper, section, 'subtitle');
                const badgeStyle = resolveSectionElementStyle(paper, section, 'marksBadge');
                const secInstStyle = resolveSectionElementStyle(paper, section, 'instruction');

                return (
                  <div
                    key={section.id}
                    className={`avoid-break space-y-3 ${startsNewPage ? 'page-break-before' : ''}`}
                  >
                    {/* Visual Page Break Indicator in Web Preview */}
                    {startsNewPage && (
                      <div className="no-print flex items-center gap-3 py-2 my-2">
                        <div className="flex-1 border-t border-dashed border-neutral-400" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                          <FilePlus2 className="w-3 h-3" />
                          Page Break · New Page
                        </span>
                        <div className="flex-1 border-t border-dashed border-neutral-400" />
                      </div>
                    )}

                    {/* Top vertical divider marker '|' (if enabled) */}
                    {settings.showDividerMarker !== false && (
                      <div className="text-center text-sm font-bold opacity-80 leading-none">
                        |
                      </div>
                    )}

                    {/* Section Title, Subtitle, and Right Marks Box */}
                    <div className="relative flex items-center justify-center min-h-[44px]">
                      <div className="text-center px-20 sm:px-28 space-y-0.5">
                        <h2
                          data-paper-editable
                          onClick={(e) =>
                            handleSelectTarget(e, {
                              kind: 'section',
                              sectionId: section.id,
                              sectionIdx: secIdx,
                              key: 'title',
                              label: `${section.name} Heading`,
                            })
                          }
                          style={resolvedStyleToCss(titleStyle)}
                          className={`px-1 ${editableClass(
                            isSelected(
                              (t) =>
                                t.kind === 'section' &&
                                t.sectionId === section.id &&
                                t.key === 'title'
                            )
                          )}`}
                        >
                          {section.name}
                        </h2>
                        {section.subtitle && (
                          <h3
                            data-paper-editable
                            onClick={(e) =>
                              handleSelectTarget(e, {
                                kind: 'section',
                                sectionId: section.id,
                                sectionIdx: secIdx,
                                key: 'subtitle',
                                label: `${section.name} Subtitle`,
                              })
                            }
                            style={resolvedStyleToCss(subtitleStyle)}
                            className={`px-1 ${editableClass(
                              isSelected(
                                (t) =>
                                  t.kind === 'section' &&
                                  t.sectionId === section.id &&
                                  t.key === 'subtitle'
                              )
                            )}`}
                          >
                            {section.subtitle}
                          </h3>
                        )}
                      </div>

                      {/* Right-aligned boxed marks badge */}
                      {settings.showMarksBadges !== false && section.marksBadge && (
                        <div
                          data-paper-editable
                          onClick={(e) =>
                            handleSelectTarget(e, {
                              kind: 'section',
                              sectionId: section.id,
                              sectionIdx: secIdx,
                              key: 'marksBadge',
                              label: `${section.name} Marks Box`,
                            })
                          }
                          style={resolvedStyleToCss(badgeStyle)}
                          className={`absolute right-0 top-1/2 -translate-y-1/2 border border-black px-3 py-1 shadow-xs whitespace-nowrap ${editableClass(
                            isSelected(
                              (t) =>
                                t.kind === 'section' &&
                                t.sectionId === section.id &&
                                t.key === 'marksBadge'
                            )
                          )}`}
                        >
                          {section.marksBadge}
                        </div>
                      )}
                    </div>

                    {/* Section Sub-Instruction (if enabled) */}
                    {settings.showSectionInstructions !== false && section.instruction && (
                      <div
                        data-paper-editable
                        onClick={(e) =>
                          handleSelectTarget(e, {
                            kind: 'section',
                            sectionId: section.id,
                            sectionIdx: secIdx,
                            key: 'instruction',
                            label: `${section.name} Instruction`,
                          })
                        }
                        style={resolvedStyleToCss(secInstStyle)}
                        className={`pt-1 px-1 ${editableClass(
                          isSelected(
                            (t) =>
                              t.kind === 'section' &&
                              t.sectionId === section.id &&
                              t.key === 'instruction'
                          )
                        )}`}
                      >
                        {section.instruction}
                      </div>
                    )}

                    {/* Questions List */}
                    <div className="space-y-4 pt-1">
                      {section.questions.map((q, qIdx) => {
                        const qStyle = resolveQuestionStyle(paper, section, q);
                        const optStyle = resolveQuestionOptionsStyle(paper, section, q);
                        const cols = q.optionColumns ?? settings.mcqColumns ?? 2;
                        const prevSub =
                          qIdx > 0 ? (section.questions[qIdx - 1].subsection || '').trim() : '';
                        const currSub = (q.subsection || '').trim();
                        const showSubHeading = Boolean(currSub) && currSub !== prevSub;
                        const subHeadingStyle = resolveSectionElementStyle(
                          paper,
                          section,
                          'subsectionHeading'
                        );

                        return (
                          <div key={q.id} className="avoid-break leading-relaxed">
                            {showSubHeading && (
                              <div className={qIdx === 0 ? 'pt-0.5 pb-1.5' : 'pt-2.5 pb-1.5'}>
                                <div
                                  data-paper-editable
                                  onClick={(e) =>
                                    handleSelectTarget(e, {
                                      kind: 'section',
                                      sectionId: section.id,
                                      sectionIdx: secIdx,
                                      key: 'subsectionHeading',
                                      label: currSub,
                                      subsectionTitle: currSub,
                                    })
                                  }
                                  style={resolvedStyleToCss(subHeadingStyle)}
                                  className={`px-1 ${editableClass(
                                    isSelected(
                                      (t) =>
                                        t.kind === 'section' &&
                                        t.sectionId === section.id &&
                                        t.key === 'subsectionHeading' &&
                                        t.subsectionTitle === currSub
                                    )
                                  )}`}
                                >
                                  {currSub}
                                </div>
                                {q.subsectionInstruction && (
                                  <div
                                    style={resolvedStyleToCss(secInstStyle)}
                                    className="px-1 pt-0.5 text-[10pt]"
                                  >
                                    {q.subsectionInstruction}
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Question Prompt */}
                            <div className="flex items-start justify-between gap-2">
                              <div
                                data-paper-editable
                                onClick={(e) =>
                                  handleSelectTarget(e, {
                                    kind: 'question',
                                    sectionId: section.id,
                                    questionId: q.id,
                                    label: `Question ${q.number}`,
                                  })
                                }
                                style={resolvedStyleToCss(qStyle)}
                                className={`flex-1 px-1 ${editableClass(
                                  isSelected(
                                    (t) => t.kind === 'question' && t.questionId === q.id
                                  )
                                )}`}
                              >
                                <span className="font-bold inline-block mr-1.5">{q.number}</span>
                                <span>{q.text}</span>
                              </div>
                              {/* Marks Note */}
                              {settings.showQuestionMarks !== false && q.marks && q.type !== 'mcq' && (
                                <span
                                  style={resolvedStyleToCss(qStyle, { includeTextAlign: false })}
                                  className="font-bold shrink-0 ml-2"
                                >
                                  [{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}]
                                </span>
                              )}
                            </div>

                            {/* MCQ Options Display */}
                            {q.type === 'mcq' && q.options && q.options.length > 0 && (
                              <div
                                data-paper-editable
                                onClick={(e) =>
                                  handleSelectTarget(e, {
                                    kind: 'options',
                                    sectionId: section.id,
                                    questionId: q.id,
                                    label: `Options (${q.number})`,
                                  })
                                }
                                style={resolvedStyleToCss(optStyle, { includeTextAlign: false })}
                                className={`mt-1.5 pl-4 sm:pl-6 pr-1 ${editableClass(
                                  isSelected(
                                    (t) => t.kind === 'options' && t.questionId === q.id
                                  )
                                )}`}
                              >
                                {q.options.length === 4 && cols === 2 ? (
                                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="font-medium">{q.options[0].label}</span>
                                      <span>{q.options[0].text}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="font-medium">{q.options[2].label}</span>
                                      <span>{q.options[2].text}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="font-medium">{q.options[1].label}</span>
                                      <span>{q.options[1].text}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="font-medium">{q.options[3].label}</span>
                                      <span>{q.options[3].text}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className={`grid ${
                                      cols === 4
                                        ? 'grid-cols-4'
                                        : cols === 1
                                        ? 'grid-cols-1'
                                        : 'grid-cols-2'
                                    } gap-x-4 gap-y-1`}
                                  >
                                    {q.options.map((opt) => (
                                      <div key={opt.id} className="flex items-baseline gap-1.5">
                                        <span className="font-medium">{opt.label}</span>
                                        <span>{opt.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Model Answer / Answer Key */}
                            {showAnswerKeys && q.answerKey && (
                              <div className="mt-1.5 p-1.5 px-2 bg-neutral-100 border border-neutral-300 rounded text-[11px] font-sans text-neutral-800 flex items-baseline gap-1.5">
                                <span className="font-bold uppercase tracking-wider text-[10px] bg-black text-white px-1.5 py-0.2 rounded">
                                  Answer Key
                                </span>
                                <span className="font-medium">{q.answerKey}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* End of Paper Sign-off */}
            {settings.showEndOfPaper !== false && (
              <div className="mt-14 pt-4 border-t border-black/40 text-center space-y-1">
                <div
                  data-paper-editable
                  onClick={(e) =>
                    handleSelectTarget(e, {
                      kind: 'endOfPaper',
                      label: 'End of Paper Line',
                    })
                  }
                  style={resolvedStyleToCss(endStyle)}
                  className={`px-1 ${editableClass(
                    isSelected((t) => t.kind === 'endOfPaper')
                  )}`}
                >
                  *** END OF EXAMINATION PAPER ***
                </div>
                <div className="text-[10px] opacity-60">
                  Intermediate Examination Board • Official Format
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Click-to-Format Popover */}
      {renderStylePopover()}
    </div>
  );
};
