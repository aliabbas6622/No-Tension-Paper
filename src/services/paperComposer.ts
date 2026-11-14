import {
  CurriculumSectionItem,
  CurriculumUnitItem,
  ExamPaper,
  ExamSection,
  MCQOption,
  Question,
  QuestionType,
} from '../types/exam';

/** The three groupings a curriculum question can belong to. */
export type QuestionKind = 'mcq' | 'short' | 'detailed';

export const DEFAULT_KIND_MARKS: Record<QuestionKind, number> = {
  mcq: 1,
  short: 4,
  detailed: 8,
};

const OPTION_LABELS = ['(a)', '(b)', '(c)', '(d)', '(e)', '(f)'];

const SECTION_META: Record<QuestionKind, { subtitle: string; instruction: string }> = {
  mcq: {
    subtitle: '(MULTIPLE CHOICE QUESTIONS)',
    instruction: 'Choose / Encircle the correct answer from the given options:',
  },
  short: {
    subtitle: '(SHORT ANSWER QUESTIONS)',
    instruction: 'Note: Answer all questions with concise and clear explanations.',
  },
  detailed: {
    subtitle: '(DETAILED ANSWER QUESTIONS)',
    instruction: 'Note: Attempt detailed questions with thorough explanations and diagrams.',
  },
};

/**
 * Curriculum sources label things loosely ("Encircle the correct answer (MCQs)",
 * "Provide short descriptive answers", "Activities"). Normalise those headings
 * into one of the three paper groupings, falling back to the options/heading text.
 */
export function classifyCurriculumSection(section: CurriculumSectionItem): QuestionKind {
  const type = (section.type || '').toLowerCase();
  const hasOptions = section.questions.some((q) => q.options && q.options.length > 0);

  if (type.includes('mcq') || type.includes('encircle') || type.includes('choice') || hasOptions) {
    return 'mcq';
  }
  if (type.includes('detailed') || type.includes('long') || type.includes('essay')) {
    return 'detailed';
  }
  return 'short';
}

/** Turn the loosely typed curriculum option list into real MCQ options. */
export function parseCurriculumOptions(optionsArr?: unknown): MCQOption[] | undefined {
  if (!Array.isArray(optionsArr) || optionsArr.length === 0) return undefined;

  return optionsArr.map((opt, idx) => {
    const id = `opt-${idx}-${Math.random().toString(36).substring(2, 7)}`;

    if (opt && typeof opt === 'object') {
      const obj = opt as { label?: string; text?: string };
      return {
        id,
        label: obj.label || OPTION_LABELS[idx] || `(${idx + 1})`,
        text: obj.text || '',
      };
    }

    const str = String(opt).trim();
    // Split a leading label like "(a)" / "a." / "1)" from the option body.
    const match = str.match(/^\s*(\([a-zA-Z0-9]+\)|[a-zA-Z0-9]+[.)])\s*(.*)$/);
    if (match) {
      const raw = match[1];
      const label = raw.startsWith('(') ? raw : `(${raw.replace(/[.)]/, '')})`;
      return { id, label, text: match[2].trim() };
    }

    return { id, label: OPTION_LABELS[idx] || `(${idx + 1})`, text: str };
  });
}

/** Convert one curriculum question into an editable paper question. */
export function curriculumQuestionToQuestion(
  raw: CurriculumSectionItem['questions'][number],
  kind: QuestionKind,
  index: number
): Question {
  const options = kind === 'mcq' ? parseCurriculumOptions(raw.options) : undefined;

  return {
    id: `q-bank-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
    number: raw.question_number ? `${raw.question_number}.` : `${index + 1}.`,
    type: kind,
    text: raw.question || '',
    marks: DEFAULT_KIND_MARKS[kind],
    ...(options ? { options, optionColumns: 2 as const } : {}),
    ...(raw.answer ? { answerKey: raw.answer } : {}),
  };
}

/** A single bank question plus the chapter context it came from. */
export interface BankQuestion {
  /** Stable unique key within a bank. */
  key: string;
  unitIndex: number;
  unitName: string;
  unitPages: string[];
  sectionType: string;
  kind: QuestionKind;
  question: Question;
}

/** Flatten a bank's units into a flat, filterable question list. */
export function buildBankQuestions(units: CurriculumUnitItem[]): BankQuestion[] {
  const out: BankQuestion[] = [];

  units.forEach((unit, unitIndex) => {
    unit.sections.forEach((section, sectionIndex) => {
      const kind = classifyCurriculumSection(section);
      section.questions.forEach((raw, qIndex) => {
        out.push({
          key: `${unitIndex}|${sectionIndex}|${qIndex}`,
          unitIndex,
          unitName: unit.unit,
          unitPages: unit.pages || [],
          sectionType: section.type,
          kind,
          question: curriculumQuestionToQuestion(raw, kind, qIndex),
        });
      });
    });
  });

  return out;
}

function normalizeKind(type: QuestionType): QuestionKind {
  if (type === 'mcq') return 'mcq';
  if (type === 'detailed') return 'detailed';
  return 'short';
}

/**
 * Work out which grouping a section belongs to, so incoming questions can be
 * appended to the section that already holds that kind instead of creating a
 * duplicate section on every add.
 */
function sectionKind(section: ExamSection): QuestionKind | null {
  const label = `${section.name} ${section.subtitle}`.toLowerCase();
  if (label.includes('mcq') || label.includes('multiple choice') || label.includes('objective')) {
    return 'mcq';
  }
  if (label.includes('detailed') || label.includes('long') || label.includes('essay')) {
    return 'detailed';
  }
  if (label.includes('short')) return 'short';

  const kinds = section.questions.map((q) => normalizeKind(q.type));
  if (kinds.length === 0) return null;
  if (kinds.every((k) => k === 'mcq')) return 'mcq';
  if (kinds.every((k) => k === 'detailed')) return 'detailed';
  if (kinds.every((k) => k === 'short')) return 'short';
  return null;
}

function renumber(questions: Question[]) {
  const roman = [
    'i.', 'ii.', 'iii.', 'iv.', 'v.', 'vi.', 'vii.', 'viii.', 'ix.', 'x.',
    'xi.', 'xii.', 'xiii.', 'xiv.', 'xv.', 'xvi.', 'xvii.', 'xviii.', 'xix.', 'xx.',
  ];
  questions.forEach((q, idx) => {
    q.number = roman[idx] || `${idx + 1}.`;
  });
}

function sectionTotalMarks(section: ExamSection): number {
  return section.questions.reduce((acc, q) => acc + (q.marks || 0), 0);
}

/**
 * Keep the "10 Marks" badge in step with the questions actually present, but
 * only when it follows that numeric pattern — a hand-written badge is a
 * deliberate note and is left untouched.
 */
function refreshMarksBadge(section: ExamSection) {
  const badge = (section.marksBadge || '').trim();
  if (!badge || /^\d+\s*marks?$/i.test(badge)) {
    section.marksBadge = `${sectionTotalMarks(section)} Marks`;
  }
}

const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function freshQuestionId(index: number): string {
  return `q-${Date.now().toString(36)}-${index}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Append bank questions to a paper, grouping them into the matching MCQ /
 * short / detailed section (creating one only when the paper has no home for
 * that kind yet). Existing questions are never touched or reordered.
 *
 * Questions are deep-cloned with brand new ids: adding the same bank question
 * twice must produce two independent questions, not one shared id.
 */
export function mergeQuestionsIntoPaper(paper: ExamPaper, incoming: Question[]): ExamPaper {
  if (incoming.length === 0) return paper;

  const groups: Record<QuestionKind, Question[]> = { mcq: [], short: [], detailed: [] };
  incoming.forEach((q, index) => {
    groups[normalizeKind(q.type)].push({
      ...JSON.parse(JSON.stringify(q)),
      id: freshQuestionId(index),
    });
  });

  const sections: ExamSection[] = paper.sections.map((s) => ({
    ...s,
    questions: [...s.questions],
  }));

  (['mcq', 'short', 'detailed'] as QuestionKind[]).forEach((kind) => {
    const questions = groups[kind];
    if (questions.length === 0) return;

    // Recompute against the live array so a section created for an earlier
    // kind in this same pass is still considered.
    let target = sections.find((s) => sectionKind(s) === kind);

    if (!target) {
      const usedLetters = new Set(
        sections
          .map((s) => s.name.match(/"([A-Z])"/)?.[1])
          .filter((l): l is string => Boolean(l))
      );
      const letter =
        SECTION_LETTERS.find((l) => !usedLetters.has(l)) || String(sections.length + 1);
      target = {
        id: `sec-${kind}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: `SECTION "${letter}"`,
        subtitle: SECTION_META[kind].subtitle,
        marksBadge: '',
        instruction: SECTION_META[kind].instruction,
        questions: [],
      };
      sections.push(target);
    }

    target.questions.push(...questions);
    renumber(target.questions);
    refreshMarksBadge(target);
  });

  return {
    ...paper,
    sections,
    updatedAt: new Date().toISOString(),
  };
}
