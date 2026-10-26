import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { IUserRepository, User } from '../repositories/userRepository';
import { IBookRepository } from '../repositories/bookRepository';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

function safeCompare(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createAuthMiddleware(
  userRepo: IUserRepository,
  bookRepo?: IBookRepository
) {
  const attachUser = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      // 1. Verificação por Chave de Administração para Scripts / Ingestão em Lote
      // Aceita cabeçalhos X-Admin-Api-Key ou X-Api-Key
      const apiKeyHeader =
        (req.headers['x-admin-api-key'] as string) ||
        (req.headers['x-api-key'] as string) ||
        '';

      const configuredApiKey =
        process.env.ADMIN_API_KEY?.trim() ||
        bookRepo?.getSetting('admin_api_key')?.trim() ||
        '';

      if (
        configuredApiKey &&
        configuredApiKey.length >= 16 &&
        apiKeyHeader &&
        safeCompare(apiKeyHeader.trim(), configuredApiKey)
      ) {
        req.user = {
          id: 'admin_api_service',
          email: 'admin-service@lumi.renovada.app.br',
          name: 'Admin API Service',
          role: 'admin',
          isBlocked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return next();
      }

      // 2. Verificação padrão por Sessão de Usuário Google ou Bearer Token
      const token =
        req.cookies?.session_token ||
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice(7)
          : null);

      if (token) {
        // Se o token fornecido em Bearer bater com a configuredApiKey:
        if (
          configuredApiKey &&
          configuredApiKey.length >= 16 &&
          safeCompare(token.trim(), configuredApiKey)
        ) {
          req.user = {
            id: 'admin_api_service',
            email: 'admin-service@lumi.renovada.app.br',
            name: 'Admin API Service',
            role: 'admin',
            isBlocked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return next();
        }

        const user = userRepo.getUserBySessionToken(token);
        if (user) {
          req.user = user;
        }
      }
    } catch (err) {
      console.warn('Erro ao verificar sessão do usuário:', err);
    }
    next();
  };

  const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticação necessária. Faça login com sua conta Google ou utilize uma chave de API válida.',
        requiresLogin: true,
      });
    }
    next();
  };

  const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticação necessária. Faça login com sua conta Google ou utilize uma chave de API válida.',
        requiresLogin: true,
      });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Acesso restrito. Esta ação requer privilégios de administrador.',
      });
    }
    next();
  };

  return { attachUser, requireAuth, requireAdmin };
}
