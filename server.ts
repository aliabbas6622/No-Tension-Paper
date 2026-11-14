import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyErrorStatus,
  executeGenerateFromPattern,
  executeRefinePaper,
  executeSelectQuestions,
} from './lib/aiHandlers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '4mb' }));

  app.post('/api/ai/select-questions', async (req, res) => {
    try {
      const result = await executeSelectQuestions(req.body || {});
      res.json(result);
    } catch (error: unknown) {
      console.error('AI question selection error:', error);
      const { status, friendlyMessage } = classifyErrorStatus(error);
      res.status(status).json({ error: friendlyMessage });
    }
  });

  app.post('/api/ai/generate-from-pattern', async (req, res) => {
    try {
      const result = await executeGenerateFromPattern(req.body || {});
      res.json(result);
    } catch (error: unknown) {
      console.error('AI pattern paper generation error:', error);
      const { status, friendlyMessage } = classifyErrorStatus(error);
      res.status(status).json({ error: friendlyMessage });
    }
  });

  app.post('/api/ai/refine-paper', async (req, res) => {
    try {
      const result = await executeRefinePaper(req.body || {});
      res.json(result);
    } catch (error: unknown) {
      console.error('AI refine paper error:', error);
      const { status, friendlyMessage } = classifyErrorStatus(error);
      res.status(status).json({ error: friendlyMessage });
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
