import React, { useState, useRef, useEffect } from 'react';
import { ExamPaper } from '../types/exam';
import {
  Home,
  ChevronDown,
  Plus,
  Sliders,
  Bookmark,
  Share2,
  FileDown,
  Printer,
  FileText,
  RotateCcw,
  Check,
  Save,
  Cloud,
} from 'lucide-react';

interface HeaderNavProps {
  paper: ExamPaper;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  onAddSection: () => void;
  onOpenDashboard: () => void;
  onOpenTemplates: () => void;
  onOpenSettings: () => void;
  onOpenExportModal: () => void;
  onOpenGoogleDocs: () => void;
  onExportWord: () => void;
  onDownloadPDF: () => void;
  onPrintPDF: () => void;
  onResetDefault: () => void;
  onSaveToLibrary: () => void;
  isSavingDatabase?: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  paper,
  activeSectionId,
  onSelectSection,
  onAddSection,
  onOpenDashboard,
  onOpenTemplates,
  onOpenSettings,
  onOpenExportModal,
  onOpenGoogleDocs,
  onExportWord,
  onDownloadPDF,
  onPrintPDF,
  onResetDefault,
  onSaveToLibrary,
  isSavingDatabase,
}) => {
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) {
        setIsSectionDropdownOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const activeSection = paper.sections.find((s) => s.id === activeSectionId);
  const activeLabel =
    activeSectionId === 'header'
      ? 'Exam Header & Metadata'
      : activeSection
      ? `${activeSection.name} ${activeSection.subtitle}`
      : 'Select Section';

  const handleSave = () => {
    onSaveToLibrary();
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  return (
    <header className="border-b border-neutral-800 bg-black text-white h-12 flex items-center justify-between px-3 sm:px-4 z-40 select-none no-print shrink-0">
      {/* Left: Home Icon & Section Dropdown (low density) */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Home / Dashboard Icon Button with Tooltip */}
        <button
          onClick={onOpenDashboard}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition relative group cursor-pointer"
          title="Return to Dashboard / Home"
        >
          <Home className="w-4 h-4" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50">
            Dashboard
          </span>
        </button>

        <div className="h-4 w-px bg-neutral-800" />

        {/* Paper Title (Compact) */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-400 max-w-[180px] truncate">
          <span className="font-semibold text-white truncate">
            {paper.header.subjectTitle.replace(/^SUBJECT:\s*/i, '') || paper.title}
          </span>
        </div>

        {/* Section Dropdown Selector (low density, clean) */}
        <div className="relative" ref={sectionRef}>
          <button
            onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-medium text-white transition cursor-pointer max-w-[240px] sm:max-w-xs truncate"
            title="Switch Section / Header"
          >
            <span className="truncate">{activeLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          </button>

          {isSectionDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-64 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in duration-100 text-xs">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                Select View
              </div>

              {/* Header Tab */}
              <button
                onClick={() => {
                  onSelectSection('header');
                  setIsSectionDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-neutral-900 cursor-pointer ${
                  activeSectionId === 'header' ? 'text-white font-bold bg-neutral-900' : 'text-neutral-300'
                }`}
              >
                <span>Exam Header & Information</span>
                <span className="text-[10px] text-neutral-500">Titles/Date</span>
              </button>

              <div className="my-1 border-t border-neutral-800/80" />
              <div className="px-3 py-1 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                Sections ({paper.sections.length})
              </div>

              {paper.sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => {
                    onSelectSection(sec.id);
                    setIsSectionDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-neutral-900 cursor-pointer ${
                    activeSectionId === sec.id ? 'text-white font-bold bg-neutral-900' : 'text-neutral-300'
                  }`}
                >
                  <span className="truncate">{sec.name}</span>
                  <span className="text-[10px] text-neutral-400 shrink-0 ml-2">
                    {sec.questions.length} Qs • {sec.marksBadge}
                  </span>
                </button>
              ))}

              <div className="my-1 border-t border-neutral-800/80" />

              <button
                onClick={() => {
                  onAddSection();
                  setIsSectionDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-neutral-300 hover:text-white hover:bg-neutral-900 flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <Plus className="w-3.5 h-3.5 text-neutral-400" />
                <span>Add New Section</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Only Icons with Hover Text (Less Density) */}
      <div className="flex items-center gap-1">
        {/* Save to Firebase Database Icon */}
        <button
          onClick={handleSave}
          className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition relative group cursor-pointer"
          title="Save Exam Paper (Firebase Database & Local)"
        >
          {savedBanner ? (
            <Check className="w-4 h-4 text-white" />
          ) : isSavingDatabase ? (
            <Cloud className="w-4 h-4 text-white animate-pulse" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50">
            {savedBanner ? 'Saved to Database!' : 'Save Paper to Database'}
          </span>
        </button>

        {/* Templates Icon Button */}
        <button
          onClick={onOpenTemplates}
          className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition relative group cursor-pointer"
          title="Subject Templates (Math, Science, History...)"
        >
          <Bookmark className="w-4 h-4" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50">
            Subject Templates
          </span>
        </button>

        {/* Display Settings Toggle Icon */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition relative group cursor-pointer"
          title="Settings (Toggle Instructions, Ending, Marks)"
        >
          <Sliders className="w-4 h-4" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50">
            Display Settings
          </span>
        </button>

        {/* Reset Icon Button */}
        <button
          onClick={onResetDefault}
          className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition relative group cursor-pointer"
          title="Reset to Default Intermediate Layout"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50">
            Reset Default
          </span>
        </button>

        <div className="h-4 w-px bg-neutral-800 mx-1" />

        {/* SINGLE EXPORT ICON BUTTON */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
            className="p-2 bg-white text-black hover:bg-neutral-200 rounded-lg transition relative group cursor-pointer flex items-center gap-1"
            title="Export Options (PDF, Word, Google Docs)"
          >
            <Share2 className="w-4 h-4 text-black" />
            <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap z-50">
              Export Paper
            </span>
          </button>

          {isExportDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in duration-100 text-xs">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                <span>Export & Download</span>
                <button
                  onClick={() => {
                    setIsExportDropdownOpen(false);
                    onOpenExportModal();
                  }}
                  className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
                >
                  All Options
                </button>
              </div>

              {/* Direct PDF Download */}
              <button
                onClick={() => {
                  setIsExportDropdownOpen(false);
                  onDownloadPDF();
                }}
                className="w-full text-left px-3 py-2 hover:bg-neutral-900 text-white flex items-center gap-2.5 cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-neutral-300" />
                <div>
                  <div className="font-medium">Download PDF File (.pdf)</div>
                  <div className="text-[10px] text-neutral-500">Direct file download</div>
                </div>
              </button>

              {/* System Print */}
              <button
                onClick={() => {
                  setIsExportDropdownOpen(false);
                  onPrintPDF();
                }}
                className="w-full text-left px-3 py-2 hover:bg-neutral-900 text-white flex items-center gap-2.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-neutral-300" />
                <div>
                  <div className="font-medium">Print Paper / PDF Dialog</div>
                  <div className="text-[10px] text-neutral-500">Browser print formatting</div>
                </div>
              </button>

              {/* Word (.docx) Option */}
              <button
                onClick={() => {
                  setIsExportDropdownOpen(false);
                  onExportWord();
                }}
                className="w-full text-left px-3 py-2 hover:bg-neutral-900 text-white flex items-center gap-2.5 cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-neutral-300" />
                <div>
                  <div className="font-medium">Download Word (.docx)</div>
                  <div className="text-[10px] text-neutral-500">Editable Word document</div>
                </div>
              </button>

              {/* Google Docs Option */}
              <button
                onClick={() => {
                  setIsExportDropdownOpen(false);
                  onOpenGoogleDocs();
                }}
                className="w-full text-left px-3 py-2 hover:bg-neutral-900 text-white flex items-center gap-2.5 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-neutral-300" />
                <div>
                  <div className="font-medium">Export to Google Docs</div>
                  <div className="text-[10px] text-neutral-500">Save in Google Drive</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
