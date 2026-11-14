import {
  CurriculumSectionItem,
  CurriculumUnitItem,
  ExamPaper,
  ExamSection,
  MCQOption,
  PastPaperPatternSeed,
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
  isFillInTheBlank: boolean;
  question: Question;
}

export function isFillInTheBlankItem(text: string, sectionType?: string): boolean {
  const secLower = (sectionType || '').toLowerCase();
  if (secLower.includes('blank')) return true;
  if (/_{3,}/.test(text || '')) return true;
  if (/\bfill\s+in\s+the\s+blank/i.test(text || '')) return true;
  return false;
}

/** Flatten a bank's units into a flat, filterable question list. */
export function buildBankQuestions(units: CurriculumUnitItem[]): BankQuestion[] {
  const out: BankQuestion[] = [];

  units.forEach((unit, unitIndex) => {
    unit.sections.forEach((section, sectionIndex) => {
      const kind = classifyCurriculumSection(section);
      section.questions.forEach((raw, qIndex) => {
        const qObj = curriculumQuestionToQuestion(raw, kind, qIndex);
        out.push({
          key: `${unitIndex}|${sectionIndex}|${qIndex}`,
          unitIndex,
          unitName: unit.unit,
          unitPages: unit.pages || [],
          sectionType: section.type,
          kind,
          isFillInTheBlank: isFillInTheBlankItem(qObj.text, section.type),
          question: qObj,
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

export function refreshSectionMarksBadge(section: ExamSection): ExamSection {
  const badge = (section.marksBadge || '').trim();
  if (!badge || /^\d+\s*marks?$/i.test(badge)) {
    return { ...section, marksBadge: `${sectionTotalMarks(section)} Marks` };
  }
  return section;
}

/**
 * Keep the "10 Marks" badge in step with the questions actually present, but
 * only when it follows that numeric pattern — a hand-written badge is a
 * deliberate note and is left untouched.
 */
function refreshMarksBadge(section: ExamSection) {
  section.marksBadge = refreshSectionMarksBadge(section).marksBadge;
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

    const existingQuestions = target.questions;
    questions.forEach((question, index) => {
      question.number = nextQuestionNumber(existingQuestions, index);
    });
    target.questions.push(...questions);
    refreshMarksBadge(target);
  });

  return {
    ...paper,
    sections,
    updatedAt: new Date().toISOString(),
  };
}

function formatPatternNum(
  idx: number,
  style?: 'roman' | 'decimal' | 'section-c-from-3'
): string {
  if (style === 'section-c-from-3') return `${idx + 3}.`;
  if (style === 'decimal') return `${idx + 1}.`;
  const roman = [
    'i.', 'ii.', 'iii.', 'iv.', 'v.', 'vi.', 'vii.', 'viii.', 'ix.', 'x.',
    'xi.', 'xii.', 'xiii.', 'xiv.', 'xv.', 'xvi.', 'xvii.', 'xviii.', 'xix.', 'xx.',
  ];
  return roman[idx] || `${idx + 1}.`;
}

function romanNumeralValue(value: string): number {
  const numeralValues: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    const current = numeralValues[value[index].toLowerCase()];
    const next = numeralValues[value[index + 1]?.toLowerCase()] || 0;
    total += current < next ? -current : current;
  }
  return total;
}

export function nextQuestionNumber(questions: Question[], offset = 0): string {
  const lastNumber = questions[questions.length - 1]?.number.trim() || '';
  const numeric = lastNumber.match(/^(.*?)(\d+)([.)]?)$/);
  if (numeric) {
    return `${numeric[1]}${Number(numeric[2]) + offset + 1}${numeric[3]}`;
  }

  const roman = lastNumber.match(/^([ivxlcdm]+)\.$/i);
  if (roman) {
    const next = formatPatternNum(romanNumeralValue(roman[1]) + offset);
    return roman[1] === roman[1].toUpperCase() ? next.toUpperCase() : next;
  }

  const alpha = lastNumber.match(/^([a-z])([.)]?)$/i);
  if (alpha) {
    const next = alpha[1].toLowerCase().charCodeAt(0) + offset + 1;
    if (next <= 'z'.charCodeAt(0)) {
      return `${String.fromCharCode(next)}${alpha[2]}`;
    }
  }

  return formatPatternNum(questions.length + offset);
}

/**
 * Replaces the active paper's questions with the user's newly checked set from
 * Question Bank / BuilderMode while preserving active Past Paper pattern metadata
 * (or existing section headers/numbering when no pattern seed is active).
 */
export function replaceQuestionsInPaper(
  paper: ExamPaper,
  incoming: Question[],
  patternSeed?: PastPaperPatternSeed | null
): ExamPaper {
  if (incoming.length === 0) return paper;

  const groups: Record<QuestionKind, Question[]> = { mcq: [], short: [], detailed: [] };
  incoming.forEach((q, index) => {
    const cloned = JSON.parse(JSON.stringify(q)) as Question;
    groups[normalizeKind(cloned.type)].push({
      ...cloned,
      id: freshQuestionId(index),
      ...(cloned.options
        ? {
            options: cloned.options.map((opt, optIdx) => ({
              ...opt,
              id: `opt-rep-${Date.now().toString(36)}-${index}-${optIdx}`,
            })),
          }
        : {}),
    });
  });

  if (patternSeed && patternSeed.sectionPatterns.length > 0) {
    const remaining: Record<QuestionKind, Question[]> = {
      mcq: [...groups.mcq],
      short: [...groups.short],
      detailed: [...groups.detailed],
    };

    const sections: ExamSection[] = patternSeed.sectionPatterns.map((sp, sIdx) => {
      const existing = paper.sections[sIdx];
      // Count how many sections share this kind after this one so the last matching
      // section receives all remaining user-checked questions of that kind.
      const laterSameKind = patternSeed.sectionPatterns
        .slice(sIdx + 1)
        .some((other) => other.kind === sp.kind);
      const pool = remaining[sp.kind];
      const taken = laterSameKind ? pool.splice(0, sp.questionCount) : pool.splice(0, pool.length);

      const formatted = taken.map((q, qIdx) => ({
        ...q,
        number: formatPatternNum(qIdx, sp.numberingStyle),
        marks: sp.marksPerQuestion,
      }));

      const totalSecMarks = formatted.reduce((sum, q) => sum + (q.marks || sp.marksPerQuestion), 0);
      const keepPatternBadge = formatted.length === sp.questionCount && sp.marksBadge;

      return {
        id: existing?.id || `sec-pp-man-${sIdx}-${Date.now()}`,
        name: existing?.name || sp.name,
        subtitle: existing?.subtitle || sp.subtitle,
        marksBadge: keepPatternBadge ? sp.marksBadge : `${totalSecMarks} Marks`,
        instruction: existing?.instruction || sp.instruction,
        questions: formatted,
      };
    });

    const matchesAllPatternCounts = patternSeed.sectionPatterns.every(
      (sp, sIdx) => (sections[sIdx]?.questions.length || 0) === sp.questionCount
    );
    const totalComputed = sections.reduce(
      (sum, sec) => sum + sec.questions.reduce((qs, q) => qs + (q.marks || 0), 0),
      0
    );

    return {
      ...paper,
      sections,
      header: {
        ...paper.header,
        maxMarks: matchesAllPatternCounts ? paper.header.maxMarks : String(totalComputed),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  // Non-pattern rebuild: preserve existing section styling for each kind that has questions
  const nextSections: ExamSection[] = [];
  (['mcq', 'short', 'detailed'] as QuestionKind[]).forEach((kind) => {
    const questions = groups[kind];
    if (questions.length === 0) return;

    const existing = paper.sections.find((s) => sectionKind(s) === kind);
    const usedLetters = new Set(
      nextSections
        .map((s) => s.name.match(/"([A-Z])"/)?.[1])
        .filter((l): l is string => Boolean(l))
    );
    const letter =
      SECTION_LETTERS.find((l) => !usedLetters.has(l)) || String(nextSections.length + 1);

    renumber(questions);
    const totalSecMarks = questions.reduce((acc, q) => acc + (q.marks || 0), 0);

    nextSections.push({
      id: existing?.id || `sec-${kind}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: existing?.name || `SECTION "${letter}"`,
      subtitle: existing?.subtitle || SECTION_META[kind].subtitle,
      marksBadge: `${totalSecMarks} Marks`,
      instruction: existing?.instruction || SECTION_META[kind].instruction,
      questions,
    });
  });

  const totalComputed = nextSections.reduce(
    (sum, sec) => sum + sec.questions.reduce((qs, q) => qs + (q.marks || 0), 0),
    0
  );

  return {
    ...paper,
    sections: nextSections.length > 0 ? nextSections : paper.sections,
    header: {
      ...paper.header,
      maxMarks: String(totalComputed || paper.header.maxMarks),
    },
    updatedAt: new Date().toISOString(),
  };
}
