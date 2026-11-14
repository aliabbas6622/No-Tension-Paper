import React, { useEffect, useMemo, useState } from 'react';
import { ExamPaper, PastPaperPatternSeed } from '../types/exam';
import { QuestionBank, getBundledQuestionBanks, loadQuestionBanks } from '../services/questionBank';
import { refinePaperWithAI } from '../services/pastPaperPattern';
import {
  AlertCircle,
  Check,
  Database,
  Hammer,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

interface AIPaperRefinerModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper: ExamPaper;
  patternSeed?: PastPaperPatternSeed | null;
  onApplyRefinedPaper: (updatedPaper: ExamPaper, summary: string) => void;
  onSwitchToQuestionBank?: () => void;
}

interface EditTurn {
  id: string;
  instruction: string;
  summary: string;
  timestamp: string;
  previousPaperSnapshot: ExamPaper;
}

const QUICK_SUGGESTIONS = [
  'Replace two questions in a section with harder questions of the same type',
  'Balance MCQs across chapters in the selected question bank',
  'Make wording clearer and add concise answer keys where missing',
  'Replace fill-in-the-blanks with short-answer questions',
];

export const AIPaperRefinerModal: React.FC<AIPaperRefinerModalProps> = ({
  isOpen,
  onClose,
  paper,
  patternSeed = null,
  onApplyRefinedPaper,
  onSwitchToQuestionBank,
}) => {
  const [banks, setBanks] = useState<QuestionBank[]>(() => getBundledQuestionBanks());
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [sourceMode, setSourceMode] = useState<'database-first' | 'direct-ai'>('database-first');
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [bankLoadError, setBankLoadError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedInstruction, setFailedInstruction] = useState<string | null>(null);
  const [history, setHistory] = useState<EditTurn[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setErrorMsg(null);
    setFailedInstruction(null);
    setBankLoadError(null);
    setIsLoadingBanks(true);

    const matchBank = (list: QuestionBank[]) => {
      if (patternSeed?.questionBankId) {
        const bySeed = list.find((b) => b.id === patternSeed.questionBankId);
        if (bySeed) return bySeed.id;
      }
      const titleLower = (paper.header.subjectTitle || paper.title || '').toLowerCase();
      const bySubject = titleLower
        ? list.find(
            (b) =>
              titleLower.includes(b.subjectName.toLowerCase()) ||
              b.subjectName.toLowerCase().includes(titleLower)
          )
        : undefined;
      return bySubject?.id || list[0]?.id || '';
    };

    const bundled = getBundledQuestionBanks();
    setBanks(bundled);
    setSelectedBankId(matchBank(bundled));

    (async () => {
      try {
        const loaded = await loadQuestionBanks();
        if (!mounted) return;
        setBanks(loaded);
        setSelectedBankId(matchBank(loaded));
      } catch (error: unknown) {
        if (!mounted) return;
        console.error('Unable to load question banks for AI paper editing:', error);
        setBanks(bundled);
        setSelectedBankId(matchBank(bundled));
        setBankLoadError('Could not load the latest bank data. Using the bundled questions instead.');
      } finally {
        if (mounted) setIsLoadingBanks(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, paper.header.subjectTitle, paper.title, patternSeed]);

  useEffect(() => {
    if (!isOpen) {
      setHistory([]);
      setErrorMsg(null);
      setFailedInstruction(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setHistory([]);
    setErrorMsg(null);
    setFailedInstruction(null);
    setInstruction('');
  }, [paper.id]);

  useEffect(() => {
    if (!isOpen || isProcessing) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  const activeBank = useMemo(
    () => banks.find((b) => b.id === selectedBankId) || null,
    [banks, selectedBankId]
  );

  if (!isOpen) return null;

  const totalQuestions = paper.sections.reduce((sum, s) => sum + s.questions.length, 0);

  const handleRunEdit = async (customPrompt?: string) => {
    const promptToRun = (customPrompt ?? instruction).trim();
    if (!promptToRun || isProcessing) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setFailedInstruction(null);
    const snapshot: ExamPaper = JSON.parse(JSON.stringify(paper));

    try {
      const { updatedPaper, summary } = await refinePaperWithAI({
        paper,
        instruction: promptToRun,
        bank: activeBank,
        sourceMode,
        avoidQuestions: patternSeed?.excludedQuestionTexts || [],
      });

      setHistory((prev) => [
        {
          id: `turn-${Date.now()}`,
          instruction: promptToRun,
          summary,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          previousPaperSnapshot: snapshot,
        },
        ...prev,
      ]);
      if (!customPrompt || instruction.trim() === promptToRun) {
        setInstruction('');
      }
      onApplyRefinedPaper(updatedPaper, summary);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to apply AI edits right now. Please try again.'
      );
      setFailedInstruction(promptToRun);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndoTurn = (turn: EditTurn) => {
    if (history[0]?.id !== turn.id || isProcessing) return;
    onApplyRefinedPaper(turn.previousPaperSnapshot, `Reverted edit: "${turn.instruction}"`);
    setHistory((prev) => prev.filter((t) => t.id !== turn.id));
    setErrorMsg(null);
    setFailedInstruction(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-paper-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4 no-print"
    >
      <div className="bg-white border border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-900 dark:text-white">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Paper Editor &amp; Refiner</span>
            </div>
            <h2 id="ai-paper-editor-title" className="text-base font-bold tracking-tight truncate">
              Edit &ldquo;{paper.header.subjectTitle || paper.title}&rdquo; with AI
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {paper.sections.length} Sections · {totalQuestions} Questions · {paper.header.maxMarks} Marks — tell AI what to swap, adjust, or improve.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            title={isProcessing ? 'Wait for the current AI edit to finish' : 'Close AI Editor'}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900 transition cursor-pointer shrink-0"
            aria-label="Close AI Editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Strategy & Database Selection */}
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-black space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={sourceMode === 'database-first'}
                disabled={isProcessing}
                onClick={() => {
                  setSourceMode('database-first');
                  setErrorMsg(null);
                  setFailedInstruction(null);
                }}
                className={`p-2.5 rounded-lg border text-left transition flex items-start gap-2 cursor-pointer disabled:opacity-60 ${
                  sourceMode === 'database-first'
                    ? 'bg-white border-neutral-900 dark:bg-neutral-900 dark:border-white'
                    : 'bg-white/70 border-neutral-200 hover:border-neutral-400 dark:bg-neutral-950 dark:border-neutral-800'
                }`}
              >
                <Database className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Question bank first</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Prefer matching unused questions from the selected bank
                  </div>
                </div>
              </button>

              <button
                type="button"
                aria-pressed={sourceMode === 'direct-ai'}
                disabled={isProcessing}
                onClick={() => {
                  setSourceMode('direct-ai');
                  setErrorMsg(null);
                  setFailedInstruction(null);
                }}
                className={`p-2.5 rounded-lg border text-left transition flex items-start gap-2 cursor-pointer disabled:opacity-60 ${
                  sourceMode === 'direct-ai'
                    ? 'bg-white border-neutral-900 dark:bg-neutral-900 dark:border-white'
                    : 'bg-white/70 border-neutral-200 hover:border-neutral-400 dark:bg-neutral-950 dark:border-neutral-800'
                }`}
              >
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">AI authoring first</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Rewrite or create questions; the bank is an optional reference
                  </div>
                </div>
              </button>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              {banks.length > 0 ? (
                <label className="min-w-0 flex-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                  {sourceMode === 'database-first' ? 'Question bank' : 'Optional bank reference'}
                  <select
                    value={selectedBankId}
                    disabled={isProcessing || isLoadingBanks}
                    onChange={(event) => {
                      setSelectedBankId(event.target.value);
                      setErrorMsg(null);
                      setFailedInstruction(null);
                    }}
                    className="mt-1 w-full bg-white border border-neutral-300 text-neutral-900 dark:bg-neutral-950 dark:border-neutral-800 dark:text-white rounded-lg px-2.5 py-2 text-xs focus:outline-hidden disabled:opacity-60"
                  >
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.subjectName} ({bank.classGrade}) —{' '}
                        {bank.source === 'database' ? 'Firestore' : 'Bundled'}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block font-normal text-neutral-500 dark:text-neutral-400">
                    {isLoadingBanks
                      ? 'Loading the latest question banks…'
                      : sourceMode === 'database-first'
                        ? 'AI will use unused matching questions from this bank when possible.'
                        : 'AI can consult this bank but will prioritize writing or rewriting questions.'}
                  </span>
                </label>
              ) : (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  No question banks are available. AI authoring can still be used.
                </p>
              )}

              {onSwitchToQuestionBank && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    onClose();
                    onSwitchToQuestionBank();
                  }}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Hammer className="w-3 h-3" />
                  <span>Choose exact questions in Builder</span>
                </button>
              )}
            </div>
            {bankLoadError && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">{bankLoadError}</p>
            )}
          </div>

          {/* Instruction Composer */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-900 dark:text-white">
              Edit instructions
            </label>
            <textarea
              rows={3}
              value={instruction}
              disabled={isProcessing}
              onChange={(event) => {
                setInstruction(event.target.value);
                setErrorMsg(null);
                setFailedInstruction(null);
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleRunEdit();
                }
              }}
              placeholder="e.g. Replace MCQ ii with a harder unused question from Unit 3. Keep the section marks and other questions unchanged."
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 dark:bg-black dark:border-neutral-800 rounded-xl text-xs dark:text-white dark:placeholder-neutral-500 focus:outline-hidden dark:focus:border-white resize-y disabled:opacity-60"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Mention question numbers, section, question type, and whether to preserve marks. Press Ctrl/Cmd + Enter to apply.
              </span>
              <button
                type="button"
                aria-busy={isProcessing}
                disabled={isProcessing || !instruction.trim()}
                onClick={() => handleRunEdit()}
                className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 disabled:opacity-40 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Applying AI Edits...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Apply AI Edits</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Quick starters (click to fill the prompt):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    setInstruction(s);
                    setErrorMsg(null);
                    setFailedInstruction(null);
                  }}
                  className="px-2.5 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-300 rounded-lg text-[11px] text-left transition cursor-pointer disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {isProcessing && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              AI is editing your paper. Your current paper stays unchanged until the edit succeeds.
            </div>
          )}

          {/* Error Banner with Retry */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50 text-xs flex flex-wrap items-center justify-between gap-2 text-red-800 dark:text-red-200">
              <div className="flex items-start gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                disabled={isProcessing || !failedInstruction || instruction.trim() !== failedInstruction}
                onClick={() => failedInstruction && handleRunEdit(failedInstruction)}
                className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded-md text-[11px] font-semibold cursor-pointer shrink-0"
              >
                Retry same edit
              </button>
            </div>
          )}

          {/* Session Edit History with Undo */}
          {history.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Applied AI Edits ({history.length})
              </div>
              <div className="space-y-2">
                {history.map((turn, index) => (
                  <div
                    key={turn.id}
                    className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-black space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="break-words">{turn.instruction}</span>
                      </div>
                      <button
                        type="button"
                        disabled={index !== 0 || isProcessing}
                        onClick={() => handleUndoTurn(turn)}
                        className="px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-medium flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title={index === 0 ? 'Undo the latest AI edit' : 'Undo the latest edit first'}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{index === 0 ? 'Undo latest' : 'Undo'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                      {turn.summary} · <span className="font-mono">{turn.timestamp}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Successful edits appear in the paper preview.
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Applying edit…' : 'Back to Paper Preview'}
          </button>
        </div>
      </div>
    </div>
  );
};
