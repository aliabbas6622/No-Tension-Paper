import React, { useState } from 'react';
import {
  ExamPaper,
  ExamHeader,
  ExamSection,
  Question,
  QuestionType,
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
} from 'lucide-react';

interface EditorPanelProps {
  paper: ExamPaper;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  onUpdateHeader: (header: Partial<ExamHeader>) => void;
  onUpdateSection: (sectionId: string, updated: Partial<ExamSection>) => void;
  onDeleteSection: (sectionId: string) => void;
  onReorderQuestions: (sectionId: string, fromIndex: number, toIndex: number) => void;
  onAddQuestion: (sectionId: string, type: QuestionType) => void;
  onUpdateQuestion: (sectionId: string, questionId: string, updated: Partial<Question>) => void;
  onDeleteQuestion: (sectionId: string, questionId: string) => void;
  onDuplicateQuestion: (sectionId: string, questionId: string) => void;
  onRenumberQuestions: (sectionId: string, style: 'roman' | 'decimal' | 'alpha') => void;
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
  onOpenMassJson,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Record<string, boolean>>({});

  const activeSection = paper.sections.find((s) => s.id === activeSectionId);

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
      <div className="h-full overflow-y-auto p-4 sm:p-5 space-y-4 bg-black text-white">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Exam Header & Metadata
            </h2>
            <p className="text-[11px] text-neutral-400">
              Formatted intermediate exam title block
            </p>
          </div>
        </div>

        {/* Header Fields in compact monochrome layout */}
        <div className="space-y-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              Examination Title (Line 1)
            </label>
            <input
              type="text"
              value={header.examinationTitle}
              onChange={(e) => onUpdateHeader({ examinationTitle: e.target.value })}
              placeholder="INTERMEDIATE EXAMINATION 2026-27"
              className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-hidden focus:border-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Month & Session (Line 2)
              </label>
              <input
                type="text"
                value={header.examinationMonth}
                onChange={(e) => onUpdateHeader({ examinationMonth: e.target.value })}
                placeholder="EXAMINATION MONTH: OCT-25"
                className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Group (Line 3)
              </label>
              <input
                type="text"
                value={header.groupName}
                onChange={(e) => onUpdateHeader({ groupName: e.target.value })}
                placeholder="COMPUTER SCIENCE GROUP"
                className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              Subject Title (Line 4)
            </label>
            <input
              type="text"
              value={header.subjectTitle}
              onChange={(e) => onUpdateHeader({ subjectTitle: e.target.value })}
              placeholder="SUBJECT: COMPUTER PAPER II"
              className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-hidden focus:border-white"
            />
          </div>
        </div>

        {/* Metadata Row: Date, Duration, Max Marks */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2.5">
          <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Metadata Details
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-neutral-400 mb-1">Date</label>
              <input
                type="text"
                value={header.date}
                onChange={(e) => onUpdateHeader({ date: e.target.value })}
                placeholder="12-10-2025"
                className="w-full bg-black border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-400 mb-1">Duration</label>
              <input
                type="text"
                value={header.duration}
                onChange={(e) => onUpdateHeader({ duration: e.target.value })}
                placeholder="2 Hour"
                className="w-full bg-black border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-400 mb-1">Max Marks</label>
              <input
                type="text"
                value={header.maxMarks}
                onChange={(e) => onUpdateHeader({ maxMarks: e.target.value })}
                placeholder="50"
                className="w-full bg-black border border-neutral-800 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Optional Institution */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2.5">
          <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Optional Board / Institution
          </div>
          <input
            type="text"
            value={header.institutionName || ''}
            onChange={(e) => onUpdateHeader({ institutionName: e.target.value })}
            placeholder="e.g. Board of Intermediate and Secondary Education"
            className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden"
          />
        </div>
      </div>
    );
  }

  // Section Editor View
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5 space-y-4 bg-black text-white">
      {/* Section Settings Header */}
      <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Section Info
          </div>
          <div className="flex items-center gap-3">
            {/* Mass JSON Trigger in header */}
            <button
              onClick={onOpenMassJson}
              className="text-[11px] text-neutral-300 hover:text-white flex items-center gap-1 transition cursor-pointer"
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
                className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Section</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">Title</label>
            <input
              type="text"
              value={activeSection.name}
              onChange={(e) => onUpdateSection(activeSection.id, { name: e.target.value })}
              placeholder='SECTION "A"'
              className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">Subtitle</label>
            <input
              type="text"
              value={activeSection.subtitle}
              onChange={(e) => onUpdateSection(activeSection.id, { subtitle: e.target.value })}
              placeholder="(MULTIPLE CHOICE QUESTIONS)"
              className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">Marks Badge</label>
            <input
              type="text"
              value={activeSection.marksBadge}
              onChange={(e) => onUpdateSection(activeSection.id, { marksBadge: e.target.value })}
              placeholder="10 Marks"
              className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-neutral-400 mb-1">
            Section Instruction / Note
          </label>
          <input
            type="text"
            value={activeSection.instruction}
            onChange={(e) => onUpdateSection(activeSection.id, { instruction: e.target.value })}
            placeholder="Q1 Choose the best answer for each from the given options"
            className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-300 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Questions Bar with Low Density Controls */}
      <div className="flex items-center justify-between gap-2 pt-1 border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Questions ({activeSection.questions.length})
          </span>
          <span className="text-[10px] text-neutral-500 hidden sm:inline">
            Drag handle to reorder
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Renumber utilities */}
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-md p-0.5 text-[10px]">
            <button
              onClick={() => onRenumberQuestions(activeSection.id, 'roman')}
              className="px-1.5 py-0.5 text-neutral-400 hover:text-white rounded transition"
              title="Renumber as i., ii., iii."
            >
              i, ii
            </button>
            <span className="text-neutral-700">|</span>
            <button
              onClick={() => onRenumberQuestions(activeSection.id, 'decimal')}
              className="px-1.5 py-0.5 text-neutral-400 hover:text-white rounded transition"
              title="Renumber as 1., 2., 3."
            >
              1, 2
            </button>
          </div>

          {/* Expand/Collapse All */}
          <button
            onClick={Object.keys(expandedQuestionIds).length > 0 ? collapseAll : expandAll}
            className="text-[11px] text-neutral-400 hover:text-white transition px-2 py-0.5 rounded hover:bg-neutral-900 cursor-pointer"
          >
            {Object.keys(expandedQuestionIds).length > 0 ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Question Accordion List with Drag & Drop */}
      <div className="space-y-2">
        {activeSection.questions.map((q, index) => {
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
                  ? 'opacity-30 border-white bg-neutral-900'
                  : isDragOver
                  ? 'border-white bg-neutral-900'
                  : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
              }`}
            >
              {/* Question Row (Compact Summary) */}
              <div className="p-2.5 flex items-center gap-2">
                {/* Drag Handle */}
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab active:cursor-grabbing p-1 text-neutral-500 hover:text-white rounded transition select-none"
                  title="Drag and drop to rearrange"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Expand / Collapse Chevron */}
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="p-1 text-neutral-400 hover:text-white transition cursor-pointer"
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
                  className="w-8 text-center bg-black border border-neutral-800 rounded py-0.5 text-xs font-bold text-white focus:outline-hidden"
                />

                {/* Question Summary Text (Click to expand) */}
                <div
                  onClick={() => toggleExpand(q.id)}
                  className="flex-1 min-w-0 text-xs text-white truncate cursor-pointer hover:text-neutral-300 transition"
                  title="Click to expand/edit question"
                >
                  {q.text || 'Empty question prompt...'}
                </div>

                {/* Marks tag */}
                <span className="text-[10px] text-neutral-400 font-mono px-1.5 py-0.5 rounded bg-black border border-neutral-800 shrink-0">
                  {q.marks || 1} M
                </span>

                {/* Question Type tag */}
                <span className="text-[9px] uppercase tracking-wider text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-900 shrink-0">
                  {q.type}
                </span>

                {/* Answer Key Badge if present */}
                {q.answerKey && (
                  <span
                    className="text-[9px] text-white px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 shrink-0 font-mono truncate max-w-[90px]"
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
                    className="p-1 text-neutral-500 hover:text-white disabled:opacity-20 transition"
                    title="Move Up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    disabled={index === activeSection.questions.length - 1}
                    onClick={() => onReorderQuestions(activeSection.id, index, index + 1)}
                    className="p-1 text-neutral-500 hover:text-white disabled:opacity-20 transition"
                    title="Move Down"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Duplicate */}
                <button
                  onClick={() => onDuplicateQuestion(activeSection.id, q.id)}
                  className="p-1 text-neutral-500 hover:text-white transition"
                  title="Duplicate question"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDeleteQuestion(activeSection.id, q.id)}
                  className="p-1 text-neutral-500 hover:text-white transition"
                  title="Delete question"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Expanded Question Form */}
              {isExpanded && (
                <div className="p-3.5 border-t border-neutral-850 bg-black space-y-3 rounded-b-xl text-xs">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">
                      Full Question Text
                    </label>
                    <textarea
                      rows={2}
                      value={q.text}
                      onChange={(e) =>
                        onUpdateQuestion(activeSection.id, q.id, { text: e.target.value })
                      }
                      placeholder="Enter question text..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-hidden focus:border-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Marks</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={q.marks || 1}
                        onChange={(e) =>
                          onUpdateQuestion(activeSection.id, q.id, {
                            marks: Number(e.target.value) || 1,
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Type</label>
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
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden"
                      >
                        <option value="mcq">MCQ</option>
                        <option value="short">Short Answer</option>
                        <option value="detailed">Detailed / Long</option>
                      </select>
                    </div>
                    {q.type === 'mcq' && (
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">
                          MCQ Columns
                        </label>
                        <select
                          value={q.optionColumns || 2}
                          onChange={(e) =>
                            onUpdateQuestion(activeSection.id, q.id, {
                              optionColumns: Number(e.target.value) as 2 | 4,
                            })
                          }
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden"
                        >
                          <option value="2">2 Columns (Board Style)</option>
                          <option value="4">4 Columns</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* MCQ Options Editor */}
                  {q.type === 'mcq' && q.options && (
                    <div className="space-y-1.5 pt-1 border-t border-neutral-850">
                      <div className="text-[10px] font-semibold text-neutral-400">
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
                              className="w-8 text-center bg-neutral-950 border border-neutral-800 rounded py-1 text-xs font-semibold text-white focus:outline-hidden"
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
                              className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white focus:outline-hidden"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Answer Key Input */}
                  <div className="pt-2 border-t border-neutral-850">
                    <label className="block text-[10px] text-neutral-400 mb-1">
                      Answer Key / Model Solution
                    </label>
                    <input
                      type="text"
                      value={q.answerKey || ''}
                      onChange={(e) =>
                        onUpdateQuestion(activeSection.id, q.id, { answerKey: e.target.value })
                      }
                      placeholder="e.g. (b) Only two values"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white focus:outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Question & JSON Mass Add Buttons */}
      <div className="pt-2 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => onAddQuestion(activeSection.id, 'mcq')}
            className="flex-1 py-2 px-3 bg-white text-black font-semibold text-xs rounded-lg hover:bg-neutral-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-black" />
            <span>Add MCQ</span>
          </button>
          <button
            onClick={() => onAddQuestion(activeSection.id, 'short')}
            className="flex-1 py-2 px-3 bg-neutral-900 border border-neutral-800 text-white font-medium text-xs rounded-lg hover:bg-neutral-850 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-neutral-400" />
            <span>Add Short</span>
          </button>
          <button
            onClick={() => onAddQuestion(activeSection.id, 'detailed')}
            className="flex-1 py-2 px-3 bg-neutral-900 border border-neutral-800 text-white font-medium text-xs rounded-lg hover:bg-neutral-850 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-neutral-400" />
            <span>Add Detailed</span>
          </button>
        </div>

        {/* Mass JSON Question Button */}
        <button
          onClick={onOpenMassJson}
          className="w-full py-2 px-3 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-white font-medium text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
          title="Import or export multiple questions via JSON"
        >
          <Code2 className="w-3.5 h-3.5 text-neutral-400" />
          <span>Mass Add / Export Questions via JSON</span>
        </button>
      </div>
    </div>
  );
};
