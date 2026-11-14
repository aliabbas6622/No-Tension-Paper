import React, { useEffect, useMemo, useState } from 'react';
import { ExamPaper } from '../types/exam';
import { QuestionBank, loadQuestionBanks } from '../services/questionBank';
import { BankQuestion, QuestionKind, buildBankQuestions } from '../services/paperComposer';
import {
  BlueprintSelectionResult,
  ChapterWeightConfig,
  DEFAULT_SECTION_BLUEPRINTS,
  SectionBlueprintConfig,
  SelectedReviewQuestion,
  SelectionEngine,
  buildPaperFromReview,
  selectQuestionsPreWeighted,
  selectQuestionsWithAI,
} from '../services/blueprintSelection';
import { AppMode, ModeSwitcher } from './ModeSwitcher';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckSquare,
  Cpu,
  Database,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Minus,
  PenLine,
  Plus,
  RefreshCw,
  Scale,
  Shuffle,
  Square,
  Trash2,
} from 'lucide-react';

interface AutoBlueprintModeProps {
  currentPaper: ExamPaper;
  onApplyPaperToEditor: (updatedPaper: ExamPaper, meta: { count: number; mode: 'replace' | 'append'; engine: SelectionEngine }) => void;
  onSwitchMode: (mode: AppMode) => void;
  onOpenDashboard: () => void;
}

type BlueprintStep = 'configure' | 'review';

const SECTION_PRESETS: Array<{
  label: string;
  counts: Record<QuestionKind, number>;
}> = [
  { label: 'Board Standard (10 / 6 / 2)', counts: { mcq: 10, short: 6, detailed: 2 } },
  { label: 'Midterm (15 / 5 / 2)', counts: { mcq: 15, short: 5, detailed: 2 } },
  { label: 'Quick Quiz (10 / 3 / 0)', counts: { mcq: 10, short: 3, detailed: 0 } },
];

const AI_FOCUS_SUGGESTIONS = [
  'Balanced easy-to-challenging difficulty with clear conceptual coverage',
  'Focus on practical scenarios, logic, and application over pure memorization',
  'Cover core definitions and high-yield board exam questions evenly',
];

const KIND_LABELS: Record<QuestionKind, string> = {
  mcq: 'MCQ',
  short: 'Short',
  detailed: 'Detailed',
};

export const AutoBlueprintMode: React.FC<AutoBlueprintModeProps> = ({
  currentPaper,
  onApplyPaperToEditor,
  onSwitchMode,
  onOpenDashboard,
}) => {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [activeBankId, setActiveBankId] = useState<string>('');

  const [step, setStep] = useState<BlueprintStep>('configure');
  const [chapters, setChapters] = useState<ChapterWeightConfig[]>([]);
  const [sectionConfigs, setSectionConfigs] = useState<SectionBlueprintConfig[]>(() =>
    DEFAULT_SECTION_BLUEPRINTS.map((s) => ({ ...s }))
  );

  const [engine, setEngine] = useState<SelectionEngine>('weighted');
  const [focusPrompt, setFocusPrompt] = useState<string>('');
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [result, setResult] = useState<BlueprintSelectionResult | null>(null);
  const [reviewedItems, setReviewedItems] = useState<SelectedReviewQuestion[]>([]);

  const [showAnswers, setShowAnswers] = useState(true);
  const [swapPickerReviewId, setSwapPickerReviewId] = useState<string | null>(null);
  const [addKindDrawer, setAddKindDrawer] = useState<QuestionKind | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const loaded = await loadQuestionBanks();
      if (!mounted) return;
      setBanks(loaded);
      setActiveBankId((prev) => prev || loaded[0]?.id || '');
      setIsLoadingBanks(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const activeBank = useMemo(
    () => banks.find((b) => b.id === activeBankId) || null,
    [banks, activeBankId]
  );

  const allBankQuestions = useMemo(
    () => (activeBank ? buildBankQuestions(activeBank.units) : []),
    [activeBank]
  );

  // Initialize chapter selection + equal weights whenever bank changes
  useEffect(() => {
    if (!activeBank) {
      setChapters([]);
      return;
    }

    const nextChapters: ChapterWeightConfig[] = activeBank.units.map((unit, unitIndex) => {
      const unitQuestions = allBankQuestions.filter((q) => q.unitIndex === unitIndex);
      const available: Record<QuestionKind, number> = { mcq: 0, short: 0, detailed: 0 };
      unitQuestions.forEach((q) => {
        available[q.kind] += 1;
      });
      return {
        unitIndex,
        unitName: unit.unit,
        selected: true,
        weight: 100,
        available,
      };
    });

    // Normalize initial weights cleanly to equal share summing ~100
    const equalWeight = nextChapters.length > 0 ? Math.round(100 / nextChapters.length) : 100;
    setChapters(
      nextChapters.map((c) => ({
        ...c,
        weight: equalWeight,
      }))
    );
    setResult(null);
    setReviewedItems([]);
    setStep('configure');
    setSelectionError(null);
    setSwapPickerReviewId(null);
    setAddKindDrawer(null);
  }, [activeBank, allBankQuestions]);

  const selectedChapters = useMemo(
    () => chapters.filter((c) => c.selected),
    [chapters]
  );

  const availableByKind = useMemo(() => {
    const totals: Record<QuestionKind, number> = { mcq: 0, short: 0, detailed: 0 };
    selectedChapters.forEach((c) => {
      totals.mcq += c.available.mcq;
      totals.short += c.available.short;
      totals.detailed += c.available.detailed;
    });
    return totals;
  }, [selectedChapters]);

  const totalWeightSum = useMemo(
    () => selectedChapters.reduce((sum, c) => sum + Math.max(0, c.weight), 0),
    [selectedChapters]
  );

  const normalizedChapterShare = (ch: ChapterWeightConfig): number => {
    if (!ch.selected) return 0;
    if (selectedChapters.length === 0) return 0;
    if (totalWeightSum <= 0) return Math.round(100 / selectedChapters.length);
    return Math.round((Math.max(0, ch.weight) / totalWeightSum) * 100);
  };

  const totalRequestedQuestions = useMemo(
    () => sectionConfigs.reduce((sum, s) => sum + Math.max(0, s.count), 0),
    [sectionConfigs]
  );

  const totalConfiguredMarks = useMemo(
    () =>
      sectionConfigs.reduce(
        (sum, s) => sum + Math.max(0, s.count) * Math.max(1, s.marksPerQuestion),
        0
      ),
    [sectionConfigs]
  );

  const toggleChapter = (unitIndex: number) => {
    setChapters((prev) =>
      prev.map((c) => (c.unitIndex === unitIndex ? { ...c, selected: !c.selected } : c))
    );
  };

  const selectAllChapters = (selected: boolean) => {
    setChapters((prev) => prev.map((c) => ({ ...c, selected })));
  };

  const updateChapterWeight = (unitIndex: number, rawVal: number) => {
    const clamped = Math.max(0, Math.min(100, Number.isFinite(rawVal) ? rawVal : 0));
    setChapters((prev) =>
      prev.map((c) => (c.unitIndex === unitIndex ? { ...c, weight: clamped } : c))
    );
  };

  const applyEqualWeights = () => {
    const count = Math.max(1, selectedChapters.length);
    const each = Math.max(1, Math.round(100 / count));
    setChapters((prev) =>
      prev.map((c) => (c.selected ? { ...c, weight: each } : c))
    );
  };

  const applyProportionalWeightsBySize = () => {
    const activeTotal = selectedChapters.reduce(
      (sum, c) => sum + c.available.mcq + c.available.short + c.available.detailed,
      0
    );
    if (activeTotal <= 0) {
      applyEqualWeights();
      return;
    }
    setChapters((prev) =>
      prev.map((c) => {
        if (!c.selected) return c;
        const size = c.available.mcq + c.available.short + c.available.detailed;
        return {
          ...c,
          weight: Math.max(1, Math.round((size / activeTotal) * 100)),
        };
      })
    );
  };

  const updateSectionCount = (kind: QuestionKind, nextCount: number) => {
    const maxAllowed = availableByKind[kind];
    const safeVal = Math.max(0, Math.min(maxAllowed, Math.floor(nextCount || 0)));
    setSectionConfigs((prev) =>
      prev.map((s) => (s.kind === kind ? { ...s, count: safeVal } : s))
    );
  };

  const updateSectionMarks = (kind: QuestionKind, nextMarks: number) => {
    const safeMarks = Math.max(1, Math.floor(nextMarks || 1));
    setSectionConfigs((prev) =>
      prev.map((s) => (s.kind === kind ? { ...s, marksPerQuestion: safeMarks } : s))
    );
  };

  const applyPreset = (counts: Record<QuestionKind, number>) => {
    setSectionConfigs((prev) =>
      prev.map((s) => ({
        ...s,
        count: Math.min(availableByKind[s.kind], counts[s.kind]),
      }))
    );
  };

  const runSelection = async (overrideEngine?: SelectionEngine) => {
    if (!activeBank) return;
    if (selectedChapters.length === 0) {
      setSelectionError('Select at least one chapter before generating questions.');
      return;
    }
    if (totalRequestedQuestions <= 0) {
      setSelectionError('Set at least 1 question across Section A, B, or C.');
      return;
    }

    const activeEngine = overrideEngine || engine;
    setEngine(activeEngine);
    setSelectionError(null);
    setIsSelecting(true);
    setSwapPickerReviewId(null);
    setAddKindDrawer(null);

    try {
      let selectionResult: BlueprintSelectionResult;
      if (activeEngine === 'ai') {
        selectionResult = await selectQuestionsWithAI({
          bank: activeBank,
          allBankQuestions,
          chapters,
          sections: sectionConfigs,
          focusPrompt,
        });
      } else {
        selectionResult = selectQuestionsPreWeighted({
          allBankQuestions,
          chapters,
          sections: sectionConfigs,
        });
      }

      setResult(selectionResult);
      setReviewedItems(selectionResult.selected);
      setStep('review');
    } catch (err: unknown) {
      setSelectionError(
        err instanceof Error ? err.message : 'Unable to select questions right now.'
      );
    } finally {
      setIsSelecting(false);
    }
  };

  // Review helpers
  const usedKeysSet = useMemo(
    () => new Set(reviewedItems.map((item) => item.bankQuestion.key)),
    [reviewedItems]
  );

  const unusedCandidatesByKind = useMemo(() => {
    const activeSet = new Set(selectedChapters.map((c) => c.unitIndex));
    const map: Record<QuestionKind, BankQuestion[]> = { mcq: [], short: [], detailed: [] };
    allBankQuestions.forEach((bq) => {
      if (activeSet.has(bq.unitIndex) && !usedKeysSet.has(bq.key)) {
        map[bq.kind].push(bq);
      }
    });
    return map;
  }, [allBankQuestions, selectedChapters, usedKeysSet]);

  const handleQuickSwap = (reviewId: string) => {
    const target = reviewedItems.find((i) => i.reviewId === reviewId);
    if (!target) return;
    const pool = unusedCandidatesByKind[target.bankQuestion.kind];
    if (pool.length === 0) return;
    const replacement = pool[Math.floor(Math.random() * pool.length)];

    setReviewedItems((prev) =>
      prev.map((item) =>
        item.reviewId === reviewId
          ? {
              ...item,
              bankQuestion: replacement,
              tag: 'Swapped',
              reason: 'Replaced with another question from selected chapters.',
            }
          : item
      )
    );
    if (swapPickerReviewId === reviewId) {
      setSwapPickerReviewId(null);
    }
  };

  const handleSpecificSwap = (reviewId: string, replacement: BankQuestion) => {
    setReviewedItems((prev) =>
      prev.map((item) =>
        item.reviewId === reviewId
          ? {
              ...item,
              bankQuestion: replacement,
              tag: 'Manual Swap',
              reason: 'Selected by reviewer.',
            }
          : item
      )
    );
    setSwapPickerReviewId(null);
  };

  const handleRemoveReviewedItem = (reviewId: string) => {
    setReviewedItems((prev) => prev.filter((item) => item.reviewId !== reviewId));
    if (swapPickerReviewId === reviewId) {
      setSwapPickerReviewId(null);
    }
  };

  const handleAddExtraQuestion = (kind: QuestionKind, bq: BankQuestion) => {
    const secCfg = sectionConfigs.find((s) => s.kind === kind);
    const marks = secCfg?.marksPerQuestion ?? bq.question.marks ?? 1;
    setReviewedItems((prev) => [
      ...prev,
      {
        reviewId: `rev-extra-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        bankQuestion: bq,
        marks,
        tag: 'Added',
        reason: 'Added during review.',
      },
    ]);
  };

  const handleMoveWithinKind = (reviewId: string, direction: -1 | 1) => {
    setReviewedItems((prev) => {
      const target = prev.find((i) => i.reviewId === reviewId);
      if (!target) return prev;
      const sameKindIndices = prev
        .map((item, idx) => (item.bankQuestion.kind === target.bankQuestion.kind ? idx : -1))
        .filter((idx) => idx >= 0);

      const posInKind = sameKindIndices.findIndex((idx) => prev[idx].reviewId === reviewId);
      const nextPosInKind = posInKind + direction;
      if (posInKind < 0 || nextPosInKind < 0 || nextPosInKind >= sameKindIndices.length) {
        return prev;
      }

      const idxA = sameKindIndices[posInKind];
      const idxB = sameKindIndices[nextPosInKind];
      const copy = [...prev];
      [copy[idxA], copy[idxB]] = [copy[idxB], copy[idxA]];
      return copy;
    });
  };

  const handleTakeToEditor = () => {
    if (!activeBank || reviewedItems.length === 0) return;
    const updatedPaper = buildPaperFromReview({
      basePaper: currentPaper,
      bank: activeBank,
      reviewedItems,
      sectionConfigs,
      applyMode,
    });
    onApplyPaperToEditor(updatedPaper, {
      count: reviewedItems.length,
      mode: applyMode,
      engine: result?.engine || engine,
    });
  };

  const reviewedTotalMarks = useMemo(
    () => reviewedItems.reduce((sum, item) => sum + (item.marks || 0), 0),
    [reviewedItems]
  );

  const chapterDistributionStats = useMemo(() => {
    const totalCount = Math.max(1, reviewedItems.length);
    return selectedChapters.map((ch) => {
      const chItems = reviewedItems.filter((i) => i.bankQuestion.unitIndex === ch.unitIndex);
      const chMarks = chItems.reduce((sum, i) => sum + (i.marks || 0), 0);
      return {
        unitIndex: ch.unitIndex,
        unitName: ch.unitName,
        targetPct: normalizedChapterShare(ch),
        selectedCount: chItems.length,
        actualPct: reviewedItems.length > 0 ? Math.round((chItems.length / totalCount) * 100) : 0,
        marks: chMarks,
      };
    });
  }, [reviewedItems, selectedChapters, totalWeightSum]);

  const toRoman = (idx: number) => {
    const romans = [
      'i.', 'ii.', 'iii.', 'iv.', 'v.', 'vi.', 'vii.', 'viii.', 'ix.', 'x.',
      'xi.', 'xii.', 'xiii.', 'xiv.', 'xv.', 'xvi.', 'xvii.', 'xviii.', 'xix.', 'xx.',
    ];
    return romans[idx] || `${idx + 1}.`;
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-black text-white">
      {/* Top Bar */}
      <header className="h-12 shrink-0 border-b border-neutral-800 bg-black flex items-center justify-between px-3 sm:px-4 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenDashboard}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition cursor-pointer shrink-0"
            title="Return to Dashboard / Home"
          >
            <Home className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-neutral-800 shrink-0" />
          <ModeSwitcher active="auto" onChange={onSwitchMode} />
        </div>

        {/* Clean Step Indicator */}
        <div className="hidden md:flex items-center gap-2 text-[11px] font-medium shrink-0">
          <button
            type="button"
            onClick={() => setStep('configure')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap transition cursor-pointer ${
              step === 'configure'
                ? 'bg-neutral-900 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            01. Chapters &amp; Counts
          </button>
          <span className="text-neutral-600">/</span>
          <button
            type="button"
            disabled={reviewedItems.length === 0}
            onClick={() => reviewedItems.length > 0 && setStep('review')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap transition ${
              step === 'review'
                ? 'bg-neutral-900 text-white border border-neutral-700'
                : reviewedItems.length > 0
                ? 'text-neutral-400 hover:text-white cursor-pointer'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
          >
            02. Review &amp; Swap
          </button>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-500 whitespace-nowrap">03. Editor</span>
        </div>
      </header>

      {isLoadingBanks ? (
        <div className="flex-1 flex items-center justify-center text-neutral-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading curriculum question banks...</span>
        </div>
      ) : banks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <Database className="w-6 h-6 text-neutral-600" />
          <div className="text-sm font-semibold text-white">No question bank available</div>
          <p className="text-xs text-neutral-400 max-w-sm">
            Import a curriculum JSON using Subject Adder on the Dashboard first, then return here to generate weighted or AI-selected papers.
          </p>
          <button
            onClick={onOpenDashboard}
            className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-lg hover:bg-neutral-200 cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      ) : step === 'configure' ? (
        /* STAGE 1: CONFIGURE CHAPTERS, COUNTS & SELECTION MODE */
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* Left Sidebar: Subject & Chapter Selection + Weightage */}
            <aside className="w-full lg:w-88 shrink-0 border-b lg:border-b-0 lg:border-r border-neutral-800 bg-black flex flex-col max-h-[44vh] lg:max-h-none min-h-0">
              <div className="p-4 border-b border-neutral-800 space-y-2.5 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-semibold text-neutral-300">
                    Subject Question Bank
                  </label>
                  {activeBank && (
                    <span className="text-[11px] text-neutral-500 font-mono tabular-nums">
                      {activeBank.source === 'database' ? 'Firestore' : 'Bundled'}
                    </span>
                  )}
                </div>
                <select
                  value={activeBankId}
                  onChange={(e) => setActiveBankId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                >
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.subjectName} ({bank.classGrade}) — {bank.units.length} chapters
                    </option>
                  ))}
                </select>
              </div>

              <div className="px-4 py-2.5 border-b border-neutral-900 flex items-center justify-between gap-2 shrink-0">
                <div className="text-xs font-semibold text-white">
                  Chapters ({selectedChapters.length}/{chapters.length})
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => selectAllChapters(true)}
                    className="px-2 py-1 text-neutral-300 hover:text-white hover:bg-neutral-900 rounded cursor-pointer whitespace-nowrap"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => selectAllChapters(false)}
                    className="px-2 py-1 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded cursor-pointer whitespace-nowrap"
                  >
                    None
                  </button>
                  <span className="text-neutral-700">|</span>
                  <button
                    type="button"
                    onClick={applyEqualWeights}
                    className="px-2 py-1 text-neutral-300 hover:text-white hover:bg-neutral-900 rounded cursor-pointer whitespace-nowrap"
                    title="Set equal percentage weights across selected chapters"
                  >
                    Equal %
                  </button>
                  <button
                    type="button"
                    onClick={applyProportionalWeightsBySize}
                    className="px-2 py-1 text-neutral-300 hover:text-white hover:bg-neutral-900 rounded cursor-pointer whitespace-nowrap"
                    title="Weight chapters proportionally by question count"
                  >
                    By Size
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chapters.map((ch) => {
                  const sharePct = normalizedChapterShare(ch);
                  const totalAvail = ch.available.mcq + ch.available.short + ch.available.detailed;
                  return (
                    <div
                      key={ch.unitIndex}
                      className={`p-3 rounded-xl border transition ${
                        ch.selected
                          ? 'bg-neutral-950 border-neutral-700'
                          : 'bg-black border-neutral-900 opacity-60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleChapter(ch.unitIndex)}
                        className="w-full flex items-start gap-2.5 text-left cursor-pointer"
                      >
                        <div className="pt-0.5 shrink-0">
                          {ch.selected ? (
                            <CheckSquare className="w-4 h-4 text-white" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white leading-snug">
                            {ch.unitName}
                          </div>
                          <div className="mt-1 text-[11px] text-neutral-400 font-mono tabular-nums">
                            {ch.available.mcq} MCQ · {ch.available.short} Short · {ch.available.detailed} Long ({totalAvail})
                          </div>
                        </div>
                      </button>

                      {ch.selected && (
                        <div className="mt-2.5 pt-2.5 border-t border-neutral-900 flex items-center gap-2.5">
                          <span className="text-[11px] text-neutral-400 shrink-0">Weight</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={ch.weight}
                            onChange={(e) =>
                              updateChapterWeight(ch.unitIndex, Number(e.target.value))
                            }
                            aria-label={`Weight for ${ch.unitName}`}
                            className="flex-1 accent-white cursor-pointer"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={ch.weight}
                              onChange={(e) =>
                                updateChapterWeight(ch.unitIndex, Number(e.target.value))
                              }
                              className="w-12 bg-black border border-neutral-800 rounded px-1.5 py-0.5 text-[11px] font-mono tabular-nums text-right text-white focus:outline-none focus:border-white"
                            />
                            <span className="text-[11px] text-neutral-500 font-mono tabular-nums w-9 text-right">
                              ({sharePct}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Right Main Panel: Section Question Counts + Selection Strategy */}
            <section className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Section Blueprint Config */}
              <div className="max-w-4xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Section Question Counts
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Choose how many questions to pick from the {selectedChapters.length} selected chapters for each section.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {SECTION_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPreset(preset.counts)}
                        className="px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 rounded-lg text-[11px] text-neutral-300 hover:text-white transition cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl bg-neutral-950 overflow-hidden">
                  {sectionConfigs.map((sec) => {
                    const maxAvail = availableByKind[sec.kind];
                    const sectionSubtotal = sec.count * sec.marksPerQuestion;
                    return (
                      <div
                        key={sec.kind}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-semibold text-white">
                            {sec.sectionName} · {sec.label}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono tabular-nums">
                            Available in selected chapters: {maxAvail} · Section Marks: {sectionSubtotal}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 shrink-0">
                          {/* Question Count Stepper */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-neutral-400">Questions</span>
                            <div className="inline-flex items-center border border-neutral-800 rounded-lg bg-black">
                              <button
                                type="button"
                                onClick={() => updateSectionCount(sec.kind, sec.count - 1)}
                                disabled={sec.count <= 0}
                                className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-30 cursor-pointer"
                                aria-label={`Decrease ${sec.label} count`}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={maxAvail}
                                value={sec.count}
                                onChange={(e) =>
                                  updateSectionCount(sec.kind, Number(e.target.value))
                                }
                                className="w-12 bg-transparent text-center text-xs font-mono font-semibold tabular-nums text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateSectionCount(sec.kind, sec.count + 1)}
                                disabled={sec.count >= maxAvail}
                                className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-30 cursor-pointer"
                                aria-label={`Increase ${sec.label} count`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Marks per Question */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-neutral-400">Marks each</span>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={sec.marksPerQuestion}
                              onChange={(e) =>
                                updateSectionMarks(sec.kind, Number(e.target.value))
                              }
                              className="w-14 px-2 py-1.5 bg-black border border-neutral-800 rounded-lg text-xs font-mono tabular-nums text-right text-white focus:outline-none focus:border-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selection Strategy: Pre-Weighted vs AI */}
              <div className="max-w-4xl space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Selection Strategy
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Pick questions using your chapter weightage distribution or let Gemini AI curate a balanced paper.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEngine('weighted')}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                      engine === 'weighted'
                        ? 'bg-neutral-900 border-white text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        engine === 'weighted' ? 'bg-white text-black' : 'bg-neutral-900 text-white'
                      }`}
                    >
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-white">
                        Pre-Weighted Blueprint
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        Draws questions strictly proportional to each chapter&apos;s percentage weight using balanced quota apportionment. Instant and deterministic.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEngine('ai')}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                      engine === 'ai'
                        ? 'bg-neutral-900 border-white text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        engine === 'ai' ? 'bg-white text-black' : 'bg-neutral-900 text-white'
                      }`}
                    >
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-white">
                        AI Smart Selection
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        Gemini analyzes the candidate pool to maximize topic diversity, avoid redundant concepts, balance difficulty, and tag each selected question.
                      </p>
                    </div>
                  </button>
                </div>

                {engine === 'ai' && (
                  <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-white">
                        Focus &amp; Difficulty Guidance (Optional)
                      </label>
                      <span className="text-[11px] text-neutral-500">
                        Considers chapter weights &amp; section counts automatically
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={focusPrompt}
                      onChange={(e) => setFocusPrompt(e.target.value)}
                      placeholder="e.g. Emphasize logic gates and networking concepts; avoid overlapping questions across Section A and B..."
                      className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white resize-y"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {AI_FOCUS_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setFocusPrompt(suggestion)}
                          className="px-2.5 py-1 bg-black hover:bg-neutral-900 border border-neutral-800 rounded-md text-[11px] text-neutral-400 hover:text-white transition cursor-pointer text-left"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectionError && (
                  <div className="p-3.5 bg-neutral-900 border border-neutral-700 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5 text-neutral-200">
                      <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
                      <span>{selectionError}</span>
                    </div>
                    {engine === 'ai' && (
                      <button
                        type="button"
                        onClick={() => runSelection('weighted')}
                        className="px-3 py-1.5 bg-white text-black font-semibold rounded-lg text-[11px] hover:bg-neutral-200 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Use Pre-Weighted Instead
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sticky Bottom Action Bar (Stage 1) */}
          <footer className="shrink-0 border-t border-neutral-800 bg-black px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-neutral-400 font-mono tabular-nums flex flex-wrap items-center gap-3">
              <span className="text-white font-semibold">
                {totalRequestedQuestions} Questions · {totalConfiguredMarks} Marks
              </span>
              <span>·</span>
              <span>
                {selectedChapters.length} of {chapters.length} chapters selected
              </span>
              <span>·</span>
              <span>{engine === 'ai' ? 'AI Smart Selection' : 'Pre-Weighted'}</span>
            </div>

            <button
              type="button"
              onClick={() => runSelection()}
              disabled={
                isSelecting || selectedChapters.length === 0 || totalRequestedQuestions <= 0
              }
              className="px-5 py-2 bg-white text-black font-semibold text-xs rounded-lg hover:bg-neutral-200 disabled:opacity-40 transition flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              {isSelecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {engine === 'ai' ? 'AI Selecting Questions...' : 'Selecting Questions...'}
                  </span>
                </>
              ) : (
                <>
                  <span>Select Questions &amp; Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </footer>
        </div>
      ) : (
        /* STAGE 2: REVIEW SELECTED QUESTIONS, SWAP & TAKE TO EDITOR */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Review Toolbar */}
          <div className="shrink-0 border-b border-neutral-800 bg-neutral-950 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setStep('configure')}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs text-white rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Adjust Blueprint</span>
              </button>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  Review Selected Paper — {result?.engine === 'ai' ? 'AI Curated' : 'Pre-Weighted'}
                </div>
                <div className="text-[11px] text-neutral-400 truncate">
                  {result?.rationale}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAnswers((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  showAnswers
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {showAnswers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Answers</span>
              </button>

              <button
                type="button"
                onClick={() => runSelection()}
                disabled={isSelecting}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white text-[11px] font-medium rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSelecting ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Shortfall notice if bank had fewer items than requested */}
            {result && result.shortfalls.length > 0 && (
              <div className="max-w-5xl mx-auto p-3.5 bg-neutral-900 border border-neutral-700 rounded-xl flex items-start gap-2.5 text-xs text-neutral-200">
                <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <div>
                  Some sections filled fewer questions than requested because the selected chapters contain fewer available questions:{' '}
                  {result.shortfalls
                    .map((s) => `${KIND_LABELS[s.kind]} (${s.filled}/${s.requested})`)
                    .join(', ')}.
                </div>
              </div>
            )}

            {/* Chapter Coverage Distribution */}
            <div className="max-w-5xl mx-auto border border-neutral-800 rounded-xl bg-neutral-950 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-white">
                  Chapter Weightage vs. Selected Coverage
                </h3>
                <span className="text-[11px] text-neutral-400 font-mono tabular-nums">
                  {reviewedItems.length} Questions · {reviewedTotalMarks} Total Marks
                </span>
              </div>
              <div className="divide-y divide-neutral-900">
                {chapterDistributionStats.map((stat) => (
                  <div
                    key={stat.unitIndex}
                    className="px-4 py-2.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <span className="text-neutral-200 truncate">{stat.unitName}</span>
                    <div className="flex items-center gap-4 text-[11px] font-mono tabular-nums shrink-0 text-neutral-400">
                      <span>Target: {stat.targetPct}%</span>
                      <span className="text-white font-semibold">
                        Selected: {stat.selectedCount} ({stat.actualPct}%)
                      </span>
                      <span>{stat.marks} Marks</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section-by-Section Questions Review */}
            <div className="max-w-5xl mx-auto space-y-6">
              {sectionConfigs.map((secCfg) => {
                const items = reviewedItems.filter(
                  (item) => item.bankQuestion.kind === secCfg.kind
                );
                const unusedPool = unusedCandidatesByKind[secCfg.kind];
                if (items.length === 0 && secCfg.count === 0) return null;
                const sectionMarks = items.reduce((s, item) => s + (item.marks || 0), 0);

                return (
                  <div
                    key={secCfg.kind}
                    className="border border-neutral-800 rounded-xl bg-neutral-950 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-neutral-800 bg-black flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-white">
                          {secCfg.sectionName} · {secCfg.label}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono tabular-nums">
                          {items.length} Questions · {sectionMarks} Marks · {unusedPool.length} unused available in selected chapters
                        </div>
                      </div>

                      {unusedPool.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setAddKindDrawer((prev) =>
                              prev === secCfg.kind ? null : secCfg.kind
                            )
                          }
                          className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Question</span>
                        </button>
                      )}
                    </div>

                    {/* Optional drawer to add an extra unused question to this section */}
                    {addKindDrawer === secCfg.kind && unusedPool.length > 0 && (
                      <div className="p-3 bg-neutral-900 border-b border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-white">
                            Pick an unused {KIND_LABELS[secCfg.kind]} question to append
                          </span>
                          <button
                            type="button"
                            onClick={() => setAddKindDrawer(null)}
                            className="text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-neutral-800 border border-neutral-800 rounded-lg bg-black">
                          {unusedPool.map((bq) => (
                            <button
                              key={bq.key}
                              type="button"
                              onClick={() => handleAddExtraQuestion(secCfg.kind, bq)}
                              className="w-full text-left px-3 py-2 hover:bg-neutral-900 transition flex items-start justify-between gap-3 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="text-xs text-white">{bq.question.text}</div>
                                <div className="text-[10px] text-neutral-500 mt-0.5">
                                  {bq.unitName}
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold text-white shrink-0">
                                + Add
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {items.length === 0 ? (
                      <div className="p-6 text-center text-xs text-neutral-500">
                        No questions selected for this section. Use &quot;Add Question&quot; above if available.
                      </div>
                    ) : (
                      <div className="divide-y divide-neutral-900">
                        {items.map((item, idx) => {
                          const canSwap = unusedPool.length > 0;
                          const isPickerOpen = swapPickerReviewId === item.reviewId;

                          return (
                            <div key={item.reviewId} className="p-4 space-y-2.5">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="text-xs text-white leading-relaxed">
                                    <span className="font-bold mr-1.5 font-mono tabular-nums">
                                      {toRoman(idx)}
                                    </span>
                                    <span>{item.bankQuestion.question.text}</span>
                                  </div>

                                  {item.bankQuestion.question.options &&
                                    item.bankQuestion.question.options.length > 0 && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-4">
                                        {item.bankQuestion.question.options.map((opt) => (
                                          <div
                                            key={opt.id}
                                            className="text-[11px] text-neutral-300 flex gap-1.5"
                                          >
                                            <span className="text-neutral-500">{opt.label}</span>
                                            <span>{opt.text}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                  {showAnswers && item.bankQuestion.question.answerKey && (
                                    <div className="pl-4 text-[11px] text-neutral-300">
                                      <span className="font-semibold text-white">Key: </span>
                                      <span>{item.bankQuestion.question.answerKey}</span>
                                    </div>
                                  )}

                                  <div className="pl-4 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                                    <span>{item.bankQuestion.unitName}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono tabular-nums">
                                      {item.marks} Marks
                                    </span>
                                    {item.tag && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="text-neutral-300">{item.tag}</span>
                                      </>
                                    )}
                                    {item.reason && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="text-neutral-400">{item.reason}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Row Controls */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveWithinKind(item.reviewId, -1)}
                                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-md disabled:opacity-30 cursor-pointer"
                                    title="Move up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === items.length - 1}
                                    onClick={() => handleMoveWithinKind(item.reviewId, 1)}
                                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-md disabled:opacity-30 cursor-pointer"
                                    title="Move down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canSwap}
                                    onClick={() => handleQuickSwap(item.reviewId)}
                                    className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-md text-[11px] flex items-center gap-1 disabled:opacity-30 cursor-pointer whitespace-nowrap"
                                    title="Swap with another unused question"
                                  >
                                    <Shuffle className="w-3 h-3" />
                                    <span>Swap</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canSwap}
                                    onClick={() =>
                                      setSwapPickerReviewId((prev) =>
                                        prev === item.reviewId ? null : item.reviewId
                                      )
                                    }
                                    className="px-2 py-1 bg-black hover:bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-md text-[11px] disabled:opacity-30 cursor-pointer whitespace-nowrap"
                                    title="Choose a specific replacement question"
                                  >
                                    Choose
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveReviewedItem(item.reviewId)}
                                    className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-md cursor-pointer"
                                    title="Remove question from selection"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Inline Replacement Picker */}
                              {isPickerOpen && unusedPool.length > 0 && (
                                <div className="ml-4 p-3 bg-black border border-neutral-700 rounded-lg space-y-2">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-white">
                                      Choose replacement from unused {KIND_LABELS[secCfg.kind]} pool ({unusedPool.length})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setSwapPickerReviewId(null)}
                                      className="text-neutral-400 hover:text-white cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <div className="max-h-44 overflow-y-auto divide-y divide-neutral-900">
                                    {unusedPool.map((candidate) => (
                                      <button
                                        key={candidate.key}
                                        type="button"
                                        onClick={() =>
                                          handleSpecificSwap(item.reviewId, candidate)
                                        }
                                        className="w-full text-left py-2 px-2 hover:bg-neutral-900 rounded transition flex items-start justify-between gap-3 cursor-pointer"
                                      >
                                        <div className="min-w-0">
                                          <div className="text-xs text-neutral-200">
                                            {candidate.question.text}
                                          </div>
                                          <div className="text-[10px] text-neutral-500 mt-0.5">
                                            {candidate.unitName}
                                          </div>
                                        </div>
                                        <span className="text-[11px] font-semibold text-white shrink-0 flex items-center gap-1">
                                          <Check className="w-3 h-3" />
                                          Select
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Action Bar (Stage 2: Take to Editor) */}
          <footer className="shrink-0 border-t border-neutral-800 bg-black px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-white font-mono tabular-nums">
                {reviewedItems.length} Questions · {reviewedTotalMarks} Marks Ready
              </span>

              <div className="inline-flex items-center gap-0.5 p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setApplyMode('replace')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer whitespace-nowrap ${
                    applyMode === 'replace'
                      ? 'bg-white text-black font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Create Fresh Paper Sections
                </button>
                <button
                  type="button"
                  onClick={() => setApplyMode('append')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer whitespace-nowrap ${
                    applyMode === 'append'
                      ? 'bg-white text-black font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Append to Active Paper
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTakeToEditor}
              disabled={reviewedItems.length === 0}
              className="px-5 py-2 bg-white text-black font-semibold text-xs rounded-lg hover:bg-neutral-200 disabled:opacity-40 transition flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Take to Editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </footer>
        </div>
      )}
    </div>
  );
};
