import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { DEFAULT_DB_PATH } from './src/server/db/database';
import {
  DEFAULT_BOOK_ID,
  IBookRepository,
  SqliteBookRepository,
} from './src/server/repositories/bookRepository';
import {
  IUserRepository,
  SqliteUserRepository,
} from './src/server/repositories/userRepository';
import { createAuthMiddleware } from './src/server/middleware/authMiddleware';
import { PdfExtractorService } from './src/server/services/pdfExtractorService';
import { GeminiConversionService } from './src/server/services/geminiConversionService';
import {
  getStorageService,
  IStorageService,
} from './src/server/services/storageService';
import { createBookRouter } from './src/server/routes/bookRoutes';
import { createAiRouter } from './src/server/routes/aiRoutes';
import { createAuthRouter } from './src/server/routes/authRoutes';
import { createAdminRouter } from './src/server/routes/adminRoutes';
import {
  ITrainingRepository,
  SqliteTrainingRepository,
} from './src/server/repositories/trainingRepository';
import {
  createTrainingRouter,
  createCertificateRouter,
  createBookmarkRouter,
  createLmsReportRouter,
} from './src/server/routes/trainingRoutes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

export function createApiApp(
  customRepo?: IBookRepository,
  customStorage?: IStorageService,
  customUserRepo?: IUserRepository,
  customConversionService?: GeminiConversionService,
  customTrainingRepo?: ITrainingRepository
) {
  const storageService = customStorage || getStorageService();
  const repo = customRepo || new SqliteBookRepository(undefined, storageService);
  repo.seedDefaultBookIfNeeded();

  const userRepo = customUserRepo || new SqliteUserRepository(undefined, storageService);
  const authMiddleware = createAuthMiddleware(userRepo, repo);

  const trainingRepo = customTrainingRepo || new SqliteTrainingRepository(undefined, storageService);
  trainingRepo.seedDefaultTrainingsIfNeeded();

  const extractor = new PdfExtractorService(storageService);
  const conversionService = customConversionService || new GeminiConversionService(repo, extractor);

  const app = express();

  // Cabeçalhos defensivos de segurança HTTP
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(cookieParser());
  app.use(authMiddleware.attachUser);

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

  // Auth Router (Google Sign-In, Me, Logout, Reading Progress)
  app.use('/api/auth', createAuthRouter(userRepo));

  // Admin Router (Protected by requireAdmin)
  app.use(
    '/api/admin',
    authMiddleware.requireAdmin,
    createAdminRouter(userRepo, repo, conversionService, storageService)
  );

  // Mount Book Router (Reading is 100% public, Mutations require auth)
  app.use(
    '/api/books',
    createBookRouter(repo, storageService, conversionService, extractor, {
      requireAuth: authMiddleware.requireAuth,
      requireAdmin: authMiddleware.requireAdmin,
    })
  );

  // LMS Training Routes
  app.use(
    '/api/trainings',
    createTrainingRouter(trainingRepo, {
      requireAuth: authMiddleware.requireAuth,
      requireAdmin: authMiddleware.requireAdmin,
    })
  );

  // LMS Certificates Routes
  app.use('/api/certificates', createCertificateRouter(trainingRepo));

  // LMS Bookmarks Routes
  app.use('/api/bookmarks', createBookmarkRouter(trainingRepo));

  // LMS Admin Reports
  app.use('/api/admin/lms', createLmsReportRouter(trainingRepo, authMiddleware.requireAdmin));

  // AI Router
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

  // PWA Service Worker with maximum root scope
  app.get('/sw.js', (_req, res) => {
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const swPath = isProduction
      ? path.join(__dirname, 'dist', 'sw.js')
      : path.join(__dirname, 'public', 'sw.js');
    if (fs.existsSync(swPath)) {
      return res.sendFile(swPath);
    }
    return res.status(404).end();
  });

  // PWA Web App Manifest
  app.get(['/manifest.webmanifest', '/manifest.json'], (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const manifestPath = isProduction
      ? path.join(__dirname, 'dist', 'manifest.webmanifest')
      : path.join(__dirname, 'public', 'manifest.webmanifest');
    if (fs.existsSync(manifestPath)) {
      return res.sendFile(manifestPath);
    }
    return res.status(404).end();
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

  const repo = new SqliteBookRepository(undefined, storageService);
  const extractor = new PdfExtractorService(storageService);
  const conversionService = new GeminiConversionService(repo, extractor);
  const trainingRepo = new SqliteTrainingRepository(undefined, storageService);

  const app = createApiApp(repo, storageService, undefined, conversionService, trainingRepo);

  // Retoma automaticamente quaisquer livros que tenham sido interrompidos por reinício/deploy do servidor
  void conversionService.resumePendingConversions(storageService);

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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });

  const handleGracefulShutdown = async (signal: string) => {
    console.log(`[Server] Recebido sinal ${signal}. Executando sincronização defensiva do banco de dados no GCS...`);
    server.close();
    try {
      if (storageService.flushDatabaseSync) {
        await storageService.flushDatabaseSync(DEFAULT_DB_PATH);
      } else {
        await storageService.syncDatabaseSnapshot(DEFAULT_DB_PATH, true);
      }
      console.log('[Server] Banco de dados sincronizado com sucesso no GCS.');
    } catch (err) {
      console.error('[Server] Erro ao sincronizar banco durante desligamento:', err);
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => void handleGracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void handleGracefulShutdown('SIGINT'));
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Falha ao iniciar servidor:', err);
    process.exit(1);
  });
}
