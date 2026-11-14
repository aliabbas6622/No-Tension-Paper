import React, { useState } from 'react';
import { PastPaperRecord } from '../types/exam';
import {
  X,
  FileText,
  Images,
  Shuffle,
  PenLine,
  Eye,
  EyeOff,
  Clock,
  Award,
} from 'lucide-react';

interface PastPaperViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pastPaper: PastPaperRecord | null;
  onOpenExactInEditor: (pastPaper: PastPaperRecord) => void;
  onUsePatternWithDifferentQuestions: (pastPaper: PastPaperRecord) => void;
}

export const PastPaperViewerModal: React.FC<PastPaperViewerModalProps> = ({
  isOpen,
  onClose,
  pastPaper,
  onOpenExactInEditor,
  onUsePatternWithDifferentQuestions,
}) => {
  const [activeTab, setActiveTab] = useState<'paper' | 'scans'>('paper');
  const [showAnswers, setShowAnswers] = useState(true);

  if (!isOpen || !pastPaper) return null;

  const hasScans = Boolean(pastPaper.sourceImages && pastPaper.sourceImages.length > 0);
  const totalQuestions = pastPaper.paper.sections.reduce(
    (sum, sec) => sum + sec.questions.length,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white border border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-900 dark:text-white">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-black font-bold">
                {pastPaper.year} Past Paper
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800">
                {pastPaper.classGrade}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800">
                {pastPaper.boardOrGroup}
              </span>
            </div>
            <h2 className="text-base font-bold tracking-tight truncate">
              {pastPaper.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {pastPaper.paper.header.duration}
              </span>
              <span className="inline-flex items-center gap-1">
                <Award className="w-3 h-3" />
                {pastPaper.paper.header.maxMarks} Marks
              </span>
              <span>
                {pastPaper.paper.sections.length} Sections • {totalQuestions} Questions
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900 transition cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Toolbar Tabs */}
        <div className="px-5 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="inline-flex items-center gap-1 p-0.5 bg-neutral-100 border border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('paper')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'paper'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Structured Questions</span>
            </button>
            {hasScans && (
              <button
                type="button"
                onClick={() => setActiveTab('scans')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'scans'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                <Images className="w-3.5 h-3.5" />
                <span>Original Scans ({pastPaper.sourceImages?.length})</span>
              </button>
            )}
          </div>

          {activeTab === 'paper' && (
            <button
              type="button"
              onClick={() => setShowAnswers((v) => !v)}
              className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-300 rounded-lg text-[11px] font-medium flex items-center gap-1.5 cursor-pointer"
            >
              {showAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showAnswers ? 'Hide Answer Keys' : 'Show Answer Keys'}</span>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeTab === 'scans' && hasScans ? (
            <div className="space-y-4">
              {pastPaper.sourceImages?.map((src, idx) => (
                <div
                  key={src}
                  className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-neutral-100 dark:bg-black"
                >
                  <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                    Page {idx + 1} of {pastPaper.sourceImages?.length}
                  </div>
                  <div className="p-3 flex justify-center bg-neutral-100 dark:bg-neutral-900">
                    <img
                      src={src}
                      alt={`${pastPaper.title} scanned page ${idx + 1}`}
                      className="max-w-full rounded border border-neutral-300 bg-white shadow-md"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pattern Breakdown Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {pastPaper.sectionPatterns.map((sp) => (
                  <div
                    key={sp.name}
                    className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-black space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">{sp.name}</span>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-black">
                        {sp.marksBadge}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                      {sp.questionCount} questions • Attempt{' '}
                      {sp.attemptCount === sp.questionCount ? 'all' : `any ${sp.attemptCount}`} (
                      {sp.marksPerQuestion}m each)
                    </div>
                  </div>
                ))}
              </div>

              {/* All Paper Sections */}
              {pastPaper.paper.sections.map((section) => (
                <div
                  key={section.id}
                  className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-black"
                >
                  <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold tracking-wide uppercase">
                        {section.name} {section.subtitle}
                      </div>
                      {section.instruction && (
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 whitespace-pre-line">
                          {section.instruction}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 shrink-0">
                      {section.marksBadge}
                    </span>
                  </div>

                  <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {section.questions.map((q) => (
                      <div key={q.id} className="p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-3 text-xs leading-relaxed">
                          <div>
                            <span className="font-bold mr-1.5">{q.number}</span>
                            <span>{q.text}</span>
                          </div>
                          {q.marks && (
                            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 shrink-0">
                              [{q.marks}m]
                            </span>
                          )}
                        </div>

                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5 text-[11px] text-neutral-700 dark:text-neutral-300">
                            {q.options.map((opt) => (
                              <div key={opt.id}>
                                <span className="font-semibold mr-1">{opt.label}</span>
                                <span>{opt.text}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {showAnswers && q.answerKey && (
                          <div className="ml-5 px-2.5 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-[11px] text-neutral-700 dark:text-neutral-300">
                            <span className="font-semibold text-neutral-900 dark:text-white mr-1">
                              Answer:
                            </span>
                            {q.answerKey}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenExactInEditor(pastPaper);
              }}
              className="px-3.5 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Open Exact Paper in Editor</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onUsePatternWithDifferentQuestions(pastPaper);
              }}
              className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Use Pattern (Different Questions)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
