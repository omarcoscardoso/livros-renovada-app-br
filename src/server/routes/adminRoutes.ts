import { Router } from 'express';
import { IUserRepository } from '../repositories/userRepository';
import { IBookRepository } from '../repositories/bookRepository';
import { GeminiConversionService } from '../services/geminiConversionService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export function createAdminRouter(
  userRepo: IUserRepository,
  bookRepo: IBookRepository,
  conversionService: GeminiConversionService
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

  return router;
}
