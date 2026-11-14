import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ExamPaper, PastPaperRecord, SubjectTemplate } from '../types/exam';
import { getAllPastPapers } from '../data/pastPapers';
import {
  BUILT_IN_TEMPLATES,
  getCustomTemplates,
  getAllSavedPapers,
  deletePaperFromLibrary,
  savePaperToLibrary,
  mergeCustomTemplatesToStorage,
  clonePaperForEditing,
} from '../data/subjectTemplates';
import {
  loadExamPapersFromFirestore,
  loadTemplatesFromFirestore,
  deleteExamPaperFromFirestore,
} from '../services/firebase';
import {
  Plus,
  Trash2,
  Search,
  BookPlus,
  Hammer,
  HardDrive,
  Mail,
  Share2,
  Clock,
  SlidersHorizontal,
  Shuffle,
  MoreVertical,
  ArrowRight,
  Sun,
  Moon,
  LayoutGrid,
  ChevronDown,
  Eye,
  PenLine,
  FileText,
} from 'lucide-react';
import { SubjectAdderModal } from './SubjectAdderModal';
import { AppTheme } from './ThemeToggleButton';

interface DashboardProps {
  currentPaper: ExamPaper;
  theme: AppTheme;
  onToggleTheme: () => void;
  onOpenPaper: (paper: ExamPaper) => void;
  onNewBlankPaper: () => void;
  onOpenBuilder: () => void;
  onOpenAutoBlueprint?: () => void;
  onOpenPastPapers?: () => void;
  onViewPastPaper?: (pastPaper: PastPaperRecord) => void;
  onUsePastPaperPattern?: (pastPaper: PastPaperRecord) => void;
  onOpenTemplatesModal: () => void;
  onOpenGoogleDrive: () => void;
  onOpenShareForPaper?: (paper: ExamPaper) => void;
  onOpenGmailScheduled?: () => void;
  pendingScheduledCount?: number;
  onSubjectAdded?: (paper: ExamPaper, template: SubjectTemplate, openWorkspace: boolean) => void;
}

const formatPaperDate = (value?: string): string => {
  if (!value) return 'Recently edited';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently edited';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const Dashboard: React.FC<DashboardProps> = ({
  currentPaper,
  theme,
  onToggleTheme,
  onOpenPaper,
  onNewBlankPaper,
  onOpenBuilder,
  onOpenAutoBlueprint,
  onOpenPastPapers,
  onViewPastPaper,
  onUsePastPaperPattern,
  onOpenTemplatesModal,
  onOpenGoogleDrive,
  onOpenShareForPaper,
  onOpenGmailScheduled,
  pendingScheduledCount = 0,
  onSubjectAdded,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedPapers, setSavedPapers] = useState<ExamPaper[]>(getAllSavedPapers());
  const [customTemplates, setCustomTemplates] = useState<SubjectTemplate[]>(getCustomTemplates());
  const [pastPapers] = useState<PastPaperRecord[]>(() => getAllPastPapers());
  const [isSubjectAdderOpen, setIsSubjectAdderOpen] = useState(false);

  // Progressive disclosure & overflow menus
  const [isUtilitiesOpen, setIsUtilitiesOpen] = useState(false);
  const [openPaperMenuId, setOpenPaperMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openPastPaperMenuId, setOpenPastPaperMenuId] = useState<string | null>(null);
  const [showAllSavedPapers, setShowAllSavedPapers] = useState(false);
  const [showAllTemplatesInline, setShowAllTemplatesInline] = useState(false);

  const utilitiesRef = useRef<HTMLDivElement>(null);
  const libraryMenuContainerRef = useRef<HTMLDivElement>(null);

  // Sync templates and papers from Firestore on load
  useEffect(() => {
    let isMounted = true;
    const loadFromDb = async () => {
      try {
        const [remoteTemplates, remotePapers] = await Promise.all([
          loadTemplatesFromFirestore(),
          loadExamPapersFromFirestore(),
        ]);

        if (!isMounted) return;

        if (remoteTemplates && remoteTemplates.length > 0) {
          const merged = mergeCustomTemplatesToStorage(remoteTemplates);
          setCustomTemplates(merged);
        }

        if (remotePapers && remotePapers.length > 0) {
          remotePapers.forEach((p) => savePaperToLibrary(p));
          setSavedPapers(getAllSavedPapers());
        }
      } catch (err) {
        console.warn('Dashboard Firestore sync notice:', err);
      }
    };

    loadFromDb();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close menus on outside click or Escape
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (utilitiesRef.current && !utilitiesRef.current.contains(target)) {
        setIsUtilitiesOpen(false);
      }
      if (libraryMenuContainerRef.current && !libraryMenuContainerRef.current.contains(target)) {
        setOpenPaperMenuId(null);
        setConfirmDeleteId(null);
        setOpenPastPaperMenuId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUtilitiesOpen(false);
        setOpenPaperMenuId(null);
        setConfirmDeleteId(null);
        setOpenPastPaperMenuId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const allTemplates: SubjectTemplate[] = useMemo(
    () => [...BUILT_IN_TEMPLATES, ...customTemplates],
    [customTemplates]
  );

  const categories = ['All', 'Computer Science', 'Math', 'Science', 'History', 'Saved'];

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((t) => {
      const matchesCategory =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Saved'
          ? !t.isBuiltIn
          : t.category === selectedCategory ||
            t.name.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchesSearch =
        searchQuery.trim() === ''
          ? true
          : t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.classGrade && t.classGrade.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [allTemplates, selectedCategory, searchQuery]);

  const visibleTemplates = useMemo(() => {
    if (showAllTemplatesInline || searchQuery.trim() !== '' || selectedCategory !== 'All') {
      return filteredTemplates;
    }
    return filteredTemplates.slice(0, 6);
  }, [filteredTemplates, showAllTemplatesInline, searchQuery, selectedCategory]);

  const sortedSavedPapers = useMemo(() => {
    return [...savedPapers].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [savedPapers]);

  const visibleSavedPapers = showAllSavedPapers
    ? sortedSavedPapers
    : sortedSavedPapers.slice(0, 4);

  const handleDeleteSavedPaper = async (id: string) => {
    deletePaperFromLibrary(id);
    setSavedPapers(getAllSavedPapers());
    setOpenPaperMenuId(null);
    setConfirmDeleteId(null);
    try {
      await deleteExamPaperFromFirestore(id);
    } catch (err) {
      console.warn('Failed to delete paper from Firestore:', err);
    }
  };

  const handleSubjectCreated = (
    paper: ExamPaper,
    template: SubjectTemplate,
    openWorkspace: boolean
  ) => {
    setCustomTemplates(getCustomTemplates());
    setSavedPapers(getAllSavedPapers());

    if (onSubjectAdded) {
      onSubjectAdded(paper, template, openWorkspace);
    }

    if (openWorkspace) {
      onOpenPaper(paper);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const activeSectionsCount = currentPaper.sections.length;
  const activeQuestionsCount = currentPaper.sections.reduce((a, s) => a + s.questions.length, 0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#171717] dark:bg-black dark:text-white flex flex-col font-sans selection:bg-[#171717] selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* 01 — Compact Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#EAEAEA] dark:border-neutral-900 bg-white/95 dark:bg-black/90 backdrop-blur-xs">
        <div className="max-w-5xl w-full mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-4">
          {/* Left: Brand Wordmark + Primary Nav */}
          <div className="flex items-center gap-7 min-w-0">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span className="w-8 h-8 rounded-[9px] bg-[#171717] text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs tracking-tight">
                EP
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-[#171717] dark:text-white">
                Exam Paper Maker
              </span>
            </button>

            <nav className="hidden md:flex items-center gap-1" aria-label="Dashboard navigation">
              <button
                type="button"
                onClick={() => scrollToSection('section-active')}
                className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-[#171717] dark:text-white hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('section-templates')}
                className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-[#737373] hover:text-[#171717] dark:text-neutral-400 dark:hover:text-white hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                Templates
              </button>
              {onOpenPastPapers && (
                <button
                  type="button"
                  onClick={onOpenPastPapers}
                  className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-[#737373] hover:text-[#171717] dark:text-neutral-400 dark:hover:text-white hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  Past Papers
                </button>
              )}
              <button
                type="button"
                onClick={() => scrollToSection('section-library')}
                className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-[#737373] hover:text-[#171717] dark:text-neutral-400 dark:hover:text-white hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                Library
              </button>
            </nav>
          </div>

          {/* Right: Utilities Popover + Primary CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative" ref={utilitiesRef}>
              <button
                type="button"
                onClick={() => setIsUtilitiesOpen((prev) => !prev)}
                aria-expanded={isUtilitiesOpen}
                aria-haspopup="menu"
                aria-label="Workspace utilities and settings"
                className="h-9 px-3 rounded-[9px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 text-[#171717] dark:text-neutral-200 text-[13px] font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#737373] dark:text-neutral-400" />
                <span className="hidden sm:inline">Utilities</span>
                {pendingScheduledCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                )}
                <ChevronDown className="w-3.5 h-3.5 text-[#737373] dark:text-neutral-400" />
              </button>

              {isUtilitiesOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 rounded-[12px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg py-1.5 z-40"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onToggleTheme();
                    }}
                    className="w-full px-3.5 py-2 text-left text-[13px] text-[#171717] dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 flex items-center justify-between gap-2 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      {theme === 'dark' ? (
                        <Sun className="w-4 h-4 text-[#737373] dark:text-neutral-400" />
                      ) : (
                        <Moon className="w-4 h-4 text-[#737373] dark:text-neutral-400" />
                      )}
                      <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                    </span>
                  </button>

                  <div className="my-1 border-t border-[#EAEAEA] dark:border-neutral-900" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsUtilitiesOpen(false);
                      onOpenGoogleDrive();
                    }}
                    className="w-full px-3.5 py-2 text-left text-[13px] text-[#171717] dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <HardDrive className="w-4 h-4 text-[#737373] dark:text-neutral-400" />
                    <span>Google Drive</span>
                  </button>

                  {onOpenGmailScheduled && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsUtilitiesOpen(false);
                        onOpenGmailScheduled();
                      }}
                      className="w-full px-3.5 py-2 text-left text-[13px] text-[#171717] dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 flex items-center justify-between gap-2 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-[#737373] dark:text-neutral-400" />
                        <span>Scheduled Gmail</span>
                      </span>
                      {pendingScheduledCount > 0 && (
                        <span className="text-[12px] font-mono tabular-nums text-indigo-600 dark:text-indigo-400 font-semibold">
                          {pendingScheduledCount}
                        </span>
                      )}
                    </button>
                  )}

                  <div className="my-1 border-t border-[#EAEAEA] dark:border-neutral-900" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsUtilitiesOpen(false);
                      setIsSubjectAdderOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-[13px] text-[#171717] dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <BookPlus className="w-4 h-4 text-[#737373] dark:text-neutral-400" />
                    <span>Import Curriculum JSON</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsUtilitiesOpen(false);
                      onOpenTemplatesModal();
                    }}
                    className="w-full px-3.5 py-2 text-left text-[13px] text-[#171717] dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <LayoutGrid className="w-4 h-4 text-[#737373] dark:text-neutral-400" />
                    <span>Browse All Templates</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onNewBlankPaper}
              className="h-9 px-3.5 rounded-[9px] bg-[#171717] hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-[13px] font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Create a new blank exam paper"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Paper</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-10">
        {/* 02 — Continue Working (Dominant Focal Anchor) */}
        <section id="section-active" aria-labelledby="active-paper-heading">
          <div className="rounded-[14px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl min-w-0">
              <div className="flex items-center gap-2 text-[12px] font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                <span className="uppercase tracking-[0.06em] font-semibold text-[#737373] dark:text-neutral-400">
                  Your Active Paper
                </span>
                <span className="text-[#737373] dark:text-neutral-600">·</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">In progress</span>
              </div>

              <h1
                id="active-paper-heading"
                className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-[#171717] dark:text-white leading-tight truncate"
              >
                {currentPaper.header.subjectTitle || currentPaper.title || 'New Subject'}
              </h1>

              <p className="text-[14px] text-[#737373] dark:text-neutral-400 tabular-nums">
                {currentPaper.header.examinationTitle || 'Examination Paper'} ·{' '}
                {activeSectionsCount} {activeSectionsCount === 1 ? 'Section' : 'Sections'} ·{' '}
                {activeQuestionsCount} {activeQuestionsCount === 1 ? 'Question' : 'Questions'} ·{' '}
                {currentPaper.header.maxMarks} Marks
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {onOpenShareForPaper && (
                <button
                  type="button"
                  onClick={() => onOpenShareForPaper(currentPaper)}
                  className="px-4 py-2.5 rounded-[10px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 text-[#171717] dark:text-neutral-200 text-[14px] font-medium transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  title="Email paper, schedule Gmail send, or upload to Google Drive"
                >
                  <Share2 className="w-4 h-4 text-[#737373] dark:text-neutral-400" />
                  <span>Email / Share</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenPaper(currentPaper)}
                className="px-5 py-2.5 rounded-[10px] bg-[#171717] hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-[14px] font-semibold transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>Continue editing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* 03 — Create an Exam Paper */}
        <section aria-labelledby="create-paper-heading" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2
                id="create-paper-heading"
                className="text-[18px] font-semibold tracking-tight text-[#171717] dark:text-white"
              >
                Create an exam paper
              </h2>
              <p className="text-[14px] text-[#737373] dark:text-neutral-400 mt-0.5">
                Start from an automated chapter blueprint or hand-pick questions — both open in the Editor next.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsSubjectAdderOpen(true)}
              className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <BookPlus className="w-3.5 h-3.5" />
              <span>Import curriculum JSON</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {onOpenAutoBlueprint && (
              <button
                type="button"
                onClick={onOpenAutoBlueprint}
                className="group text-left rounded-[14px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 p-6 transition flex flex-col justify-between gap-5 cursor-pointer"
              >
                <div className="space-y-2.5">
                  <div className="w-9 h-9 rounded-[10px] border border-[#EAEAEA] dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900 flex items-center justify-center text-[#171717] dark:text-white">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <h3 className="text-[16px] font-semibold tracking-tight text-[#171717] dark:text-white">
                    Auto Generate
                  </h3>
                  <p className="text-[14px] text-[#737373] dark:text-neutral-400 leading-relaxed">
                    Select chapters, set section counts, and let pre-weighted chapter balance or AI assemble a balanced draft for your review.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-indigo-600 dark:text-indigo-400">
                  <span>Configure blueprint</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenBuilder}
              className="group text-left rounded-[14px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 p-6 transition flex flex-col justify-between gap-5 cursor-pointer"
            >
              <div className="space-y-2.5">
                <div className="w-9 h-9 rounded-[10px] border border-[#EAEAEA] dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900 flex items-center justify-center text-[#171717] dark:text-white">
                  <Hammer className="w-4 h-4" />
                </div>
                <h3 className="text-[16px] font-semibold tracking-tight text-[#171717] dark:text-white">
                  Manual Builder
                </h3>
                <p className="text-[14px] text-[#737373] dark:text-neutral-400 leading-relaxed">
                  Browse the chapter-wise question bank, inspect model answers, pick exact questions, and send them into the Editor.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#171717] dark:text-neutral-200">
                <span>Choose from question bank</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </div>
        </section>

        {/* 04 — Subject Templates */}
        <section id="section-templates" aria-labelledby="templates-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="templates-heading"
              className="text-[18px] font-semibold tracking-tight text-[#171717] dark:text-white"
            >
              Find a template
            </h2>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsSubjectAdderOpen(true)}
                className="text-[13px] font-medium text-[#737373] hover:text-[#171717] dark:text-neutral-400 dark:hover:text-white transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>

              <button
                type="button"
                onClick={onOpenTemplatesModal}
                className="text-[13px] font-medium text-[#171717] hover:text-indigo-600 dark:text-neutral-200 dark:hover:text-indigo-400 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs + Quiet Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-[9px] text-[13px] font-medium transition cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-[#171717] text-white dark:bg-white dark:text-black'
                      : 'text-[#737373] hover:text-[#171717] hover:bg-white dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-60 shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373] dark:text-neutral-500" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-neutral-950 border border-[#EAEAEA] dark:border-neutral-800 rounded-[9px] pl-8.5 pr-3 py-1.5 text-[13px] text-[#171717] dark:text-white placeholder-[#737373] dark:placeholder-neutral-500 focus:outline-hidden focus:border-[#171717] dark:focus:border-white transition"
              />
            </div>
          </div>

          {/* Templates Grid */}
          {visibleTemplates.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleTemplates.map((template) => {
                  const sectionCount = template.paper.sections.length;
                  const questionCount = template.paper.sections.reduce(
                    (acc, sec) => acc + sec.questions.length,
                    0
                  );

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => onOpenPaper(clonePaperForEditing(template.paper))}
                      className="group text-left rounded-[13px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 p-4 sm:p-5 transition flex flex-col justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1.5">
                        <div className="text-[12px] text-[#737373] dark:text-neutral-400 tabular-nums truncate">
                          {template.category}
                          {template.classGrade ? ` · ${template.classGrade}` : ''} ·{' '}
                          {template.paper.header.maxMarks} Marks
                        </div>

                        <h3 className="text-[15px] font-semibold text-[#171717] dark:text-white tracking-tight">
                          {template.name}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between text-[13px] text-[#737373] dark:text-neutral-400 tabular-nums">
                        <span>
                          {sectionCount} {sectionCount === 1 ? 'Section' : 'Sections'} ·{' '}
                          {questionCount} {questionCount === 1 ? 'Question' : 'Questions'}
                        </span>
                        <span className="font-medium text-[#171717] dark:text-neutral-200 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                          <span>Use</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredTemplates.length > 6 &&
                searchQuery.trim() === '' &&
                selectedCategory === 'All' && (
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAllTemplatesInline((prev) => !prev)}
                      className="text-[13px] font-medium text-[#737373] hover:text-[#171717] dark:text-neutral-400 dark:hover:text-white transition cursor-pointer"
                    >
                      {showAllTemplatesInline
                        ? 'Show fewer templates'
                        : `Show all ${filteredTemplates.length} templates`}
                    </button>
                  </div>
                )}
            </>
          ) : (
            <div className="rounded-[13px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8 text-center space-y-3">
              <p className="text-[14px] text-[#737373] dark:text-neutral-400">
                No templates match "{searchQuery || selectedCategory}".
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-1.5 rounded-[9px] border border-[#EAEAEA] dark:border-neutral-800 text-[13px] font-medium text-[#171717] dark:text-white hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 transition cursor-pointer"
                >
                  Reset filters
                </button>
                <button
                  type="button"
                  onClick={() => setIsSubjectAdderOpen(true)}
                  className="px-3.5 py-1.5 rounded-[9px] bg-[#171717] text-white dark:bg-white dark:text-black text-[13px] font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition cursor-pointer"
                >
                  Import custom JSON
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 05 — Library: Recent Saved Papers & Past Board Papers */}
        <div ref={libraryMenuContainerRef} id="section-library" className="space-y-8">
          {/* Saved Papers */}
          <section aria-labelledby="saved-papers-heading" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2
                id="saved-papers-heading"
                className="text-[18px] font-semibold tracking-tight text-[#171717] dark:text-white"
              >
                Saved Papers
              </h2>

              {sortedSavedPapers.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllSavedPapers((prev) => !prev)}
                  className="text-[13px] font-medium text-[#171717] hover:text-indigo-600 dark:text-neutral-200 dark:hover:text-indigo-400 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>
                    {showAllSavedPapers ? 'Show recent' : `View all (${sortedSavedPapers.length})`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {visibleSavedPapers.length > 0 ? (
              <div className="rounded-[14px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 divide-y divide-[#EAEAEA] dark:divide-neutral-900">
                {visibleSavedPapers.map((saved) => {
                  const isMenuOpen = openPaperMenuId === saved.id;
                  const isConfirmingDelete = confirmDeleteId === saved.id;

                  return (
                    <div
                      key={saved.id}
                      onClick={() => onOpenPaper(saved)}
                      className="px-4 sm:px-5 py-3.5 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900/60 transition flex items-center justify-between gap-4 cursor-pointer first:rounded-t-[14px] last:rounded-b-[14px]"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <FileText className="w-4 h-4 text-[#737373] dark:text-neutral-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[15px] font-medium text-[#171717] dark:text-white truncate">
                            {saved.header.subjectTitle || saved.title || 'Untitled Exam Paper'}
                          </div>
                          <div className="text-[13px] text-[#737373] dark:text-neutral-400 truncate tabular-nums">
                            {saved.header.examinationTitle} ·{' '}
                            {formatPaperDate(saved.updatedAt || saved.createdAt)} ·{' '}
                            {saved.sections.length} Sections
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-3 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="hidden sm:inline text-[13px] text-[#737373] dark:text-neutral-400 tabular-nums">
                          {saved.header.maxMarks} Marks
                        </span>

                        <button
                          type="button"
                          onClick={() => onOpenPaper(saved)}
                          className="px-3 py-1.5 rounded-[9px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 text-[13px] font-medium text-[#171717] dark:text-white transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenPastPaperMenuId(null);
                              setConfirmDeleteId(null);
                              setOpenPaperMenuId(isMenuOpen ? null : saved.id);
                            }}
                            aria-label={`More actions for ${saved.header.subjectTitle || saved.title}`}
                            aria-expanded={isMenuOpen}
                            className="p-1.5 rounded-[8px] text-[#737373] hover:text-[#171717] hover:bg-[#F8F9FA] dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div
                              role="menu"
                              className="absolute right-0 mt-1.5 w-48 rounded-[10px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg py-1 z-30"
                            >
                              {onOpenShareForPaper && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenPaperMenuId(null);
                                    onOpenShareForPaper(saved);
                                  }}
                                  className="w-full px-3 py-2 text-left text-[13px] text-[#171717] dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 flex items-center gap-2 cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5 text-[#737373] dark:text-neutral-400" />
                                  <span>Email / Share</span>
                                </button>
                              )}

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  if (!isConfirmingDelete) {
                                    setConfirmDeleteId(saved.id);
                                  } else {
                                    handleDeleteSavedPaper(saved.id);
                                  }
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{isConfirmingDelete ? 'Confirm delete' : 'Delete paper'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[14px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-[14px] text-[#737373] dark:text-neutral-400">
                  No saved papers yet. Create a blank paper or save from the Editor to see recent work here.
                </p>
                <button
                  type="button"
                  onClick={onNewBlankPaper}
                  className="self-start sm:self-auto px-3.5 py-1.5 rounded-[9px] bg-[#171717] text-white dark:bg-white dark:text-black text-[13px] font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition cursor-pointer whitespace-nowrap"
                >
                  Create first paper
                </button>
              </div>
            )}
          </section>

          {/* Compact Past Papers Row(s) */}
          {pastPapers.length > 0 && (
            <section aria-labelledby="past-papers-heading" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2
                  id="past-papers-heading"
                  className="text-[18px] font-semibold tracking-tight text-[#171717] dark:text-white"
                >
                  Past Papers
                </h2>

                {onOpenPastPapers && (
                  <button
                    type="button"
                    onClick={onOpenPastPapers}
                    className="text-[13px] font-medium text-[#171717] hover:text-indigo-600 dark:text-neutral-200 dark:hover:text-indigo-400 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <span>Browse archive</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="rounded-[14px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 divide-y divide-[#EAEAEA] dark:divide-neutral-900">
                {pastPapers.map((pp) => {
                  const isMenuOpen = openPastPaperMenuId === pp.id;
                  const scansCount = pp.sourceImages?.length || 0;

                  return (
                    <div
                      key={pp.id}
                      className="px-4 sm:px-5 py-3.5 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:rounded-t-[14px] last:rounded-b-[14px]"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-[15px] font-medium text-[#171717] dark:text-white truncate">
                          {pp.title}
                        </div>
                        <div className="text-[13px] text-[#737373] dark:text-neutral-400 truncate tabular-nums">
                          {pp.year} · {pp.boardOrGroup} · {pp.paper.header.maxMarks} Marks ·{' '}
                          {pp.sectionPatterns.length} Sections
                          {scansCount > 0 ? ` · ${scansCount} Scans` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onViewPastPaper && (
                          <button
                            type="button"
                            onClick={() => onViewPastPaper(pp)}
                            className="px-3 py-1.5 rounded-[9px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 text-[13px] font-medium text-[#171717] dark:text-neutral-200 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#737373] dark:text-neutral-400" />
                            <span>View Scans</span>
                          </button>
                        )}

                        {onUsePastPaperPattern && (
                          <button
                            type="button"
                            onClick={() => onUsePastPaperPattern(pp)}
                            className="px-3 py-1.5 rounded-[9px] bg-[#171717] hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-[13px] font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <Shuffle className="w-3.5 h-3.5" />
                            <span>Use Pattern</span>
                          </button>
                        )}

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenPaperMenuId(null);
                              setConfirmDeleteId(null);
                              setOpenPastPaperMenuId(isMenuOpen ? null : pp.id);
                            }}
                            aria-label={`More actions for ${pp.title}`}
                            aria-expanded={isMenuOpen}
                            className="p-1.5 rounded-[8px] text-[#737373] hover:text-[#171717] hover:bg-[#F8F9FA] dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div
                              role="menu"
                              className="absolute right-0 mt-1.5 w-52 rounded-[10px] border border-[#EAEAEA] dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg py-1 z-30"
                            >
                              {onViewPastPaper && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenPastPaperMenuId(null);
                                    onViewPastPaper(pp);
                                  }}
                                  className="w-full px-3 py-2 text-left text-[13px] text-[#171717] dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#737373] dark:text-neutral-400" />
                                  <span>View Questions &amp; Scans</span>
                                </button>
                              )}

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenPastPaperMenuId(null);
                                  onOpenPaper(clonePaperForEditing(pp.paper));
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] text-[#171717] dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-900 flex items-center gap-2 cursor-pointer"
                              >
                                <PenLine className="w-3.5 h-3.5 text-[#737373] dark:text-neutral-400" />
                                <span>Open Exact Paper</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Subject Adder Modal */}
      <SubjectAdderModal
        isOpen={isSubjectAdderOpen}
        onClose={() => setIsSubjectAdderOpen(false)}
        onSubjectAdded={handleSubjectCreated}
      />
    </div>
  );
};
