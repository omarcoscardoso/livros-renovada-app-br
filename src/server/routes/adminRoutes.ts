import { Router } from 'express';
import crypto from 'node:crypto';
import { IUserRepository } from '../repositories/userRepository';
import { IBookRepository } from '../repositories/bookRepository';
import { GeminiConversionService } from '../services/geminiConversionService';
import { getStorageService, IStorageService } from '../services/storageService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export function createAdminRouter(
  userRepo: IUserRepository,
  bookRepo: IBookRepository,
  conversionService: GeminiConversionService,
  storageService?: IStorageService
): Router {
  const router = Router();

  // List all users
  router.get('/users', (_req: AuthenticatedRequest, res) => {
    try {
      const users = userRepo.listUsers();
      return res.json({ users });
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      return res.status(500).json({ error: 'Falha ao listar usuários.' });
    }
  });

  // Update user role (admin | user)
  router.put('/users/:id/role', (req: AuthenticatedRequest, res) => {
    try {
      const { role } = req.body;
      if (role !== 'admin' && role !== 'user') {
        return res.status(400).json({ error: 'Papel inválido. Deve ser "admin" ou "user".' });
      }

      // Prevent admin from removing their own admin role
      if (req.user?.id === req.params.id && role !== 'admin') {
        return res.status(400).json({ error: 'Você não pode revogar seu próprio papel de administrador.' });
      }

      const success = userRepo.updateUserRole(req.params.id, role);
      if (!success) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const updated = userRepo.getUserById(req.params.id);
      return res.json({ success: true, user: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao atualizar papel do usuário.' });
    }
  });

  // Block / Unblock user
  router.put('/users/:id/block', (req: AuthenticatedRequest, res) => {
    try {
      const { isBlocked } = req.body;
      if (typeof isBlocked !== 'boolean') {
        return res.status(400).json({ error: 'Valor booleano isBlocked é obrigatório.' });
      }

      if (req.user?.id === req.params.id && isBlocked) {
        return res.status(400).json({ error: 'Você não pode bloquear sua própria conta.' });
      }

      const success = userRepo.setUserBlocked(req.params.id, isBlocked);
      if (!success) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const updated = userRepo.getUserById(req.params.id);
      return res.json({ success: true, user: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao alterar bloqueio do usuário.' });
    }
  });

  // Get Admin statistics
  router.get('/stats', (_req: AuthenticatedRequest, res) => {
    try {
      const books = bookRepo.listBooks();
      const users = userRepo.listUsers();
      const hasGeminiKey = Boolean(conversionService.resolveApiKey());

      return res.json({
        totalBooks: books.length,
        totalUsers: users.length,
        adminCount: users.filter((u) => u.role === 'admin').length,
        hasGeminiKey,
        booksByStatus: {
          ready: books.filter((b) => b.status === 'ready').length,
          processing: books.filter((b) => b.status === 'processing').length,
          error: books.filter((b) => b.status === 'error').length,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao carregar estatísticas.' });
    }
  });

  // Get Gemini API Key status
  router.get('/api-key', (_req: AuthenticatedRequest, res) => {
    const rawKey = conversionService.resolveApiKey();
    const isConfigured = Boolean(rawKey && rawKey.length > 8);
    const maskedKey = isConfigured
      ? `${rawKey.slice(0, 4)}••••••••${rawKey.slice(-4)}`
      : null;

    return res.json({
      isConfigured,
      maskedKey,
    });
  });

  // Set / Update Gemini API Key
  router.post('/api-key', (req: AuthenticatedRequest, res) => {
    try {
      const { apiKey } = req.body;
      if (typeof apiKey !== 'string' || apiKey.trim().length < 8) {
        return res.status(400).json({ error: 'Informe uma chave Gemini válida.' });
      }

      bookRepo.setSetting('gemini_api_key', apiKey.trim());
      const rawKey = conversionService.resolveApiKey(apiKey.trim());

      return res.json({
        success: true,
        isConfigured: Boolean(rawKey),
        maskedKey: `${rawKey.slice(0, 4)}••••••••${rawKey.slice(-4)}`,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao salvar chave.' });
    }
  });

  // Get Admin API Key status and value for automation scripts
  router.get('/admin-key', (_req: AuthenticatedRequest, res) => {
    try {
      const configuredKey =
        process.env.ADMIN_API_KEY?.trim() ||
        bookRepo.getSetting('admin_api_key')?.trim() ||
        null;
      const isConfigured = Boolean(configuredKey && configuredKey.length >= 16);
      const maskedKey =
        isConfigured && configuredKey
          ? `${configuredKey.slice(0, 4)}••••••••${configuredKey.slice(-4)}`
          : null;

      return res.json({
        isConfigured,
        maskedKey,
        apiKey: configuredKey,
        isFromEnv: Boolean(process.env.ADMIN_API_KEY?.trim()),
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error?.message || 'Erro ao consultar chave de administração.',
      });
    }
  });

  // Set / Regenerate Admin API Key for automation scripts
  router.post('/admin-key', (req: AuthenticatedRequest, res) => {
    try {
      if (process.env.ADMIN_API_KEY?.trim()) {
        return res.status(400).json({
          error:
            'A chave de administração foi configurada por variável de ambiente (ADMIN_API_KEY) e não pode ser sobrescrita pelo painel.',
        });
      }

      const { adminKey, generate } = req.body || {};
      let finalKey = '';

      if (generate || !adminKey) {
        finalKey = `lumi_${crypto.randomBytes(24).toString('hex')}`;
      } else if (typeof adminKey === 'string' && adminKey.trim().length >= 16) {
        finalKey = adminKey.trim();
      } else {
        return res.status(400).json({
          error: 'A chave de administração deve conter no mínimo 16 caracteres.',
        });
      }

      bookRepo.setSetting('admin_api_key', finalKey);

      return res.json({
        success: true,
        apiKey: finalKey,
        maskedKey: `${finalKey.slice(0, 4)}••••••••${finalKey.slice(-4)}`,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error?.message || 'Erro ao salvar chave de administração.',
      });
    }
  });

  // Toggle Book Featured status (Destaque Editorial)
  router.put('/books/:id/featured', (req: AuthenticatedRequest, res) => {
    try {
      const { isFeatured } = req.body;
      if (typeof isFeatured !== 'boolean') {
        return res.status(400).json({ error: 'Valor booleano isFeatured é obrigatório.' });
      }

      const success = bookRepo.setBookFeatured(req.params.id, isFeatured);
      if (!success) {
        return res.status(404).json({ error: 'Livro não encontrado.' });
      }

      return res.json({ success: true, isFeatured });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao alterar destaque editorial.' });
    }
  });

  // Reprocess book via Admin Panel (Supports both /reprocess/:id and /books/:id/reprocess)
  const handleReprocess = async (req: AuthenticatedRequest, res: any) => {
    try {
      const book = bookRepo.getBookByIdOrSlug(req.params.id);
      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado.' });
      }

      const pdfMeta = bookRepo.getPdfMetadata(book.id);
      if (!pdfMeta) {
        return res.status(404).json({ error: 'Arquivo PDF original não encontrado para este livro.' });
      }

      const effectiveStorage = storageService || getStorageService();
      const pdfBuffer = await effectiveStorage.getPdfBuffer(pdfMeta.filename);
      if (!pdfBuffer) {
        return res.status(404).json({ error: 'Arquivo PDF original não encontrado no storage.' });
      }

      const { customInstructions, apiKey } = req.body || {};
      if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 10) {
        bookRepo.setSetting('gemini_api_key', apiKey.trim());
      }

      bookRepo.updateBookConversionStatus(
        book.id,
        'processing',
        'Reiniciando conversão inteligente do PDF com IA...',
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

      const updated = bookRepo.getBookByIdOrSlug(book.id);
      return res.json({ success: true, book: updated });
    } catch (error: any) {
      console.error('Erro ao reprocessar livro via admin:', error);
      return res.status(500).json({ error: error?.message || 'Erro ao reprocessar livro.' });
    }
  };

  router.post('/reprocess/:id', handleReprocess);
  router.post('/books/:id/reprocess', handleReprocess);

  return router;
}
