import type { CurriculumUnitItem } from '../../types/exam';
import computerScienceClass11 from './computer-science-class11.json';

/**
 * A reusable, chapter-based question bank. The `units` array is exactly the
 * `curriculum_answers` payload the rest of the app already understands, so a
 * bank can be turned into a paper, a template, or cherry-picked question by
 * question without any conversion step.
 */
export interface QuestionBankSubject {
  /** Deterministic id so seeding the same bank twice is a no-op. */
  id: string;
  classGrade: string;
  subjectName: string;
  group: string;
  category: 'Math' | 'Science' | 'History' | 'Computer Science' | 'English' | 'Other';
  description: string;
  units: CurriculumUnitItem[];
}

export const BUNDLED_QUESTION_BANKS: QuestionBankSubject[] = [
  {
    id: 'curr-computer-science-class-11',
    classGrade: 'Class 11',
    subjectName: 'Computer Science',
    group: 'COMPUTER SCIENCE GROUP',
    category: 'Computer Science',
    description:
      'Board-syllabus chapters with MCQs, fill in the blanks, short and detailed questions, each with a model answer.',
    units: computerScienceClass11.curriculum_answers as CurriculumUnitItem[],
  },
];
