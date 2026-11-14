import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type QuestionKind = 'mcq' | 'short' | 'detailed';

interface CandidatePayload {
  key: string;
  unitIndex: number;
  unitName: string;
  kind: QuestionKind;
  text: string;
  optionsPreview?: string[];
}

interface SectionRequestPayload {
  kind: QuestionKind;
  count: number;
}

interface ChapterWeightPayload {
  unitIndex: number;
  unitName: string;
  weight: number;
}

interface SelectQuestionsRequestBody {
  subjectName?: string;
  classGrade?: string;
  sections?: SectionRequestPayload[];
  chapters?: ChapterWeightPayload[];
  candidates?: CandidatePayload[];
  focusPrompt?: string;
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

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel.');
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

function normalizeKind(raw: string | undefined): QuestionKind | null {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'mcq' || val === 'short' || val === 'detailed') return val;
  return null;
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

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '4mb' }));

  app.post('/api/ai/select-questions', async (req, res) => {
    try {
      const body = (req.body || {}) as SelectQuestionsRequestBody;
      const sections = Array.isArray(body.sections) ? body.sections : [];
      const chapters = Array.isArray(body.chapters) ? body.chapters : [];
      const candidates = Array.isArray(body.candidates) ? body.candidates : [];

      if (candidates.length === 0) {
        res.status(400).json({ error: 'No candidate questions were provided for the selected chapters.' });
        return;
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
        res.status(400).json({ error: 'Please request at least 1 question across the paper sections.' });
        return;
      }

      const candidateMap = new Map<string, CandidatePayload>();
      for (const cand of candidates) {
        if (cand && typeof cand.key === 'string') {
          candidateMap.set(cand.key, cand);
        }
      }

      const chapterWeightMap = new Map<number, number>();
      const totalChapterWeight = chapters.reduce((acc, c) => acc + Math.max(0, Number(c.weight) || 0), 0);
      for (const ch of chapters) {
        const w = totalChapterWeight > 0
          ? Math.round(((Math.max(0, Number(ch.weight) || 0)) / totalChapterWeight) * 100)
          : Math.round(100 / Math.max(1, chapters.length));
        chapterWeightMap.set(ch.unitIndex, Math.max(1, w));
      }

      const chapterSummary = chapters
        .map((c) => `- Unit ${c.unitIndex} (${c.unitName}): target weight ${chapterWeightMap.get(c.unitIndex) ?? 0}%`)
        .join('\n');

      const catalogLines = candidates
        .map((c) => {
          const opts = c.optionsPreview && c.optionsPreview.length > 0
            ? ` | Options: ${c.optionsPreview.join(' ; ')}`
            : '';
          return `[key="${c.key}" | kind=${c.kind} | unit="${c.unitName}"] ${c.text.slice(0, 260)}${opts}`;
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
          ? `TEACHER FOCUS & DIFFICULTY GUIDANCE:\n${body.focusPrompt.trim()}\n`
          : 'TEACHER FOCUS & DIFFICULTY GUIDANCE:\nAim for broad conceptual coverage, avoid overlapping topics across questions, and balance foundational recall with applied reasoning.\n',
        'CANDIDATE QUESTION POOL (select ONLY using exact `key` values below):',
        catalogLines,
      ].join('\n');

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert academic examination setter. Select exact candidate keys from the provided pool so that each section has the exact requested count of matching `kind`, matches chapter weightage proportionally, maximizes topic diversity, and avoids redundant questions. Never invent keys not present in the pool.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rationale: {
                type: Type.STRING,
                description: 'Concise 1-2 sentence explanation of how the questions were balanced across chapters, weights, and difficulty.',
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
                      description: 'Short 1-3 word topic or difficulty tag (e.g., Conceptual, Numerical, Core Theory).',
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
      const validSelections: Record<QuestionKind, Array<{ key: string; tag?: string; reason?: string }>> = {
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
          reason: typeof item.reason === 'string' && item.reason.trim() ? item.reason.trim().slice(0, 140) : undefined,
        });
      }

      // If Gemini slightly under-selected any section while unused candidates remain, top up using chapter weights.
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

      res.json({
        rationale:
          typeof parsed.rationale === 'string' && parsed.rationale.trim()
            ? parsed.rationale.trim()
            : 'Questions selected across your chosen chapters to balance coverage and section counts.',
        selections: orderedSelections,
      });
    } catch (error: unknown) {
      console.error('AI question selection error:', error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID') || message.includes('API key')) {
        res.status(403).json({
          error: 'Gemini API key is missing or invalid. Please check your key in the Settings > Secrets panel.',
        });
        return;
      }
      if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
        res.status(429).json({
          error: 'Gemini API rate limit reached. Please retry in a moment or switch to Pre-Weighted selection.',
        });
        return;
      }
      res.status(500).json({
        error: message || 'Failed to select questions with AI.',
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Exam Paper Maker server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
