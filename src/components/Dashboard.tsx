import React, { useState } from 'react';
import { ExamPaper, SubjectTemplate } from '../types/exam';
import {
  BUILT_IN_TEMPLATES,
  getCustomTemplates,
  getAllSavedPapers,
  deletePaperFromLibrary,
} from '../data/subjectTemplates';
import {
  Plus,
  FileText,
  Bookmark,
  Clock,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Sliders,
  FolderOpen,
  Search,
} from 'lucide-react';

interface DashboardProps {
  currentPaper: ExamPaper;
  onOpenPaper: (paper: ExamPaper) => void;
  onNewBlankPaper: () => void;
  onOpenTemplatesModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentPaper,
  onOpenPaper,
  onNewBlankPaper,
  onOpenTemplatesModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedPapers, setSavedPapers] = useState<ExamPaper[]>(getAllSavedPapers());
  const customTemplates = getCustomTemplates();

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
          t.subject.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleDeleteSavedPaper = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this saved exam paper?')) {
      deletePaperFromLibrary(id);
      setSavedPapers(getAllSavedPapers());
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Ultra-Minimal Monochrome Top Navigation */}
      <header className="border-b border-neutral-900 bg-black/90 sticky top-0 z-20 backdrop-blur-xs px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-sm tracking-tighter">
            EP
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase text-white">
              Exam Paper Maker
            </h1>
            <p className="text-[11px] text-neutral-400">Minimalist Assessment Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Return to Active Paper Workspace */}
          <button
            onClick={() => onOpenPaper(currentPaper)}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            title="Resume editing current paper"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open Current Workspace</span>
          </button>

          {/* New Blank Paper Button */}
          <button
            onClick={onNewBlankPaper}
            className="px-3.5 py-1.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Create a new fresh exam paper"
          >
            <Plus className="w-3.5 h-3.5 text-black" />
            <span>New Exam Paper</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-10">
        {/* Quick Hero Banner */}
        <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
              Active Paper
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {currentPaper.header.subjectTitle || 'Current Exam Paper'}
            </h2>
            <p className="text-xs text-neutral-400">
              {currentPaper.header.examinationTitle} • {currentPaper.sections.length} Sections •{' '}
              {currentPaper.sections.reduce((a, s) => a + s.questions.length, 0)} Questions • Max Marks:{' '}
              {currentPaper.header.maxMarks}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPaper(currentPaper)}
              className="px-5 py-2.5 bg-white text-black font-semibold text-xs rounded-xl hover:bg-neutral-200 transition flex items-center gap-2 cursor-pointer"
            >
              <span>Edit Paper in Workspace</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section: Subject Templates */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Subject Templates
              </h3>
              <p className="text-xs text-neutral-400">
                Choose a pre-formatted subject template or create your own
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search subject templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-white"
              />
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
                    ? 'bg-white text-black font-semibold'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-900 hover:border-neutral-800'
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
                onClick={() => onOpenPaper(template.paper)}
                className="group border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 p-5 rounded-xl transition cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                      {template.category}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {template.paper.header.maxMarks} Marks
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm text-white group-hover:text-white transition">
                    {template.name}
                  </h4>
                  <p className="text-xs text-neutral-400 line-clamp-2">
                    {template.description || template.paper.header.subjectTitle}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-400">
                  <span>
                    {template.paper.sections.length} Sections •{' '}
                    {template.paper.sections.reduce((a, s) => a + s.questions.length, 0)} Qs
                  </span>
                  <span className="font-medium text-white group-hover:underline flex items-center gap-1">
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
          <div className="space-y-4 pt-4 border-t border-neutral-900">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Saved Papers Library ({savedPapers.length})
              </h3>
              <p className="text-xs text-neutral-400">
                Previously authored exam papers saved on this machine
              </p>
            </div>

            <div className="divide-y divide-neutral-900 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
              {savedPapers.map((saved) => (
                <div
                  key={saved.id}
                  onClick={() => onOpenPaper(saved)}
                  className="p-4 hover:bg-neutral-900 transition flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {saved.header.subjectTitle || saved.title}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {saved.header.examinationTitle} • {saved.sections.length} Sections • Max Marks:{' '}
                        {saved.header.maxMarks}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={(e) => handleDeleteSavedPaper(e, saved.id)}
                      className="p-1.5 text-neutral-500 hover:text-white rounded hover:bg-neutral-800 transition"
                      title="Delete paper"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenPaper(saved)}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-white rounded-lg transition"
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
    </div>
  );
};
