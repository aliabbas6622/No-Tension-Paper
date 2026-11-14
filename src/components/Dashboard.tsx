import React, { useState, useEffect } from 'react';
import { ExamPaper, SubjectTemplate } from '../types/exam';
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
  FileText,
  Trash2,
  ChevronRight,
  Search,
  BookPlus,
  Hammer,
  PenLine,
  HardDrive,
  Mail,
  Share2,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import { SubjectAdderModal } from './SubjectAdderModal';
import { AppTheme, ThemeToggleButton } from './ThemeToggleButton';

interface DashboardProps {
  currentPaper: ExamPaper;
  theme: AppTheme;
  onToggleTheme: () => void;
  onOpenPaper: (paper: ExamPaper) => void;
  onNewBlankPaper: () => void;
  onOpenBuilder: () => void;
  onOpenAutoBlueprint?: () => void;
  onOpenTemplatesModal: () => void;
  onOpenGoogleDrive: () => void;
  onOpenShareForPaper?: (paper: ExamPaper) => void;
  onOpenGmailScheduled?: () => void;
  pendingScheduledCount?: number;
  onSubjectAdded?: (paper: ExamPaper, template: SubjectTemplate, openWorkspace: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentPaper,
  theme,
  onToggleTheme,
  onOpenPaper,
  onNewBlankPaper,
  onOpenBuilder,
  onOpenAutoBlueprint,
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
  const [isSubjectAdderOpen, setIsSubjectAdderOpen] = useState(false);

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

  const allTemplates: SubjectTemplate[] = [...BUILT_IN_TEMPLATES, ...customTemplates];

  const categories = ['All', 'Computer Science', 'Math', 'Science', 'History', 'Saved Templates'];

  const filteredTemplates = allTemplates.filter((t) => {
    const matchesCategory =
      selectedCategory === 'All'
        ? true
        : selectedCategory === 'Saved Templates'
        ? !t.isBuiltIn
        : t.category === selectedCategory || t.name.toLowerCase().includes(selectedCategory.toLowerCase());

    const matchesSearch =
      searchQuery === ''
        ? true
        : t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.classGrade && t.classGrade.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const handleDeleteSavedPaper = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this saved exam paper?')) {
      deletePaperFromLibrary(id);
      setSavedPapers(getAllSavedPapers());
      try {
        await deleteExamPaperFromFirestore(id);
      } catch (err) {
        console.warn('Failed to delete paper from Firestore:', err);
      }
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

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-black dark:text-white flex flex-col font-sans selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Ultra-Minimal Monochrome Top Navigation */}
      <header className="border-b border-neutral-200 dark:border-neutral-900 bg-white/90 dark:bg-black/90 sticky top-0 z-20 backdrop-blur-xs px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-sm tracking-tighter">
            EP
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase text-neutral-900 dark:text-white">
              Exam Paper Maker
            </h1>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Minimalist Assessment Dashboard</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Adder Button */}
          <button
            onClick={() => setIsSubjectAdderOpen(true)}
            className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            title="Import curriculum answers JSON to add a new subject"
          >
            <BookPlus className="w-3.5 h-3.5" />
            <span>+ Subject Adder</span>
          </button>

          {/* Auto Paper Blueprint */}
          {onOpenAutoBlueprint && (
            <button
              onClick={onOpenAutoBlueprint}
              className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Select chapters and section counts using AI or pre-weighted balance"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Auto Paper</span>
            </button>
          )}

          {/* Question Bank Builder */}
          <button
            onClick={onOpenBuilder}
            className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Build a paper manually from the chapter-wise question bank"
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Builder</span>
          </button>

          {/* Google Drive */}
          <button
            onClick={onOpenGoogleDrive}
            className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Open or save exam papers in Google Drive"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Google Drive</span>
          </button>

          {/* Scheduled Gmail Queue */}
          {onOpenGmailScheduled && (
            <button
              onClick={onOpenGmailScheduled}
              className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="View or schedule Gmail deliveries"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                Scheduled{pendingScheduledCount > 0 ? ` (${pendingScheduledCount})` : ''}
              </span>
            </button>
          )}

          {/* Theme Toggle */}
          <ThemeToggleButton theme={theme} onToggle={onToggleTheme} showLabel />

          {/* New Blank Paper Button */}
          <button
            onClick={onNewBlankPaper}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            title="Create a new fresh exam paper"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Exam Paper</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-10">
        {/* Quick Hero Banner */}
        <div className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-600 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400">
              Active Paper
            </span>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
              {currentPaper.header.subjectTitle || 'Current Exam Paper'}
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {currentPaper.header.examinationTitle} • {currentPaper.sections.length} Sections •{' '}
              {currentPaper.sections.reduce((a, s) => a + s.questions.length, 0)} Questions • Max Marks:{' '}
              {currentPaper.header.maxMarks}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenShareForPaper && (
              <button
                onClick={() => onOpenShareForPaper(currentPaper)}
                className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-white font-semibold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
                title="Email paper, schedule Gmail send, or upload to Drive & share link"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Email / Share Link</span>
              </button>
            )}
            <button
              onClick={() => onOpenPaper(currentPaper)}
              className="px-5 py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold text-xs rounded-xl dark:hover:bg-neutral-200 transition flex items-center gap-2 cursor-pointer"
            >
              <span>Edit Paper in Workspace</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The app's primary creation surfaces */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {onOpenAutoBlueprint && (
            <div className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 p-6 rounded-2xl flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">Auto Paper</h3>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Select chapters, set question counts per section, choose Pre-Weighted chapter balance or AI selection, review and swap picks, then send directly to the Editor.
                </p>
              </div>
              <button
                onClick={onOpenAutoBlueprint}
                className="self-start px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold text-xs rounded-xl dark:hover:bg-neutral-200 transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Configure Blueprint</span>
              </button>
            </div>
          )}

          <div className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 p-6 rounded-2xl flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white flex items-center justify-center">
                  <Hammer className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">Builder</h3>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Browse the chapter-wise question bank manually, inspect model answers, tick the exact questions you want, and append them into your active paper.
              </p>
            </div>
            <button
              onClick={onOpenBuilder}
              className="self-start px-4 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-white font-semibold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Hammer className="w-3.5 h-3.5" />
              <span>Open Builder</span>
            </button>
          </div>

          <div className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 p-6 rounded-2xl flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white flex items-center justify-center">
                  <PenLine className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">Editor</h3>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Hand-edit the paper: header metadata, sections, marks, options and answer keys,
                with the live A4 preview beside you and export to PDF, Word, Google Docs, or Gmail.
              </p>
            </div>
            <button
              onClick={() => onOpenPaper(currentPaper)}
              className="self-start px-4 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-white font-semibold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Open Editor</span>
            </button>
          </div>
        </div>

        {/* Featured Curriculum Subject Adder Hero Banner */}
        <div className="border border-neutral-200 bg-gradient-to-r from-white via-neutral-100 to-white dark:border-neutral-800 dark:from-neutral-950 dark:via-neutral-900/50 dark:to-neutral-950 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-black font-bold">
                Feature
              </span>
              <span className="text-xs font-semibold text-neutral-900 dark:text-white tracking-wide uppercase">
                Curriculum Subject Adder
              </span>
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
              Add New Subject from Curriculum Answers JSON
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Specify your <strong>Class</strong> (e.g. Class 11, Class 9) and <strong>Subject</strong>, then paste curriculum JSON with Units, Pages, MCQs, short questions, and answer keys. The system instantly structures an official exam paper and stores it in your subject templates library.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSubjectAdderOpen(true)}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <BookPlus className="w-4 h-4" />
              <span>Launch Subject Adder</span>
            </button>
          </div>
        </div>

        {/* Section: Subject Templates */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                Subject Templates
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Choose a pre-formatted subject template or create your own with the Subject Adder
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Add Subject Button */}
              <button
                onClick={() => setIsSubjectAdderOpen(true)}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 dark:text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>

              {/* Search Input */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 dark:bg-neutral-950 dark:border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs dark:text-white dark:placeholder-neutral-500 focus:outline-hidden dark:focus:border-white"
                />
              </div>
            </div>
          </div>

          {/* Subject Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold'
                    : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-white dark:border-neutral-900 dark:hover:border-neutral-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => onOpenPaper(clonePaperForEditing(template.paper))}
                className="group border border-neutral-200 bg-white hover:bg-neutral-100/70 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900 p-5 rounded-xl transition cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800">
                        {template.category}
                      </span>
                      {template.classGrade && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-black font-bold">
                          {template.classGrade}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                      {template.paper.header.maxMarks} Marks
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm text-neutral-900 dark:text-white transition">
                    {template.name}
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                    {template.description || template.paper.header.subjectTitle}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-200 dark:border-neutral-900 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>
                    {template.paper.sections.length} Sections •{' '}
                    {template.paper.sections.reduce((a, s) => a + s.questions.length, 0)} Qs
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white group-hover:underline flex items-center gap-1">
                    <span>Use Template</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Saved Papers Library */}
        {savedPapers.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-900">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                Saved Papers Library ({savedPapers.length})
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Previously authored exam papers saved on this machine
              </p>
            </div>

            <div className="divide-y divide-neutral-200 border border-neutral-200 dark:divide-neutral-900 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-950">
              {savedPapers.map((saved) => (
                <div
                  key={saved.id}
                  onClick={() => onOpenPaper(saved)}
                  className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:border-neutral-800 flex items-center justify-center dark:text-white shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                        {saved.header.subjectTitle || saved.title}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {saved.header.examinationTitle} • {saved.sections.length} Sections • Max Marks:{' '}
                        {saved.header.maxMarks}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenShareForPaper && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenShareForPaper(saved);
                        }}
                        className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-700 text-xs font-medium dark:text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                        title="Email, schedule Gmail send, or upload to Drive & share link"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Deliver / Share</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteSavedPaper(e, saved.id)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 dark:hover:text-white rounded dark:hover:bg-neutral-800 transition cursor-pointer"
                      title="Delete paper"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPaper(saved);
                      }}
                      className="px-3 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold dark:hover:bg-neutral-200 text-xs rounded-lg transition cursor-pointer"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
