import React, { useState, useEffect } from 'react';
import {
  ExamPaper,
  ExamHeader,
  ExamSection,
  Question,
  QuestionType,
  PaperSettings,
} from './types/exam';
import { DEFAULT_EXAM_PAPER } from './data/defaultPaper';
import { savePaperToLibrary } from './data/subjectTemplates';
import {
  saveExamPaperToFirestore,
  loadExamPapersFromFirestore,
  initAuth,
} from './services/firebase';
import { HeaderNav } from './components/HeaderNav';
import { EditorPanel } from './components/EditorPanel';
import { PaperPreview } from './components/PaperPreview';
import { TemplateModal } from './components/TemplateModal';
import { SettingsModal } from './components/SettingsModal';
import { GoogleDocsModal } from './components/GoogleDocsModal';
import { ExportModal } from './components/ExportModal';
import { MassJsonModal } from './components/MassJsonModal';
import { Dashboard } from './components/Dashboard';
import { exportPaperToWord } from './services/wordExport';
import { downloadPaperAsPDF, printPaperDirect } from './services/pdfExport';
import { Edit3, Eye, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState<'dashboard' | 'workspace'>('dashboard');

  const [paper, setPaper] = useState<ExamPaper>(() => {
    try {
      const saved = localStorage.getItem('exam_paper_active_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return DEFAULT_EXAM_PAPER;
  });

  const [activeSectionId, setActiveSectionId] = useState<string>('section-a');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isGoogleDocsModalOpen, setIsGoogleDocsModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isMassJsonModalOpen, setIsMassJsonModalOpen] = useState<boolean>(false);
  const [mobileViewTab, setMobileViewTab] = useState<'editor' | 'preview'>('editor');

  // Notification banners
  const [bannerMessage, setBannerMessage] = useState<{
    text: string;
    type: 'success' | 'loading' | 'error';
  } | null>(null);
  const [isSavingDb, setIsSavingDb] = useState(false);

  const showNotification = (
    text: string,
    type: 'success' | 'loading' | 'error' = 'success',
    timeout = 3500
  ) => {
    setBannerMessage({ text, type });
    if (timeout > 0) {
      setTimeout(() => setBannerMessage(null), timeout);
    }
  };

  // Sync Auth with Firestore
  useEffect(() => {
    initAuth(
      async (user) => {
        try {
          const remotePapers = await loadExamPapersFromFirestore();
          if (remotePapers && remotePapers.length > 0) {
            remotePapers.forEach((p) => savePaperToLibrary(p));
          }
        } catch (e) {
          console.warn('Sync notice:', e);
        }
      },
      () => {}
    );
  }, []);

  const updatePaper = (newPaper: ExamPaper) => {
    setPaper(newPaper);
    try {
      localStorage.setItem('exam_paper_active_draft', JSON.stringify(newPaper));
    } catch (e) {
      // ignore
    }
  };

  // Header update
  const handleUpdateHeader = (updates: Partial<ExamHeader>) => {
    updatePaper({
      ...paper,
      header: { ...paper.header, ...updates },
      updatedAt: new Date().toISOString(),
    });
  };

  // Settings update
  const handleUpdateSettings = (updates: Partial<PaperSettings>) => {
    updatePaper({
      ...paper,
      settings: { ...paper.settings, ...updates },
      updatedAt: new Date().toISOString(),
    });
  };

  // Section update
  const handleUpdateSection = (sectionId: string, updates: Partial<ExamSection>) => {
    const updatedSections = paper.sections.map((sec) =>
      sec.id === sectionId ? { ...sec, ...updates } : sec
    );
    updatePaper({
      ...paper,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    });
  };

  // Delete Section
  const handleDeleteSection = (sectionId: string) => {
    if (paper.sections.length <= 1) {
      alert('Examination paper must have at least one section.');
      return;
    }
    const updatedSections = paper.sections.filter((s) => s.id !== sectionId);
    updatePaper({
      ...paper,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    });
    if (activeSectionId === sectionId) {
      setActiveSectionId(updatedSections[0]?.id || 'header');
    }
  };

  // Add Section
  const handleAddSection = () => {
    const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const currentCount = paper.sections.length;
    const nextLetter = sectionLetters[currentCount] || `${currentCount + 1}`;

    const newSection: ExamSection = {
      id: 'section-' + Date.now(),
      name: `SECTION "${nextLetter}"`,
      subtitle: '(ADDITIONAL QUESTIONS)',
      marksBadge: '10 Marks',
      instruction: 'Note: Attempt all questions from this section.',
      questions: [
        {
          id: 'q-' + Date.now(),
          number: 'i.',
          type: 'short',
          text: 'Answer the following question with relevant details:',
          marks: 5,
        },
      ],
    };

    updatePaper({
      ...paper,
      sections: [...paper.sections, newSection],
      updatedAt: new Date().toISOString(),
    });
    setActiveSectionId(newSection.id);
  };

  // Drag and drop reordering
  const handleReorderQuestions = (
    sectionId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    const updatedSections = paper.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      const questions = [...sec.questions];
      const [movedQuestion] = questions.splice(fromIndex, 1);
      questions.splice(toIndex, 0, movedQuestion);
      return { ...sec, questions };
    });

    updatePaper({
      ...paper,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add question
  const handleAddQuestion = (sectionId: string, type: QuestionType) => {
    const targetSection = paper.sections.find((s) => s.id === sectionId);
    if (!targetSection) return;

    const romanNumerals = [
      'i.',
      'ii.',
      'iii.',
      'iv.',
      'v.',
      'vi.',
      'vii.',
      'viii.',
      'ix.',
      'x.',
      'xi.',
      'xii.',
      'xiii.',
      'xiv.',
      'xv.',
    ];
    const nextNumber =
      romanNumerals[targetSection.questions.length] ||
      `${targetSection.questions.length + 1}.`;

    const newQuestion: Question = {
      id: 'q-' + Date.now(),
      number: nextNumber,
      type,
      text:
        type === 'mcq'
          ? 'Enter your new multiple choice question here:'
          : type === 'short'
          ? 'Explain the following concept with brief examples:'
          : 'Discuss the following topic in detail with analytical proofs:',
      marks: type === 'mcq' ? 1 : type === 'short' ? 4 : 8,
      optionColumns: 2,
      ...(type === 'mcq'
        ? {
            options: [
              { id: 'opt-a-' + Date.now(), label: '(a)', text: 'Option A' },
              { id: 'opt-b-' + Date.now(), label: '(b)', text: 'Option B' },
              { id: 'opt-c-' + Date.now(), label: '(c)', text: 'Option C' },
              { id: 'opt-d-' + Date.now(), label: '(d)', text: 'Option D' },
            ],
          }
        : {}),
    };

    const updatedSections = paper.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        questions: [...sec.questions, newQuestion],
      };
    });

    updatePaper({
      ...paper,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    });
  };

  // Mass Import Questions via JSON
  const handleImportMassQuestions = (
    importedQuestions: Question[],
    mode: 'append' | 'replace'
  ) => {
    const currentSectionId =
      activeSectionId === 'header'
        ? paper.sections[0]?.id || 'section-a'
        : activeSectionId;

    const targetSection = paper.sections.find((s) => s.id === currentSectionId);
    if (!targetSection) return;

    const updatedSections = paper.sections.map((sec) => {
      if (sec.id !== currentSectionId) return sec;
      const combined =
        mode === 'append' ? [...sec.questions, ...importedQuestions] : importedQuestions;
      return {
        ...sec,
        questions: combined,
      };
    });

    updatePaper({
      ...paper,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    });

    showNotification(
      `Imported ${importedQuestions.length} questions into ${targetSection.name}!`
    );
  };

  // Update question
  const handleUpdateQuestion = (
    sectionId: string,
    questionId: string,
    updates: Partial<Question>
  ) => {
    const updatedSections = paper.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      const questions = sec.questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      );
      return { ...sec, questions };
    });

    updatePaper({
      ...paper,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    });
  };

  // Delete question
  const handleDeleteQuestion = (sectionId: string, questionId: string) => {
    const updatedSections = paper.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        questions: sec.questions.filter((q) => q.id !== questionId),
      };
    });

    updatePaper({
      ...paper,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    });
  };

  // Duplicate question
  const handleDuplicateQuestion = (sectionId: string, questionId: string) => {
    const targetSection = paper.sections.find((s) => s.id === sectionId);
    if (!targetSection) return;

    const source = targetSection.questions.find((q) => q.id === questionId);
    if (!source) return;

    const duplicate: Question = {
      ...JSON.parse(JSON.stringify(source)),
      id: 'q-dup-' + Date.now(),
      number: source.number + ' (copy)',
    };

    const qIndex = targetSection.questions.findIndex((q) => q.id === questionId);
    const newQuestions = [...targetSection.questions];
    newQuestions.splice(qIndex + 1, 0, duplicate);

    const updatedSections = paper.sections.map((sec) =>
      sec.id === sectionId ? { ...sec, questions: newQuestions } : sec
    );

    updatePaper({
      ...paper,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    });
  };

  // Renumber questions
  const handleRenumberQuestions = (
    sectionId: string,
    style: 'roman' | 'decimal' | 'alpha'
  ) => {
    const roman = [
      'i.',
      'ii.',
      'iii.',
      'iv.',
      'v.',
      'vi.',
      'vii.',
      'viii.',
      'ix.',
      'x.',
      'xi.',
      'xii.',
      'xiii.',
      'xiv.',
      'xv.',
      'xvi.',
    ];
    const alpha = ['a.', 'b.', 'c.', 'd.', 'e.', 'f.', 'g.', 'h.', 'i.', 'j.', 'k.', 'l.'];

    const updatedSections = paper.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      const questions = sec.questions.map((q, idx) => {
        let newNum = `${idx + 1}.`;
        if (style === 'roman') {
          newNum = roman[idx] || `${idx + 1}.`;
        } else if (style === 'alpha') {
          newNum = alpha[idx] || `${idx + 1}.`;
        }
        return { ...q, number: newNum };
      });
      return { ...sec, questions };
    });

    updatePaper({
      ...paper,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    });
  };

  // Reset to default
  const handleResetDefault = () => {
    if (window.confirm('Reset exam paper to the default intermediate template?')) {
      updatePaper(DEFAULT_EXAM_PAPER);
      setActiveSectionId('section-a');
      showNotification('Reset to original default template!');
    }
  };

  // Select Subject Template
  const handleSelectTemplate = (templatePaper: ExamPaper) => {
    const cloned = JSON.parse(JSON.stringify(templatePaper));
    cloned.id = 'paper-' + Date.now();
    cloned.updatedAt = new Date().toISOString();
    updatePaper(cloned);
    setActiveSectionId(cloned.sections[0]?.id || 'header');
    setViewMode('workspace');
    showNotification(`Loaded template: ${cloned.header.subjectTitle || cloned.title}`);
  };

  // New Blank Paper
  const handleNewBlankPaper = () => {
    const newPaper: ExamPaper = {
      id: 'paper-' + Date.now(),
      title: 'New Examination Paper',
      header: {
        examinationTitle: 'ANNUAL EXAMINATION 2026',
        examinationMonth: 'EXAMINATION MONTH: DEC-26',
        groupName: 'GENERAL GROUP',
        subjectTitle: 'SUBJECT: NEW SUBJECT',
        date: new Date().toISOString().split('T')[0],
        duration: '3 Hours',
        maxMarks: '100',
        showDividerLine: true,
        generalInstructions: ['Read all questions carefully before attempting.'],
      },
      settings: {
        paperSize: 'a4',
        fontFamily: 'times',
        fontSize: 'base',
        showMarksBadges: true,
        mcqColumns: 2,
        showGeneralInstructions: true,
        showSectionInstructions: true,
        showEndOfPaper: true,
        showQuestionMarks: true,
        showDividerMarker: true,
      },
      sections: [
        {
          id: 'sec-a-' + Date.now(),
          name: 'SECTION "A"',
          subtitle: '(OBJECTIVE / MCQs)',
          marksBadge: '20 Marks',
          instruction: 'Choose the correct option:',
          questions: [
            {
              id: 'q-mcq-init',
              number: 'i.',
              type: 'mcq',
              text: 'Sample question statement:',
              marks: 1,
              optionColumns: 2,
              options: [
                { id: 'opt-1', label: '(a)', text: 'Option A' },
                { id: 'opt-2', label: '(b)', text: 'Option B' },
                { id: 'opt-3', label: '(c)', text: 'Option C' },
                { id: 'opt-4', label: '(d)', text: 'Option D' },
              ],
            },
          ],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updatePaper(newPaper);
    setActiveSectionId(newPaper.sections[0].id);
    setViewMode('workspace');
  };

  // Save to Firebase Database & Local Library
  const handleSaveToLibrary = async () => {
    setIsSavingDb(true);
    savePaperToLibrary(paper);
    try {
      await saveExamPaperToFirestore(paper);
      showNotification('Paper saved to Firebase Database & Library!');
    } catch (e: any) {
      console.warn('Firestore notice:', e);
      showNotification('Saved to local library (Sign in for cloud sync)');
    } finally {
      setIsSavingDb(false);
    }
  };

  // Export to Word
  const handleExportWord = async () => {
    showNotification('Generating Word document (.docx)...', 'loading', 0);
    try {
      const filename = await exportPaperToWord(paper);
      showNotification(`Downloaded Word file: ${filename}`);
    } catch (e: any) {
      console.error(e);
      showNotification(`Word export failed: ${e.message}`, 'error', 5000);
    }
  };

  // Download PDF file
  const handleDownloadPDF = async () => {
    showNotification('Rendering crisp A4 PDF document...', 'loading', 0);
    try {
      await downloadPaperAsPDF(paper);
      showNotification('PDF file downloaded successfully!');
    } catch (e: any) {
      console.error(e);
      printPaperDirect();
      showNotification('Opened print preview for PDF saving.');
    }
  };

  // Print dialog
  const handlePrintPDF = () => {
    printPaperDirect();
  };

  const activeSectionObj =
    paper.sections.find((s) => s.id === activeSectionId) || paper.sections[0];

  // Render Dashboard
  if (viewMode === 'dashboard') {
    return (
      <div className="h-screen w-screen overflow-y-auto bg-black text-white">
        <Dashboard
          currentPaper={paper}
          onOpenPaper={(selected) => {
            updatePaper(selected);
            setActiveSectionId(selected.sections[0]?.id || 'header');
            setViewMode('workspace');
          }}
          onNewBlankPaper={handleNewBlankPaper}
          onOpenTemplatesModal={() => setIsTemplateModalOpen(true)}
        />
        <TemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          currentPaper={paper}
          onSelectTemplate={handleSelectTemplate}
        />
      </div>
    );
  }

  // Render Workspace
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-black text-white select-none">
      {/* Toast Notification Banner */}
      {bannerMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-medium shadow-2xl flex items-center gap-2 border bg-neutral-900 border-neutral-700 text-white animate-in fade-in slide-in-from-top-2 duration-150">
          {bannerMessage.type === 'loading' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          ) : bannerMessage.type === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 text-white" />
          ) : (
            <Check className="w-3.5 h-3.5 text-white" />
          )}
          <span>{bannerMessage.text}</span>
        </div>
      )}

      {/* Top Bar with Icon Tools */}
      <HeaderNav
        paper={paper}
        activeSectionId={activeSectionId}
        onSelectSection={setActiveSectionId}
        onAddSection={handleAddSection}
        onOpenDashboard={() => setViewMode('dashboard')}
        onOpenTemplates={() => setIsTemplateModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenGoogleDocs={() => setIsGoogleDocsModalOpen(true)}
        onExportWord={handleExportWord}
        onDownloadPDF={handleDownloadPDF}
        onPrintPDF={handlePrintPDF}
        onResetDefault={handleResetDefault}
        onSaveToLibrary={handleSaveToLibrary}
        isSavingDatabase={isSavingDb}
      />

      {/* Mobile Switcher */}
      <div className="md:hidden flex border-b border-neutral-800 bg-black px-3 py-1.5 gap-2 no-print shrink-0">
        <button
          onClick={() => setMobileViewTab('editor')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
            mobileViewTab === 'editor'
              ? 'bg-white text-black'
              : 'bg-neutral-900 text-neutral-400'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Editor</span>
        </button>
        <button
          onClick={() => setMobileViewTab('preview')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
            mobileViewTab === 'preview'
              ? 'bg-white text-black'
              : 'bg-neutral-900 text-neutral-400'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Paper Preview</span>
        </button>
      </div>

      {/* Main Split-Screen Workspace */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Column: Editor (Independent Scroll Container) */}
        <div
          className={`w-full md:w-5/12 lg:w-4/12 h-full overflow-hidden flex flex-col border-r border-neutral-800 bg-black no-print ${
            mobileViewTab === 'preview' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <EditorPanel
            paper={paper}
            activeSectionId={activeSectionId}
            onSelectSection={setActiveSectionId}
            onUpdateHeader={handleUpdateHeader}
            onUpdateSection={handleUpdateSection}
            onDeleteSection={handleDeleteSection}
            onReorderQuestions={handleReorderQuestions}
            onAddQuestion={handleAddQuestion}
            onUpdateQuestion={handleUpdateQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onDuplicateQuestion={handleDuplicateQuestion}
            onRenumberQuestions={handleRenumberQuestions}
            onOpenMassJson={() => setIsMassJsonModalOpen(true)}
          />
        </div>

        {/* Right Column: Live Paper Preview (Independent Scroll Container) */}
        <div
          className={`flex-1 h-full overflow-hidden flex flex-col ${
            mobileViewTab === 'editor' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <PaperPreview paper={paper} onPrint={handlePrintPDF} />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={paper.settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Subject Templates Modal */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        currentPaper={paper}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Google Docs Modal */}
      <GoogleDocsModal
        isOpen={isGoogleDocsModalOpen}
        onClose={() => setIsGoogleDocsModalOpen(false)}
        paper={paper}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        paper={paper}
        onOpenGoogleDocs={() => setIsGoogleDocsModalOpen(true)}
      />

      {/* Mass JSON Question Modal */}
      <MassJsonModal
        isOpen={isMassJsonModalOpen}
        onClose={() => setIsMassJsonModalOpen(false)}
        section={activeSectionObj}
        onImportQuestions={handleImportMassQuestions}
      />
    </div>
  );
}
