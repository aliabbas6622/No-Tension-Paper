import {
  ExamPaper,
  ExamSection,
  PastPaperPatternSeed,
  PastPaperRecord,
  PastPaperSectionPattern,
  Question,
} from '../types/exam';
import { BankQuestion, QuestionKind, buildBankQuestions } from './paperComposer';
import { QuestionBank } from './questionBank';

export type PatternGenerationEngine = 'bank' | 'ai-db' | 'ai' | 'manual';

export interface GeneratedFromPatternResult {
  paper: ExamPaper;
  engine: PatternGenerationEngine;
  rationale: string;
  excludedCount: number;
  shortfalls: Array<{ sectionName: string; kind: QuestionKind; requested: number; filled: number }>;
  questionMetaById?: Record<string, { unitName?: string; tag?: string; reason?: string }>;
}

const STOP_WORDS = new Set([
  'the', 'is', 'are', 'of', 'in', 'a', 'an', 'and', 'or', 'to', 'for', 'with',
  'what', 'which', 'this', 'that', 'these', 'those', 'between', 'from', 'any',
  'define', 'describe', 'explain', 'write', 'main', 'computer', 'data',
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(' ')
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
  );
}

/**
 * Checks whether a candidate question substantially overlaps with any question
 * from the source past paper so "different questions" avoids near-duplicates.
 */
export function isSimilarToPastQuestion(candidateText: string, pastTexts: string[]): boolean {
  const normCand = normalizeText(candidateText);
  if (!normCand) return false;

  const candTokens = significantTokens(candidateText);

  for (const past of pastTexts) {
    const normPast = normalizeText(past);
    if (!normPast) continue;
    if (normCand === normPast || normCand.includes(normPast) || normPast.includes(normCand)) {
      return true;
    }

    if (candTokens.size >= 3) {
      const pastTokens = significantTokens(past);
      if (pastTokens.size >= 3) {
        let overlap = 0;
        candTokens.forEach((tok) => {
          if (pastTokens.has(tok)) overlap += 1;
        });
        const ratio = overlap / Math.min(candTokens.size, pastTokens.size);
        if (ratio >= 0.72) return true;
      }
    }
  }

  return false;
}

export function extractPastPaperQuestionTexts(paper: ExamPaper): string[] {
  const texts: string[] = [];
  paper.sections.forEach((sec) => {
    sec.questions.forEach((q) => {
      if (q.text) texts.push(q.text);
    });
  });
  return texts;
}

export function formatQuestionNumber(
  idx: number,
  style: PastPaperSectionPattern['numberingStyle'] = 'roman'
): string {
  if (style === 'section-c-from-3') {
    return `${idx + 3}.`;
  }
  if (style === 'decimal') {
    return `${idx + 1}.`;
  }
  const roman = [
    'i.', 'ii.', 'iii.', 'iv.', 'v.', 'vi.', 'vii.', 'viii.', 'ix.', 'x.',
    'xi.', 'xii.', 'xiii.', 'xiv.', 'xv.', 'xvi.', 'xvii.', 'xviii.', 'xix.', 'xx.',
    'xxi.', 'xxii.', 'xxiii.', 'xxiv.', 'xxv.',
  ];
  return roman[idx] || `${idx + 1}.`;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Picks questions evenly across chapters (round-robin over shuffled unit buckets)
 * so the resulting paper stays balanced across the curriculum.
 */
function pickBalancedAcrossChapters(pool: BankQuestion[], count: number): BankQuestion[] {
  if (count <= 0 || pool.length === 0) return [];
  const byUnit = new Map<number, BankQuestion[]>();
  pool.forEach((item) => {
    const list = byUnit.get(item.unitIndex) || [];
    list.push(item);
    byUnit.set(item.unitIndex, list);
  });

  const unitQueues = shuffle(
    Array.from(byUnit.values()).map((items) => shuffle(items))
  );

  const picked: BankQuestion[] = [];
  let madeProgress = true;
  while (picked.length < count && madeProgress) {
    madeProgress = false;
    for (const queue of unitQueues) {
      if (picked.length >= count) break;
      const next = queue.shift();
      if (next) {
        picked.push(next);
        madeProgress = true;
      }
    }
  }
  return picked;
}

function buildFreshHeaderFromPastPaper(pastPaper: PastPaperRecord): ExamPaper['header'] {
  const totalPatternMarks = pastPaper.sectionPatterns.reduce(
    (sum, sp) => sum + sp.totalSectionMarks,
    0
  );
  const currentYear = new Date().getFullYear();

  return {
    ...pastPaper.paper.header,
    examinationTitle: `${pastPaper.subject.toUpperCase()} MODEL PAPER ${currentYear}`,
    examinationMonth: `BASED ON ${pastPaper.year} PATTERN`,
    groupName: pastPaper.paper.header.groupName || pastPaper.boardOrGroup.toUpperCase(),
    subjectTitle: pastPaper.paper.header.subjectTitle || `SUBJECT: ${pastPaper.subject.toUpperCase()}`,
    date: new Date().toISOString().split('T')[0],
    duration: pastPaper.paper.header.duration || '3 Hours',
    maxMarks: String(totalPatternMarks || pastPaper.paper.header.maxMarks || '75'),
    paperCode: pastPaper.paper.header.paperCode
      ? `${pastPaper.paper.header.paperCode}-ALT`
      : 'ALT-01',
    generalInstructions: pastPaper.paper.header.generalInstructions
      ? [...pastPaper.paper.header.generalInstructions]
      : undefined,
  };
}

export function findMatchingBankForPastPaper(
  pastPaper: PastPaperRecord,
  banks: QuestionBank[]
): QuestionBank | null {
  if (banks.length === 0) return null;
  if (pastPaper.questionBankId) {
    const exact = banks.find((b) => b.id === pastPaper.questionBankId);
    if (exact) return exact;
  }
  const subNorm = pastPaper.subject.toLowerCase();
  const bySubject = banks.find(
    (b) =>
      b.subjectName.toLowerCase().includes(subNorm) ||
      subNorm.includes(b.subjectName.toLowerCase())
  );
  if (bySubject) return bySubject;
  const byCategory = banks.find(
    (b) => b.category.toLowerCase() === pastPaper.category.toLowerCase()
  );
  return byCategory || banks[0];
}

export function buildPatternSeedFromPastPaper(pastPaper: PastPaperRecord): PastPaperPatternSeed {
  return {
    pastPaperId: pastPaper.id,
    pastPaperTitle: pastPaper.title,
    year: pastPaper.year,
    subject: pastPaper.subject,
    classGrade: pastPaper.classGrade,
    boardOrGroup: pastPaper.boardOrGroup,
    questionBankId: pastPaper.questionBankId,
    sectionPatterns: pastPaper.sectionPatterns.map((sp) => ({ ...sp })),
    excludedQuestionTexts: extractPastPaperQuestionTexts(pastPaper.paper),
    sourcePaperHeader: { ...pastPaper.paper.header },
  };
}

/**
 * Generates a brand-new ExamPaper following the EXACT section structure,
 * question counts, attempt counts, marks per question, and instructions of the
 * selected Past Paper, populated with DIFFERENT questions from the Question Bank.
 */
export function generatePaperFromPastPatternWeighted(params: {
  pastPaper: PastPaperRecord;
  bank: QuestionBank;
}): GeneratedFromPatternResult {
  const { pastPaper, bank } = params;
  const allBankQuestions = buildBankQuestions(bank.units);
  const pastTexts = extractPastPaperQuestionTexts(pastPaper.paper);

  let excludedCount = 0;
  const eligibleQuestions = allBankQuestions.filter((bq) => {
    const isDup = isSimilarToPastQuestion(bq.question.text, pastTexts);
    if (isDup) excludedCount += 1;
    return !isDup;
  });

  const usedKeys = new Set<string>();
  const shortfalls: GeneratedFromPatternResult['shortfalls'] = [];
  const ts = Date.now();

  const newSections: ExamSection[] = pastPaper.sectionPatterns.map((pattern, secIdx) => {
    const freshPool = eligibleQuestions.filter(
      (bq) => bq.kind === pattern.kind && !usedKeys.has(bq.key)
    );
    const chosen = pickBalancedAcrossChapters(freshPool, pattern.questionCount);
    chosen.forEach((item) => usedKeys.add(item.key));

    if (chosen.length < pattern.questionCount) {
      shortfalls.push({
        sectionName: pattern.name,
        kind: pattern.kind,
        requested: pattern.questionCount,
        filled: chosen.length,
      });
    }

    const questions: Question[] = chosen.map((item, qIdx) => {
      const cloned = JSON.parse(JSON.stringify(item.question)) as Question;
      return {
        ...cloned,
        id: `q-pp-gen-${ts}-${secIdx}-${qIdx}-${Math.random().toString(36).substring(2, 6)}`,
        number: formatQuestionNumber(qIdx, pattern.numberingStyle),
        marks: pattern.marksPerQuestion,
        ...(cloned.options
          ? {
              options: cloned.options.map((opt, optIdx) => ({
                ...opt,
                id: `opt-pp-gen-${ts}-${secIdx}-${qIdx}-${optIdx}`,
              })),
            }
          : {}),
      };
    });

    return {
      id: `sec-pp-${secIdx}-${ts}`,
      name: pattern.name,
      subtitle: pattern.subtitle,
      marksBadge: pattern.marksBadge,
      instruction: pattern.instruction,
      questions,
    };
  });

  const paper: ExamPaper = {
    id: `paper-pattern-${ts}`,
    title: `${pastPaper.subject} (${pastPaper.year} Pattern — Fresh Set)`,
    classGrade: pastPaper.classGrade,
    subjectCategory: pastPaper.category,
    header: buildFreshHeaderFromPastPaper(pastPaper),
    settings: { ...pastPaper.paper.settings },
    sections: newSections,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    paper,
    engine: 'bank',
    rationale: `Generated a fresh ${pastPaper.subject} paper matching the exact ${pastPaper.year} board pattern (${pastPaper.sectionPatterns
      .map((s) => `${s.questionCount} ${s.kind.toUpperCase()}`)
      .join(', ')}), excluding ${excludedCount} overlapping past-paper questions.`,
    excludedCount,
    shortfalls,
  };
}

/**
 * Uses Gemini AI (/api/ai/generate-from-pattern) to craft fresh, non-overlapping
 * questions matching the exact section counts, marks, and syllabus level of the Past Paper.
 */
export async function generatePaperFromPastPatternAI(params: {
  pastPaper: PastPaperRecord;
  focusPrompt?: string;
}): Promise<GeneratedFromPatternResult> {
  const { pastPaper, focusPrompt } = params;
  const pastTexts = extractPastPaperQuestionTexts(pastPaper.paper);

  const res = await fetch('/api/ai/generate-from-pattern', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: pastPaper.subject,
      classGrade: pastPaper.classGrade,
      boardOrGroup: pastPaper.boardOrGroup,
      year: pastPaper.year,
      focusPrompt: focusPrompt?.trim() || undefined,
      avoidQuestions: pastTexts,
      sectionPatterns: pastPaper.sectionPatterns.map((sp) => ({
        name: sp.name,
        subtitle: sp.subtitle,
        kind: sp.kind,
        questionCount: sp.questionCount,
        attemptCount: sp.attemptCount,
        marksPerQuestion: sp.marksPerQuestion,
        totalSectionMarks: sp.totalSectionMarks,
      })),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    rationale?: string;
    sections?: Array<{
      kind: QuestionKind;
      questions: Array<{
        text: string;
        options?: string[];
        answerKey?: string;
      }>;
    }>;
  };

  if (!res.ok) {
    throw new Error(data.error || `AI pattern generation failed (${res.status}).`);
  }

  const ts = Date.now();
  const shortfalls: GeneratedFromPatternResult['shortfalls'] = [];
  const generatedSections = Array.isArray(data.sections) ? data.sections : [];

  const newSections: ExamSection[] = pastPaper.sectionPatterns.map((pattern, secIdx) => {
    const matched = generatedSections[secIdx] || generatedSections.find((g) => g.kind === pattern.kind);
    const rawQuestions = Array.isArray(matched?.questions) ? matched.questions : [];
    const sliced = rawQuestions.slice(0, pattern.questionCount);

    if (sliced.length < pattern.questionCount) {
      shortfalls.push({
        sectionName: pattern.name,
        kind: pattern.kind,
        requested: pattern.questionCount,
        filled: sliced.length,
      });
    }

    const labels = ['(a)', '(b)', '(c)', '(d)'];
    const questions: Question[] = sliced.map((rq, qIdx) => {
      const options =
        pattern.kind === 'mcq' && Array.isArray(rq.options) && rq.options.length > 0
          ? rq.options.slice(0, 4).map((optText, optIdx) => ({
              id: `opt-ai-${ts}-${secIdx}-${qIdx}-${optIdx}`,
              label: labels[optIdx] || `(${String.fromCharCode(97 + optIdx)})`,
              text: String(optText).replace(/^\([a-dA-D]\)\s*/, '').trim(),
            }))
          : undefined;

      return {
        id: `q-ai-pp-${ts}-${secIdx}-${qIdx}`,
        number: formatQuestionNumber(qIdx, pattern.numberingStyle),
        type: pattern.kind,
        text: String(rq.text || '').trim(),
        marks: pattern.marksPerQuestion,
        ...(options ? { options, optionColumns: 2 as const } : {}),
        ...(rq.answerKey ? { answerKey: String(rq.answerKey).trim() } : {}),
      };
    });

    return {
      id: `sec-ai-pp-${secIdx}-${ts}`,
      name: pattern.name,
      subtitle: pattern.subtitle,
      marksBadge: pattern.marksBadge,
      instruction: pattern.instruction,
      questions,
    };
  });

  const paper: ExamPaper = {
    id: `paper-ai-pattern-${ts}`,
    title: `${pastPaper.subject} (${pastPaper.year} Pattern — AI Fresh Set)`,
    classGrade: pastPaper.classGrade,
    subjectCategory: pastPaper.category,
    header: buildFreshHeaderFromPastPaper(pastPaper),
    settings: { ...pastPaper.paper.settings },
    sections: newSections,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    paper,
    engine: 'ai',
    rationale:
      data.rationale ||
      `AI generated ${newSections.reduce((sum, s) => sum + s.questions.length, 0)} fresh questions following the exact ${pastPaper.year} paper pattern.`,
    excludedCount: pastTexts.length,
    shortfalls,
  };
}

/**
 * Replaces a single question in a pattern-generated paper with another non-overlapping
 * question of the same kind from the Question Bank.
 */
export function swapSingleQuestionFromBank(params: {
  paper: ExamPaper;
  sectionIndex: number;
  questionIndex: number;
  pastPaper: PastPaperRecord;
  bank: QuestionBank;
}): { updatedPaper: ExamPaper; swapped: boolean } {
  const { paper, sectionIndex, questionIndex, pastPaper, bank } = params;
  const targetSec = paper.sections[sectionIndex];
  const targetPattern = pastPaper.sectionPatterns[sectionIndex];
  const targetQ = targetSec?.questions[questionIndex];
  if (!targetSec || !targetPattern || !targetQ) {
    return { updatedPaper: paper, swapped: false };
  }

  const allBankQuestions = buildBankQuestions(bank.units);
  const pastTexts = extractPastPaperQuestionTexts(pastPaper.paper);
  const currentPaperTexts = extractPastPaperQuestionTexts(paper);
  const combinedAvoid = [...pastTexts, ...currentPaperTexts];

  const pool = allBankQuestions.filter(
    (bq) =>
      bq.kind === targetPattern.kind &&
      !isSimilarToPastQuestion(bq.question.text, combinedAvoid)
  );

  if (pool.length === 0) {
    return { updatedPaper: paper, swapped: false };
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  const ts = Date.now();
  const cloned = JSON.parse(JSON.stringify(pick.question)) as Question;
  const replacement: Question = {
    ...cloned,
    id: `q-pp-swap-${ts}-${Math.random().toString(36).substring(2, 6)}`,
    number: targetQ.number,
    marks: targetQ.marks ?? targetPattern.marksPerQuestion,
    ...(cloned.options
      ? {
          options: cloned.options.map((opt, idx) => ({
            ...opt,
            id: `opt-pp-swap-${ts}-${idx}`,
          })),
        }
      : {}),
  };

  const nextSections = paper.sections.map((sec, sIdx) => {
    if (sIdx !== sectionIndex) return sec;
    const nextQs = [...sec.questions];
    nextQs[questionIndex] = replacement;
    return { ...sec, questions: nextQs };
  });

  return {
    updatedPaper: {
      ...paper,
      sections: nextSections,
      updatedAt: new Date().toISOString(),
    },
    swapped: true,
  };
}

/**
 * Uses Gemini AI (/api/ai/select-questions) to curate and organize questions DIRECTLY
 * from the user's database/question bank according to the exact Past Paper pattern
 * while automatically excluding questions from the past paper itself.
 */
export async function selectFromDatabaseForPatternAI(params: {
  pastPaper: PastPaperRecord;
  bank: QuestionBank;
  selectedUnitIndices?: number[];
  focusPrompt?: string;
}): Promise<GeneratedFromPatternResult> {
  const { pastPaper, bank, selectedUnitIndices, focusPrompt } = params;
  const allBankQuestions = buildBankQuestions(bank.units);
  const pastTexts = extractPastPaperQuestionTexts(pastPaper.paper);

  const allowedUnits =
    selectedUnitIndices && selectedUnitIndices.length > 0
      ? new Set(selectedUnitIndices)
      : new Set(bank.units.map((_, idx) => idx));

  let excludedCount = 0;
  const eligible = allBankQuestions.filter((bq) => {
    if (!allowedUnits.has(bq.unitIndex)) return false;
    const isDup = isSimilarToPastQuestion(bq.question.text, pastTexts);
    if (isDup) {
      excludedCount += 1;
      return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    throw new Error(
      'No non-overlapping questions remain in the selected database chapters for this pattern.'
    );
  }

  const activeUnits = bank.units
    .map((u, idx) => ({ unitIndex: idx, unitName: u.unit }))
    .filter((u) => allowedUnits.has(u.unitIndex));

  const equalWeight = Math.max(1, Math.round(100 / Math.max(1, activeUnits.length)));

  const res = await fetch('/api/ai/select-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjectName: bank.subjectName,
      classGrade: bank.classGrade,
      sections: pastPaper.sectionPatterns.map((sp) => ({
        kind: sp.kind,
        count: sp.questionCount,
      })),
      chapters: activeUnits.map((u) => ({
        unitIndex: u.unitIndex,
        unitName: u.unitName,
        weight: equalWeight,
      })),
      candidates: eligible.map((c) => ({
        key: c.key,
        unitIndex: c.unitIndex,
        unitName: c.unitName,
        kind: c.kind,
        text: c.question.text,
        optionsPreview: c.question.options?.map((o) => `${o.label} ${o.text}`),
      })),
      focusPrompt:
        focusPrompt?.trim() ||
        `Select a balanced set matching the ${pastPaper.year} ${pastPaper.subject} board paper pattern across chapters without repeats.`,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    rationale?: string;
    selections?: Array<{ key: string; kind: QuestionKind; tag?: string; reason?: string }>;
  };

  if (!res.ok) {
    throw new Error(data.error || `AI database selection failed (${res.status}).`);
  }

  const candidateMap = new Map<string, BankQuestion>(eligible.map((c) => [c.key, c]));
  const pickedByKind: Record<
    QuestionKind,
    Array<{ bq: BankQuestion; tag?: string; reason?: string }>
  > = {
    mcq: [],
    short: [],
    detailed: [],
  };

  (data.selections || []).forEach((sel) => {
    const bq = candidateMap.get(sel.key);
    if (!bq) return;
    pickedByKind[bq.kind].push({ bq, tag: sel.tag, reason: sel.reason });
  });

  const ts = Date.now();
  const shortfalls: GeneratedFromPatternResult['shortfalls'] = [];
  const questionMetaById: Record<string, { unitName?: string; tag?: string; reason?: string }> = {};

  const newSections: ExamSection[] = pastPaper.sectionPatterns.map((pattern, secIdx) => {
    const pool = pickedByKind[pattern.kind] || [];
    const chosen = pool.splice(0, pattern.questionCount);

    if (chosen.length < pattern.questionCount) {
      shortfalls.push({
        sectionName: pattern.name,
        kind: pattern.kind,
        requested: pattern.questionCount,
        filled: chosen.length,
      });
    }

    const questions: Question[] = chosen.map((item, qIdx) => {
      const cloned = JSON.parse(JSON.stringify(item.bq.question)) as Question;
      const qId = `q-aidb-${ts}-${secIdx}-${qIdx}-${Math.random().toString(36).substring(2, 6)}`;
      questionMetaById[qId] = {
        unitName: item.bq.unitName,
        tag: item.tag || 'AI DB Pick',
        reason: item.reason,
      };
      return {
        ...cloned,
        id: qId,
        number: formatQuestionNumber(qIdx, pattern.numberingStyle),
        marks: pattern.marksPerQuestion,
        ...(cloned.options
          ? {
              options: cloned.options.map((opt, optIdx) => ({
                ...opt,
                id: `opt-aidb-${ts}-${secIdx}-${qIdx}-${optIdx}`,
              })),
            }
          : {}),
      };
    });

    return {
      id: `sec-pp-${secIdx}-${ts}`,
      name: pattern.name,
      subtitle: pattern.subtitle,
      marksBadge: pattern.marksBadge,
      instruction: pattern.instruction,
      questions,
    };
  });

  const paper: ExamPaper = {
    id: `paper-pattern-aidb-${ts}`,
    title: `${pastPaper.subject} (${pastPaper.year} Pattern — AI from DB)`,
    classGrade: pastPaper.classGrade,
    subjectCategory: pastPaper.category,
    header: buildFreshHeaderFromPastPaper(pastPaper),
    settings: { ...pastPaper.paper.settings },
    sections: newSections,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    paper,
    engine: 'ai-db',
    rationale:
      data.rationale ||
      `AI curated ${newSections.reduce((s, sec) => s + sec.questions.length, 0)} questions from your ${bank.subjectName} database matching the ${pastPaper.year} pattern.`,
    excludedCount,
    shortfalls,
    questionMetaById,
  };
}

/**
 * Builds an ExamPaper matching the selected Past Paper pattern from questions manually
 * checked by the user in their Question Bank.
 */
export function buildPaperFromManualPatternSelection(params: {
  pastPaper: PastPaperRecord;
  selectedQuestions: BankQuestion[];
  bankName?: string;
}): GeneratedFromPatternResult {
  const { pastPaper, selectedQuestions, bankName } = params;
  const ts = Date.now();
  const shortfalls: GeneratedFromPatternResult['shortfalls'] = [];
  const questionMetaById: Record<string, { unitName?: string; tag?: string; reason?: string }> = {};

  const remainingByKind: Record<QuestionKind, BankQuestion[]> = {
    mcq: selectedQuestions.filter((q) => q.kind === 'mcq'),
    short: selectedQuestions.filter((q) => q.kind === 'short'),
    detailed: selectedQuestions.filter((q) => q.kind === 'detailed'),
  };

  const newSections: ExamSection[] = pastPaper.sectionPatterns.map((pattern, secIdx) => {
    const pool = remainingByKind[pattern.kind];
    const chosen = pool.splice(0, pattern.questionCount);

    if (chosen.length < pattern.questionCount) {
      shortfalls.push({
        sectionName: pattern.name,
        kind: pattern.kind,
        requested: pattern.questionCount,
        filled: chosen.length,
      });
    }

    const questions: Question[] = chosen.map((bq, qIdx) => {
      const cloned = JSON.parse(JSON.stringify(bq.question)) as Question;
      const qId = `q-manual-${ts}-${secIdx}-${qIdx}-${Math.random().toString(36).substring(2, 6)}`;
      questionMetaById[qId] = {
        unitName: bq.unitName,
        tag: 'Selected Manually',
      };
      return {
        ...cloned,
        id: qId,
        number: formatQuestionNumber(qIdx, pattern.numberingStyle),
        marks: pattern.marksPerQuestion,
        ...(cloned.options
          ? {
              options: cloned.options.map((opt, optIdx) => ({
                ...opt,
                id: `opt-manual-${ts}-${secIdx}-${qIdx}-${optIdx}`,
              })),
            }
          : {}),
      };
    });

    return {
      id: `sec-pp-manual-${secIdx}-${ts}`,
      name: pattern.name,
      subtitle: pattern.subtitle,
      marksBadge: pattern.marksBadge,
      instruction: pattern.instruction,
      questions,
    };
  });

  const paper: ExamPaper = {
    id: `paper-pattern-manual-${ts}`,
    title: `${pastPaper.subject} (${pastPaper.year} Pattern — Manual Selection)`,
    classGrade: pastPaper.classGrade,
    subjectCategory: pastPaper.category,
    header: buildFreshHeaderFromPastPaper(pastPaper),
    settings: { ...pastPaper.paper.settings },
    sections: newSections,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    paper,
    engine: 'manual',
    rationale: `Selected ${newSections.reduce((s, sec) => s + sec.questions.length, 0)} questions manually${
      bankName ? ` from ${bankName}` : ''
    } matching the ${pastPaper.year} pattern.`,
    excludedCount: 0,
    shortfalls,
    questionMetaById,
  };
}

/**
 * Sends the current ExamPaper and a teacher follow-up instruction to /api/ai/refine-paper
 * so users can interactively edit/re-balance/swap questions from Paper Preview or Review.
 */
export async function refinePaperWithAI(params: {
  paper: ExamPaper;
  instruction: string;
  bank?: QuestionBank | null;
  sourceMode?: 'database-first' | 'direct-ai';
  avoidQuestions?: string[];
}): Promise<{ updatedPaper: ExamPaper; summary: string }> {
  const { paper, instruction, bank, sourceMode = 'database-first', avoidQuestions = [] } = params;

  const allBankQuestions = bank ? buildBankQuestions(bank.units) : [];
  const bankByKey = new Map<string, BankQuestion>(allBankQuestions.map((bq) => [bq.key, bq]));

  const currentTexts = new Set(
    extractPastPaperQuestionTexts(paper).map((t) => normalizeText(t))
  );

  // Put unused non-past-paper bank questions first so AI has fresh replacements ready
  const prioritizedCandidates = allBankQuestions.filter((bq) => {
    if (currentTexts.has(normalizeText(bq.question.text))) return false;
    if (avoidQuestions.length > 0 && isSimilarToPastQuestion(bq.question.text, avoidQuestions)) {
      return false;
    }
    return true;
  });

  const res = await fetch('/api/ai/refine-paper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjectName: paper.header.subjectTitle || paper.title,
      classGrade: paper.classGrade || 'Standard',
      instruction: instruction.trim(),
      sourceMode,
      avoidQuestions,
      sections: paper.sections.map((sec) => ({
        id: sec.id,
        name: sec.name,
        subtitle: sec.subtitle,
        marksBadge: sec.marksBadge,
        instruction: sec.instruction,
        questions: sec.questions.map((q) => ({
          id: q.id,
          number: q.number,
          type: q.type,
          text: q.text,
          marks: q.marks,
          options: q.options,
          answerKey: q.answerKey,
        })),
      })),
      candidates: prioritizedCandidates.slice(0, 220).map((c) => ({
        key: c.key,
        unitIndex: c.unitIndex,
        unitName: c.unitName,
        kind: c.kind,
        text: c.question.text,
        optionsPreview: c.question.options?.map((o) => `${o.label} ${o.text}`),
      })),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    summary?: string;
    sections?: Array<{
      id?: string;
      name: string;
      subtitle?: string;
      instruction?: string;
      questions: Array<{
        id?: string;
        bankKey?: string;
        type: string;
        text: string;
        marks?: number;
        options?: string[];
        answerKey?: string;
      }>;
    }>;
  };

  if (!res.ok) {
    throw new Error(data.error || `AI paper editing failed (${res.status}).`);
  }

  const ts = Date.now();
  const labels = ['(a)', '(b)', '(c)', '(d)'];

  const existingQById = new Map<string, Question>();
  paper.sections.forEach((s) => s.questions.forEach((q) => existingQById.set(q.id, q)));

  const incomingSections = Array.isArray(data.sections) ? data.sections : [];
  if (incomingSections.length === 0) {
    throw new Error('AI returned an empty section list. Your paper was not modified.');
  }

  const nextSections: ExamSection[] = incomingSections.map((rawSec, secIdx) => {
    const existingSec =
      paper.sections.find((s) => s.id === rawSec.id) || paper.sections[secIdx];

    const isSectionCFrom3 =
      existingSec?.questions[0]?.number === '3.' &&
      rawSec.name.toUpperCase().includes('C');

    const questions: Question[] = (rawSec.questions || []).map((rq, qIdx) => {
      const bankMatch = rq.bankKey ? bankByKey.get(rq.bankKey) : undefined;
      const numStr = formatQuestionNumber(
        qIdx,
        isSectionCFrom3 ? 'section-c-from-3' : 'roman'
      );

      if (bankMatch) {
        const cloned = JSON.parse(JSON.stringify(bankMatch.question)) as Question;
        return {
          ...cloned,
          id: `q-ai-ref-${ts}-${secIdx}-${qIdx}-${Math.random().toString(36).substring(2, 5)}`,
          number: numStr,
          marks: rq.marks ?? cloned.marks ?? existingSec?.questions[0]?.marks ?? 1,
          ...(cloned.options
            ? {
                options: cloned.options.map((opt, optIdx) => ({
                  ...opt,
                  id: `opt-ai-ref-${ts}-${secIdx}-${qIdx}-${optIdx}`,
                })),
              }
            : {}),
        };
      }

      const prevQ = rq.id ? existingQById.get(rq.id) : undefined;
      const fallbackKind: QuestionKind =
        prevQ?.type === 'mcq' || prevQ?.type === 'short' || prevQ?.type === 'detailed'
          ? prevQ.type
          : 'short';
      const qType: QuestionKind =
        rq.type === 'mcq' || rq.type === 'short' || rq.type === 'detailed'
          ? rq.type
          : fallbackKind;

      const options =
        qType === 'mcq'
          ? Array.isArray(rq.options) && rq.options.length > 0
            ? rq.options.slice(0, 4).map((optText, optIdx) => ({
                id: `opt-ai-ref-${ts}-${secIdx}-${qIdx}-${optIdx}`,
                label: labels[optIdx] || `(${String.fromCharCode(97 + optIdx)})`,
                text: String(optText).replace(/^\([a-dA-D]\)\s*/, '').trim(),
              }))
            : prevQ?.options
          : undefined;

      return {
        id: prevQ?.id || `q-ai-ref-${ts}-${secIdx}-${qIdx}-${Math.random().toString(36).substring(2, 5)}`,
        number: numStr,
        type: qType,
        text: String(rq.text || prevQ?.text || '').trim(),
        marks: rq.marks ?? prevQ?.marks ?? existingSec?.questions[0]?.marks ?? 1,
        ...(options ? { options, optionColumns: prevQ?.optionColumns || 2 } : {}),
        ...(rq.answerKey || prevQ?.answerKey
          ? { answerKey: String(rq.answerKey || prevQ?.answerKey || '').trim() }
          : {}),
      };
    });

    const computedMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const keepExistingBadge =
      existingSec &&
      existingSec.questions.length === questions.length &&
      existingSec.marksBadge;

    return {
      id: existingSec?.id || rawSec.id || `sec-ai-ref-${ts}-${secIdx}`,
      name: rawSec.name || existingSec?.name || `SECTION ${secIdx + 1}`,
      subtitle: rawSec.subtitle ?? existingSec?.subtitle ?? '',
      marksBadge: keepExistingBadge ? existingSec.marksBadge : `${computedMarks} Marks`,
      instruction: rawSec.instruction ?? existingSec?.instruction ?? '',
      questions,
    };
  });

  const totalComputedMarks = nextSections.reduce(
    (sum, sec) => sum + sec.questions.reduce((qs, q) => qs + (q.marks || 1), 0),
    0
  );

  // Preserve pattern maxMarks if section counts didn't shrink/grow total
  const sameCounts =
    nextSections.length === paper.sections.length &&
    nextSections.every((s, idx) => s.questions.length === paper.sections[idx]?.questions.length);

  return {
    updatedPaper: {
      ...paper,
      sections: nextSections,
      header: {
        ...paper.header,
        maxMarks: sameCounts ? paper.header.maxMarks : String(totalComputedMarks),
      },
      updatedAt: new Date().toISOString(),
    },
    summary:
      data.summary ||
      'Updated your paper according to your AI edit instructions.',
  };
}

