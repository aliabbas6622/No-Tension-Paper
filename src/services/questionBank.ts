import { BUNDLED_QUESTION_BANKS } from '../data/questionBank';
import {
  CurriculumUnitItem,
  ENGLISH_SECTION_B_SUBSECTIONS,
  ExamPaper,
  Question,
  SubjectTemplate,
} from '../types/exam';
import {
  BiekEnglishSeedResult,
  loadCurriculumSubjectsFromFirestore,
  seedBiekEnglishClass11StructureToFirestore,
  seedCurriculumSubjectsToFirestore,
} from './firebase';
import {
  buildBankQuestions,
  classifyCurriculumSection,
  inferCurriculumSubsection,
} from './paperComposer';

export type { BiekEnglishSeedResult };

/** A chapter-based question bank the Builder can browse. */
export interface QuestionBank {
  id: string;
  classGrade: string;
  subjectName: string;
  group: string;
  category: string;
  description?: string;
  units: CurriculumUnitItem[];
  /** Where this bank was read from, so the UI can be honest about freshness. */
  source: 'database' | 'bundled';
}

/** The banks compiled into the app — always available, even offline. */
export function getBundledQuestionBanks(): QuestionBank[] {
  return BUNDLED_QUESTION_BANKS.map((bank) => ({
    id: bank.id,
    classGrade: bank.classGrade,
    subjectName: bank.subjectName,
    group: bank.group,
    category: bank.category,
    description: bank.description,
    units: bank.units,
    source: 'bundled' as const,
  }));
}

/**
 * Read the question bank from Firestore, falling back to the bundled copy.
 * Database records win when they share an id with a bundled bank, so edits made
 * in the DB are respected, while the bundled data guarantees the Builder is
 * never empty on a cold or offline start.
 */
export async function loadQuestionBanks(): Promise<QuestionBank[]> {
  const byId = new Map<string, QuestionBank>(
    getBundledQuestionBanks().map((bank) => [bank.id, bank])
  );

  try {
    const records = await loadCurriculumSubjectsFromFirestore();
    records.forEach((record) => {
      if (!record.curriculumAnswers || record.curriculumAnswers.length === 0) return;
      byId.set(record.id, {
        id: record.id,
        classGrade: record.classGrade || 'Unassigned',
        subjectName: record.subjectName || 'Untitled Subject',
        group: record.group || '',
        category: record.category || 'Other',
        units: record.curriculumAnswers,
        source: 'database',
      });
    });
  } catch (err) {
    console.warn('Falling back to bundled question banks:', err);
  }

  // Bundled banks first so the built-in curriculum is easy to find.
  return [...byId.values()].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'bundled' ? -1 : 1;
    return a.subjectName.localeCompare(b.subjectName);
  });
}

/**
 * Push the bundled banks into Firestore. Without `force` this only fills in
 * missing records; with `force` it overwrites them with the bundled version.
 */
export async function syncBundledQuestionBanks(force = false) {
  return seedCurriculumSubjectsToFirestore(
    BUNDLED_QUESTION_BANKS.map((bank) => ({
      id: bank.id,
      classGrade: bank.classGrade,
      subjectName: bank.subjectName,
      group: bank.group,
      category: bank.category,
      description: bank.description,
      curriculumAnswers: bank.units,
    })),
    { force }
  );
}

const ROMAN_NUMERALS = [
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
  'xvii.',
  'xviii.',
  'xix.',
  'xx.',
];

/**
 * Seed the Firestore database with the standard BIEK Class 11 English question
 * structure — explicitly organized into Prose, Poem, and Grammar categories —
 * plus a ready-to-use BIEK Class 11 English template so users can immediately build papers.
 */
export async function seedBiekClass11EnglishToFirestore(
  options: { force?: boolean } = {}
): Promise<BiekEnglishSeedResult> {
  const englishBank = BUNDLED_QUESTION_BANKS.find(
    (bank) => bank.id === 'curr-english-class-11'
  );
  if (!englishBank) {
    throw new Error('Bundled Class 11 English question bank is missing.');
  }

  const normalizedUnits: CurriculumUnitItem[] = englishBank.units.map((unit) => ({
    ...unit,
    sections: unit.sections.map((section) => {
      const kind = classifyCurriculumSection(section);
      const inferredSub =
        kind === 'short'
          ? inferCurriculumSubsection(section.type, unit.unit, section.subsection)
          : section.subsection;

      return {
        ...section,
        ...(inferredSub ? { subsection: inferredSub } : {}),
        questions: section.questions.map((q) => {
          const itemSub =
            kind === 'short'
              ? inferCurriculumSubsection(
                  section.type,
                  unit.unit,
                  q.subsection || inferredSub
                )
              : q.subsection || inferredSub;
          return {
            ...q,
            ...(itemSub ? { subsection: itemSub } : {}),
            ...(typeof q.marks === 'number'
              ? {}
              : { marks: kind === 'mcq' ? 1 : kind === 'short' ? 4 : 10 }),
          };
        }),
      };
    }),
  }));

  const flatQuestions = buildBankQuestions(normalizedUnits);
  const proseShorts = flatQuestions.filter(
    (bq) => bq.kind === 'short' && bq.subsection === 'Sub-Section I (Prose)'
  );
  const poemShorts = flatQuestions.filter(
    (bq) => bq.kind === 'short' && bq.subsection === 'Sub-Section II (Poem)'
  );
  const grammarShorts = flatQuestions.filter(
    (bq) => bq.kind === 'short' && bq.subsection === 'Sub-Section III (Grammar)'
  );
  const mcqPool = flatQuestions.filter((bq) => bq.kind === 'mcq');
  const detailedPool = flatQuestions.filter((bq) => bq.kind === 'detailed');

  const countsByCategory: BiekEnglishSeedResult['countsByCategory'] = {
    Prose: proseShorts.length,
    Poem: poemShorts.length,
    Grammar: grammarShorts.length,
    MCQ: mcqPool.length,
    Detailed: detailedPool.length,
    Total: flatQuestions.length,
  };

  const toPaperQuestions = (
    items: typeof flatQuestions,
    marksOverride?: number,
    subsectionOverride?: string,
    startIndex = 0,
    numbering: 'roman' | 'section-c' = 'roman'
  ): Question[] =>
    items.map((bq, idx) => {
      const cloned = JSON.parse(JSON.stringify(bq.question)) as Question;
      const numberIndex = startIndex + idx;
      return {
        ...cloned,
        id: `q-seed-eng11-${numberIndex}-${Math.random().toString(36).slice(2, 7)}`,
        number:
          numbering === 'section-c'
            ? `${numberIndex + 3}.`
            : ROMAN_NUMERALS[numberIndex] || `${numberIndex + 1}.`,
        marks: marksOverride ?? cloned.marks ?? 4,
        ...(subsectionOverride || cloned.subsection
          ? { subsection: subsectionOverride || cloned.subsection }
          : {}),
      };
    });

  const secAQuestions = toPaperQuestions(mcqPool.slice(0, 20), 1);
  const secBProse = toPaperQuestions(proseShorts.slice(0, 4), 4, 'Sub-Section I (Prose)', 0);
  const secBPoem = toPaperQuestions(poemShorts.slice(0, 4), 4, 'Sub-Section II (Poem)', 4);
  const secBGrammar = toPaperQuestions(
    grammarShorts.slice(0, 5),
    4,
    'Sub-Section III (Grammar)',
    8
  );
  const secBQuestions = [...secBProse, ...secBPoem, ...secBGrammar];
  const secCQuestions = toPaperQuestions(detailedPool.slice(0, 3), undefined, undefined, 0, 'section-c');

  const now = new Date().toISOString();
  const starterPaper: ExamPaper = {
    id: 'paper-biek-english-class-11-seed',
    title: 'English (Compulsory) Paper I — Class 11 (BIEK)',
    classGrade: 'Class 11',
    subjectCategory: 'English',
    header: {
      examinationTitle: 'INTERMEDIATE EXAMINATION (ANNUAL)',
      examinationMonth: 'BIEK CLASS 11 ENGLISH PATTERN',
      groupName: 'COMPULSORY (ALL GROUPS)',
      subjectTitle: 'SUBJECT: ENGLISH (COMPULSORY) PAPER I',
      institutionName: 'BOARD OF INTERMEDIATE EDUCATION KARACHI (PATTERN)',
      date: now.split('T')[0],
      duration: '3 Hours',
      maxMarks: '100',
      showDividerLine: true,
      paperCode: 'ENG-XI-101',
      generalInstructions: [
        'Section A (20 Marks): Attempt all 20 Multiple Choice Questions (1 mark each).',
        'Section B (40 Marks): Attempt any TEN short part-questions across Prose, Poem, and Grammar (4 marks each).',
        'Section C (40 Marks): Attempt all THREE detailed composition and reading tasks.',
      ],
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
        id: 'sec-biek-eng-a',
        name: 'SECTION "A"',
        subtitle: '(MULTIPLE CHOICE QUESTIONS)',
        marksBadge: '20 Marks',
        instruction:
          'Q1. Choose the correct answer for each from the given options (20 MCQs × 1 Mark):',
        questions: secAQuestions,
      },
      {
        id: 'sec-biek-eng-b',
        name: 'SECTION "B"',
        subtitle: '(SHORT ANSWER QUESTIONS)',
        marksBadge: '40 Marks',
        instruction:
          'Q2. Attempt TEN part-questions in all from Prose, Poem, and Grammar (10 × 4 = 40 Marks):',
        subsections: [...ENGLISH_SECTION_B_SUBSECTIONS],
        questions: secBQuestions,
      },
      {
        id: 'sec-biek-eng-c',
        name: 'SECTION "C"',
        subtitle: '(DETAILED ANSWER QUESTIONS)',
        marksBadge: '40 Marks',
        instruction: 'NOTE: Attempt all questions from this section.',
        questions: secCQuestions,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const template: SubjectTemplate = {
    id: 'tpl-english-biek-class-11',
    name: 'English (Compulsory) — BIEK Class 11',
    subject: 'ENGLISH (COMPULSORY) PAPER I',
    classGrade: 'Class 11',
    group: 'COMPULSORY (ALL GROUPS)',
    category: 'English',
    description:
      'Standard BIEK Class 11 English format seeded with Prose, Poem, and Grammar sub-sections.',
    isBuiltIn: false,
    paper: starterPaper,
    curriculumData: {
      curriculum_answers: normalizedUnits,
    },
  };

  return seedBiekEnglishClass11StructureToFirestore(
    {
      bank: {
        id: englishBank.id,
        classGrade: englishBank.classGrade,
        subjectName: englishBank.subjectName,
        group: englishBank.group,
        category: englishBank.category,
        board: 'BIEK Karachi',
        description: englishBank.description,
        subSectionCategories: ['Prose', 'Poem', 'Grammar'],
        curriculumAnswers: normalizedUnits,
      },
      template,
      countsByCategory,
    },
    options
  );
}
