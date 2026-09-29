import { SubjectTemplate, ExamPaper } from '../types/exam';
import { DEFAULT_EXAM_PAPER } from './defaultPaper';

export const BUILT_IN_TEMPLATES: SubjectTemplate[] = [
  {
    id: 'tpl-cs-paper-2',
    name: 'Computer Paper II (Intermediate)',
    subject: 'COMPUTER PAPER II',
    group: 'COMPUTER SCIENCE GROUP',
    category: 'Computer Science',
    description: 'Standard intermediate board paper layout with Logic gates, Networks, and MCQs.',
    isBuiltIn: true,
    paper: DEFAULT_EXAM_PAPER,
  },
  {
    id: 'tpl-math-1',
    name: 'Mathematics Intermediate Paper',
    subject: 'MATHEMATICS PAPER II',
    group: 'GENERAL SCIENCE & COMMERCE GROUP',
    category: 'Math',
    description: 'Calculus, Vectors, Coordinate Geometry, and Algebra format with step markings.',
    isBuiltIn: true,
    paper: {
      ...DEFAULT_EXAM_PAPER,
      id: 'paper-math-2',
      title: 'Mathematics Paper II',
      subjectCategory: 'Math',
      header: {
        ...DEFAULT_EXAM_PAPER.header,
        groupName: 'PRE-ENGINEERING & GENERAL SCIENCE GROUP',
        subjectTitle: 'SUBJECT: MATHEMATICS PAPER II',
        maxMarks: '50',
      },
      sections: [
        {
          id: 'sec-math-a',
          name: 'SECTION "A"',
          subtitle: '(MULTIPLE CHOICE QUESTIONS)',
          marksBadge: '10 Marks',
          instruction: 'Q1 Choose the correct option for each problem:',
          questions: [
            {
              id: 'm1',
              number: 'i.',
              type: 'mcq',
              text: 'The derivative of ln(sec x + tan x) with respect to x is:',
              marks: 1,
              optionColumns: 2,
              options: [
                { id: 'm1a', label: '(a)', text: 'sec x' },
                { id: 'm1b', label: '(b)', text: 'tan x' },
                { id: 'm1c', label: '(c)', text: 'sec² x' },
                { id: 'm1d', label: '(d)', text: 'cos x' },
              ],
            },
            {
              id: 'm2',
              number: 'ii.',
              type: 'mcq',
              text: 'The slope of the line perpendicular to 2x - 3y + 5 = 0 is:',
              marks: 1,
              optionColumns: 2,
              options: [
                { id: 'm2a', label: '(a)', text: '2/3' },
                { id: 'm2b', label: '(b)', text: '-3/2' },
                { id: 'm2c', label: '(c)', text: '3/2' },
                { id: 'm2d', label: '(d)', text: '-2/3' },
              ],
            },
            {
              id: 'm3',
              number: 'iii.',
              type: 'mcq',
              text: 'If matrix A is singular, then det(A) is equal to:',
              marks: 1,
              optionColumns: 2,
              options: [
                { id: 'm3a', label: '(a)', text: '1' },
                { id: 'm3b', label: '(b)', text: '-1' },
                { id: 'm3c', label: '(c)', text: '0' },
                { id: 'm3d', label: '(d)', text: 'Infinity' },
              ],
            },
          ],
        },
        {
          id: 'sec-math-b',
          name: 'SECTION "B"',
          subtitle: '(SHORT ANSWER QUESTIONS)',
          marksBadge: '24 Marks',
          instruction: 'Note: Attempt any SIX questions. Show step-by-step mathematical reasoning.',
          questions: [
            {
              id: 'm-s1',
              number: 'i.',
              type: 'short',
              text: 'Find dy/dx if x = a cos³θ and y = a sin³θ.',
              marks: 4,
            },
            {
              id: 'm-s2',
              number: 'ii.',
              type: 'short',
              text: 'Evaluate the definite integral ∫ (x / √(1 + x²)) dx from 0 to 1.',
              marks: 4,
            },
          ],
        },
        {
          id: 'sec-math-c',
          name: 'SECTION "C"',
          subtitle: '(DETAILED ANSWER QUESTIONS)',
          marksBadge: '16 Marks',
          instruction: 'Note: Attempt any TWO questions (8 marks each).',
          questions: [
            {
              id: 'm-d1',
              number: 'i.',
              type: 'detailed',
              text: 'Find the equation of circle passing through points (1, 2), (3, -4), and (5, -6). Also determine its center and radius.',
              marks: 8,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'tpl-science-phy',
    name: 'General Science / Physics Paper',
    subject: 'PHYSICS PAPER I',
    group: 'PRE-ENGINEERING & PRE-MEDICAL GROUP',
    category: 'Science',
    description: 'Mechanics, Thermodynamics, Waves, and Optics with numerical problem sections.',
    isBuiltIn: true,
    paper: {
      ...DEFAULT_EXAM_PAPER,
      id: 'paper-physics-1',
      title: 'Physics Paper I',
      subjectCategory: 'Science',
      header: {
        ...DEFAULT_EXAM_PAPER.header,
        groupName: 'PRE-ENGINEERING / PRE-MEDICAL GROUP',
        subjectTitle: 'SUBJECT: PHYSICS PAPER I',
        maxMarks: '50',
      },
      sections: [
        {
          id: 'sec-phy-a',
          name: 'SECTION "A"',
          subtitle: '(MULTIPLE CHOICE QUESTIONS)',
          marksBadge: '10 Marks',
          instruction: 'Q1 Choose the best answer from the given choices:',
          questions: [
            {
              id: 'p1',
              number: 'i.',
              type: 'mcq',
              text: 'The SI unit of angular momentum is:',
              marks: 1,
              optionColumns: 2,
              options: [
                { id: 'p1a', label: '(a)', text: 'J . s' },
                { id: 'p1b', label: '(b)', text: 'N . m' },
                { id: 'p1c', label: '(c)', text: 'kg . m/s' },
                { id: 'p1d', label: '(d)', text: 'Watt' },
              ],
            },
            {
              id: 'p2',
              number: 'ii.',
              type: 'mcq',
              text: 'The phenomenon of polarization can only be exhibited by:',
              marks: 1,
              optionColumns: 2,
              options: [
                { id: 'p2a', label: '(a)', text: 'Longitudinal waves' },
                { id: 'p2b', label: '(b)', text: 'Transverse waves' },
                { id: 'p2c', label: '(c)', text: 'Sound waves' },
                { id: 'p2d', label: '(d)', text: 'Pressure waves' },
              ],
            },
          ],
        },
        {
          id: 'sec-phy-b',
          name: 'SECTION "B"',
          subtitle: '(SHORT ANSWER QUESTIONS)',
          marksBadge: '24 Marks',
          instruction: 'Note: Attempt any SIX questions. Give concise answers and formula derivations.',
          questions: [
            {
              id: 'p-s1',
              number: 'i.',
              type: 'short',
              text: 'State the Law of Conservation of Linear Momentum. Derive its expression for an isolated system.',
              marks: 4,
            },
            {
              id: 'p-s2',
              number: 'ii.',
              type: 'short',
              text: 'State Bernoulli\'s theorem and write its mathematical equation with physical significance of each term.',
              marks: 4,
            },
          ],
        },
        {
          id: 'sec-phy-c',
          name: 'SECTION "C"',
          subtitle: '(DETAILED ANSWER QUESTIONS)',
          marksBadge: '16 Marks',
          instruction: 'Note: Attempt any TWO questions. (8 marks each)',
          questions: [
            {
              id: 'p-d1',
              number: 'i.',
              type: 'detailed',
              text: 'Define Projectile Motion. Derive formulas for: (a) Time of flight, (b) Maximum height, (c) Horizontal range.',
              marks: 8,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'tpl-history-1',
    name: 'World & Modern History Paper',
    subject: 'MODERN WORLD HISTORY',
    group: 'HUMANITIES & SOCIAL SCIENCES GROUP',
    category: 'History',
    description: 'Chronology, Historical treaties, analytical causes, and essay topics.',
    isBuiltIn: true,
    paper: {
      ...DEFAULT_EXAM_PAPER,
      id: 'paper-history-1',
      title: 'Modern World History Paper',
      subjectCategory: 'History',
      header: {
        ...DEFAULT_EXAM_PAPER.header,
        groupName: 'HUMANITIES & SOCIAL SCIENCES GROUP',
        subjectTitle: 'SUBJECT: MODERN WORLD HISTORY',
        maxMarks: '50',
      },
      sections: [
        {
          id: 'sec-hist-a',
          name: 'SECTION "A"',
          subtitle: '(MULTIPLE CHOICE QUESTIONS)',
          marksBadge: '10 Marks',
          instruction: 'Q1 Choose the correct option for each historical inquiry:',
          questions: [
            {
              id: 'h1',
              number: 'i.',
              type: 'mcq',
              text: 'The Treaty of Versailles concluding World War I was signed in the year:',
              marks: 1,
              optionColumns: 2,
              options: [
                { id: 'h1a', label: '(a)', text: '1914' },
                { id: 'h1b', label: '(b)', text: '1918' },
                { id: 'h1c', label: '(c)', text: '1919' },
                { id: 'h1d', label: '(d)', text: '1923' },
              ],
            },
            {
              id: 'h2',
              number: 'ii.',
              type: 'mcq',
              text: 'The Industrial Revolution initially originated in:',
              marks: 1,
              optionColumns: 2,
              options: [
                { id: 'h2a', label: '(a)', text: 'France' },
                { id: 'h2b', label: '(b)', text: 'Great Britain' },
                { id: 'h2c', label: '(c)', text: 'Germany' },
                { id: 'h2d', label: '(d)', text: 'United States' },
              ],
            },
            {
              id: 'h3',
              number: 'iii.',
              type: 'mcq',
              text: 'The League of Nations was established following the recommendations of:',
              marks: 1,
              optionColumns: 2,
              options: [
                { id: 'h3a', label: '(a)', text: 'Woodrow Wilson' },
                { id: 'h3b', label: '(b)', text: 'Winston Churchill' },
                { id: 'h3c', label: '(c)', text: 'Franklin Roosevelt' },
                { id: 'h3d', label: '(d)', text: 'Otto von Bismarck' },
              ],
            },
          ],
        },
        {
          id: 'sec-hist-b',
          name: 'SECTION "B"',
          subtitle: '(SHORT ANSWER QUESTIONS)',
          marksBadge: '24 Marks',
          instruction: 'Note: Answer any SIX questions briefly with historical evidence.',
          questions: [
            {
              id: 'h-s1',
              number: 'i.',
              type: 'short',
              text: 'What were the immediate triggers of the French Revolution of 1789?',
              marks: 4,
            },
            {
              id: 'h-s2',
              number: 'ii.',
              type: 'short',
              text: 'Explain the main objectives and outcomes of the Congress of Vienna (1815).',
              marks: 4,
            },
            {
              id: 'h-s3',
              number: 'iii.',
              type: 'short',
              text: 'Define the policy of Imperialism in Africa during the late 19th century.',
              marks: 4,
            },
          ],
        },
        {
          id: 'sec-hist-c',
          name: 'SECTION "C"',
          subtitle: '(DETAILED ESSAY & ANALYSIS)',
          marksBadge: '16 Marks',
          instruction: 'Note: Attempt any TWO detailed analytical questions.',
          questions: [
            {
              id: 'h-d1',
              number: 'i.',
              type: 'detailed',
              text: 'Analyze the primary causes and long-term geopolitical consequences of the Cold War between 1947 and 1991.',
              marks: 8,
            },
            {
              id: 'h-d2',
              number: 'ii.',
              type: 'detailed',
              text: 'Critically assess the economic and social ramifications of the Great Depression of 1929 on global politics.',
              marks: 8,
            },
          ],
        },
      ],
    },
  },
];

const LOCAL_STORAGE_KEY = 'exam_maker_custom_templates_v2';
const PAPERS_STORAGE_KEY = 'exam_maker_saved_papers_v2';

export function getCustomTemplates(): SubjectTemplate[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load custom templates from localStorage', e);
    return [];
  }
}

export function saveCustomTemplate(
  name: string,
  category: 'Math' | 'Science' | 'History' | 'Computer Science' | 'English' | 'Other',
  paper: ExamPaper
): SubjectTemplate {
  const existing = getCustomTemplates();
  const newTemplate: SubjectTemplate = {
    id: 'custom-' + Date.now(),
    name,
    subject: paper.header.subjectTitle,
    group: paper.header.groupName,
    category,
    description: `User template with ${paper.sections.length} sections and ${paper.sections.reduce(
      (a, s) => a + s.questions.length,
      0
    )} questions.`,
    isBuiltIn: false,
    paper: JSON.parse(JSON.stringify(paper)),
  };

  const updated = [newTemplate, ...existing];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return newTemplate;
}

export function deleteCustomTemplate(id: string): void {
  const existing = getCustomTemplates();
  const updated = existing.filter((t) => t.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
}

export function getAllSavedPapers(): ExamPaper[] {
  try {
    const raw = localStorage.getItem(PAPERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function savePaperToLibrary(paper: ExamPaper): void {
  const existing = getAllSavedPapers();
  const index = existing.findIndex((p) => p.id === paper.id);
  let updated: ExamPaper[];
  if (index >= 0) {
    updated = [...existing];
    updated[index] = { ...paper, updatedAt: new Date().toISOString() };
  } else {
    updated = [{ ...paper, updatedAt: new Date().toISOString() }, ...existing];
  }
  localStorage.setItem(PAPERS_STORAGE_KEY, JSON.stringify(updated));
}

export function deletePaperFromLibrary(id: string): void {
  const existing = getAllSavedPapers();
  const updated = existing.filter((p) => p.id !== id);
  localStorage.setItem(PAPERS_STORAGE_KEY, JSON.stringify(updated));
}
