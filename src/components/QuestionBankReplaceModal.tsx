import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Search, X } from 'lucide-react';
import { Question, ExamPaper, QuestionType } from '../types/exam';
import { BankQuestion, QuestionKind, buildBankQuestions } from '../services/paperComposer';
import { getBundledQuestionBanks, loadQuestionBanks, QuestionBank } from '../services/questionBank';
import { isSimilarToPastQuestion } from '../services/pastPaperPattern';

interface QuestionBankReplaceModalProps {
  paper: ExamPaper;
  question: Question;
  excludedQuestionTexts?: string[];
  onClose: () => void;
  onReplace: (replacement: Partial<Question>) => void;
}

function questionKind(type: QuestionType): QuestionKind | null {
  if (type === 'mcq' || type === 'short' || type === 'detailed') return type;
  return null;
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export const QuestionBankReplaceModal: React.FC<QuestionBankReplaceModalProps> = ({
  paper,
  question,
  excludedQuestionTexts = [],
  onClose,
  onReplace,
}) => {
  const [banks, setBanks] = useState<QuestionBank[]>(() => getBundledQuestionBanks());
  const [selectedBankId, setSelectedBankId] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    loadQuestionBanks()
      .then((loaded) => {
        if (!mounted) return;
        setBanks(loaded);
        const subject = (paper.header.subjectTitle || paper.title || '').toLowerCase();
        const preferred = subject
          ? loaded.find(
              (bank) =>
                subject.includes(bank.subjectName.toLowerCase()) ||
                bank.subjectName.toLowerCase().includes(subject)
            )
          : undefined;
        setSelectedBankId((current) =>
          current && loaded.some((bank) => bank.id === current)
            ? current
            : preferred?.id || loaded[0]?.id || ''
        );
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        console.error('Unable to load question banks for replacement:', error);
        setLoadError('Could not load the latest bank data. Showing bundled questions.');
        setSelectedBankId((current) => current || getBundledQuestionBanks()[0]?.id || '');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [paper.header.subjectTitle, paper.title]);

  const activeBank = banks.find((bank) => bank.id === selectedBankId);
  const targetKind = questionKind(question.type);
  const bankQuestions = useMemo(
    () => (activeBank ? buildBankQuestions(activeBank.units) : []),
    [activeBank]
  );
  const usedQuestionTexts = useMemo(
    () =>
      new Set(
        paper.sections.flatMap((section) =>
          section.questions.map((current) => normalizeText(current.text))
        )
      ),
    [paper.sections]
  );
  const visibleQuestions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return bankQuestions.filter((candidate) => {
      if (
        candidate.isFillInTheBlank ||
        !candidate.question.text.trim() ||
        candidate.kind !== targetKind
      ) {
        return false;
      }
      if (usedQuestionTexts.has(normalizeText(candidate.question.text))) return false;
      if (
        excludedQuestionTexts.length > 0 &&
        isSimilarToPastQuestion(candidate.question.text, excludedQuestionTexts)
      ) {
        return false;
      }
      if (!needle) return true;
      const optionText = (candidate.question.options || []).map((option) => option.text).join(' ');
      return [
        candidate.question.text,
        candidate.unitName,
        candidate.sectionType,
        optionText,
        candidate.question.answerKey || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [bankQuestions, excludedQuestionTexts, search, targetKind, usedQuestionTexts]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleReplace = (candidate: BankQuestion) => {
    onReplace({
      type: candidate.question.type,
      text: candidate.question.text,
      options: candidate.question.options,
      optionColumns: candidate.question.optionColumns,
      answerKey: candidate.question.answerKey,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-bank-replace-title"
        className="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-xl dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div>
            <h2 id="question-bank-replace-title" className="text-sm font-bold">
              Replace question from bank
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Choose a different {targetKind || 'supported'} question. The question number and marks
              will stay the same.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white"
            aria-label="Close question bank"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
              Question bank
              <select
                value={selectedBankId}
                onChange={(event) => setSelectedBankId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-black dark:text-white"
              >
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.subjectName} ({bank.classGrade}) ·{' '}
                    {bank.source === 'database' ? 'Firestore' : 'Bundled'}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
              Search questions or chapters
              <span className="mt-1 flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-2.5 dark:border-neutral-700 dark:bg-black">
                <Search className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search bank..."
                  className="w-full bg-transparent py-2 text-xs text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-white"
                />
              </span>
            </label>
          </div>
          {loadError && (
            <p className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {loadError}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {!targetKind ? (
            <p className="rounded-lg bg-neutral-50 p-4 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
              Bank replacement is currently available for MCQ, short-answer, and detailed questions.
            </p>
          ) : isLoading ? (
            <p className="flex items-center justify-center gap-2 p-8 text-xs text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading question banks…
            </p>
          ) : visibleQuestions.length === 0 ? (
            <p className="p-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
              No unused {targetKind} questions match this search in the selected bank.
            </p>
          ) : (
            <div className="space-y-2">
              {visibleQuestions.map((candidate) => (
                <button
                  key={candidate.key}
                  type="button"
                  onClick={() => handleReplace(candidate)}
                  className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-left transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-black dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
                >
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {candidate.unitName}
                  </span>
                  <span className="block text-xs leading-relaxed text-neutral-900 dark:text-neutral-100">
                    {candidate.question.text}
                  </span>
                  {candidate.question.options && (
                    <span className="mt-2 block text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                      {candidate.question.options
                        .map((option) => `${option.label} ${option.text}`)
                        .join(' · ')}
                    </span>
                  )}
                  {candidate.question.answerKey && (
                    <span className="mt-2 block text-[10px] text-neutral-500 dark:text-neutral-400">
                      Answer: {candidate.question.answerKey}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
