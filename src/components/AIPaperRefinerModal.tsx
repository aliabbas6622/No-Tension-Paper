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
  'Replace the 2 easiest questions in Section B with more conceptual questions from my database',
  'Swap Section A MCQs to ensure even coverage across all chapters',
  'Make wording clearer and add concise answer keys where missing',
  'Focus Section C detailed questions more on core architecture and networking concepts',
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<EditTurn[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setErrorMsg(null);

    const matchBank = (list: QuestionBank[]) => {
      if (patternSeed?.questionBankId) {
        const bySeed = list.find((b) => b.id === patternSeed.questionBankId);
        if (bySeed) return bySeed.id;
      }
      const titleLower = (paper.header.subjectTitle || paper.title || '').toLowerCase();
      const bySubject = list.find(
        (b) =>
          titleLower.includes(b.subjectName.toLowerCase()) ||
          b.subjectName.toLowerCase().includes(titleLower)
      );
      return bySubject?.id || list[0]?.id || '';
    };

    const bundled = getBundledQuestionBanks();
    setBanks(bundled);
    setSelectedBankId((prev) => prev || matchBank(bundled));

    (async () => {
      const loaded = await loadQuestionBanks();
      if (!mounted) return;
      setBanks(loaded);
      setSelectedBankId((prev) => {
        if (prev && loaded.some((b) => b.id === prev)) return prev;
        return matchBank(loaded);
      });
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, paper.header.subjectTitle, paper.title, patternSeed]);

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
      if (!customPrompt) {
        setInstruction('');
      }
      onApplyRefinedPaper(updatedPaper, summary);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to apply AI edits right now. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndoTurn = (turn: EditTurn) => {
    onApplyRefinedPaper(turn.previousPaperSnapshot, `Reverted edit: "${turn.instruction}"`);
    setHistory((prev) => prev.filter((t) => t.id !== turn.id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4 no-print">
      <div className="bg-white border border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-900 dark:text-white">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Paper Editor &amp; Refiner</span>
            </div>
            <h2 className="text-base font-bold tracking-tight truncate">
              Edit &ldquo;{paper.header.subjectTitle || paper.title}&rdquo; with AI
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {paper.sections.length} Sections · {totalQuestions} Questions · {paper.header.maxMarks} Marks — tell AI what to swap, adjust, or improve.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
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
                onClick={() => setSourceMode('database-first')}
                className={`p-2.5 rounded-lg border text-left transition flex items-start gap-2 cursor-pointer ${
                  sourceMode === 'database-first'
                    ? 'bg-white border-neutral-900 dark:bg-neutral-900 dark:border-white'
                    : 'bg-white/70 border-neutral-200 hover:border-neutral-400 dark:bg-neutral-950 dark:border-neutral-800'
                }`}
              >
                <Database className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Manage via My Database</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Swaps &amp; adds real questions from your DB first
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSourceMode('direct-ai')}
                className={`p-2.5 rounded-lg border text-left transition flex items-start gap-2 cursor-pointer ${
                  sourceMode === 'direct-ai'
                    ? 'bg-white border-neutral-900 dark:bg-neutral-900 dark:border-white'
                    : 'bg-white/70 border-neutral-200 hover:border-neutral-400 dark:bg-neutral-950 dark:border-neutral-800'
                }`}
              >
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Direct AI Rewrite / Author</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Rewords or creates custom questions directly
                  </div>
                </div>
              </button>
            </div>

            {banks.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 dark:text-neutral-400">Database Bank:</span>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="bg-white border border-neutral-300 text-neutral-900 dark:bg-neutral-950 dark:border-neutral-800 dark:text-white rounded-lg px-2.5 py-1 text-xs focus:outline-hidden"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.subjectName} ({b.classGrade}) — {b.source === 'database' ? 'Firestore' : 'Bundled'}
                      </option>
                    ))}
                  </select>
                </div>

                {onSwitchToQuestionBank && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSwitchToQuestionBank();
                    }}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                  >
                    <Hammer className="w-3 h-3" />
                    <span>Reselect Manually in Question Bank</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Instruction Composer */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-900 dark:text-white">
              Tell AI what to edit on your paper
            </label>
            <textarea
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleRunEdit();
                }
              }}
              placeholder="e.g. Replace question ii and v in Section A with harder MCQs from Unit 3, and make Section B short questions focus more on Operating Systems..."
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 dark:bg-black dark:border-neutral-800 rounded-xl text-xs dark:text-white dark:placeholder-neutral-500 focus:outline-hidden dark:focus:border-white resize-y"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Press Ctrl/Cmd + Enter to apply · Live Preview updates immediately
              </span>
              <button
                type="button"
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
              Quick edit ideas:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInstruction(s)}
                  className="px-2.5 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-300 rounded-lg text-[11px] text-left transition cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner with Retry */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50 text-xs flex flex-wrap items-center justify-between gap-2 text-red-800 dark:text-red-200">
              <div className="flex items-start gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                disabled={isProcessing || !instruction.trim()}
                onClick={() => handleRunEdit()}
                className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded-md text-[11px] font-semibold cursor-pointer shrink-0"
              >
                Retry
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
                {history.map((turn) => (
                  <div
                    key={turn.id}
                    className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-black space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{turn.instruction}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUndoTurn(turn)}
                        className="px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-medium flex items-center gap-1 shrink-0 cursor-pointer"
                        title="Revert this AI edit"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Undo</span>
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
            Changes update your Paper Preview live.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Back to Paper Preview
          </button>
        </div>
      </div>
    </div>
  );
};
