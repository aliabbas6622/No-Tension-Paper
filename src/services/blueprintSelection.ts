import {
  ExamPaper,
  ExamSection,
  Question,
} from '../types/exam';
import {
  BankQuestion,
  QuestionKind,
  mergeQuestionsIntoPaper,
} from './paperComposer';
import { QuestionBank } from './questionBank';

export type SelectionEngine = 'weighted' | 'ai';

export interface ChapterWeightConfig {
  unitIndex: number;
  unitName: string;
  selected: boolean;
  weight: number;
  available: Record<QuestionKind, number>;
}

export interface SectionBlueprintConfig {
  kind: QuestionKind;
  label: string;
  sectionName: string;
  subtitle: string;
  instruction: string;
  count: number;
  marksPerQuestion: number;
}

export interface SelectedReviewQuestion {
  reviewId: string;
  bankQuestion: BankQuestion;
  marks: number;
  tag?: string;
  reason?: string;
}

export interface SelectionShortfall {
  kind: QuestionKind;
  requested: number;
  filled: number;
}

export interface BlueprintSelectionResult {
  engine: SelectionEngine;
  rationale: string;
  selected: SelectedReviewQuestion[];
  shortfalls: SelectionShortfall[];
}

export const DEFAULT_SECTION_BLUEPRINTS: SectionBlueprintConfig[] = [
  {
    kind: 'mcq',
    label: 'Multiple Choice Questions (MCQs)',
    sectionName: 'SECTION "A"',
    subtitle: '(MULTIPLE CHOICE QUESTIONS)',
    instruction: 'Q1 Choose / Encircle the correct answer from the given options:',
    count: 10,
    marksPerQuestion: 1,
  },
  {
    kind: 'short',
    label: 'Short Answer Questions',
    sectionName: 'SECTION "B"',
    subtitle: '(SHORT ANSWER QUESTIONS)',
    instruction: 'Note: Answer all short questions with concise, accurate explanations.',
    count: 6,
    marksPerQuestion: 4,
  },
  {
    kind: 'detailed',
    label: 'Detailed / Long Questions',
    sectionName: 'SECTION "C"',
    subtitle: '(DETAILED ANSWER QUESTIONS)',
    instruction: 'Note: Attempt detailed questions with thorough explanations and diagrams.',
    count: 2,
    marksPerQuestion: 8,
  },
];

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeReviewId(key: string, index: number): string {
  return `rev-${index}-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Allocate integer counts across chapters proportionally using Hamilton (largest remainder)
 * apportionment while respecting each chapter's available question capacity.
 */
function allocateQuotasByWeight(
  chapterPools: Array<{ unitIndex: number; unitName: string; weight: number; items: BankQuestion[] }>,
  requestedCount: number
): Map<number, number> {
  const allocations = new Map<number, number>();
  chapterPools.forEach((p) => allocations.set(p.unitIndex, 0));

  let remainingToAssign = Math.min(
    requestedCount,
    chapterPools.reduce((sum, p) => sum + p.items.length, 0)
  );
  if (remainingToAssign <= 0) return allocations;

  while (remainingToAssign > 0) {
    const eligible = chapterPools.filter(
      (p) => (allocations.get(p.unitIndex) ?? 0) < p.items.length
    );
    if (eligible.length === 0) break;

    const totalWeight = eligible.reduce((sum, p) => sum + Math.max(0, p.weight), 0);
    const useEqual = totalWeight <= 0;
    const effectiveTotalWeight = useEqual ? eligible.length : totalWeight;

    const rawShares = eligible.map((p) => {
      const capLeft = p.items.length - (allocations.get(p.unitIndex) ?? 0);
      const w = useEqual ? 1 : Math.max(0, p.weight);
      const exact = (remainingToAssign * w) / effectiveTotalWeight;
      const base = Math.min(capLeft, Math.floor(exact));
      return {
        unitIndex: p.unitIndex,
        capLeft,
        base,
        remainder: exact - Math.floor(exact),
        weight: w,
      };
    });

    let assignedThisPass = 0;
    for (const share of rawShares) {
      if (share.base > 0) {
        allocations.set(share.unitIndex, (allocations.get(share.unitIndex) ?? 0) + share.base);
        assignedThisPass += share.base;
        remainingToAssign -= share.base;
      }
    }

    if (remainingToAssign > 0) {
      const sortedByRemainder = [...rawShares]
        .filter((s) => (allocations.get(s.unitIndex) ?? 0) < (chapterPools.find((p) => p.unitIndex === s.unitIndex)?.items.length ?? 0))
        .sort((a, b) => {
          if (Math.abs(b.remainder - a.remainder) > 1e-6) {
            return b.remainder - a.remainder;
          }
          return b.weight - a.weight;
        });

      for (const s of sortedByRemainder) {
        if (remainingToAssign <= 0) break;
        const poolLen = chapterPools.find((p) => p.unitIndex === s.unitIndex)?.items.length ?? 0;
        const current = allocations.get(s.unitIndex) ?? 0;
        if (current < poolLen) {
          allocations.set(s.unitIndex, current + 1);
          assignedThisPass += 1;
          remainingToAssign -= 1;
        }
      }
    }

    if (assignedThisPass === 0) break;
  }

  return allocations;
}

/**
 * Deterministic pre-weighted question selector using chapter weightage percentages.
 */
export function selectQuestionsPreWeighted(params: {
  allBankQuestions: BankQuestion[];
  chapters: ChapterWeightConfig[];
  sections: SectionBlueprintConfig[];
  excludeFillInBlanks?: boolean;
}): BlueprintSelectionResult {
  const { excludeFillInBlanks = true } = params;
  const activeChapters = params.chapters.filter((c) => c.selected);
  const activeChapterSet = new Set(activeChapters.map((c) => c.unitIndex));
  const candidates = params.allBankQuestions.filter(
    (q) => activeChapterSet.has(q.unitIndex) && !(excludeFillInBlanks && q.isFillInTheBlank)
  );

  const selected: SelectedReviewQuestion[] = [];
  const shortfalls: SelectionShortfall[] = [];
  let idxCounter = 0;

  for (const sec of params.sections) {
    if (sec.count <= 0) continue;

    const kindPools = activeChapters.map((ch) => ({
      unitIndex: ch.unitIndex,
      unitName: ch.unitName,
      weight: ch.weight,
      items: shuffleArray(
        candidates.filter((q) => q.unitIndex === ch.unitIndex && q.kind === sec.kind)
      ),
    }));

    const quotas = allocateQuotasByWeight(kindPools, sec.count);
    let filledForKind = 0;

    for (const pool of kindPools) {
      const quota = quotas.get(pool.unitIndex) ?? 0;
      const slice = pool.items.slice(0, quota);
      for (const bq of slice) {
        selected.push({
          reviewId: makeReviewId(bq.key, idxCounter++),
          bankQuestion: bq,
          marks: sec.marksPerQuestion,
          tag: 'Weighted',
        });
        filledForKind += 1;
      }
    }

    if (filledForKind < sec.count) {
      shortfalls.push({
        kind: sec.kind,
        requested: sec.count,
        filled: filledForKind,
      });
    }
  }

  const totalWeight = activeChapters.reduce((sum, c) => sum + Math.max(0, c.weight), 0);
  const weightSummary = activeChapters
    .map((c) => {
      const pct = totalWeight > 0
        ? Math.round((Math.max(0, c.weight) / totalWeight) * 100)
        : Math.round(100 / Math.max(1, activeChapters.length));
      return `${c.unitName} (${pct}%)`;
    })
    .join(', ');

  return {
    engine: 'weighted',
    rationale: `Distributed questions proportionally across ${activeChapters.length} chapter${
      activeChapters.length === 1 ? '' : 's'
    } by configured weights: ${weightSummary}.`,
    selected,
    shortfalls,
  };
}

/**
 * AI-powered question selector backed by server-side Gemini (/api/ai/select-questions).
 */
export async function selectQuestionsWithAI(params: {
  bank: QuestionBank;
  allBankQuestions: BankQuestion[];
  chapters: ChapterWeightConfig[];
  sections: SectionBlueprintConfig[];
  focusPrompt?: string;
  excludeFillInBlanks?: boolean;
}): Promise<BlueprintSelectionResult> {
  const { excludeFillInBlanks = true } = params;
  const activeChapters = params.chapters.filter((c) => c.selected);
  const activeChapterSet = new Set(activeChapters.map((c) => c.unitIndex));
  const requestedKinds = new Set(
    params.sections.filter((s) => s.count > 0).map((s) => s.kind)
  );

  const candidates = params.allBankQuestions.filter(
    (q) =>
      activeChapterSet.has(q.unitIndex) &&
      requestedKinds.has(q.kind) &&
      !(excludeFillInBlanks && q.isFillInTheBlank)
  );

  const res = await fetch('/api/ai/select-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjectName: params.bank.subjectName,
      classGrade: params.bank.classGrade,
      excludeFillInBlanks,
      sections: params.sections
        .filter((s) => s.count > 0)
        .map((s) => ({ kind: s.kind, count: s.count })),
      chapters: activeChapters.map((c) => ({
        unitIndex: c.unitIndex,
        unitName: c.unitName,
        weight: c.weight,
      })),
      candidates: candidates.map((c) => ({
        key: c.key,
        unitIndex: c.unitIndex,
        unitName: c.unitName,
        sectionType: c.sectionType,
        kind: c.kind,
        text: c.question.text,
        optionsPreview: c.question.options?.map((o) => `${o.label} ${o.text}`),
      })),
      focusPrompt: params.focusPrompt?.trim() || undefined,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    rationale?: string;
    selections?: Array<{ key: string; kind: QuestionKind; tag?: string; reason?: string }>;
  };

  if (!res.ok) {
    throw new Error(data.error || `AI selection failed (${res.status}).`);
  }

  const candidateMap = new Map<string, BankQuestion>(candidates.map((c) => [c.key, c]));
  const marksMap = new Map<QuestionKind, number>(
    params.sections.map((s) => [s.kind, s.marksPerQuestion])
  );

  const selected: SelectedReviewQuestion[] = [];
  const countsFilled: Record<QuestionKind, number> = { mcq: 0, short: 0, detailed: 0 };

  (data.selections || []).forEach((item, idx) => {
    const bq = candidateMap.get(item.key);
    if (!bq) return;
    selected.push({
      reviewId: makeReviewId(bq.key, idx),
      bankQuestion: bq,
      marks: marksMap.get(bq.kind) ?? bq.question.marks ?? 1,
      tag: item.tag || 'AI Pick',
      reason: item.reason,
    });
    countsFilled[bq.kind] += 1;
  });

  const shortfalls: SelectionShortfall[] = [];
  for (const sec of params.sections) {
    if (sec.count > 0 && countsFilled[sec.kind] < sec.count) {
      shortfalls.push({
        kind: sec.kind,
        requested: sec.count,
        filled: countsFilled[sec.kind],
      });
    }
  }

  return {
    engine: 'ai',
    rationale:
      data.rationale ||
      'AI selected questions balancing conceptual breadth, difficulty progression, and chapter weights.',
    selected,
    shortfalls,
  };
}

function toRomanOrDecimal(idx: number): string {
  const roman = [
    'i.', 'ii.', 'iii.', 'iv.', 'v.', 'vi.', 'vii.', 'viii.', 'ix.', 'x.',
    'xi.', 'xii.', 'xiii.', 'xiv.', 'xv.', 'xvi.', 'xvii.', 'xviii.', 'xix.', 'xx.',
    'xxi.', 'xxii.', 'xxiii.', 'xxiv.', 'xxv.',
  ];
  return roman[idx] || `${idx + 1}.`;
}

function cloneQuestionForPaper(
  item: SelectedReviewQuestion,
  indexInSection: number
): Question {
  const ts = Date.now();
  const cloned = JSON.parse(JSON.stringify(item.bankQuestion.question)) as Question;
  return {
    ...cloned,
    id: `q-bp-${ts}-${indexInSection}-${Math.random().toString(36).substring(2, 6)}`,
    number: toRomanOrDecimal(indexInSection),
    marks: item.marks,
    ...(cloned.options
      ? {
          options: cloned.options.map((opt, optIdx) => ({
            ...opt,
            id: `opt-bp-${ts}-${indexInSection}-${optIdx}`,
          })),
        }
      : {}),
  };
}

/**
 * Converts reviewed blueprint selections into an updated ExamPaper ready for the Editor.
 */
export function buildPaperFromReview(params: {
  basePaper: ExamPaper;
  bank: QuestionBank;
  reviewedItems: SelectedReviewQuestion[];
  sectionConfigs: SectionBlueprintConfig[];
  applyMode: 'replace' | 'append';
}): ExamPaper {
  const { basePaper, bank, reviewedItems, sectionConfigs, applyMode } = params;

  if (applyMode === 'append') {
    const incoming: Question[] = reviewedItems.map((item, idx) =>
      cloneQuestionForPaper(item, idx)
    );
    return mergeQuestionsIntoPaper(basePaper, incoming);
  }

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  let letterIdx = 0;
  const newSections: ExamSection[] = [];

  for (const cfg of sectionConfigs) {
    const items = reviewedItems.filter((item) => item.bankQuestion.kind === cfg.kind);
    if (items.length === 0) continue;

    const sectionMarks = items.reduce((sum, item) => sum + (item.marks || 0), 0);
    const letter = letters[letterIdx] || String(letterIdx + 1);
    letterIdx += 1;

    newSections.push({
      id: `sec-bp-${cfg.kind}-${Date.now()}-${letterIdx}`,
      name: `SECTION "${letter}"`,
      subtitle: cfg.subtitle,
      marksBadge: `${sectionMarks} Marks`,
      instruction: cfg.instruction,
      questions: items.map((item, idx) => cloneQuestionForPaper(item, idx)),
    });
  }

  const totalMarks = newSections.reduce(
    (sum, sec) => sum + sec.questions.reduce((qs, q) => qs + (q.marks || 0), 0),
    0
  );

  const now = new Date().toISOString();
  return {
    ...basePaper,
    id: basePaper.id || `paper-${Date.now()}`,
    title: `${bank.subjectName} (${bank.classGrade})`,
    classGrade: bank.classGrade,
    subjectCategory: bank.category,
    header: {
      ...basePaper.header,
      subjectTitle: `SUBJECT: ${bank.subjectName.toUpperCase()}`,
      groupName: bank.group || basePaper.header.groupName,
      maxMarks: String(totalMarks),
    },
    sections: newSections.length > 0 ? newSections : basePaper.sections,
    updatedAt: now,
  };
}
