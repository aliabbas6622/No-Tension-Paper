import { GoogleGenAI, Type } from '@google/genai';

export type QuestionKind = 'mcq' | 'short' | 'detailed';

export interface CandidatePayload {
  key: string;
  unitIndex: number;
  unitName: string;
  sectionType?: string;
  kind: QuestionKind;
  text: string;
  optionsPreview?: string[];
}

export interface SectionRequestPayload {
  kind: QuestionKind;
  count: number;
}

export interface ChapterWeightPayload {
  unitIndex: number;
  unitName: string;
  weight: number;
}

export interface SelectQuestionsRequestBody {
  subjectName?: string;
  classGrade?: string;
  sections?: SectionRequestPayload[];
  chapters?: ChapterWeightPayload[];
  candidates?: CandidatePayload[];
  focusPrompt?: string;
  excludeFillInBlanks?: boolean;
}

export interface GenerateFromPatternRequestBody {
  subject?: string;
  classGrade?: string;
  boardOrGroup?: string;
  year?: string;
  focusPrompt?: string;
  avoidQuestions?: string[];
  sectionPatterns?: Array<{
    name: string;
    subtitle: string;
    kind: QuestionKind;
    questionCount: number;
    attemptCount: number;
    marksPerQuestion: number;
    totalSectionMarks: number;
  }>;
}

export interface PaperQuestionPayload {
  id: string;
  number: string;
  type: QuestionKind;
  text: string;
  marks?: number;
  options?: Array<{ id: string; label: string; text: string }>;
  answerKey?: string;
}

export interface PaperSectionPayload {
  id: string;
  name: string;
  subtitle: string;
  marksBadge: string;
  instruction: string;
  questions: PaperQuestionPayload[];
}

export interface RefinePaperRequestBody {
  subjectName?: string;
  classGrade?: string;
  instruction?: string;
  sourceMode?: 'database-first' | 'direct-ai';
  avoidQuestions?: string[];
  sections?: PaperSectionPayload[];
  candidates?: CandidatePayload[];
}

interface GeminiSelectionItem {
  key: string;
  kind?: string;
  tag?: string;
  reason?: string;
}

interface GeminiSelectionResponse {
  rationale?: string;
  selections?: GeminiSelectionItem[];
}

export class ApiRouteError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new ApiRouteError(
      403,
      'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets or Vercel Environment Variables.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseErrorMessage(rawMessage: string): string {
  const trimmed = (rawMessage || '').trim();
  if (!trimmed) return 'Unexpected AI service error.';
  try {
    const parsed = JSON.parse(trimmed) as { error?: { message?: string } };
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // not raw JSON
  }
  return trimmed;
}

export function classifyErrorStatus(err: unknown): { status: number; friendlyMessage: string } {
  if (err instanceof ApiRouteError) {
    return { status: err.status, friendlyMessage: err.message };
  }
  const message = err instanceof Error ? err.message : String(err);
  const clean = parseErrorMessage(message);
  const lower = clean.toLowerCase();

  if (
    lower.includes('permission_denied') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key')
  ) {
    return {
      status: 403,
      friendlyMessage:
        'Gemini API key is missing or invalid. Please check your key in Settings > Secrets or Vercel Environment Variables.',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      friendlyMessage: 'Gemini API rate limit reached. Please wait a few seconds and try again.',
    };
  }
  if (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded')
  ) {
    return {
      status: 503,
      friendlyMessage: 'Gemini AI is temporarily busy (high demand). Please click Retry in a few seconds.',
    };
  }
  return {
    status: 500,
    friendlyMessage: clean,
  };
}

function isRetryableGeminiError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('fetch failed')
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let hydrogenBusyUntil = 0;

/**
 * Retries transient 503/429 Gemini errors and falls back from gemini-4-hydrogen
 * to gemini-3.1-flash-lite with a 45s cooldown when hydrogen is experiencing high demand.
 */
async function generateContentWithRetry(
  ai: GoogleGenAI,
  request: Omit<Parameters<typeof ai.models.generateContent>[0], 'model'>
) {
  const hydrogenBusy = Date.now() < hydrogenBusyUntil;
  const modelsToTry = hydrogenBusy
    ? ['gemini-3.1-flash-lite', 'gemini-4-hydrogen']
    : ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-3.1-flash-lite'];
  let lastError: unknown;

  for (let attempt = 0; attempt < modelsToTry.length; attempt += 1) {
    const model = modelsToTry[attempt];
    try {
      return await ai.models.generateContent({
        model,
        ...request,
      });
    } catch (err) {
      lastError = err;
      if (model === 'gemini-4-hydrogen' && isRetryableGeminiError(err)) {
        hydrogenBusyUntil = Date.now() + 45_000;
      }
      if (!isRetryableGeminiError(err) || attempt === modelsToTry.length - 1) {
        throw err;
      }
      const delayMs = 450 * Math.pow(2, attempt) + Math.floor(Math.random() * 150);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function normalizeKind(raw: string | undefined): QuestionKind | null {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'mcq' || val === 'short' || val === 'detailed') return val;
  return null;
}

export function isBlankQuestionCandidate(c: CandidatePayload): boolean {
  const secType = (c.sectionType || '').toLowerCase();
  if (secType.includes('blank')) return true;
  if (/_{3,}/.test(c.text || '')) return true;
  if (/\bfill\s+in\s+the\s+blank/i.test(c.text || '')) return true;
  return false;
}

function shouldExcludeBlanksFromPrompt(text: string | undefined): boolean {
  const lower = (text || '').toLowerCase();
  if (!lower) return false;
  return (
    /(?:don'?t|do not|no|without|exclude|skip|avoid|remove|never)\b[^.\n]{0,30}\bblank/i.test(lower) ||
    /no\s+fill[\s-]+in[\s-]+the[\s-]+blanks?/i.test(lower)
  );
}

function buildWeightedTopUp(
  pool: CandidatePayload[],
  chapterWeights: Map<number, number>,
  needed: number
): CandidatePayload[] {
  if (needed <= 0 || pool.length === 0) return [];
  const remaining = [...pool];
  const picked: CandidatePayload[] = [];

  while (picked.length < needed && remaining.length > 0) {
    let totalWeight = 0;
    for (const item of remaining) {
      totalWeight += Math.max(1, chapterWeights.get(item.unitIndex) ?? 1);
    }
    let threshold = Math.random() * totalWeight;
    let chosenIdx = 0;
    for (let i = 0; i < remaining.length; i += 1) {
      threshold -= Math.max(1, chapterWeights.get(remaining[i].unitIndex) ?? 1);
      if (threshold <= 0) {
        chosenIdx = i;
        break;
      }
    }
    const [item] = remaining.splice(chosenIdx, 1);
    picked.push(item);
  }

  return picked;
}

export async function executeSelectQuestions(body: SelectQuestionsRequestBody) {
  const sections = Array.isArray(body.sections) ? body.sections : [];
  const chapters = Array.isArray(body.chapters) ? body.chapters : [];
  const rawCandidates = Array.isArray(body.candidates) ? body.candidates : [];

  const excludeBlanks =
    body.excludeFillInBlanks !== false || shouldExcludeBlanksFromPrompt(body.focusPrompt);

  const candidates = excludeBlanks
    ? rawCandidates.filter((c) => !isBlankQuestionCandidate(c))
    : rawCandidates;

  if (candidates.length === 0) {
    throw new ApiRouteError(
      400,
      'No matching candidate questions remain after applying chapter and question-type filters.'
    );
  }

  const requestedByKind: Record<QuestionKind, number> = {
    mcq: 0,
    short: 0,
    detailed: 0,
  };
  for (const sec of sections) {
    const k = normalizeKind(sec.kind);
    if (k && typeof sec.count === 'number' && sec.count > 0) {
      requestedByKind[k] += Math.floor(sec.count);
    }
  }

  const totalRequested = requestedByKind.mcq + requestedByKind.short + requestedByKind.detailed;
  if (totalRequested <= 0) {
    throw new ApiRouteError(400, 'Please request at least 1 question across the paper sections.');
  }

  const candidateMap = new Map<string, CandidatePayload>();
  for (const cand of candidates) {
    if (cand && typeof cand.key === 'string') {
      candidateMap.set(cand.key, cand);
    }
  }

  const chapterWeightMap = new Map<number, number>();
  const totalChapterWeight = chapters.reduce(
    (acc, c) => acc + Math.max(0, Number(c.weight) || 0),
    0
  );
  for (const ch of chapters) {
    const w =
      totalChapterWeight > 0
        ? Math.round((Math.max(0, Number(ch.weight) || 0) / totalChapterWeight) * 100)
        : Math.round(100 / Math.max(1, chapters.length));
    chapterWeightMap.set(ch.unitIndex, Math.max(1, w));
  }

  const chapterSummary = chapters
    .map(
      (c) =>
        `- Unit ${c.unitIndex} (${c.unitName}): target weight ${chapterWeightMap.get(c.unitIndex) ?? 0}%`
    )
    .join('\n');

  const catalogLines = candidates
    .map((c) => {
      const opts =
        c.optionsPreview && c.optionsPreview.length > 0
          ? ` | Options: ${c.optionsPreview.join(' ; ')}`
          : '';
      const srcTag = c.sectionType ? ` | type="${c.sectionType}"` : '';
      return `[key="${c.key}" | kind=${c.kind}${srcTag} | unit="${c.unitName}"] ${c.text.slice(0, 260)}${opts}`;
    })
    .join('\n');

  const prompt = [
    `Design a balanced examination paper for ${body.subjectName || 'Examination Subject'} (${body.classGrade || 'Standard'}).`,
    '',
    'TARGET QUESTION COUNTS PER SECTION:',
    `- mcq (Section A - Multiple Choice): ${requestedByKind.mcq}`,
    `- short (Section B - Short Answer): ${requestedByKind.short}`,
    `- detailed (Section C - Detailed / Essay): ${requestedByKind.detailed}`,
    '',
    'SELECTED CHAPTERS & TARGET WEIGHTAGE:',
    chapterSummary || '- Equal distribution across provided chapters',
    '',
    body.focusPrompt?.trim()
      ? `TEACHER FOCUS & CONSTRAINTS (MUST FOLLOW STRICTLY):\n${body.focusPrompt.trim()}\n`
      : 'TEACHER FOCUS & DIFFICULTY GUIDANCE:\nAim for broad conceptual coverage, avoid overlapping topics across questions, and balance foundational recall with applied reasoning.\n',
    'CANDIDATE QUESTION POOL (select ONLY using exact `key` values below):',
    catalogLines,
  ].join('\n');

  const ai = getGeminiClient();
  const response = await generateContentWithRetry(ai, {
    contents: prompt,
    config: {
      systemInstruction:
        'You are an expert academic examination setter. Select exact candidate keys from the provided pool so that each section has the exact requested count of matching `kind`, strictly obeys all teacher constraints (including negative exclusions), matches chapter weightage proportionally, maximizes topic diversity, and avoids redundant questions. Never invent keys not present in the pool.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rationale: {
            type: Type.STRING,
            description:
              'Concise 1-2 sentence explanation of how the questions were balanced across chapters, weights, and difficulty.',
          },
          selections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: {
                  type: Type.STRING,
                  description: 'Exact key string copied verbatim from the candidate question pool.',
                },
                kind: {
                  type: Type.STRING,
                  description: 'Must match the candidate kind: mcq, short, or detailed.',
                },
                tag: {
                  type: Type.STRING,
                  description:
                    'Short 1-3 word topic or difficulty tag (e.g., Conceptual, Numerical, Core Theory).',
                },
                reason: {
                  type: Type.STRING,
                  description: 'Short reason why this question fits the blueprint.',
                },
              },
              required: ['key', 'kind'],
            },
          },
        },
        required: ['rationale', 'selections'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  let parsed: GeminiSelectionResponse = {};
  try {
    parsed = JSON.parse(rawText) as GeminiSelectionResponse;
  } catch {
    parsed = {};
  }

  const usedKeys = new Set<string>();
  const validSelections: Record<
    QuestionKind,
    Array<{ key: string; tag?: string; reason?: string }>
  > = {
    mcq: [],
    short: [],
    detailed: [],
  };

  const modelItems = Array.isArray(parsed.selections) ? parsed.selections : [];
  for (const item of modelItems) {
    if (!item || typeof item.key !== 'string') continue;
    if (usedKeys.has(item.key)) continue;
    const cand = candidateMap.get(item.key);
    if (!cand) continue;
    const k = cand.kind;
    if (validSelections[k].length >= requestedByKind[k]) continue;
    usedKeys.add(item.key);
    validSelections[k].push({
      key: item.key,
      tag: typeof item.tag === 'string' && item.tag.trim() ? item.tag.trim().slice(0, 32) : undefined,
      reason:
        typeof item.reason === 'string' && item.reason.trim()
          ? item.reason.trim().slice(0, 140)
          : undefined,
    });
  }

  (['mcq', 'short', 'detailed'] as QuestionKind[]).forEach((k) => {
    const shortfall = requestedByKind[k] - validSelections[k].length;
    if (shortfall <= 0) return;
    const unusedPool = candidates.filter((c) => c.kind === k && !usedKeys.has(c.key));
    const extra = buildWeightedTopUp(unusedPool, chapterWeightMap, shortfall);
    for (const cand of extra) {
      usedKeys.add(cand.key);
      validSelections[k].push({
        key: cand.key,
        tag: 'Weighted Fill',
        reason: 'Added proportionally by chapter weight to complete section count.',
      });
    }
  });

  const orderedSelections = [
    ...validSelections.mcq.map((s) => ({ ...s, kind: 'mcq' as const })),
    ...validSelections.short.map((s) => ({ ...s, kind: 'short' as const })),
    ...validSelections.detailed.map((s) => ({ ...s, kind: 'detailed' as const })),
  ];

  return {
    rationale:
      typeof parsed.rationale === 'string' && parsed.rationale.trim()
        ? parsed.rationale.trim()
        : 'Questions selected across your chosen chapters to balance coverage and section counts.',
    selections: orderedSelections,
  };
}

export async function executeGenerateFromPattern(body: GenerateFromPatternRequestBody) {
  const sectionPatterns = Array.isArray(body.sectionPatterns) ? body.sectionPatterns : [];
  if (sectionPatterns.length === 0) {
    throw new ApiRouteError(400, 'No section patterns were provided.');
  }

  const avoidList = Array.isArray(body.avoidQuestions) ? body.avoidQuestions.slice(0, 60) : [];
  const patternDesc = sectionPatterns
    .map(
      (sp, idx) =>
        `${idx + 1}. ${sp.name} ${sp.subtitle} [kind=${sp.kind}]: generate EXACTLY ${sp.questionCount} questions (${sp.marksPerQuestion} marks each; students attempt ${sp.attemptCount} for ${sp.totalSectionMarks} total section marks).`
    )
    .join('\n');

  const prompt = [
    `Create a 100% FRESH examination paper for ${body.subject || 'Computer Science'} (${body.classGrade || 'Class 11'}, ${body.boardOrGroup || 'General Group'}).`,
    `Follow the EXACT paper pattern from the ${body.year || '2025'} past paper below, but write COMPLETELY DIFFERENT questions on the same syllabus level and difficulty.`,
    '',
    'REQUIRED SECTIONS & EXACT QUESTION COUNTS:',
    patternDesc,
    '',
    body.focusPrompt?.trim()
      ? `TEACHER GUIDANCE (MUST FOLLOW STRICTLY):\n${body.focusPrompt.trim()}\n`
      : 'TEACHER GUIDANCE:\nCover core syllabus units broadly (computer systems, memory/storage, operating systems, data communication/networks, number systems/logic gates, IoT/software engineering). Do not generate fill-in-the-blank items unless explicitly requested.\n',
    'DO NOT REPEAT OR CLOSELY PARAPHRASE ANY OF THESE PAST PAPER QUESTIONS:',
    avoidList.map((q, i) => `- (${i + 1}) ${q}`).join('\n'),
  ].join('\n');

  const ai = getGeminiClient();
  const response = await generateContentWithRetry(ai, {
    contents: prompt,
    config: {
      systemInstruction: `You are a senior board examination paper setter. You MUST output ALL ${sectionPatterns.length} requested sections in the \`sections\` array in exact order, with the exact requested \`questionCount\` items in \`questions\` for each section. Write fresh, original, syllabus-aligned exam questions while strictly avoiding repeating any of the provided past paper questions or violating teacher constraints. Never write fill-in-the-blank questions unless requested. For MCQ sections, always provide 4 concise options (without prefix letters) and an accurate answerKey. For short and detailed sections, provide concise answerKey points.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rationale: {
            type: Type.STRING,
            description:
              '1-2 sentences summarizing syllabus coverage and how questions differ from the past paper.',
          },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                kind: {
                  type: Type.STRING,
                  description: 'Section question type: mcq, short, or detailed.',
                },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: '4 MCQ option strings (only for mcq sections).',
                      },
                      answerKey: { type: Type.STRING },
                    },
                    required: ['text'],
                  },
                },
              },
              required: ['kind', 'questions'],
            },
          },
        },
        required: ['rationale', 'sections'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as {
    rationale?: string;
    sections?: Array<{
      kind: string;
      questions: Array<{ text: string; options?: string[]; answerKey?: string }>;
    }>;
  };

  const rawSections = Array.isArray(parsed.sections) ? [...parsed.sections] : [];
  const usedSectionIndices = new Set<number>();

  const prelimSections = sectionPatterns.map((sp, i) => {
    let matchedIdx =
      i < rawSections.length &&
      !usedSectionIndices.has(i) &&
      normalizeKind(rawSections[i]?.kind) === sp.kind
        ? i
        : rawSections.findIndex(
            (sec, idx) => !usedSectionIndices.has(idx) && normalizeKind(sec?.kind) === sp.kind
          );

    if (matchedIdx < 0 && i < rawSections.length && !usedSectionIndices.has(i)) {
      matchedIdx = i;
    }

    const existingQs =
      matchedIdx >= 0
        ? (usedSectionIndices.add(matchedIdx),
          Array.isArray(rawSections[matchedIdx]?.questions)
            ? rawSections[matchedIdx].questions
                .filter((q) => typeof q?.text === 'string' && q.text.trim().length > 0)
                .slice(0, sp.questionCount)
            : [])
        : [];

    return { sp, existingQs };
  });

  const completedSections: Array<{
    kind: QuestionKind;
    questions: Array<{ text: string; options?: string[]; answerKey?: string }>;
  }> = await Promise.all(
    prelimSections.map(async ({ sp, existingQs }) => {
      const qs = [...existingQs];
      const missingCount = sp.questionCount - qs.length;
      if (missingCount > 0) {
        const alreadyTexts = [...avoidList, ...qs.map((q) => q.text)].slice(0, 75);

        const fillPrompt = [
          `Subject: ${body.subject || 'Computer Science'} (${body.classGrade || 'Class 11'}, ${body.boardOrGroup || 'General Group'})`,
          `Section: ${sp.name} ${sp.subtitle} [type=${sp.kind}]`,
          `Generate EXACTLY ${missingCount} fresh, distinct \`${sp.kind}\` examination question(s) (${sp.marksPerQuestion} marks each).`,
          body.focusPrompt?.trim() ? `Teacher guidance: ${body.focusPrompt.trim()}` : '',
          alreadyTexts.length > 0
            ? `Do NOT repeat or paraphrase any of these:\n${alreadyTexts.map((t) => `- ${t}`).join('\n')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n');

        try {
          const fillResp = await generateContentWithRetry(ai, {
            contents: fillPrompt,
            config: {
              systemInstruction: `Generate an array of EXACTLY ${missingCount} distinct ${sp.kind} exam questions in JSON. Do not return fewer than ${missingCount} questions. Never generate fill-in-the-blank items unless requested. For mcq, include 4 option strings and answerKey.`,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        answerKey: { type: Type.STRING },
                      },
                      required: ['text'],
                    },
                  },
                },
                required: ['questions'],
              },
            },
          });

          const fillParsed = JSON.parse((fillResp.text ?? '{}').trim()) as {
            questions?: Array<{ text: string; options?: string[]; answerKey?: string }>;
          };
          if (Array.isArray(fillParsed.questions)) {
            for (const fq of fillParsed.questions) {
              if (qs.length >= sp.questionCount) break;
              if (typeof fq?.text === 'string' && fq.text.trim()) {
                qs.push(fq);
              }
            }
          }
        } catch (fillErr) {
          console.warn(`Per-section fill fallback notice for ${sp.name}:`, fillErr);
        }
      }

      return {
        kind: sp.kind,
        questions: qs.slice(0, sp.questionCount),
      };
    })
  );

  return {
    rationale:
      parsed.rationale ||
      `AI crafted fresh questions matching the exact ${body.year || '2025'} paper pattern without repeating prior prompts.`,
    sections: completedSections,
  };
}

export async function executeRefinePaper(body: RefinePaperRequestBody) {
  const instruction = (body.instruction || '').trim();
  const currentSections = Array.isArray(body.sections) ? body.sections : [];
  const rawCandidates = Array.isArray(body.candidates) ? body.candidates : [];
  const excludeBlanks = true;
  const candidates = excludeBlanks
    ? rawCandidates.filter((c) => !isBlankQuestionCandidate(c))
    : rawCandidates;
  const sourceMode = body.sourceMode || 'database-first';
  const avoidList = Array.isArray(body.avoidQuestions) ? body.avoidQuestions.slice(0, 60) : [];

  if (!instruction) {
    throw new ApiRouteError(400, 'Please describe the edits you want AI to make.');
  }

  if (currentSections.length === 0) {
    throw new ApiRouteError(400, 'The current paper has no sections to edit.');
  }

  const currentPaperSnapshot = currentSections
    .map((sec, sIdx) => {
      const qs = sec.questions
        .map((q) => {
          const opts =
            q.options && q.options.length > 0
              ? ` | options: ${q.options.map((o) => `${o.label} ${o.text}`).join(' ; ')}`
              : '';
          const ans = q.answerKey ? ` | key: ${q.answerKey}` : '';
          return `  - [id="${q.id}" | num="${q.number}" | type=${q.type} | marks=${q.marks ?? 1}] ${q.text}${opts}${ans}`;
        })
        .join('\n');
      return `Section ${sIdx + 1}: id="${sec.id}" | name="${sec.name}" | subtitle="${sec.subtitle}" | instruction="${sec.instruction}"\n${qs}`;
    })
    .join('\n\n');

  const dbPoolLines = candidates
    .slice(0, 220)
    .map((c) => {
      const opts =
        c.optionsPreview && c.optionsPreview.length > 0
          ? ` | Options: ${c.optionsPreview.join(' ; ')}`
          : '';
      return `[bankKey="${c.key}" | kind=${c.kind} | unit="${c.unitName}"] ${c.text.slice(0, 220)}${opts}`;
    })
    .join('\n');

  const prompt = [
    `Subject: ${body.subjectName || 'Examination Subject'} (${body.classGrade || 'Standard'})`,
    `Preferred Edit Strategy: ${
      sourceMode === 'database-first'
        ? 'DATABASE-FIRST — whenever swapping or adding questions, prefer choosing exact `bankKey` items from the DATABASE QUESTION POOL below. Only write/reword questions directly when no suitable unused database question fits or the teacher asks to reword/author directly.'
        : 'DIRECT AI AUTHORING — rewrite, adjust difficulty, or author updated questions directly according to teacher instructions (you may still reference `bankKey` from the pool if helpful).'
    }`,
    '',
    `TEACHER EDIT INSTRUCTION:\n"${instruction}"`,
    '',
    'CURRENT PAPER SECTIONS & QUESTIONS (preserve untouched questions with their existing id/text/options/answerKey):',
    currentPaperSnapshot,
    '',
    avoidList.length > 0
      ? `DO NOT PICK OR REPEAT THESE PAST PAPER QUESTIONS:\n${avoidList.map((q) => `- ${q}`).join('\n')}\n`
      : '',
    dbPoolLines
      ? `DATABASE QUESTION POOL (when picking a question from the user's database, set \`bankKey\` to the exact key):\n${dbPoolLines}`
      : 'DATABASE QUESTION POOL: (none provided — edit or write questions directly)',
  ].join('\n');

  const ai = getGeminiClient();
  const response = await generateContentWithRetry(ai, {
    contents: prompt,
    config: {
      systemInstruction:
        'You are an interactive examination paper editor assistant. Apply ONLY the teacher instruction cleanly to the current paper while keeping all unaffected sections, questions, marks, and formatting intact. Strictly honor negative constraints (e.g. removing fill-in-the-blank items if asked). Return ALL sections in full order so nothing gets lost. When replacing/adding a question from the database pool, set `bankKey` verbatim and match its `type` (`mcq`, `short`, `detailed`). When keeping an existing unchanged question, preserve its `id`, `text`, `type`, `marks`, `options`, and `answerKey`. For newly written/edited MCQs, provide 4 concise option strings (without prefix letters) and `answerKey`.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: 'Concise 1-2 sentence summary of the exact edits performed on the paper.',
          },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                instruction: { type: Type.STRING },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      bankKey: {
                        type: Type.STRING,
                        description:
                          'Exact key from DATABASE QUESTION POOL if selected/swapped from DB; omit otherwise.',
                      },
                      type: {
                        type: Type.STRING,
                        description: 'mcq, short, or detailed',
                      },
                      text: { type: Type.STRING },
                      marks: { type: Type.NUMBER },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: '4 option strings (for mcq questions).',
                      },
                      answerKey: { type: Type.STRING },
                    },
                    required: ['type', 'text'],
                  },
                },
              },
              required: ['name', 'questions'],
            },
          },
        },
        required: ['summary', 'sections'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as {
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

  return {
    summary:
      parsed.summary?.trim() || 'Updated your examination paper according to your instructions.',
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
  };
}
