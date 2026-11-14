export type QuestionType = 'mcq' | 'short' | 'detailed' | 'fill_blank' | 'true_false';

export interface MCQOption {
  id: string;
  label: string; // e.g. '(a)', '(b)', '(c)', '(d)'
  text: string;
}

export interface Question {
  id: string;
  number: string; // e.g. 'i.', 'ii.', '1.', 'Q2'
  type: QuestionType;
  text: string;
  marks?: number;
  options?: MCQOption[]; // For MCQs
  optionColumns?: 2 | 4 | 1;
  answerKey?: string;
  linesToLeave?: number;
}

export interface ExamSection {
  id: string;
  name: string; // e.g. 'SECTION "A"'
  subtitle: string; // e.g. '(MULTIPLE CHOICE QUESTIONS)'
  marksBadge: string; // e.g. '10 Marks' or '24 Marks'
  instruction: string; // e.g. 'Q1 Choose the best answer for each from the given options'
  questions: Question[];
}

export interface ExamHeader {
  examinationTitle: string; // e.g. 'INTERMEDIATE EXAMINATION 2026-27'
  examinationMonth: string; // e.g. 'EXAMINATION MONTH: OCT-25'
  groupName: string; // e.g. 'COMPUTER SCIENCE GROUP'
  subjectTitle: string; // e.g. 'SUBJECT: COMPUTER PAPER II'
  institutionName?: string;
  date: string; // e.g. '12-10-2025'
  duration: string; // e.g. '2 Hour'
  maxMarks: number | string; // e.g. '50'
  generalInstructions?: string[];
  showDividerLine: boolean;
  paperCode?: string;
}

export interface PaperSettings {
  paperSize: 'a4' | 'letter';
  fontFamily: 'times' | 'sans' | 'classic';
  fontSize: 'sm' | 'base' | 'lg';
  showMarksBadges: boolean;
  mcqColumns: 2 | 4;
  // Specific toggles requested by user
  showGeneralInstructions: boolean; // enable/disable general instructions
  showSectionInstructions: boolean; // enable/disable section notes ("Q1 Choose...")
  showEndOfPaper: boolean; // enable/disable "*** END OF EXAMINATION PAPER ***"
  showQuestionMarks: boolean; // enable/disable marks notes with each question
  showDividerMarker: boolean; // enable/disable '|' marker
}

export interface ExamPaper {
  id: string;
  title: string;
  classGrade?: string;
  subjectCategory?: string; // 'Computer Science' | 'Math' | 'Science' | 'History' | 'English' | etc.
  header: ExamHeader;
  sections: ExamSection[];
  settings: PaperSettings;
  curriculumData?: CurriculumAnswersPayload;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumQuestionItem {
  question_number: string;
  question: string;
  options?: string[];
  answer?: string;
}

export interface CurriculumSectionItem {
  type: string;
  questions: CurriculumQuestionItem[];
}

export interface CurriculumUnitItem {
  unit: string;
  pages?: string[];
  sections: CurriculumSectionItem[];
}

export interface CurriculumAnswersPayload {
  curriculum_answers: CurriculumUnitItem[];
}

export interface CurriculumSubjectRecord {
  id: string;
  userId?: string;
  classGrade: string;
  subjectName: string;
  group?: string;
  category?: string;
  curriculumAnswers: CurriculumUnitItem[];
  paperId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectTemplate {
  id: string;
  name: string;
  subject: string;
  classGrade?: string;
  group: string;
  category: 'Math' | 'Science' | 'History' | 'Computer Science' | 'English' | 'Other';
  description?: string;
  isBuiltIn?: boolean;
  paper: ExamPaper;
  curriculumData?: CurriculumAnswersPayload;
}

export type EmailAttachmentFormat = 'pdf' | 'docx' | 'json' | 'none';
export type ScheduledEmailStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';

export interface ScheduledEmailJob {
  id: string;
  userId: string;
  senderEmail?: string;
  to: string;
  cc?: string;
  subject: string;
  messageBody: string;
  includePaperText: boolean;
  attachmentFormat: EmailAttachmentFormat;
  driveShareLink?: string;
  scheduledFor: string;
  status: ScheduledEmailStatus;
  paperId: string;
  paperTitle: string;
  paperSnapshot: ExamPaper;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  gmailMessageId?: string;
  errorMessage?: string;
}

export interface PastPaperSectionPattern {
  name: string;
  subtitle: string;
  kind: 'mcq' | 'short' | 'detailed';
  questionCount: number;
  attemptCount: number;
  marksPerQuestion: number;
  totalSectionMarks: number;
  marksBadge: string;
  instruction: string;
  numberingStyle?: 'roman' | 'decimal' | 'section-c-from-3';
}

export interface PastPaperRecord {
  id: string;
  title: string;
  year: string;
  subject: string;
  classGrade: string;
  boardOrGroup: string;
  category: 'Math' | 'Science' | 'History' | 'Computer Science' | 'English' | 'Other';
  description?: string;
  questionBankId?: string;
  sourceImages?: string[];
  sectionPatterns: PastPaperSectionPattern[];
  paper: ExamPaper;
  createdAt: string;
  isBuiltIn?: boolean;
}

export interface PastPaperPatternSeed {
  pastPaperId: string;
  pastPaperTitle: string;
  year: string;
  subject: string;
  classGrade: string;
  boardOrGroup: string;
  questionBankId?: string;
  sectionPatterns: PastPaperSectionPattern[];
  excludedQuestionTexts: string[];
  sourcePaperHeader: ExamHeader;
}

