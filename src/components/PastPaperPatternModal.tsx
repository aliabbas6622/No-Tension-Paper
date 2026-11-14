import React, { useEffect, useMemo, useState } from 'react';
import { ExamPaper, PastPaperPatternSeed, PastPaperRecord } from '../types/exam';
import { QuestionBank, getBundledQuestionBanks, loadQuestionBanks } from '../services/questionBank';
import { BankQuestion, QuestionKind, buildBankQuestions } from '../services/paperComposer';
import {
  GeneratedFromPatternResult,
  PatternGenerationEngine,
  buildPaperFromManualPatternSelection,
  buildPatternSeedFromPastPaper,
  extractPastPaperQuestionTexts,
  findMatchingBankForPastPaper,
  generatePaperFromPastPatternAI,
  generatePaperFromPastPatternWeighted,
  isSimilarToPastQuestion,
  refinePaperWithAI,
  selectFromDatabaseForPatternAI,
  swapSingleQuestionFromBank,
} from '../services/pastPaperPattern';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckSquare,
  Cpu,
  Database,
  Eye,
  EyeOff,
  Hammer,
  ListChecks,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Square,
  X,
} from 'lucide-react';

interface PastPaperPatternModalProps {
  isOpen: boolean;
  onClose: () => void;
  pastPaper: PastPaperRecord | null;
  onApplyGeneratedPaper: (
    paper: ExamPaper,
    meta: {
      engine: PatternGenerationEngine;
      sourceTitle: string;
      seed: PastPaperPatternSeed;
      sourcePaper: PastPaperRecord;
    }
  ) => void;
  onCustomizeInAutoBlueprint: (seed: PastPaperPatternSeed, sourcePaper: PastPaperRecord) => void;
  onOpenManualBuilderWithSeed?: (seed: PastPaperPatternSeed, sourcePaper: PastPaperRecord) => void;
}

type ModalStep = 'choice' | 'ai' | 'manual';

export const PastPaperPatternModal: React.FC<PastPaperPatternModalProps> = ({
  isOpen,
  onClose,
  pastPaper,
  onApplyGeneratedPaper,
  onCustomizeInAutoBlueprint,
  onOpenManualBuilderWithSeed,
}) => {
  const [step, setStep] = useState<ModalStep>('choice');
  const [banks, setBanks] = useState<QuestionBank[]>(() => getBundledQuestionBanks());
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  // AI step state
  const [aiSourceMode, setAiSourceMode] = useState<'database' | 'author'>('database');
  const [selectedUnitIndices, setSelectedUnitIndices] = useState<number[]>([]);
  const [focusPrompt, setFocusPrompt] = useState('');
  const [followUpPrompt, setFollowUpPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedFromPatternResult | null>(null);
  const [activeSectionTab, setActiveSectionTab] = useState<number>(0);
  const [showAnswers, setShowAnswers] = useState(true);

  // Manual step state
  const [manualSelectedKeys, setManualSelectedKeys] = useState<Set<string>>(new Set());
  const [manualSectionIdx, setManualSectionIdx] = useState<number>(0);
  const [manualChapterFilter, setManualChapterFilter] = useState<number>(-1);
  const [manualSearch, setManualSearch] = useState('');
  const [excludePastQuestions, setExcludePastQuestions] = useState(true);

  useEffect(() => {
    if (!isOpen || !pastPaper) return;
    let mounted = true;
    setStep('choice');
    setErrorMsg(null);
    setResult(null);
    setActiveSectionTab(0);
    setManualSelectedKeys(new Set());
    setManualSectionIdx(0);
    setManualChapterFilter(-1);
    setManualSearch('');
    setExcludePastQuestions(true);
    setFocusPrompt('');
    setFollowUpPrompt('');
    setAiSourceMode('database');

    const bundled = getBundledQuestionBanks();
    setBanks(bundled);
    const immediateMatch = findMatchingBankForPastPaper(pastPaper, bundled);
    if (immediateMatch) {
      setSelectedBankId(immediateMatch.id);
      setSelectedUnitIndices(immediateMatch.units.map((_, idx) => idx));
    }

    (async () => {
      const loaded = await loadQuestionBanks();
      if (!mounted) return;
      setBanks(loaded);
      const matched = findMatchingBankForPastPaper(pastPaper, loaded);
      if (matched) {
        setSelectedBankId((prev) => {
          if (prev && loaded.some((b) => b.id === prev)) return prev;
          return matched.id;
        });
        setSelectedUnitIndices((prev) =>
          prev.length > 0 ? prev : matched.units.map((_, idx) => idx)
        );
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, pastPaper]);

  const activeBank = useMemo(
    () => banks.find((b) => b.id === selectedBankId) || null,
    [banks, selectedBankId]
  );

  // Reset chapter indices when user switches database bank manually
  const handleSelectBankChange = (bankId: string) => {
    setSelectedBankId(bankId);
    const found = banks.find((b) => b.id === bankId);
    if (found) {
      setSelectedUnitIndices(found.units.map((_, idx) => idx));
    }
    setManualSelectedKeys(new Set());
    setManualChapterFilter(-1);
    setResult(null);
  };

  const allBankQuestions = useMemo(
    () => (activeBank ? buildBankQuestions(activeBank.units) : []),
    [activeBank]
  );

  const pastTexts = useMemo(
    () => (pastPaper ? extractPastPaperQuestionTexts(pastPaper.paper) : []),
    [pastPaper]
  );

  const eligibleBankQuestions = useMemo(() => {
    if (!excludePastQuestions) return allBankQuestions;
    return allBankQuestions.filter(
      (bq) => !isSimilarToPastQuestion(bq.question.text, pastTexts)
    );
  }, [allBankQuestions, excludePastQuestions, pastTexts]);

  const manualSelectedList = useMemo(
    () => allBankQuestions.filter((bq) => manualSelectedKeys.has(bq.key)),
    [allBankQuestions, manualSelectedKeys]
  );

  const manualCountsByKind = useMemo(() => {
    const counts: Record<QuestionKind, number> = { mcq: 0, short: 0, detailed: 0 };
    manualSelectedList.forEach((bq) => {
      counts[bq.kind] += 1;
    });
    return counts;
  }, [manualSelectedList]);

  const activeManualPattern = pastPaper?.sectionPatterns[manualSectionIdx] || pastPaper?.sectionPatterns[0];

  const manualVisibleQuestions = useMemo(() => {
    const needle = manualSearch.trim().toLowerCase();
    return eligibleBankQuestions.filter((bq) => {
      if (activeManualPattern && bq.kind !== activeManualPattern.kind) return false;
      if (manualChapterFilter !== -1 && bq.unitIndex !== manualChapterFilter) return false;
      if (!needle) return true;
      const haystack = [
        bq.question.text,
        bq.unitName,
        ...(bq.question.options || []).map((o) => o.text),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [eligibleBankQuestions, activeManualPattern, manualChapterFilter, manualSearch]);

  if (!isOpen || !pastPaper) return null;

  const totalPatternQuestions = pastPaper.sectionPatterns.reduce(
    (sum, sp) => sum + sp.questionCount,
    0
  );

  const toggleUnit = (idx: number) => {
    setSelectedUnitIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleRunAI = async (modeOverride?: 'database' | 'author') => {
    const mode = modeOverride || aiSourceMode;
    setAiSourceMode(mode);
    setErrorMsg(null);
    setIsGenerating(true);

    try {
      if (mode === 'database') {
        if (!activeBank) {
          throw new Error(
            'No database Question Bank found for this subject. Switch to "AI Write Fresh Questions" instead.'
          );
        }
        const res = await selectFromDatabaseForPatternAI({
          pastPaper,
          bank: activeBank,
          selectedUnitIndices:
            selectedUnitIndices.length > 0
              ? selectedUnitIndices
              : activeBank.units.map((_, idx) => idx),
          focusPrompt,
        });
        setResult(res);
        setActiveSectionTab(0);
      } else {
        const res = await generatePaperFromPastPatternAI({
          pastPaper,
          focusPrompt,
        });
        setResult(res);
        setActiveSectionTab(0);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'AI could not process the selection right now. Please retry.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFillShortfallsWithAI = async () => {
    if (!result || result.shortfalls.length === 0 || isGenerating) return;
    setErrorMsg(null);
    setIsGenerating(true);
    try {
      const aiRes = await generatePaperFromPastPatternAI({
        pastPaper,
        focusPrompt:
          focusPrompt ||
          `Generate fresh questions to complete remaining slots without duplicating any existing questions.`,
      });

      const mergedSections = result.paper.sections.map((sec, sIdx) => {
        const pattern = pastPaper.sectionPatterns[sIdx];
        if (!pattern) return sec;
        const needed = pattern.questionCount - sec.questions.length;
        if (needed <= 0) return sec;
        const aiSec = aiRes.paper.sections[sIdx];
        const extras = (aiSec?.questions || []).slice(0, needed);
        return {
          ...sec,
          questions: [...sec.questions, ...extras].map((q, qIdx) => ({
            ...q,
            number:
              pattern.numberingStyle === 'section-c-from-3'
                ? `${qIdx + 3}.`
                : q.number,
          })),
        };
      });

      setResult({
        ...result,
        paper: { ...result.paper, sections: mergedSections },
        shortfalls: [],
        rationale: `${result.rationale} Filled remaining slots with AI fresh questions.`,
      });
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to generate supplementary AI questions.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineGeneratedResult = async () => {
    if (!result || !followUpPrompt.trim() || isRefining) return;
    setErrorMsg(null);
    setIsRefining(true);
    try {
      const { updatedPaper, summary } = await refinePaperWithAI({
        paper: result.paper,
        instruction: followUpPrompt,
        bank: activeBank,
        sourceMode: aiSourceMode === 'database' ? 'database-first' : 'direct-ai',
        avoidQuestions: pastTexts,
      });
      setResult({
        ...result,
        paper: updatedPaper,
        rationale: summary,
      });
      setFollowUpPrompt('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'AI follow-up edit failed. Please retry.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleSwapQuestion = (sectionIndex: number, questionIndex: number) => {
    if (!result || !activeBank) return;
    const { updatedPaper, swapped } = swapSingleQuestionFromBank({
      paper: result.paper,
      sectionIndex,
      questionIndex,
      pastPaper,
      bank: activeBank,
    });
    if (!swapped) {
      setErrorMsg('No more unused non-overlapping questions of this type remain in your database.');
      return;
    }
    setErrorMsg(null);
    setResult({ ...result, paper: updatedPaper });
  };

  const handleToggleManualQuestion = (bq: BankQuestion) => {
    setManualSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(bq.key)) {
        next.delete(bq.key);
      } else {
        next.add(bq.key);
      }
      return next;
    });
  };

  const handleAutoFillManualRemaining = () => {
    if (!activeBank) return;
    const weighted = generatePaperFromPastPatternWeighted({
      pastPaper,
      bank: activeBank,
    });
    const weightedTexts = new Set<string>();
    weighted.paper.sections.forEach((s) =>
      s.questions.forEach((q) => weightedTexts.add(q.text.trim().toLowerCase()))
    );

    const next = new Set(manualSelectedKeys);
    const currentCounts: Record<QuestionKind, number> = {
      mcq: manualCountsByKind.mcq,
      short: manualCountsByKind.short,
      detailed: manualCountsByKind.detailed,
    };
    const targets: Record<QuestionKind, number> = { mcq: 0, short: 0, detailed: 0 };
    pastPaper.sectionPatterns.forEach((sp) => {
      targets[sp.kind] += sp.questionCount;
    });

    for (const bq of eligibleBankQuestions) {
      if (next.has(bq.key)) continue;
      if (currentCounts[bq.kind] >= targets[bq.kind]) continue;
      if (weightedTexts.has(bq.question.text.trim().toLowerCase())) {
        next.add(bq.key);
        currentCounts[bq.kind] += 1;
      }
    }
    // Top up if weighted didn't cover already-checked overlap
    for (const bq of eligibleBankQuestions) {
      if (next.has(bq.key)) continue;
      if (currentCounts[bq.kind] >= targets[bq.kind]) continue;
      next.add(bq.key);
      currentCounts[bq.kind] += 1;
    }

    setManualSelectedKeys(next);
  };

  const handleOpenManualResultInEditor = () => {
    if (manualSelectedList.length === 0) return;
    const built = buildPaperFromManualPatternSelection({
      pastPaper,
      selectedQuestions: manualSelectedList,
      bankName: activeBank?.subjectName,
    });
    const seed = buildPatternSeedFromPastPaper(pastPaper);
    onApplyGeneratedPaper(built.paper, {
      engine: 'manual',
      sourceTitle: pastPaper.title,
      seed,
      sourcePaper: pastPaper,
    });
    onClose();
  };

  const totalGeneratedQuestions =
    result?.paper.sections.reduce((acc, s) => acc + s.questions.length, 0) || 0;

  const activeSection = result?.paper.sections[activeSectionTab] || result?.paper.sections[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white border border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-neutral-900 dark:text-white">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {step !== 'choice' && (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setStep('choice');
                  }}
                  className="inline-flex items-center gap-1 text-neutral-900 dark:text-white font-semibold hover:underline cursor-pointer mr-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Choice</span>
                </button>
              )}
              <span className="font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                {pastPaper.year} Pattern · {pastPaper.paper.header.maxMarks} Marks
              </span>
              <span>·</span>
              <span className="truncate">{pastPaper.title}</span>
            </div>

            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              {step === 'choice'
                ? 'How would you like to manage questions for this pattern?'
                : step === 'ai'
                ? 'AI Question Manager (Using Your Database)'
                : 'Select Questions Yourself from Your Database'}
            </h2>
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Locked Pattern Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {pastPaper.sectionPatterns.map((sp, idx) => (
              <div
                key={sp.name}
                onClick={() => {
                  if (step === 'manual') setManualSectionIdx(idx);
                }}
                className={`p-3 rounded-xl border space-y-1 transition ${
                  step === 'manual' ? 'cursor-pointer' : ''
                } ${
                  step === 'manual' && manualSectionIdx === idx
                    ? 'border-neutral-900 bg-neutral-100 dark:border-white dark:bg-neutral-900'
                    : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-black'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">{sp.name}</span>
                  <span className="text-[11px] font-mono font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
                    {step === 'manual'
                      ? `${manualCountsByKind[sp.kind]}/${sp.questionCount} selected`
                      : sp.marksBadge}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 tabular-nums">
                  {sp.questionCount} {sp.kind.toUpperCase()}s · {sp.marksPerQuestion}m each · Attempt{' '}
                  {sp.attemptCount === sp.questionCount ? 'all' : `any ${sp.attemptCount}`}
                </div>
              </div>
            ))}
          </div>

          {/* STEP 1: CHOICE SCREEN */}
          {step === 'choice' && (
            <div className="space-y-5">
              {/* Database Source Selector */}
              {banks.length > 0 && (
                <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-black flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="font-semibold">Your Question Bank Database:</span>
                    {activeBank && (
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                        ({activeBank.source === 'database' ? 'Firestore Cloud DB' : 'Bundled DB'} ·{' '}
                        {allBankQuestions.length} total Qs)
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedBankId}
                    onChange={(e) => handleSelectBankChange(e.target.value)}
                    className="bg-white border border-neutral-300 text-neutral-900 dark:bg-neutral-950 dark:border-neutral-800 dark:text-white rounded-lg px-3 py-1.5 text-xs focus:outline-hidden"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.subjectName} ({b.classGrade}) — {b.units.length} chapters
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Primary Two Choices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setStep('ai');
                  }}
                  className="group p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-indigo-500 dark:hover:border-indigo-400 text-left transition flex flex-col justify-between gap-5 cursor-pointer shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold tracking-tight">
                        Use AI to Manage from My Database
                      </h3>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        AI reads your database question bank, excludes questions from the {pastPaper.year}{' '}
                        past paper, selects a balanced set for all {totalPatternQuestions} slots, and lets
                        you tell AI to refine further.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>Let AI manage questions</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setStep('manual');
                  }}
                  className="group p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-900 dark:hover:border-white text-left transition flex flex-col justify-between gap-5 cursor-pointer shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white flex items-center justify-center">
                      <ListChecks className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold tracking-tight">I Will Select Myself</h3>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        Browse your database chapter-by-chapter, inspect answers, and tick the exact MCQs,
                        short, and detailed questions yourself to fill Section A, B, and C.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-white">
                    <span>Choose questions myself</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              </div>

              {/* Advanced Blueprint Link */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-neutral-500 dark:text-neutral-400">
                <span>
                  Want custom chapter weightage sliders (% per chapter)?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const seed = buildPatternSeedFromPastPaper(pastPaper);
                    onClose();
                    onCustomizeInAutoBlueprint(seed, pastPaper);
                  }}
                  className="font-semibold text-neutral-800 dark:text-neutral-200 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Open Chapter Weightage Blueprint</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2A: AI MANAGES QUESTIONS FROM DATABASE */}
          {step === 'ai' && (
            <div className="space-y-4">
              {/* Configuration Card */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-black space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold">AI Source Mode</span>
                  <div className="inline-flex p-0.5 rounded-lg bg-white border border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAiSourceMode('database')}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        aiSourceMode === 'database'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <Database className="w-3 h-3" />
                      <span>Select from My Database</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiSourceMode('author')}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        aiSourceMode === 'author'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <Cpu className="w-3 h-3" />
                      <span>AI Write Fresh Questions</span>
                    </button>
                  </div>
                </div>

                {/* Chapter filter when using database */}
                {aiSourceMode === 'database' && activeBank && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>
                        Chapters to include ({selectedUnitIndices.length}/{activeBank.units.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedUnitIndices(
                            selectedUnitIndices.length === activeBank.units.length
                              ? []
                              : activeBank.units.map((_, idx) => idx)
                          )
                        }
                        className="font-semibold text-neutral-800 dark:text-neutral-200 hover:underline cursor-pointer"
                      >
                        {selectedUnitIndices.length === activeBank.units.length
                          ? 'Unselect all'
                          : 'Select all'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeBank.units.map((u, idx) => {
                        const checked = selectedUnitIndices.includes(idx);
                        return (
                          <button
                            key={u.unit}
                            type="button"
                            onClick={() => toggleUnit(idx)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] border transition flex items-center gap-1.5 cursor-pointer ${
                              checked
                                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-medium'
                                : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-950 dark:text-neutral-400 dark:border-neutral-800'
                            }`}
                          >
                            {checked ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Square className="w-3 h-3 opacity-50" />
                            )}
                            <span className="truncate max-w-[200px]">{u.unit}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Guidance Prompt + Generate Button */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={focusPrompt}
                    onChange={(e) => setFocusPrompt(e.target.value)}
                    placeholder={
                      aiSourceMode === 'database'
                        ? 'Instructions for AI (e.g. balance chapters evenly, avoid easy recall, prioritize networking & logic gates)...'
                        : 'Topic focus for AI-authored questions (e.g. emphasize Boolean algebra, OS features, and conversions)...'
                    }
                    className="flex-1 px-3 py-2 bg-white border border-neutral-300 text-neutral-900 placeholder-neutral-400 dark:bg-neutral-950 dark:border-neutral-800 dark:text-white dark:placeholder-neutral-500 rounded-lg text-xs focus:outline-hidden"
                  />
                  <button
                    type="button"
                    disabled={
                      isGenerating ||
                      (aiSourceMode === 'database' &&
                        (!activeBank || selectedUnitIndices.length === 0))
                    }
                    onClick={() => handleRunAI()}
                    className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 disabled:opacity-40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI Managing Paper...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {result
                            ? 'Regenerate with AI'
                            : aiSourceMode === 'database'
                            ? 'Let AI Select from DB'
                            : 'Generate AI Questions'}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50 text-xs flex flex-wrap items-center justify-between gap-2 text-red-800 dark:text-red-200">
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRunAI()}
                        disabled={isGenerating}
                        className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded-md text-[11px] font-semibold cursor-pointer"
                      >
                        Retry AI
                      </button>
                      {activeBank && (
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMsg(null);
                            setResult(
                              generatePaperFromPastPatternWeighted({
                                pastPaper,
                                bank: activeBank,
                              })
                            );
                          }}
                          className="px-2.5 py-1 bg-white border border-neutral-300 text-neutral-900 rounded-md text-[11px] font-semibold cursor-pointer"
                        >
                          Use Balanced DB Fallback
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Curated Paper Review & Follow-up Refinement */}
              {result && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-black flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 min-w-0">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{result.rationale}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAnswers((v) => !v)}
                      className="px-2.5 py-1 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-md text-[11px] font-medium flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {showAnswers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showAnswers ? 'Hide Keys' : 'Show Keys'}</span>
                    </button>
                  </div>

                  {result.shortfalls.length > 0 && (
                    <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
                      <span>
                        Your database had{' '}
                        {result.shortfalls
                          .map((sf) => `${sf.filled}/${sf.requested} unused for ${sf.sectionName}`)
                          .join(', ')}{' '}
                        (after skipping {pastPaper.year} questions).
                      </span>
                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={handleFillShortfallsWithAI}
                        className="px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-black rounded-lg text-[11px] font-semibold cursor-pointer shrink-0"
                      >
                        Fill Missing Slots with AI
                      </button>
                    </div>
                  )}

                  {/* Interactive Follow-Up Refinement Input */}
                  <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={followUpPrompt}
                      onChange={(e) => setFollowUpPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRefineGeneratedResult();
                        }
                      }}
                      placeholder="Ask AI for further edits (e.g. 'Swap question iii in Section A', 'Make Section B harder')..."
                      className="flex-1 px-3 py-1.5 bg-white border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 rounded-lg text-xs focus:outline-hidden"
                    />
                    <button
                      type="button"
                      disabled={isRefining || !followUpPrompt.trim()}
                      onClick={handleRefineGeneratedResult}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {isRefining ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Tell AI to Edit</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Section Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    {result.paper.sections.map((sec, idx) => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setActiveSectionTab(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          activeSectionTab === idx
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {sec.name} ({sec.questions.length})
                      </button>
                    ))}
                  </div>

                  {activeSection && (
                    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-black divide-y divide-neutral-200 dark:divide-neutral-800">
                      {activeSection.questions.map((q, qIdx) => {
                        const qMeta = result.questionMetaById?.[q.id];
                        return (
                          <div key={q.id} className="p-3.5 space-y-1.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-xs leading-relaxed">
                                <span className="font-bold mr-1.5">{q.number}</span>
                                <span>{q.text}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                                  {q.marks}m
                                </span>
                                {activeBank && (
                                  <button
                                    type="button"
                                    onClick={() => handleSwapQuestion(activeSectionTab, qIdx)}
                                    className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-200 rounded-md text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                                    title="Swap this question with another non-overlapping database question"
                                  >
                                    <Shuffle className="w-3 h-3" />
                                    <span>Swap</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-5 text-[11px] text-neutral-600 dark:text-neutral-400">
                                {q.options.map((opt) => (
                                  <div key={opt.id}>
                                    <span className="font-semibold mr-1">{opt.label}</span>
                                    <span>{opt.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {showAnswers && q.answerKey && (
                              <div className="ml-5 text-[11px] text-neutral-600 dark:text-neutral-400">
                                <span className="font-semibold text-neutral-900 dark:text-white">
                                  Key:{' '}
                                </span>
                                {q.answerKey}
                              </div>
                            )}

                            {(qMeta?.unitName || qMeta?.reason) && (
                              <div className="ml-5 text-[11px] text-neutral-500 dark:text-neutral-400">
                                {qMeta.unitName}
                                {qMeta.reason ? ` · ${qMeta.reason}` : ''}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2B: MANUAL SELECTION FROM DATABASE */}
          {step === 'manual' && (
            <div className="space-y-4">
              {!activeBank ? (
                <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center space-y-2 text-xs text-neutral-500">
                  <p>No database Question Bank found for this subject yet.</p>
                </div>
              ) : (
                <>
                  {/* Controls Row */}
                  <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-black space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold">
                          Picking for {activeManualPattern?.name} ({activeManualPattern?.kind.toUpperCase()}s):
                        </span>
                        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold tabular-nums">
                          {activeManualPattern
                            ? `${manualCountsByKind[activeManualPattern.kind]} / ${
                                activeManualPattern.questionCount
                              } selected`
                            : ''}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAutoFillManualRemaining}
                          className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-white rounded-lg text-[11px] font-medium flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Auto-Fill Empty Slots</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExcludePastQuestions((v) => !v)}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium cursor-pointer transition ${
                            excludePastQuestions
                              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white'
                              : 'bg-white text-neutral-700 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700'
                          }`}
                        >
                          {excludePastQuestions ? `Hiding ${pastPaper.year} Qs` : `Showing All Qs`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAnswers((v) => !v)}
                          className="px-2.5 py-1.5 bg-white border border-neutral-300 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-300 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                        >
                          {showAnswers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showAnswers ? 'Hide Keys' : 'Show Keys'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Chapter filter + Search */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={manualChapterFilter}
                        onChange={(e) => setManualChapterFilter(Number(e.target.value))}
                        className="sm:w-64 bg-white border border-neutral-300 text-neutral-900 dark:bg-neutral-950 dark:border-neutral-800 dark:text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden"
                      >
                        <option value={-1}>All Chapters ({activeBank.units.length})</option>
                        {activeBank.units.map((u, idx) => (
                          <option key={u.unit} value={idx}>
                            {u.unit}
                          </option>
                        ))}
                      </select>

                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          type="text"
                          value={manualSearch}
                          onChange={(e) => setManualSearch(e.target.value)}
                          placeholder="Search database questions..."
                          className="w-full bg-white border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Database Questions Checklist */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl divide-y divide-neutral-200 dark:divide-neutral-800 max-h-[340px] overflow-y-auto bg-white dark:bg-black">
                    {manualVisibleQuestions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-neutral-500">
                        No {activeManualPattern?.kind.toUpperCase()} questions match the current chapter/search filter.
                      </div>
                    ) : (
                      manualVisibleQuestions.map((bq) => {
                        const checked = manualSelectedKeys.has(bq.key);
                        return (
                          <div
                            key={bq.key}
                            onClick={() => handleToggleManualQuestion(bq)}
                            className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                              checked
                                ? 'bg-neutral-100 dark:bg-neutral-900'
                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-950'
                            }`}
                          >
                            <div className="pt-0.5 shrink-0">
                              {checked ? (
                                <CheckSquare className="w-4 h-4 text-neutral-900 dark:text-white" />
                              ) : (
                                <Square className="w-4 h-4 text-neutral-400 dark:text-neutral-600" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="text-xs leading-relaxed text-neutral-900 dark:text-white">
                                <span className="font-bold mr-1.5">{bq.question.number}</span>
                                <span>{bq.question.text}</span>
                              </div>
                              {bq.question.options && bq.question.options.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                                  {bq.question.options.map((opt) => (
                                    <div key={opt.id} className="truncate">
                                      <span className="font-semibold mr-1">{opt.label}</span>
                                      {opt.text}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {showAnswers && bq.question.answerKey && (
                                <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                                  <span className="font-semibold text-neutral-900 dark:text-white">
                                    Key:{' '}
                                  </span>
                                  {bq.question.answerKey}
                                </div>
                              )}
                              <div className="text-[10px] text-neutral-500">{bq.unitName}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
            {step === 'choice'
              ? `Pattern: ${totalPatternQuestions} Questions · ${pastPaper.paper.header.maxMarks} Marks`
              : step === 'ai'
              ? `AI Review: ${totalGeneratedQuestions} / ${totalPatternQuestions} Questions Ready`
              : `Selected Manually: ${manualSelectedList.length} / ${totalPatternQuestions} Questions`}
          </div>

          <div className="flex items-center gap-2">
            {step === 'manual' && onOpenManualBuilderWithSeed && (
              <button
                type="button"
                onClick={() => {
                  const seed = buildPatternSeedFromPastPaper(pastPaper);
                  onClose();
                  onOpenManualBuilderWithSeed(seed, pastPaper);
                }}
                className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Hammer className="w-3.5 h-3.5" />
                <span>Full Question Bank</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>

            {step === 'ai' && (
              <button
                type="button"
                disabled={!result || totalGeneratedQuestions === 0 || isGenerating || isRefining}
                onClick={() => {
                  if (!result) return;
                  const seed = buildPatternSeedFromPastPaper(pastPaper);
                  onApplyGeneratedPaper(result.paper, {
                    engine: result.engine,
                    sourceTitle: pastPaper.title,
                    seed,
                    sourcePaper: pastPaper,
                  });
                  onClose();
                }}
                className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 disabled:opacity-40 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open Paper Preview &amp; Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'manual' && (
              <button
                type="button"
                disabled={manualSelectedList.length === 0}
                onClick={handleOpenManualResultInEditor}
                className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 disabled:opacity-40 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open Paper Preview &amp; Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
