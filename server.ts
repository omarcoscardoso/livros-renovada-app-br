import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import multer from 'multer';
import { ensureStorageDirectories, PDF_STORAGE_DIR } from './src/server/db/database';
import {
  DEFAULT_BOOK_ID,
  IBookRepository,
  SqliteBookRepository,
} from './src/server/repositories/bookRepository';
import { PdfExtractorService } from './src/server/services/pdfExtractorService';
import { GeminiConversionService } from './src/server/services/geminiConversionService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

ensureStorageDirectories();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureStorageDirectories();
    cb(null, PDF_STORAGE_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const base = path
      .basename(file.originalname, ext)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    cb(null, `${base}_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 60 * 1024 * 1024, // 60 MB max PDF upload
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos no formato PDF (.pdf) são permitidos.'));
    }
  },
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

export function createApiApp(customRepo?: IBookRepository) {
  const repo = customRepo || new SqliteBookRepository();
  repo.seedDefaultBookIfNeeded();

  const extractor = new PdfExtractorService();
  const conversionService = new GeminiConversionService(repo, extractor);

  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Health & AI Key check endpoint
  app.get('/api/health', (_req, res) => {
    const hasGeminiKey = Boolean(conversionService.resolveApiKey());
    res.json({ status: 'ok', hasGeminiKey });
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

  // List all books in the library
  app.get('/api/books', (_req, res) => {
    try {
      const books = repo.listBooks();
      return res.json({
        books,
        hasGeminiKey: Boolean(conversionService.resolveApiKey()),
      });
    } catch (error: any) {
      console.error('Erro ao listar livros:', error);
      return res.status(500).json({ error: 'Falha ao carregar biblioteca de livros.' });
    }
  });

  // Get full book details and chapters by ID or slug
  app.get('/api/books/:id', (req, res) => {
    try {
      const book = repo.getBookByIdOrSlug(req.params.id);
      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado.' });
      }
      return res.json({ book });
    } catch (error: any) {
      console.error('Erro ao buscar livro:', error);
      return res.status(500).json({ error: 'Falha ao carregar o livro.' });
    }
  });

  // Upload a new PDF book and convert it into structured reading format
  app.post('/api/books/upload', upload.single('pdf'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Por favor, selecione um arquivo PDF válido.' });
      }

      const rawTitle =
        (req.body.titlePt as string)?.trim() ||
        file.originalname.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() ||
        'Novo Livro';
      const author = (req.body.author as string)?.trim() || 'Autor Desconhecido';
      const originalYear = Number(req.body.originalYear) || new Date().getFullYear();
      const publisher =
        (req.body.publisher as string)?.trim() || 'Edição Digital — Biblioteca IPR Viamão';
      const coverColor = (req.body.coverColor as string)?.trim() || 'amber';
      const customInstructions = (req.body.customInstructions as string)?.trim() || '';
      const apiKeyOverride = (req.body.apiKey as string)?.trim() || '';

      if (apiKeyOverride && apiKeyOverride.length > 10) {
        repo.setSetting('gemini_api_key', apiKeyOverride);
      }

      const id = `book_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const slug = `${slugify(rawTitle)}-${crypto.randomBytes(2).toString('hex')}`;

      const initialBook = repo.createBook({
        id,
        slug,
        titlePt: rawTitle,
        titleEn: rawTitle,
        subtitlePt: 'Convertendo PDF para formato de leitura...',
        subtitleEn: 'Converting PDF to structured reader format...',
        author,
        originalYear,
        publisher,
        translatorNote: 'Processando e estruturando capítulos a partir do PDF enviado.',
        coverColor,
        pdfFilename: file.filename,
        originalPdfName: file.originalname,
        status: 'processing',
        conversionProgress: 'Arquivo PDF recebido. Iniciando leitura das páginas...',
        conversionPercent: 5,
        chapters: [
          {
            id: 'intro',
            number: 0,
            titlePt: 'Processando Livro...',
            titleEn: 'Processing Book...',
            pages: '1',
            estimatedReadTimeMinutes: 1,
            summaryPt: 'O arquivo PDF está sendo convertido para o formato de capítulos.',
            keyPointsPt: ['Processamento em andamento...'],
            studyQuestionsPt: ['Aguarde a conclusão da conversão.'],
            sections: [
              {
                id: 'sec-loading',
                titlePt: 'Conversão em Andamento',
                titleEn: 'Conversion in Progress',
                paragraphsPt: [
                  'Estamos extraindo o conteúdo do seu PDF e organizando os capítulos, seções, resumos executivos e perguntas de estudo.',
                ],
                paragraphsEn: [],
              },
            ],
          },
        ],
      });

      // Kick off background conversion (non-blocking)
      void conversionService.processUploadedBook(
        id,
        file.path,
        file.originalname,
        {
          titlePt: rawTitle,
          author: author !== 'Autor Desconhecido' ? author : undefined,
          originalYear,
          publisher,
          coverColor,
        },
        customInstructions,
        apiKeyOverride
      );

      return res.status(201).json({ book: initialBook });
    } catch (error: any) {
      console.error('Erro no upload de PDF:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao enviar e processar o arquivo PDF.',
      });
    }
  });

  // Reprocess an existing book's PDF (e.g., with AI after setting API key)
  app.post('/api/books/:id/reprocess', async (req, res) => {
    try {
      const book = repo.getBookByIdOrSlug(req.params.id);
      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado.' });
      }
      if (book.id === DEFAULT_BOOK_ID) {
        return res.status(400).json({
          error: 'O livro original "A Igreja em Células" já possui tradução integral revisada.',
        });
      }

      const pdfInfo = repo.getPdfFilePath(book.id);
      if (!pdfInfo || !fs.existsSync(pdfInfo.filePath)) {
        return res.status(404).json({ error: 'Arquivo PDF original não encontrado para este livro.' });
      }

      const { customInstructions, apiKey } = req.body || {};
      if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 10) {
        repo.setSetting('gemini_api_key', apiKey.trim());
      }

      repo.updateBookConversionStatus(
        book.id,
        'processing',
        'Reiniciando conversão inteligente do PDF...',
        5
      );

      void conversionService.processUploadedBook(
        book.id,
        pdfInfo.filePath,
        pdfInfo.downloadName,
        {
          titlePt: book.titlePt,
          author: book.author,
          originalYear: book.originalYear,
          publisher: book.publisher,
          coverColor: book.coverColor,
        },
        customInstructions,
        apiKey
      );

      const updated = repo.getBookByIdOrSlug(book.id);
      return res.json({ book: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao reprocessar livro.' });
    }
  });

  // Update book metadata and/or chapters
  app.put('/api/books/:id', (req, res) => {
    try {
      const existing = repo.getBookByIdOrSlug(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Livro não encontrado.' });
      }

      const {
        titlePt,
        titleEn,
        subtitlePt,
        subtitleEn,
        author,
        originalYear,
        publisher,
        translatorNote,
        coverColor,
        chapters,
      } = req.body;

      const updated = repo.updateBookContent(existing.id, {
        titlePt,
        titleEn,
        subtitlePt,
        subtitleEn,
        author,
        originalYear: originalYear ? Number(originalYear) : undefined,
        publisher,
        translatorNote,
        coverColor,
        chapters: Array.isArray(chapters) ? chapters : undefined,
      });

      return res.json({ book: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao atualizar livro.' });
    }
  });

  // Delete a book from the library
  app.delete('/api/books/:id', (req, res) => {
    try {
      const existing = repo.getBookByIdOrSlug(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Livro não encontrado.' });
      }
      if (existing.id === DEFAULT_BOOK_ID) {
        return res.status(400).json({
          error: 'O livro base "A Igreja em Células" faz parte do acervo permanente e não pode ser excluído.',
        });
      }

      repo.deleteBook(existing.id);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || 'Erro ao remover livro.' });
    }
  });

  // Download or view the original PDF of any book
  app.get('/api/books/:id/pdf', (req, res) => {
    const pdfInfo = repo.getPdfFilePath(req.params.id);
    if (!pdfInfo || !fs.existsSync(pdfInfo.filePath)) {
      return res.status(404).json({ error: 'Arquivo PDF original não encontrado para este livro.' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    const safeName = pdfInfo.downloadName.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    return res.sendFile(pdfInfo.filePath);
  });

  // Backwards-compatible endpoint to download the original PDF of "The Cell Church"
  app.get('/api/download-original-pdf', (_req, res) => {
    const pdfInfo = repo.getPdfFilePath(DEFAULT_BOOK_ID);
    if (pdfInfo && fs.existsSync(pdfInfo.filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="The_Cell_Church_Larry_Stockstill_Original.pdf"'
      );
      return res.sendFile(pdfInfo.filePath);
    }

    const fallbackPath = path.join(
      __dirname,
      'public',
      'assets',
      'aistudio',
      'The_Cell_Church_-_Larry_Stockstill_020021f2.pdf'
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="The_Cell_Church_Larry_Stockstill_Original.pdf"'
    );
    return res.sendFile(fallbackPath);
  });

  // AI Route: Study Assistant & Question Answering (works for any book in the library)
  app.post('/api/assistant', async (req, res) => {
    try {
      const { prompt, chapterTitle, contextText, bookTitle, bookAuthor } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt é obrigatório.' });
      }

      const text = await conversionService.askStudyAssistant({
        prompt,
        chapterTitle,
        contextText,
        bookTitle,
        bookAuthor,
      });

      return res.json({ text });
    } catch (error: any) {
      if (error?.message === 'GEMINI_KEY_MISSING') {
        return res.status(503).json({
          error: 'Chave do Gemini API não configurada no servidor.',
          fallbackResponse:
            'O serviço de IA aguarda a configuração da chave GEMINI_API_KEY (você pode configurá-la no botão "Subir PDF / IA" ou no arquivo .env).',
        });
      }
      console.error('Erro na API Gemini:', error);
      return res.status(500).json({
        error: 'Falha ao processar solicitação de IA.',
        details: error?.message || 'Erro interno',
      });
    }
  });

  // AI Route: Gerador de Estudo de Célula (Roteiro Completo de Reunião de 90 min)
  app.post('/api/generate-lesson', async (req, res) => {
    try {
      const { topic, chapterNumber, audience, bookTitle, bookAuthor, chapterSummary } = req.body;

      const lesson = await conversionService.generateCellLesson({
        topic,
        chapterNumber,
        audience,
        bookTitle,
        bookAuthor,
        chapterSummary,
      });

      return res.json({ lesson });
    } catch (error: any) {
      if (error?.message === 'GEMINI_KEY_MISSING') {
        return res.status(503).json({
          error: 'Chave do Gemini API não configurada no servidor.',
        });
      }
      console.error('Erro ao gerar lição:', error);
      return res.status(500).json({ error: error?.message || 'Erro ao gerar lição' });
    }
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
  const app = createApiApp();

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
