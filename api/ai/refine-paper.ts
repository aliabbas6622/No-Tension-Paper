import {
  RefinePaperRequestBody,
  classifyErrorStatus,
  executeRefinePaper,
} from '../../lib/aiHandlers';

async function readJsonBody(req: any): Promise<RefinePaperRequestBody> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = await readJsonBody(req);
    const result = await executeRefinePaper(body);
    return res.status(200).json(result);
  } catch (error: unknown) {
    console.error('Vercel /api/ai/refine-paper error:', error);
    const { status, friendlyMessage } = classifyErrorStatus(error);
    return res.status(status).json({ error: friendlyMessage });
  }
}
