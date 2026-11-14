import React, { useEffect, useMemo, useState } from 'react';
import { ExamPaper, PastPaperPatternSeed, Question } from '../types/exam';
import { QuestionBank, loadQuestionBanks, syncBundledQuestionBanks } from '../services/questionBank';
import { BankQuestion, QuestionKind, buildBankQuestions } from '../services/paperComposer';
import { isSimilarToPastQuestion } from '../services/pastPaperPattern';
import { AppMode, ModeSwitcher } from './ModeSwitcher';
import { AppTheme, ThemeToggleButton } from './ThemeToggleButton';
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Home,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shuffle,
  Sparkles,
  Square,
  CheckSquare,
  ListChecks,
  Share2,
} from 'lucide-react';

interface BuilderModeProps {
  currentPaper: ExamPaper;
  theme: AppTheme;
  onToggleTheme: () => void;
  patternSeed?: PastPaperPatternSeed | null;
  onClearPatternSeed?: () => void;
  preferSyncFromPaper?: boolean;
  onAddQuestionsToPaper: (questions: Question[], label: string) => void;
  onReplacePaperWithQuestions?: (questions: Question[], label: string) => void;
  onOpenEditor: () => void;
  onOpenAIRefiner?: () => void;
  onOpenDashboard: () => void;
  onSwitchMode?: (mode: AppMode) => void;
  onOpenShareModal?: () => void;
}

const ALL_CHAPTERS = -1;

const KIND_LABELS: Record<QuestionKind, string> = {
  mcq: 'MCQ',
  short: 'Short',
  detailed: 'Detailed',
};

const KIND_CHIP_STYLES: Record<QuestionKind, string> = {
  mcq: 'bg-neutral-900 text-white dark:bg-white dark:text-black',
  short: 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-white',
  detailed: 'bg-neutral-100 text-neutral-700 border border-neutral-300 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700',
};

export const BuilderMode: React.FC<BuilderModeProps> = ({
  currentPaper,
  theme,
  onToggleTheme,
  patternSeed = null,
  onClearPatternSeed,
  preferSyncFromPaper = false,
  onAddQuestionsToPaper,
  onReplacePaperWithQuestions,
  onOpenEditor,
  onOpenAIRefiner,
  onOpenDashboard,
  onSwitchMode,
  onOpenShareModal,
}) => {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBankId, setActiveBankId] = useState<string>('');
  const [activeChapter, setActiveChapter] = useState<number>(ALL_CHAPTERS);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [hasAutoSynced, setHasAutoSynced] = useState(false);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | QuestionKind>('all');
  const [showAnswers, setShowAnswers] = useState(true);
  const [excludeSeedPastQs, setExcludeSeedPastQs] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [confirmOverwriteDb, setConfirmOverwriteDb] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);

  // Load the bank: Firestore first, bundled copy as the guaranteed fallback.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const loaded = await loadQuestionBanks();
      if (!mounted) return;
      setBanks(loaded);
      const subjectTitle = (currentPaper.header.subjectTitle || currentPaper.title || '').toLowerCase();
      const preferredBySeed = patternSeed?.questionBankId
        ? loaded.find((b) => b.id === patternSeed.questionBankId)
        : undefined;
      const preferredByPaper = loaded.find(
        (b) =>
          subjectTitle.includes(b.subjectName.toLowerCase()) ||
          b.subjectName.toLowerCase().includes(subjectTitle)
      );
      setActiveBankId(
        (prev) => prev || preferredBySeed?.id || preferredByPaper?.id || loaded[0]?.id || ''
      );
      setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [patternSeed, currentPaper.header.subjectTitle, currentPaper.title]);

  const activeBank = useMemo(
    () => banks.find((b) => b.id === activeBankId) || null,
    [banks, activeBankId]
  );

  const allQuestions = useMemo(
    () => (activeBank ? buildBankQuestions(activeBank.units) : []),
    [activeBank]
  );

  const paperQuestionNormalizedTexts = useMemo(() => {
    const set = new Set<string>();
    currentPaper.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        if (q.text) set.add(q.text.trim().toLowerCase().replace(/\s+/g, ' '));
      });
    });
    return set;
  }, [currentPaper.sections]);

  const inPaperKeys = useMemo(() => {
    const matched = new Set<string>();
    allQuestions.forEach((bq) => {
      const norm = bq.question.text.trim().toLowerCase().replace(/\s+/g, ' ');
      if (paperQuestionNormalizedTexts.has(norm)) {
        matched.add(bq.key);
      }
    });
    return matched;
  }, [allQuestions, paperQuestionNormalizedTexts]);

  useEffect(() => {
    if (preferSyncFromPaper && !hasAutoSynced && allQuestions.length > 0 && inPaperKeys.size > 0) {
      setSelectedKeys(new Set(inPaperKeys));
      setHasAutoSynced(true);
    }
  }, [preferSyncFromPaper, hasAutoSynced, allQuestions.length, inPaperKeys]);

  // One entry per curriculum unit ("chapter"), with its question counts.
  const chapters = useMemo(() => {
    if (!activeBank) return [];
    return activeBank.units.map((unit, index) => {
      const questions = allQuestions.filter((q) => q.unitIndex === index);
      const counts: Record<QuestionKind, number> = { mcq: 0, short: 0, detailed: 0 };
      questions.forEach((q) => {
        counts[q.kind] += 1;
      });
      return {
        index,
        name: unit.unit,
        pages: unit.pages || [],
        total: questions.length,
        counts,
      };
    });
  }, [activeBank, allQuestions]);

  const visibleQuestions = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return allQuestions.filter((bq) => {
      if (
        patternSeed &&
        excludeSeedPastQs &&
        patternSeed.excludedQuestionTexts.length > 0 &&
        isSimilarToPastQuestion(bq.question.text, patternSeed.excludedQuestionTexts)
      ) {
        return false;
      }
      if (activeChapter !== ALL_CHAPTERS && bq.unitIndex !== activeChapter) return false;
      if (kindFilter !== 'all' && bq.kind !== kindFilter) return false;
      if (!needle) return true;

      const haystack = [
        bq.question.text,
        bq.sectionType,
        bq.unitName,
        ...(bq.question.options || []).map((o) => o.text),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [allQuestions, activeChapter, kindFilter, search]);

  const chapterKindCounts = useMemo(() => {
    const counts: Record<'all' | QuestionKind, number> = { all: 0, mcq: 0, short: 0, detailed: 0 };
    allQuestions.forEach((q) => {
      if (activeChapter !== ALL_CHAPTERS && q.unitIndex !== activeChapter) return;
      counts.all += 1;
      counts[q.kind] += 1;
    });
    return counts;
  }, [allQuestions, activeChapter]);

  const allVisibleSelected =
    visibleQuestions.length > 0 && visibleQuestions.every((q) => selectedKeys.has(q.key));

  const toggleQuestion = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleVisible = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleQuestions.forEach((q) => next.delete(q.key));
      else visibleQuestions.forEach((q) => next.add(q.key));
      return next;
    });
  };

  const handleSelectBank = (id: string) => {
    if (id === activeBankId) return;
    setActiveBankId(id);
    setActiveChapter(ALL_CHAPTERS);
    setSearch('');
    setKindFilter('all');
    // Selection is scoped to one bank so the count always matches what is on screen.
    setSelectedKeys(new Set());
  };

  const handleAddToPaper = () => {
    if (selectedKeys.size === 0) return;

    const chosen = allQuestions.filter((q) => selectedKeys.has(q.key));
    // mergeQuestionsIntoPaper deep-clones with fresh ids, so the bank stays intact.
    const picked: Question[] = chosen.map((bq) => bq.question);

    onAddQuestionsToPaper(picked, activeBank?.subjectName || 'question bank');
    setSelectedKeys(new Set());
  };

  const handleReplaceAndReturn = () => {
    if (selectedKeys.size === 0 || !onReplacePaperWithQuestions) return;
    const chosen = allQuestions.filter((q) => selectedKeys.has(q.key));
    const picked: Question[] = chosen.map((bq) => bq.question);
    onReplacePaperWithQuestions(picked, activeBank?.subjectName || 'question bank');
  };

  const handleLoadFromPaper = () => {
    if (inPaperKeys.size === 0) {
      setStatus({
        text: 'No matching questions from the current paper were found in this bank.',
        tone: 'error',
      });
      return;
    }
    setSelectedKeys(new Set(inPaperKeys));
    setStatus({
      text: `Pre-selected ${inPaperKeys.size} questions currently in your paper so you can adjust or reselect.`,
      tone: 'ok',
    });
  };

  const handleSync = async (force: boolean) => {
    if (force && !confirmOverwriteDb) {
      setConfirmOverwriteDb(true);
      setTimeout(() => setConfirmOverwriteDb(false), 4500);
      return;
    }
    setConfirmOverwriteDb(false);
    setIsSyncing(true);
    setStatus(null);
    try {
      const result = await syncBundledQuestionBanks(force);
      const reloaded = await loadQuestionBanks();
      setBanks(reloaded);

      if (result.failed.length > 0) {
        setStatus({ text: `Could not sync ${result.failed.length} bank(s). Check permissions.`, tone: 'error' });
      } else if (result.seeded.length > 0) {
        setStatus({ text: `Uploaded ${result.seeded.length} bank(s) to the database.`, tone: 'ok' });
      } else {
        setStatus({ text: 'Database already up to date.', tone: 'ok' });
      }
    } catch (err) {
      setStatus({ text: 'Sync failed — check your connection and Firestore rules.', tone: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const paperQuestionCount = currentPaper.sections.reduce((a, s) => a + s.questions.length, 0);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-neutral-50 text-neutral-900 dark:bg-black dark:text-white">
      {/* Builder top bar */}
      <header className="h-12 shrink-0 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex items-center justify-between px-3 sm:px-4 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenDashboard}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white rounded-lg dark:hover:bg-neutral-900 transition cursor-pointer"
            title="Return to Dashboard / Home"
          >
            <Home className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <ModeSwitcher
            active="builder"
            onChange={(m) => {
              if (onSwitchMode) {
                onSwitchMode(m);
              } else if (m === 'editor') {
                onOpenEditor();
              }
            }}
          />
          <span className="hidden lg:inline text-[11px] text-neutral-500 truncate">
            Pick chapters and questions — they land straight in your paper
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAIRefiner && (
            <button
              type="button"
              onClick={onOpenAIRefiner}
              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-white text-[11px] font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Let AI refine or swap questions on the paper"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit with AI</span>
            </button>
          )}
          <ThemeToggleButton theme={theme} onToggle={onToggleTheme} showLabel />
          <button
            onClick={() => handleSync(true)}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-200 text-[11px] font-medium rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
            title="Push the bundled question bank to Firestore"
          >
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>{confirmOverwriteDb ? 'Click Again to Confirm' : 'Re-sync to DB'}</span>
          </button>
        </div>
      </header>

      {patternSeed && (
        <div className="shrink-0 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-950 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-3 text-neutral-700 dark:text-neutral-300">
            <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white">
              <Shuffle className="w-3.5 h-3.5" />
              {patternSeed.year} Pattern Targets:
            </span>
            {patternSeed.sectionPatterns.map((sp) => {
              const selectedCount = allQuestions.filter(
                (q) => selectedKeys.has(q.key) && q.kind === sp.kind
              ).length;
              return (
                <span key={sp.name} className="font-mono tabular-nums">
                  {sp.name}: {selectedCount}/{sp.questionCount}
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExcludeSeedPastQs((v) => !v)}
              className="font-medium text-neutral-700 dark:text-neutral-300 hover:underline cursor-pointer"
            >
              {excludeSeedPastQs ? `Hiding ${patternSeed.year} Qs` : `Showing All Qs`}
            </button>
            {onClearPatternSeed && (
              <button
                type="button"
                onClick={onClearPatternSeed}
                className="font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                Clear Pattern
              </button>
            )}
          </div>
        </div>
      )}

      {status && (
        <div
          className={`shrink-0 px-4 py-2 text-[11px] flex items-center gap-2 border-b ${
            status.tone === 'error'
              ? 'bg-neutral-100 border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white'
              : 'bg-neutral-100 border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300'
          }`}
        >
          {status.tone === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading question bank…</span>
        </div>
      ) : banks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <Database className="w-6 h-6 text-neutral-400 dark:text-neutral-600" />
          <div className="text-sm text-neutral-900 dark:text-white font-semibold">No question bank available</div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm">
            Import a curriculum JSON through the Subject Adder to create a chapter-based question
            bank, then return here to build papers from it.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Bank + chapter sidebar */}
          <aside className="w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col min-h-0 bg-white dark:bg-black">
            <div className="p-3 space-y-2 border-b border-neutral-200 dark:border-neutral-900">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Question Bank
              </label>
              <select
                value={activeBankId}
                onChange={(e) => handleSelectBank(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 text-neutral-900 focus:border-neutral-900 dark:bg-neutral-950 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs dark:text-white focus:outline-hidden dark:focus:border-white"
              >
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.subjectName} ({bank.classGrade}) — {bank.units.length}{' '}
                    {bank.units.length === 1 ? 'chapter' : 'chapters'}
                  </option>
                ))}
              </select>
              {activeBank && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono flex items-center gap-1 ${
                      activeBank.source === 'database'
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                        : 'bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800'
                    }`}
                    title={
                      activeBank.source === 'database'
                        ? 'Loaded from Firestore'
                        : 'Bundled with the app — not yet in the database'
                    }
                  >
                    <Database className="w-2.5 h-2.5" />
                    {activeBank.source === 'database' ? 'Database' : 'Bundled'}
                  </span>
                  <span className="text-neutral-500">{activeBank.units.length} chapters</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <button
                onClick={() => setActiveChapter(ALL_CHAPTERS)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition flex items-center justify-between gap-2 cursor-pointer ${
                  activeChapter === ALL_CHAPTERS
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold'
                    : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  All Chapters
                </span>
                <span className="font-mono text-[10px] opacity-70">{allQuestions.length}</span>
              </button>

              {chapters.map((chapter) => {
                const isActive = activeChapter === chapter.index;
                return (
                  <button
                    key={chapter.index}
                    onClick={() => setActiveChapter(chapter.index)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg transition cursor-pointer ${
                      isActive
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                        : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium leading-snug">{chapter.name}</span>
                      <span className="font-mono text-[10px] shrink-0 pt-0.5 opacity-70">
                        {chapter.total}
                      </span>
                    </div>
                    <div
                      className={`mt-1 flex items-center gap-1.5 text-[9px] font-mono ${
                        isActive ? 'text-white/75 dark:text-black/70' : 'text-neutral-500'
                      }`}
                    >
                      {chapter.counts.mcq > 0 && <span>{chapter.counts.mcq} MCQ</span>}
                      {chapter.counts.short > 0 && <span>{chapter.counts.short} SHORT</span>}
                      {chapter.counts.detailed > 0 && <span>{chapter.counts.detailed} LONG</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Question list */}
          <section className="flex-1 flex flex-col min-h-0 min-w-0">
            {/* Filters */}
            <div className="shrink-0 p-3 border-b border-neutral-200 dark:border-neutral-900 bg-white dark:bg-black space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                    {activeChapter === ALL_CHAPTERS
                      ? 'All Chapters'
                      : chapters.find((c) => c.index === activeChapter)?.name}
                  </h2>
                  <p className="text-[11px] text-neutral-500">
                    {visibleQuestions.length} of {chapterKindCounts.all} questions shown
                    {activeChapter !== ALL_CHAPTERS &&
                      chapters.find((c) => c.index === activeChapter)?.pages.length
                        ? ` · Pages ${chapters
                            .find((c) => c.index === activeChapter)
                            ?.pages.join(', ')}`
                        : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowAnswers((v) => !v)}
                    className={`px-2 py-1 rounded-md text-[11px] border transition flex items-center gap-1.5 cursor-pointer ${
                      showAnswers
                        ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-neutral-900 dark:border-neutral-700 dark:text-white'
                        : 'bg-neutral-50 border-neutral-300 text-neutral-600 hover:text-neutral-900 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                    title="Show the model answer under each question"
                  >
                    {showAnswers ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>Answers</span>
                  </button>

                  <button
                    onClick={toggleVisible}
                    disabled={visibleQuestions.length === 0}
                    className="px-2 py-1 rounded-md text-[11px] border border-neutral-300 bg-neutral-50 text-neutral-700 hover:text-neutral-900 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:text-white dark:hover:border-neutral-700 transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="w-3 h-3" />
                    ) : (
                      <Square className="w-3 h-3" />
                    )}
                    <span>{allVisibleSelected ? 'Unselect all' : 'Select all'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search questions, options, or keywords…"
                    className="w-full bg-neutral-50 border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 dark:bg-neutral-950 dark:border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs dark:text-white dark:placeholder-neutral-500 focus:outline-hidden dark:focus:border-white"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {(['all', 'mcq', 'short', 'detailed'] as const).map((kind) => (
                    <button
                      key={kind}
                      onClick={() => setKindFilter(kind)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                        kindFilter === kind
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                          : 'bg-neutral-50 text-neutral-600 hover:text-neutral-900 border border-neutral-200 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-white dark:border-neutral-800'
                      }`}
                    >
                      {kind === 'all' ? 'All' : KIND_LABELS[kind]}
                      <span className="ml-1 font-mono opacity-60">{chapterKindCounts[kind]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scrollable question rows */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {visibleQuestions.length === 0 ? (
                <div className="text-center text-xs text-neutral-500 py-12">
                  No questions match the current chapter, filter, or search.
                </div>
              ) : (
                visibleQuestions.map((bq) => {
                  const isSelected = selectedKeys.has(bq.key);
                  return (
                    <div
                      key={bq.key}
                      onClick={() => toggleQuestion(bq.key)}
                      className={`rounded-xl border p-3 cursor-pointer transition flex items-start gap-3 ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-100 dark:border-white dark:bg-neutral-900'
                          : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="pt-0.5 shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-neutral-900 dark:text-white" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-400 dark:text-neutral-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-xs text-neutral-900 dark:text-white leading-relaxed">
                            <span className="font-bold mr-1.5">{bq.question.number}</span>
                            {bq.question.text}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {inPaperKeys.has(bq.key) && (
                              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                                In Paper
                              </span>
                            )}
                            <span
                              className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${KIND_CHIP_STYLES[bq.kind]}`}
                            >
                              {KIND_LABELS[bq.kind]}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                              {bq.question.marks} M
                            </span>
                          </div>
                        </div>

                        {bq.question.options && bq.question.options.length > 0 && (
                          <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                            {bq.question.options.map((opt) => (
                              <div key={opt.id} className="text-[11px] text-neutral-600 dark:text-neutral-400 flex gap-1.5">
                                <span className="text-neutral-400 dark:text-neutral-500">{opt.label}</span>
                                <span className="truncate">{opt.text}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {showAnswers && bq.question.answerKey && (
                          <div className="mt-1.5 text-[10px] text-neutral-700 dark:text-neutral-300 flex items-baseline gap-1.5">
                            <span className="font-bold uppercase tracking-wider text-[9px] bg-neutral-900 text-white dark:bg-white dark:text-black px-1.5 rounded">
                              Key
                            </span>
                            <span className="truncate">{bq.question.answerKey}</span>
                          </div>
                        )}

                        {activeChapter === ALL_CHAPTERS && (
                          <div className="mt-1 text-[10px] text-neutral-500 truncate">
                            {bq.unitName} · {bq.sectionType}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* Sticky action bar */}
      {!isLoading && banks.length > 0 && (
        <footer className="shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-neutral-900 dark:text-white font-semibold">
              <ListChecks className="w-3.5 h-3.5" />
              {selectedKeys.size} selected
            </span>
            {inPaperKeys.size > 0 && (
              <button
                type="button"
                onClick={handleLoadFromPaper}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                title="Pre-check questions currently on your paper so you can swap or uncheck them"
              >
                Sync {inPaperKeys.size} from current paper
              </button>
            )}
            <span className="hidden lg:inline truncate">
              Paper: {currentPaper.header.subjectTitle || currentPaper.title} ·{' '}
              {currentPaper.sections.length} sections · {paperQuestionCount} questions
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedKeys(new Set())}
              disabled={selectedKeys.size === 0}
              className="px-2.5 py-1.5 text-[11px] text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg transition disabled:opacity-40 cursor-pointer"
            >
              Clear
            </button>
            {onReplacePaperWithQuestions && (
              <button
                type="button"
                onClick={handleReplaceAndReturn}
                disabled={selectedKeys.size === 0}
                className="px-3.5 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold text-[11px] rounded-lg dark:hover:bg-neutral-200 transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                title="Replace the paper's questions with your checked selection and return to Paper Preview"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Update Paper ({selectedKeys.size}) &amp; Preview</span>
              </button>
            )}
            <button
              onClick={handleAddToPaper}
              disabled={selectedKeys.size === 0}
              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-white font-semibold text-[11px] rounded-lg transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Append {selectedKeys.size > 0 ? selectedKeys.size : ''}</span>
            </button>
            {onOpenShareModal && (
              <button
                onClick={onOpenShareModal}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-white text-[11px] font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Email paper, schedule Gmail send, or upload to Drive & share link"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}
            <button
              onClick={onOpenEditor}
              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-white text-[11px] font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Back to Preview</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
