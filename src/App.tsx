import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ExamPaper,
  ExamHeader,
  ExamSection,
  Question,
  QuestionType,
  PaperSettings,
  PastPaperRecord,
  PastPaperPatternSeed,
} from './types/exam';
import { DEFAULT_EXAM_PAPER } from './data/defaultPaper';
import {
  savePaperToLibrary,
  mergeCustomTemplatesToStorage,
  clonePaperForEditing,
} from './data/subjectTemplates';
import {
  saveExamPaperToFirestore,
  loadExamPapersFromFirestore,
  loadTemplatesFromFirestore,
  initAuth,
} from './services/firebase';
import { HeaderNav } from './components/HeaderNav';
import { EditorPanel } from './components/EditorPanel';
import { PaperPreview } from './components/PaperPreview';
import { TemplateModal } from './components/TemplateModal';
import { SettingsModal } from './components/SettingsModal';
import { GoogleDocsModal } from './components/GoogleDocsModal';
import { GoogleDriveModal, DriveSaveFormat } from './components/GoogleDriveModal';
import { GmailModal } from './components/GmailModal';
import { ExportModal } from './components/ExportModal';
import { MassJsonModal } from './components/MassJsonModal';
import { PaperShareModal } from './components/PaperShareModal';
import { Dashboard } from './components/Dashboard';
import { BuilderMode } from './components/BuilderMode';
import { AutoBlueprintMode } from './components/AutoBlueprintMode';
import { PastPapersView } from './components/PastPapersView';
import { PastPaperViewerModal } from './components/PastPaperViewerModal';
import { PastPaperPatternModal } from './components/PastPaperPatternModal';
import { AIPaperRefinerModal } from './components/AIPaperRefinerModal';
import { AppMode } from './components/ModeSwitcher';
import { AppTheme } from './components/ThemeToggleButton';
import {
  mergeQuestionsIntoPaper,
  nextQuestionNumber,
  refreshSectionMarksBadge,
  replaceQuestionsInPaper,
} from './services/paperComposer';
import { syncBundledQuestionBanks } from './services/questionBank';
import { exportPaperToWord } from './services/wordExport';
import { downloadPaperAsPDF, printPaperDirect } from './services/pdfExport';
import {
  getScheduledEmails,
  syncScheduledEmailsFromFirestore,
  deliverScheduledEmailJob,
} from './services/scheduledEmailService';
import { Edit3, Eye, Check, AlertCircle, Loader2, Share2, X } from 'lucide-react';

interface BannerNotification {
  text: string;
  type: 'success' | 'loading' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
  const [viewMode, setViewMode] = useState<'dashboard' | 'past-papers' | 'builder' | 'auto' | 'workspace'>('dashboard');
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('exam_maker_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    try {
      localStorage.setItem('exam_maker_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const [paper, setPaper] = useState<ExamPaper>(() => {
    try {
      const saved = localStorage.getItem('exam_paper_active_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return DEFAULT_EXAM_PAPER;
  });

  const [activeSectionId, setActiveSectionId] = useState<string>(
    () => paper.sections[0]?.id || 'header'
  );
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isGoogleDocsModalOpen, setIsGoogleDocsModalOpen] = useState<boolean>(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState<boolean>(false);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isMassJsonModalOpen, setIsMassJsonModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareTargetPaper, setShareTargetPaper] = useState<ExamPaper | null>(null);
  const [viewerPastPaper, setViewerPastPaper] = useState<PastPaperRecord | null>(null);
  const [patternModalPastPaper, setPatternModalPastPaper] = useState<PastPaperRecord | null>(null);
  const [activePatternSeed, setActivePatternSeed] = useState<PastPaperPatternSeed | null>(null);
  const [isAIRefinerOpen, setIsAIRefinerOpen] = useState<boolean>(false);
  const [builderCameFromPreview, setBuilderCameFromPreview] = useState<boolean>(false);

  const [driveModalConfig, setDriveModalConfig] = useState<{
    targetPaper?: ExamPaper;
    initialFormat?: DriveSaveFormat;
    autoOpenShareAfterSave?: boolean;
  }>({});

  const [gmailModalConfig, setGmailModalConfig] = useState<{
    targetPaper?: ExamPaper;
    initialTo?: string;
    initialDriveShareLink?: string;
    initialTab?: 'compose' | 'scheduled';
    initialDeliveryMode?: 'now' | 'schedule';
  }>({});

  const [pendingScheduledCount, setPendingScheduledCount] = useState<number>(
    () => getScheduledEmails().filter((j) => j.status === 'pending').length
  );
  const [mobileViewTab, setMobileViewTab] = useState<'editor' | 'preview'>('editor');

  // Notification banners
  const [bannerMessage, setBannerMessage] = useState<BannerNotification | null>(null);
  const [isSavingDb, setIsSavingDb] = useState(false);

  const notificationTimerRef = useRef<number | null>(null);
  const isProcessingScheduledRef = useRef(false);
  const authWarningShownRef = useRef(false);

  const refreshPendingScheduledCount = useCallback(() => {
    setPendingScheduledCount(getScheduledEmails().filter((j) => j.status === 'pending').length);
  }, []);

  const showNotification = useCallback(
    (
      text: string,
      type: 'success' | 'loading' | 'error' = 'success',
      timeout = 4000,
      action?: { label: string; onClick: () => void }
    ) => {
      if (notificationTimerRef.current !== null) {
        window.clearTimeout(notificationTimerRef.current);
        notificationTimerRef.current = null;
      }
      setBannerMessage({
        text,
        type,
        actionLabel: action?.label,
        onAction: action?.onClick,
      });
      if (timeout > 0) {
        notificationTimerRef.current = window.setTimeout(() => {
          setBannerMessage(null);
          notificationTimerRef.current = null;
        }, timeout);
      }
    },
    []
  );

  const openShareHub = useCallback((target: ExamPaper) => {
    setShareTargetPaper(target);
    setIsShareModalOpen(true);
  }, []);

  const openGmailForPaper = useCallback(
    (
      target: ExamPaper,
      options?: {
        initialTo?: string;
        initialDriveShareLink?: string;
        initialTab?: 'compose' | 'scheduled';
        initialDeliveryMode?: 'now' | 'schedule';
      }
    ) => {
      setGmailModalConfig({
        targetPaper: target,
        initialTo: options?.initialTo,
        initialDriveShareLink: options?.initialDriveShareLink,
        initialTab: options?.initialTab || 'compose',
        initialDeliveryMode: options?.initialDeliveryMode || 'now',
      });
      setIsGmailModalOpen(true);
    },
    []
  );

  const openDriveForPaper = useCallback(
    (
      target: ExamPaper,
      options?: {
        initialFormat?: DriveSaveFormat;
        autoOpenShareAfterSave?: boolean;
      }
    ) => {
      setDriveModalConfig({
        targetPaper: target,
        initialFormat: options?.initialFormat,
        autoOpenShareAfterSave: options?.autoOpenShareAfterSave,
      });
      setIsGoogleDriveModalOpen(true);
    },
    []
  );

  // Sync papers, templates, and scheduled emails with Firestore
  useEffect(() => {
    const syncWithFirestore = async () => {
      try {
        const [remotePapers, remoteTemplates] = await Promise.all([
          loadExamPapersFromFirestore(),
          loadTemplatesFromFirestore(),
        ]);

        if (remotePapers && remotePapers.length > 0) {
          remotePapers.forEach((p) => savePaperToLibrary(p));
        }

        if (remoteTemplates && remoteTemplates.length > 0) {
          mergeCustomTemplatesToStorage(remoteTemplates);
        }

        await syncScheduledEmailsFromFirestore();
        refreshPendingScheduledCount();
      } catch (e) {
        console.warn('Initial Firestore sync notice:', e);
      }
    };

    const seedQuestionBank = () => {
      syncBundledQuestionBanks()
        .then((result) => {
          if (result.seeded.length > 0) {
            console.info('Seeded question banks to Firestore:', result.seeded.join(', '));
          }
        })
        .catch((err) => console.warn('Question bank seed notice:', err));
    };

    syncWithFirestore();
    seedQuestionBank();

    const unsubscribe = initAuth(
      async () => {
        authWarningShownRef.current = false;
        await syncWithFirestore();
        seedQuestionBank();
      },
      () => {}
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [refreshPendingScheduledCount]);

  // Background Scheduled Gmail dispatcher loop (polls every 5 seconds while app is open)
  useEffect(() => {
    const checkDueEmails = async () => {
      if (isProcessingScheduledRef.current) return;
      const now = Date.now();
      const dueJob = getScheduledEmails().find(
        (j) => j.status === 'pending' && new Date(j.scheduledFor).getTime() <= now
      );
      if (!dueJob) return;

      isProcessingScheduledRef.current = true;
      try {
        const result = await deliverScheduledEmailJob(dueJob);
        refreshPendingScheduledCount();

        if (result.needsAuth) {
          if (!authWarningShownRef.current) {
            authWarningShownRef.current = true;
            showNotification(
              `Scheduled email to ${dueJob.to} is due. Sign in to Gmail to send.`,
              'error',
              8000,
              {
                label: 'Open Queue',
                onClick: () =>
                  openGmailForPaper(dueJob.paperSnapshot, {
                    initialTab: 'scheduled',
                  }),
              }
            );
          }
        } else if (result.job.status === 'sent') {
          showNotification(`Sent scheduled email to ${result.job.to}!`, 'success', 5000);
        } else if (result.job.status === 'failed') {
          showNotification(
            `Scheduled email to ${result.job.to} failed: ${
              result.job.errorMessage || 'Unknown error'
            }`,
            'error',
            6000,
            {
              label: 'View Queue',
              onClick: () =>
                openGmailForPaper(dueJob.paperSnapshot, {
                  initialTab: 'scheduled',
                }),
            }
          );
        }
      } finally {
        isProcessingScheduledRef.current = false;
      }
    };

    const timer = window.setInterval(checkDueEmails, 5000);
    return () => window.clearInterval(timer);
  }, [openGmailForPaper, refreshPendingScheduledCount, showNotification]);

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
      showNotification('Examination paper must have at least one section.', 'error');
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

  // Add Section (picks first unused letter so deleting middle sections never duplicates letters)
  const handleAddSection = () => {
    const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const usedLetters = new Set(
      paper.sections
        .map((s) => {
          const match = s.name.match(/["']([A-Z])["']|\b([A-Z])$/i);
          return (match?.[1] || match?.[2] || '').toUpperCase();
        })
        .filter(Boolean)
    );
    const nextLetter =
      sectionLetters.find((letter) => !usedLetters.has(letter)) ||
      `${paper.sections.length + 1}`;

    const now = Date.now();
    const newSection: ExamSection = {
      id: 'section-' + now,
      name: `SECTION "${nextLetter}"`,
      subtitle: '(ADDITIONAL QUESTIONS)',
      marksBadge: '5 Marks',
      instruction: 'Note: Attempt all questions from this section.',
      questions: [
        {
          id: 'q-' + now,
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

    const nextNumber = nextQuestionNumber(targetSection.questions);

    const ts = createLocalId('q');
    const newQuestion: Question = {
      id: ts,
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
              { id: `opt-a-${ts}`, label: '(a)', text: 'Option A' },
              { id: `opt-b-${ts}`, label: '(b)', text: 'Option B' },
              { id: `opt-c-${ts}`, label: '(c)', text: 'Option C' },
              { id: `opt-d-${ts}`, label: '(d)', text: 'Option D' },
            ],
          }
        : {}),
    };

    const updatedSections = paper.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      return refreshSectionMarksBadge({
        ...sec,
        questions: [...sec.questions, newQuestion],
      });
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
    const importBatchId = createLocalId('import');
    const uniqueImportedQuestions = importedQuestions.map((question, index) => ({
      ...question,
      id: `${importBatchId}-${index}`,
      ...(mode === 'append'
        ? { number: nextQuestionNumber(targetSection.questions, index) }
        : {}),
      ...(question.options
        ? {
            options: question.options.map((option, optionIndex) => ({
              ...option,
              id: `${importBatchId}-${index}-option-${optionIndex}`,
            })),
          }
        : {}),
    }));

    const updatedSections = paper.sections.map((sec) => {
      if (sec.id !== currentSectionId) return sec;
      const combined =
        mode === 'append' ? [...sec.questions, ...uniqueImportedQuestions] : uniqueImportedQuestions;
      return refreshSectionMarksBadge({
        ...sec,
        questions: combined,
      });
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
      return refreshSectionMarksBadge({ ...sec, questions });
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
      return refreshSectionMarksBadge({
        ...sec,
        questions: sec.questions.filter((q) => q.id !== questionId),
      });
    });

    updatePaper({
      ...paper,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    });
  };

  // Duplicate question (assigns clean numbering & fresh unique MCQ option IDs)
  const handleDuplicateQuestion = (sectionId: string, questionId: string) => {
    const targetSection = paper.sections.find((s) => s.id === sectionId);
    if (!targetSection) return;

    const qIndex = targetSection.questions.findIndex((q) => q.id === questionId);
    if (qIndex < 0) return;
    const source = targetSection.questions[qIndex];

    const ts = createLocalId('duplicate');
    const cloned = JSON.parse(JSON.stringify(source)) as Question;
    const isLast = qIndex === targetSection.questions.length - 1;
    const cleanNum = isLast
      ? `${qIndex + 2}.`
      : `${source.number.replace(/\.$/, '')}a.`;

    const duplicate: Question = {
      ...cloned,
      id: ts,
      number: cleanNum,
      ...(cloned.options
        ? {
            options: cloned.options.map((opt, idx) => ({
              ...opt,
              id: `opt-dup-${ts}-${idx}`,
            })),
          }
        : {}),
    };

    const newQuestions = [...targetSection.questions];
    newQuestions.splice(qIndex + 1, 0, duplicate);

    const updatedSections = paper.sections.map((sec) =>
      sec.id === sectionId
        ? refreshSectionMarksBadge({ ...sec, questions: newQuestions })
        : sec
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
      const freshDefault = clonePaperForEditing(DEFAULT_EXAM_PAPER);
      freshDefault.id = DEFAULT_EXAM_PAPER.id;
      updatePaper(freshDefault);
      setActiveSectionId(freshDefault.sections[0]?.id || 'header');
      showNotification('Reset to original default template!');
    }
  };

  // Select Subject Template
  const handleSelectTemplate = (templatePaper: ExamPaper) => {
    const cloned = clonePaperForEditing(templatePaper);
    setActivePatternSeed(null);
    updatePaper(cloned);
    setActiveSectionId(cloned.sections[0]?.id || 'header');
    setViewMode('workspace');
    showNotification(
      `Loaded template: ${cloned.header.subjectTitle || cloned.title}`,
      'success',
      4500,
      {
        label: 'Deliver / Share',
        onClick: () => openShareHub(cloned),
      }
    );
  };

  // New Blank Paper
  const handleNewBlankPaper = () => {
    setActivePatternSeed(null);
    const now = Date.now();
    const newPaper: ExamPaper = {
      id: 'paper-' + now,
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
          id: 'sec-a-' + now,
          name: 'SECTION "A"',
          subtitle: '(OBJECTIVE / MCQs)',
          marksBadge: '20 Marks',
          instruction: 'Choose the correct option:',
          questions: [
            {
              id: 'q-mcq-init-' + now,
              number: 'i.',
              type: 'mcq',
              text: 'Sample question statement:',
              marks: 1,
              optionColumns: 2,
              options: [
                { id: `opt-1-${now}`, label: '(a)', text: 'Option A' },
                { id: `opt-2-${now}`, label: '(b)', text: 'Option B' },
                { id: `opt-3-${now}`, label: '(c)', text: 'Option C' },
                { id: `opt-4-${now}`, label: '(d)', text: 'Option D' },
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
    showNotification('Created new exam paper!', 'success', 4500, {
      label: 'Deliver / Share',
      onClick: () => openShareHub(newPaper),
    });
  };

  // Save to Firebase Database & Local Library, then offer post-save delivery options
  const handleSaveToLibrary = async () => {
    setIsSavingDb(true);
    savePaperToLibrary(paper);
    try {
      await saveExamPaperToFirestore(paper);
      showNotification(
        'Paper saved to Firebase Database & Library!',
        'success',
        6000,
        {
          label: 'Email / Drive Share',
          onClick: () => openShareHub(paper),
        }
      );
    } catch (e: any) {
      console.warn('Firestore notice:', e);
      showNotification(
        'Saved to local library (Sign in for cloud sync)',
        'success',
        6000,
        {
          label: 'Email / Drive Share',
          onClick: () => openShareHub(paper),
        }
      );
    } finally {
      setIsSavingDb(false);
    }
  };

  // Add questions picked in the Builder into the active paper.
  const handleAddQuestionsFromBank = (questions: Question[], label: string) => {
    if (questions.length === 0) return;

    let updatedPaperSnapshot: ExamPaper | null = null;
    setPaper((prev) => {
      const merged = mergeQuestionsIntoPaper(prev, questions);
      updatedPaperSnapshot = merged;
      try {
        localStorage.setItem('exam_paper_active_draft', JSON.stringify(merged));
      } catch (e) {
        // ignore
      }
      return merged;
    });

    showNotification(
      `Added ${questions.length} question${questions.length === 1 ? '' : 's'} from ${label} to the paper.`,
      'success',
      5000,
      {
        label: 'Deliver / Share',
        onClick: () => openShareHub(updatedPaperSnapshot || paper),
      }
    );
  };

  // Replace paper questions when reselecting from Question Bank / BuilderMode
  const handleReplaceQuestionsInPaper = (questions: Question[], label: string) => {
    if (questions.length === 0) return;

    const updated = replaceQuestionsInPaper(paper, questions, activePatternSeed);
    updatePaper(updated);
    setActiveSectionId(updated.sections[0]?.id || 'header');
    setBuilderCameFromPreview(false);
    setViewMode('workspace');

    showNotification(
      `Updated paper with ${questions.length} question${questions.length === 1 ? '' : 's'} from ${label}.`,
      'success',
      5000,
      {
        label: 'Deliver / Share',
        onClick: () => openShareHub(updated),
      }
    );
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
    showNotification('Rendering crisp PDF document...', 'loading', 0);
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

  const handleSwitchMode = (mode: AppMode) => {
    if (mode === 'past-papers') setViewMode('past-papers');
    else if (mode === 'auto') setViewMode('auto');
    else if (mode === 'builder') {
      setBuilderCameFromPreview(viewMode === 'workspace');
      setViewMode('builder');
    } else {
      setBuilderCameFromPreview(false);
      setViewMode('workspace');
    }
  };

  const handleOpenExactPastPaper = (pastPaper: PastPaperRecord) => {
    const cloned = clonePaperForEditing(pastPaper.paper);
    setActivePatternSeed(null);
    updatePaper(cloned);
    setActiveSectionId(cloned.sections[0]?.id || 'header');
    setViewMode('workspace');
    showNotification(`Opened ${pastPaper.title} in the Editor.`);
  };

  const activeDrivePaper = driveModalConfig.targetPaper || paper;
  const activeGmailPaper = gmailModalConfig.targetPaper || paper;

  return (
    <>
      {/* Global Toast Notification Banner (Visible across Dashboard, Builder, and Workspace) */}
      {bannerMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[60] max-w-md px-4 py-2 rounded-xl text-xs font-medium shadow-2xl flex items-center gap-2.5 border bg-white border-neutral-300 text-neutral-900 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white animate-in fade-in slide-in-from-top-2 duration-150 no-print">
          {bannerMessage.type === 'loading' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-900 dark:text-white shrink-0" />
          ) : bannerMessage.type === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 text-neutral-900 dark:text-white shrink-0" />
          ) : (
            <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white shrink-0" />
          )}
          <span className="truncate">{bannerMessage.text}</span>
          {bannerMessage.actionLabel && bannerMessage.onAction && (
            <button
              type="button"
              onClick={() => {
                const action = bannerMessage.onAction;
                setBannerMessage(null);
                action?.();
              }}
              className="px-2.5 py-1 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-semibold rounded-md text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              <span>{bannerMessage.actionLabel}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-0.5 shrink-0 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Primary View Surface */}
      {viewMode === 'dashboard' ? (
        <div className="h-screen w-screen overflow-y-auto bg-[#F8F9FA] text-[#171717] dark:bg-black dark:text-white">
          <Dashboard
            currentPaper={paper}
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenPaper={(selected) => {
              updatePaper(selected);
              setActiveSectionId(selected.sections[0]?.id || 'header');
              setViewMode('workspace');
            }}
            onNewBlankPaper={handleNewBlankPaper}
            onOpenBuilder={() => setViewMode('builder')}
            onOpenAutoBlueprint={() => setViewMode('auto')}
            onOpenPastPapers={() => setViewMode('past-papers')}
            onViewPastPaper={(pp) => setViewerPastPaper(pp)}
            onUsePastPaperPattern={(pp) => setPatternModalPastPaper(pp)}
            onOpenTemplatesModal={() => setIsTemplateModalOpen(true)}
            onOpenGoogleDrive={() => openDriveForPaper(paper)}
            onOpenShareForPaper={(target) => openShareHub(target)}
            onOpenGmailScheduled={() =>
              openGmailForPaper(paper, {
                initialTab: 'scheduled',
              })
            }
            pendingScheduledCount={pendingScheduledCount}
            onSubjectAdded={(newPaper, template, openWorkspace) => {
              const qCount = newPaper.sections.reduce(
                (a, s) => a + s.questions.length,
                0
              );
              if (!openWorkspace) {
                openShareHub(newPaper);
              }
              showNotification(
                `Subject "${template.name}" added with ${qCount} questions!`,
                'success',
                5500,
                openWorkspace
                  ? {
                      label: 'Deliver / Share',
                      onClick: () => openShareHub(newPaper),
                    }
                  : undefined
              );
            }}
          />
        </div>
      ) : viewMode === 'past-papers' ? (
        <PastPapersView
          currentPaper={paper}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSwitchMode={handleSwitchMode}
          onOpenDashboard={() => setViewMode('dashboard')}
          onViewPastPaper={(pp) => setViewerPastPaper(pp)}
          onOpenExactPastPaper={handleOpenExactPastPaper}
          onUsePatternDifferentQuestions={(pp) => setPatternModalPastPaper(pp)}
        />
      ) : viewMode === 'auto' ? (
        <AutoBlueprintMode
          currentPaper={paper}
          theme={theme}
          onToggleTheme={toggleTheme}
          patternSeed={activePatternSeed}
          onClearPatternSeed={() => setActivePatternSeed(null)}
          onSwitchMode={handleSwitchMode}
          onOpenDashboard={() => setViewMode('dashboard')}
          onApplyPaperToEditor={(updatedPaper, meta) => {
            updatePaper(updatedPaper);
            setActiveSectionId(updatedPaper.sections[0]?.id || 'header');
            setBuilderCameFromPreview(false);
            setViewMode('workspace');
            showNotification(
              `${meta.mode === 'replace' ? 'Loaded' : 'Appended'} ${meta.count} ${
                meta.engine === 'ai' ? 'AI-selected' : 'weighted'
              } questions into the Editor.`,
              'success',
              5000,
              {
                label: 'Deliver / Share',
                onClick: () => openShareHub(updatedPaper),
              }
            );
          }}
        />
      ) : viewMode === 'builder' ? (
        <BuilderMode
          currentPaper={paper}
          theme={theme}
          onToggleTheme={toggleTheme}
          patternSeed={activePatternSeed}
          onClearPatternSeed={() => setActivePatternSeed(null)}
          preferSyncFromPaper={builderCameFromPreview}
          onAddQuestionsToPaper={handleAddQuestionsFromBank}
          onReplacePaperWithQuestions={handleReplaceQuestionsInPaper}
          onOpenEditor={() => {
            setBuilderCameFromPreview(false);
            setViewMode('workspace');
          }}
          onOpenAIRefiner={() => setIsAIRefinerOpen(true)}
          onOpenDashboard={() => setViewMode('dashboard')}
          onSwitchMode={handleSwitchMode}
          onOpenShareModal={() => openShareHub(paper)}
        />
      ) : (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-neutral-50 text-neutral-900 dark:bg-black dark:text-white select-none">
          {/* Top Bar with Icon Tools */}
          <HeaderNav
            paper={paper}
            theme={theme}
            onToggleTheme={toggleTheme}
            activeMode="editor"
            onSwitchMode={handleSwitchMode}
            activeSectionId={activeSectionId}
            onSelectSection={setActiveSectionId}
            onAddSection={handleAddSection}
            onOpenDashboard={() => setViewMode('dashboard')}
            onOpenTemplates={() => setIsTemplateModalOpen(true)}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onOpenGoogleDocs={() => setIsGoogleDocsModalOpen(true)}
            onOpenGoogleDrive={() => openDriveForPaper(paper)}
            onOpenGmail={() => openGmailForPaper(paper)}
            onExportWord={handleExportWord}
            onDownloadPDF={handleDownloadPDF}
            onPrintPDF={handlePrintPDF}
            onResetDefault={handleResetDefault}
            onSaveToLibrary={handleSaveToLibrary}
            isSavingDatabase={isSavingDb}
            pendingScheduledCount={pendingScheduledCount}
            onOpenShareModal={() => openShareHub(paper)}
          />

          {/* Mobile Switcher */}
          <div className="md:hidden flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black px-3 py-1.5 gap-2 no-print shrink-0">
            <button
              onClick={() => setMobileViewTab('editor')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
                mobileViewTab === 'editor'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setMobileViewTab('preview')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
                mobileViewTab === 'preview'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
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
              className={`w-full md:w-5/12 lg:w-4/12 h-full overflow-hidden flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black no-print ${
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
                excludedQuestionTexts={activePatternSeed?.excludedQuestionTexts || []}
                onOpenMassJson={() => setIsMassJsonModalOpen(true)}
              />
            </div>

            {/* Right Column: Live Paper Preview (Independent Scroll Container) */}
            <div
              className={`flex-1 h-full overflow-hidden flex flex-col ${
                mobileViewTab === 'editor' ? 'hidden md:flex' : 'flex'
              }`}
            >
              <PaperPreview
                paper={paper}
                onPrint={handlePrintPDF}
                onOpenAIRefiner={() => setIsAIRefinerOpen(true)}
                onBackToQuestionBank={() => {
                  setBuilderCameFromPreview(true);
                  setViewMode('builder');
                }}
              />
            </div>
          </main>

          {/* Workspace-Only Modals */}
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            settings={paper.settings}
            onUpdateSettings={handleUpdateSettings}
          />

          <GoogleDocsModal
            isOpen={isGoogleDocsModalOpen}
            onClose={() => setIsGoogleDocsModalOpen(false)}
            paper={paper}
          />

          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            paper={paper}
            onOpenGoogleDocs={() => setIsGoogleDocsModalOpen(true)}
            onOpenGoogleDrive={() => openDriveForPaper(paper)}
            onOpenGmail={() => openGmailForPaper(paper)}
          />

          <MassJsonModal
            isOpen={isMassJsonModalOpen}
            onClose={() => setIsMassJsonModalOpen(false)}
            section={activeSectionObj}
            onImportQuestions={handleImportMassQuestions}
          />
        </div>
      )}

      {/* Shared Modals Available Across Dashboard, Builder, and Workspace */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        currentPaper={paper}
        onSelectTemplate={handleSelectTemplate}
      />

      <GoogleDriveModal
        isOpen={isGoogleDriveModalOpen}
        onClose={() => setIsGoogleDriveModalOpen(false)}
        paper={activeDrivePaper}
        allowSaveCurrentPaper={true}
        initialFormat={driveModalConfig.initialFormat}
        autoOpenShareAfterSave={driveModalConfig.autoOpenShareAfterSave}
        onLoadPaperFromDrive={(loadedPaper, filename) => {
          updatePaper(loadedPaper);
          setActiveSectionId(loadedPaper.sections[0]?.id || 'header');
          setViewMode('workspace');
          showNotification(`Opened "${filename}" from Google Drive!`);
        }}
        onEmailShareLink={({ shareLink, recipientEmail }) => {
          setIsGoogleDriveModalOpen(false);
          openGmailForPaper(activeDrivePaper, {
            initialTo: recipientEmail || '',
            initialDriveShareLink: shareLink,
            initialTab: 'compose',
            initialDeliveryMode: 'now',
          });
        }}
      />

      <GmailModal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
        paper={activeGmailPaper}
        initialTo={gmailModalConfig.initialTo}
        initialDriveShareLink={gmailModalConfig.initialDriveShareLink}
        initialTab={gmailModalConfig.initialTab}
        initialDeliveryMode={gmailModalConfig.initialDeliveryMode}
        onScheduledListChanged={refreshPendingScheduledCount}
      />

      <PaperShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        paper={shareTargetPaper || paper}
        onEmailNow={(target) =>
          openGmailForPaper(target, {
            initialTab: 'compose',
            initialDeliveryMode: 'now',
          })
        }
        onScheduleEmail={(target) =>
          openGmailForPaper(target, {
            initialTab: 'compose',
            initialDeliveryMode: 'schedule',
          })
        }
        onUploadAndShareDrive={(target) =>
          openDriveForPaper(target, {
            initialFormat: 'pdf',
            autoOpenShareAfterSave: true,
          })
        }
        onOpenInEditor={
          viewMode !== 'workspace'
            ? (target) => {
                updatePaper(target);
                setActiveSectionId(target.sections[0]?.id || 'header');
                setViewMode('workspace');
              }
            : undefined
        }
      />

      <PastPaperViewerModal
        isOpen={Boolean(viewerPastPaper)}
        onClose={() => setViewerPastPaper(null)}
        pastPaper={viewerPastPaper}
        onOpenExactInEditor={handleOpenExactPastPaper}
        onUsePatternWithDifferentQuestions={(pp) => setPatternModalPastPaper(pp)}
      />

      <PastPaperPatternModal
        isOpen={Boolean(patternModalPastPaper)}
        onClose={() => setPatternModalPastPaper(null)}
        pastPaper={patternModalPastPaper}
        onApplyGeneratedPaper={(generatedPaper, meta) => {
          updatePaper(generatedPaper);
          setActivePatternSeed(meta.seed);
          setActiveSectionId(generatedPaper.sections[0]?.id || 'header');
          setBuilderCameFromPreview(false);
          setViewMode('workspace');
          const modeLabel =
            meta.engine === 'ai-db'
              ? 'AI selected from your DB'
              : meta.engine === 'ai'
              ? 'AI crafted'
              : meta.engine === 'manual'
              ? 'Manually selected'
              : 'Question Bank';
          showNotification(
            `Generated paper using ${meta.sourceTitle} pattern (${modeLabel})!`,
            'success',
            5500,
            {
              label: 'Deliver / Share',
              onClick: () => openShareHub(generatedPaper),
            }
          );
        }}
        onCustomizeInAutoBlueprint={(seed) => {
          setActivePatternSeed(seed);
          setViewMode('auto');
        }}
        onOpenManualBuilderWithSeed={(seed) => {
          setActivePatternSeed(seed);
          setBuilderCameFromPreview(false);
          setViewMode('builder');
        }}
      />

      <AIPaperRefinerModal
        isOpen={isAIRefinerOpen}
        onClose={() => setIsAIRefinerOpen(false)}
        paper={paper}
        patternSeed={activePatternSeed}
        onApplyRefinedPaper={(updatedPaper, summary) => {
          updatePaper(updatedPaper);
          setActiveSectionId(updatedPaper.sections[0]?.id || 'header');
          showNotification(summary, 'success', 5500, {
            label: 'Deliver / Share',
            onClick: () => openShareHub(updatedPaper),
          });
        }}
        onSwitchToQuestionBank={() => {
          setIsAIRefinerOpen(false);
          setBuilderCameFromPreview(true);
          setViewMode('builder');
        }}
      />
    </>
  );
}
