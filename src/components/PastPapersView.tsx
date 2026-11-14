import React, { useMemo, useState } from 'react';
import { ExamPaper, PastPaperRecord } from '../types/exam';
import {
  createPastPaperRecordFromPaper,
  deleteCustomPastPaper,
  getAllPastPapers,
  saveCustomPastPaper,
} from '../data/pastPapers';
import { AppMode, ModeSwitcher } from './ModeSwitcher';
import { AppTheme, ThemeToggleButton } from './ThemeToggleButton';
import {
  Award,
  BookmarkPlus,
  Clock,
  Eye,
  FileStack,
  Home,
  Images,
  PenLine,
  Search,
  Shuffle,
  Trash2,
} from 'lucide-react';

interface PastPapersViewProps {
  currentPaper: ExamPaper;
  theme: AppTheme;
  onToggleTheme: () => void;
  onSwitchMode: (mode: AppMode) => void;
  onOpenDashboard: () => void;
  onViewPastPaper: (pastPaper: PastPaperRecord) => void;
  onOpenExactPastPaper: (pastPaper: PastPaperRecord) => void;
  onUsePatternDifferentQuestions: (pastPaper: PastPaperRecord) => void;
}

export const PastPapersView: React.FC<PastPapersViewProps> = ({
  currentPaper,
  theme,
  onToggleTheme,
  onSwitchMode,
  onOpenDashboard,
  onViewPastPaper,
  onOpenExactPastPaper,
  onUsePatternDifferentQuestions,
}) => {
  const [pastPapers, setPastPapers] = useState<PastPaperRecord[]>(() => getAllPastPapers());
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [isSaveFormOpen, setIsSaveFormOpen] = useState(false);

  const [saveYear, setSaveYear] = useState(String(new Date().getFullYear()));
  const [saveSubject, setSaveSubject] = useState(
    currentPaper.header.subjectTitle.replace(/^SUBJECT:\s*/i, '') || currentPaper.title || 'Computer Science'
  );
  const [saveClassGrade, setSaveClassGrade] = useState(currentPaper.classGrade || 'Class 11');
  const [saveGroup, setSaveGroup] = useState(
    currentPaper.header.groupName || 'Science General Group'
  );

  const subjects = useMemo(() => {
    const set = new Set<string>(['All']);
    pastPapers.forEach((p) => set.add(p.subject));
    return Array.from(set);
  }, [pastPapers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pastPapers.filter((p) => {
      const matchSub = subjectFilter === 'All' || p.subject === subjectFilter;
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.year.toLowerCase().includes(q) ||
        p.subject.toLowerCase().includes(q) ||
        p.boardOrGroup.toLowerCase().includes(q);
      return matchSub && matchQuery;
    });
  }, [pastPapers, search, subjectFilter]);

  const handleSaveCurrentAsPastPaper = (e: React.FormEvent) => {
    e.preventDefault();
    const record = createPastPaperRecordFromPaper(currentPaper, {
      year: saveYear.trim() || String(new Date().getFullYear()),
      subject: saveSubject.trim() || 'Computer Science',
      classGrade: saveClassGrade.trim() || 'Class 11',
      boardOrGroup: saveGroup.trim() || 'General Group',
      category:
        (currentPaper.subjectCategory as PastPaperRecord['category']) || 'Computer Science',
    });
    saveCustomPastPaper(record);
    setPastPapers(getAllPastPapers());
    setIsSaveFormOpen(false);
  };

  const handleDeleteCustom = (id: string) => {
    if (!window.confirm('Remove this saved past paper from your archive?')) return;
    deleteCustomPastPaper(id);
    setPastPapers(getAllPastPapers());
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-neutral-50 text-neutral-900 dark:bg-black dark:text-white select-none">
      {/* Top Bar */}
      <header className="h-12 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenDashboard}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900 rounded-lg transition cursor-pointer"
            title="Return to Dashboard"
          >
            <Home className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

          <ModeSwitcher active="past-papers" onChange={onSwitchMode} />

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 pl-2">
            <FileStack className="w-3.5 h-3.5" />
            <span className="font-semibold text-neutral-900 dark:text-white">
              Past Papers &amp; Pattern Clone
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsSaveFormOpen((v) => !v)}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save Current as Past Paper</span>
          </button>

          <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Save Current Paper Form */}
          {isSaveFormOpen && (
            <form
              onSubmit={handleSaveCurrentAsPastPaper}
              className="p-5 rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">Archive Current Active Paper as a Past Paper</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Saves its section counts, marks scheme, and questions so you can reuse its pattern later with different questions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSaveFormOpen(false)}
                  className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <label className="space-y-1 text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Year</span>
                  <input
                    type="text"
                    value={saveYear}
                    onChange={(e) => setSaveYear(e.target.value)}
                    className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 dark:bg-black dark:border-neutral-800 rounded-lg text-xs focus:outline-none"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Subject</span>
                  <input
                    type="text"
                    value={saveSubject}
                    onChange={(e) => setSaveSubject(e.target.value)}
                    className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 dark:bg-black dark:border-neutral-800 rounded-lg text-xs focus:outline-none"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Class / Grade</span>
                  <input
                    type="text"
                    value={saveClassGrade}
                    onChange={(e) => setSaveClassGrade(e.target.value)}
                    className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 dark:bg-black dark:border-neutral-800 rounded-lg text-xs focus:outline-none"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Group / Board</span>
                  <input
                    type="text"
                    value={saveGroup}
                    onChange={(e) => setSaveGroup(e.target.value)}
                    className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 dark:bg-black dark:border-neutral-800 rounded-lg text-xs focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Save to Past Papers Archive
                </button>
              </div>
            </form>
          )}

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {subjects.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubjectFilter(sub)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    subjectFilter === sub
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold'
                      : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-white dark:border-neutral-800'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search past papers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-neutral-300 text-neutral-900 placeholder-neutral-400 dark:bg-neutral-950 dark:border-neutral-800 dark:text-white dark:placeholder-neutral-500 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Past Papers Cards */}
          <div className="space-y-4">
            {filtered.map((pp) => (
              <div
                key={pp.id}
                className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-black font-bold">
                        {pp.year}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800">
                        {pp.subject}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800">
                        {pp.boardOrGroup}
                      </span>
                      {pp.sourceImages && pp.sourceImages.length > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800 inline-flex items-center gap-1">
                          <Images className="w-3 h-3" />
                          {pp.sourceImages.length} Scans
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold tracking-tight">{pp.title}</h3>
                    {pp.description && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {pp.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-500 dark:text-neutral-400 pt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Duration: {pp.paper.header.duration}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        Max Marks: {pp.paper.header.maxMarks}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!pp.isBuiltIn && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustom(pp.id)}
                        className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-white dark:hover:bg-neutral-900 rounded-lg transition cursor-pointer"
                        title="Delete saved past paper"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onViewPastPaper(pp)}
                      className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Questions &amp; Scans</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenExactPastPaper(pp)}
                      className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      <span>Open Exact Paper</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUsePatternDifferentQuestions(pp)}
                      className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Use Pattern (Different Questions)</span>
                    </button>
                  </div>
                </div>

                {/* Section Pattern Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-neutral-200 dark:border-neutral-900">
                  {pp.sectionPatterns.map((sp) => (
                    <div
                      key={sp.name}
                      className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-black space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold">{sp.name}</span>
                        <span className="text-[11px] font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                          {sp.marksBadge}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                        {sp.questionCount} {sp.kind.toUpperCase()}s • Attempt{' '}
                        {sp.attemptCount === sp.questionCount ? 'all' : `any ${sp.attemptCount}`} (
                        {sp.marksPerQuestion}m each)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
