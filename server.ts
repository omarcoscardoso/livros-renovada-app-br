import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { DEFAULT_DB_PATH } from './src/server/db/database';
import {
  DEFAULT_BOOK_ID,
  IBookRepository,
  SqliteBookRepository,
} from './src/server/repositories/bookRepository';
import { PdfExtractorService } from './src/server/services/pdfExtractorService';
import { GeminiConversionService } from './src/server/services/geminiConversionService';
import {
  getStorageService,
  IStorageService,
} from './src/server/services/storageService';
import { createBookRouter } from './src/server/routes/bookRoutes';
import { createAiRouter } from './src/server/routes/aiRoutes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

export function createApiApp(
  customRepo?: IBookRepository,
  customStorage?: IStorageService
) {
  const storageService = customStorage || getStorageService();
  const repo = customRepo || new SqliteBookRepository(undefined, storageService);
  repo.seedDefaultBookIfNeeded();

  const extractor = new PdfExtractorService(storageService);
  const conversionService = new GeminiConversionService(repo, extractor);

  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Health & AI Key check endpoint
  app.get('/api/health', (_req, res) => {
    const hasGeminiKey = Boolean(conversionService.resolveApiKey());
    res.json({
      status: 'ok',
      hasGeminiKey,
      storageBucket: storageService.getBucketName(),
      gcsEnabled: storageService.isGcsEnabled(),
    });
  });

  // Save Gemini API Key from UI Settings
  app.post('/api/settings/gemini-key', (req, res) => {
    try {
      const { apiKey } = req.body;
      if (typeof apiKey !== 'string' || apiKey.trim().length < 10) {
        return res.status(400).json({ error: 'Informe uma chave GEMINI_API_KEY válida.' });
      }
      repo.setSetting('gemini_api_key', apiKey.trim());
      return res.json({
        success: true,
        hasGeminiKey: Boolean(conversionService.resolveApiKey()),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao salvar chave.' });
    }
  });

  // Mount Modular Subrouters (SRP)
  app.use(
    '/api/books',
    createBookRouter(repo, storageService, conversionService, extractor)
  );
  app.use('/api', createAiRouter(conversionService));

  // Backwards-compatible endpoint to download the original PDF of "The Cell Church"
  app.get('/api/download-original-pdf', async (_req, res) => {
    const pdfMeta = repo.getPdfMetadata(DEFAULT_BOOK_ID);
    if (pdfMeta) {
      const pdfBuffer = await storageService.getPdfBuffer(pdfMeta.filename);
      if (pdfBuffer) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="The_Cell_Church_Larry_Stockstill_Original.pdf"'
        );
        return res.send(pdfBuffer);
      }
    }

    const fallbackPath = path.join(
      __dirname,
      'public',
      'assets',
      'aistudio',
      'The_Cell_Church_-_Larry_Stockstill_020021f2.pdf'
    );
    if (fs.existsSync(fallbackPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="The_Cell_Church_Larry_Stockstill_Original.pdf"'
      );
      return res.sendFile(fallbackPath);
    }
    return res.status(404).json({ error: 'Arquivo PDF não encontrado.' });
  });

  // Explicit static serve for public/assets
  app.use(
    '/assets',
    express.static(path.join(__dirname, 'public', 'assets'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.pdf')) {
          res.setHeader('Content-Type', 'application/pdf');
        }
      },
    })
  );

  return app;
}

async function startServer() {
  const storageService = getStorageService();
  await storageService.restoreDatabaseSnapshot(DEFAULT_DB_PATH);

  const app = createApiApp(undefined, storageService);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Falha ao iniciar servidor:', err);
    process.exit(1);
  });
}
