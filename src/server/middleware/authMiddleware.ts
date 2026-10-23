import { Request, Response, NextFunction } from 'express';
import { IUserRepository, User } from '../repositories/userRepository';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function createAuthMiddleware(userRepo: IUserRepository) {
  const attachUser = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const token =
        req.cookies?.session_token ||
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice(7)
          : null);

      if (token) {
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
        error: 'Autenticação necessária. Faça login com sua conta Google para continuar.',
        requiresLogin: true,
      });
    }
    next();
  };

  const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticação necessária. Faça login com sua conta Google.',
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
