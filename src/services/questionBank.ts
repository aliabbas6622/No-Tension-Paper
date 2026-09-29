import { BUNDLED_QUESTION_BANKS } from '../data/questionBank';
import { CurriculumUnitItem } from '../types/exam';
import {
  loadCurriculumSubjectsFromFirestore,
  seedCurriculumSubjectsToFirestore,
} from './firebase';

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
