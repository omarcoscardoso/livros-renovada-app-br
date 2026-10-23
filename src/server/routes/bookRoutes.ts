import { Router } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { DEFAULT_BOOK_ID, IBookRepository } from '../repositories/bookRepository';
import { IStorageService } from '../services/storageService';
import { GeminiConversionService } from '../services/geminiConversionService';
import { PdfExtractorService } from '../services/pdfExtractorService';

const upload = multer({
  storage: multer.memoryStorage(),
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

export function createBookRouter(
  repo: IBookRepository,
  storageService: IStorageService,
  conversionService: GeminiConversionService,
  extractor: PdfExtractorService,
  auth?: {
    requireAuth: (req: any, res: any, next: any) => void;
    requireAdmin: (req: any, res: any, next: any) => void;
  }
): Router {
  const router = Router();
  const requireAuth = auth?.requireAuth || ((_req, _res, next) => next());
  const requireAdmin = auth?.requireAdmin || ((_req, _res, next) => next());

  // List all books (Public - No login required)
  router.get('/', (_req, res) => {
    try {
      const books = repo.listBooks();
      return res.json({
        books,
        hasGeminiKey: Boolean(conversionService.resolveApiKey()),
      });
    } catch (error) {
      console.error('Erro ao listar livros:', error);
      return res.status(500).json({ error: 'Falha ao carregar biblioteca de livros.' });
    }
  });

  // Get single book
  router.get('/:id', (req, res) => {
    try {
      const book = repo.getBookByIdOrSlug(req.params.id);
      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado.' });
      }
      return res.json({ book });
    } catch (error) {
      console.error('Erro ao buscar livro:', error);
      return res.status(500).json({ error: 'Falha ao carregar o livro.' });
    }
  });

  // Rate a book (1 to 5 stars) - Real user reviews
  router.post('/:id/rate', async (req: any, res) => {
    try {
      const bookId = req.params.id;
      const stars = Number(req.body?.stars);
      if (!stars || stars < 1 || stars > 5) {
        return res.status(400).json({ error: 'Nota inválida. Escolha entre 1 e 5 estrelas.' });
      }

      const book = repo.getBookByIdOrSlug(bookId);
      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado.' });
      }

      const userId =
        req.user?.id ||
        req.cookies?.session_token ||
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        'anonymous_reader';

      const result = repo.rateBook(book.id, String(userId), stars);
      return res.json({
        success: true,
        rating: result.rating,
        reviewsCount: result.reviewsCount,
        userRating: stars,
      });
    } catch (error: any) {
      console.error('Erro ao avaliar livro:', error);
      return res.status(500).json({ error: 'Falha ao registrar avaliação.' });
    }
  });

  // Get user's own rating for this book
  router.get('/:id/user-rating', (req: any, res) => {
    try {
      const bookId = req.params.id;
      const book = repo.getBookByIdOrSlug(bookId);
      if (!book) {
        return res.json({ userRating: null });
      }

      const userId =
        req.user?.id ||
        req.cookies?.session_token ||
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        'anonymous_reader';

      const userRating = repo.getUserRating(book.id, String(userId));
      return res.json({ userRating });
    } catch {
      return res.json({ userRating: null });
    }
  });

  // Analyze PDF to auto-fill metadata (Gemini AI with Local Heuristic Fallback)
  router.post('/extract-metadata', upload.single('pdf'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo PDF fornecido.' });
      }

      // 1. Fast local extraction from PDF metadata & text (guarantees fields are never empty)
      const localMetadata = await extractor.extractLocalMetadata(file.buffer, file.originalname);

      // 2. Extract first 10 pages for Gemini contextual enrichment
      const extracted = await extractor.extractPdfPages(file.buffer);
      const firstPagesText = extracted.pages
        .slice(0, Math.min(10, extracted.pages.length))
        .map((p, i) => `--- PÁGINA ${i + 1} ---\n${p.slice(0, 1500)}`)
        .join('\n\n');

      const apiKey = (req.body?.apiKey as string)?.trim() || undefined;

      // 3. Enhance with Gemini AI if key is configured, or return local metadata
      const metadata = await conversionService.extractMetadataWithAi(
        firstPagesText,
        apiKey,
        localMetadata
      );

      return res.json({
        metadata,
        source: metadata.source,
        message:
          metadata.source === 'gemini'
            ? 'Metadados e sinopse identificados via IA Gemini 2.5 Flash.'
            : 'Metadados extraídos das propriedades e páginas do PDF (modo local).',
      });
    } catch (error: any) {
      console.error('Erro na extração de metadados:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao analisar metadados do PDF.',
      });
    }
  });

  // Upload new PDF book (Requires Authentication)
  router.post('/upload', requireAuth, upload.single('pdf'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Por favor, selecione um arquivo PDF válido.' });
      }

      const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
      const base = path
        .basename(file.originalname, ext)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 60);
      const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const filename = `${base}_${uniqueSuffix}${ext}`;

      // Save PDF directly to GCS bucket
      await storageService.savePdf(filename, file.buffer);

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
        pdfFilename: filename,
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

      // Kick off background conversion directly using in-memory PDF buffer
      void conversionService.processUploadedBook(
        id,
        file.buffer,
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

  // Reprocess an existing book (Requires Authentication)
  router.post('/:id/reprocess', requireAuth, async (req, res) => {
    try {
      const book = repo.getBookByIdOrSlug(req.params.id);
      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado.' });
      }

      const pdfMeta = repo.getPdfMetadata(book.id);
      if (!pdfMeta) {
        return res.status(404).json({ error: 'Arquivo PDF original não encontrado para este livro.' });
      }

      const pdfBuffer = await storageService.getPdfBuffer(pdfMeta.filename);
      if (!pdfBuffer) {
        return res.status(404).json({ error: 'Arquivo PDF original não encontrado no storage.' });
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
        pdfBuffer,
        pdfMeta.downloadName,
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

  // Update book (Requires Authentication)
  router.put('/:id', requireAuth, (req, res) => {
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

  // Delete book (Requires Admin)
  router.delete('/:id', requireAdmin, (req, res) => {
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

  // Serve cover
  router.get('/:id/cover', async (req, res) => {
    try {
      const coverFilename = repo.getCoverFilename(req.params.id);
      if (coverFilename) {
        const coverBuffer = await storageService.getCoverBuffer(coverFilename);
        if (coverBuffer) {
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          return res.send(coverBuffer);
        }
      }

      const coverPath = repo.getCoverImagePath(req.params.id);
      if (coverPath) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.sendFile(coverPath);
      }

      return res.status(404).json({ error: 'Capa não encontrada para este livro.' });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao carregar capa.' });
    }
  });

  // Change cover page (Requires Authentication)
  router.post('/:id/cover-page', requireAuth, async (req, res) => {
    try {
      const book = repo.getBookByIdOrSlug(req.params.id);
      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado.' });
      }
      const pdfMeta = repo.getPdfMetadata(book.id);
      if (!pdfMeta) {
        return res.status(404).json({ error: 'PDF original não encontrado.' });
      }

      const pdfBuffer = await storageService.getPdfBuffer(pdfMeta.filename);
      if (!pdfBuffer) {
        return res.status(404).json({ error: 'PDF original não encontrado no storage.' });
      }

      const pageNumber = Math.max(1, Number(req.body?.pageNumber) || 1);
      const coverResult = await extractor.extractBookCoverImage(
        pdfBuffer,
        book.id,
        pageNumber
      );
      if (!coverResult) {
        return res.status(500).json({ error: 'Não foi possível renderizar a página da capa.' });
      }
      const updated = repo.updateBookContent(book.id, {
        coverImageFilename: coverResult.filename,
        coverPageNumber: coverResult.pageNumber,
      });
      return res.json({ book: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao atualizar capa.' });
    }
  });

  // Serve PDF
  router.get('/:id/pdf', async (req, res) => {
    try {
      const pdfMeta = repo.getPdfMetadata(req.params.id);
      if (pdfMeta) {
        const pdfBuffer = await storageService.getPdfBuffer(pdfMeta.filename);
        if (pdfBuffer) {
          res.setHeader('Content-Type', 'application/pdf');
          const safeName = pdfMeta.downloadName.replace(/[^a-zA-Z0-9._-]/g, '_');
          res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
          return res.send(pdfBuffer);
        }
      }

      const pdfInfo = repo.getPdfFilePath(req.params.id);
      if (pdfInfo) {
        res.setHeader('Content-Type', 'application/pdf');
        const safeName = pdfInfo.downloadName.replace(/[^a-zA-Z0-9._-]/g, '_');
        res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
        return res.sendFile(pdfInfo.filePath);
      }

      return res.status(404).json({ error: 'Arquivo PDF original não encontrado para este livro.' });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao carregar PDF.' });
    }
  });

  return router;
}
