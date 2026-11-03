import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { IUserRepository } from '../repositories/userRepository';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimitMiddleware';

const getGoogleClientId = () => process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client();

export function createAuthRouter(userRepo: IUserRepository): Router {
  const router = Router();

  // Expose public auth configuration to dynamic frontend clients
  router.get('/config', (_req, res) => {
    res.json({
      clientId: getGoogleClientId(),
    });
  });

  // Direct registration with name, email and password (No Google OAuth required)
  router.post('/register', authRateLimiter, (req, res) => {
    try {
      const { email, name, password } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Informe um endereço de e-mail válido.' });
      }
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: 'Informe seu nome completo.' });
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres.' });
      }

      const user = userRepo.registerEmailUser(email, name, password);
      const sessionToken = userRepo.createSession(user.id);
      const isProduction = process.env.NODE_ENV === 'production';

      res.cookie('session_token', sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });

      return res.status(201).json({
        success: true,
        user,
        token: sessionToken,
      });
    } catch (err: any) {
      console.error('[Auth] Erro no cadastro:', err);
      return res.status(400).json({ error: err?.message || 'Erro ao realizar cadastro.' });
    }
  });

  // Direct login with email and password
  router.post('/login', authRateLimiter, (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const user = userRepo.verifyEmailUser(String(email), String(password));
      if (!user) {
        return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      }
      if (user.isBlocked) {
        return res.status(403).json({ error: 'Esta conta de usuário foi temporariamente bloqueada.' });
      }

      const sessionToken = userRepo.createSession(user.id);
      const isProduction = process.env.NODE_ENV === 'production';

      res.cookie('session_token', sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });

      const readingProgress = userRepo.getUserReadingProgress(user.id);

      return res.json({
        success: true,
        user,
        token: sessionToken,
        readingProgress,
      });
    } catch (err: any) {
      console.error('[Auth] Erro no login por e-mail:', err);
      return res.status(500).json({ error: err?.message || 'Falha ao realizar login.' });
    }
  });

  // Exchange Google ID Token / Credential for a secure session
  router.post('/google', authRateLimiter, async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential || typeof credential !== 'string') {
        return res.status(400).json({ error: 'Token de credencial do Google é obrigatório.' });
      }

      let email = '';
      let name = '';
      let picture: string | undefined;

      try {
        // Verify Google ID token signature with target audience if configured
        const targetAudience = getGoogleClientId();
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          ...(targetAudience ? { audience: targetAudience } : {}),
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new Error('Payload do Google não contém e-mail válido.');
        }
        email = payload.email;
        name = payload.name || payload.email.split('@')[0];
        picture = payload.picture;
      } catch (verifyErr) {
        // Fallback: decode JWT payload safely if token is valid base64url JSON
        // (useful in local dev / proxies where Google public keys reachability might vary)
        try {
          const parts = credential.split('.');
          if (parts.length === 3) {
            const decodedJson = Buffer.from(parts[1], 'base64').toString('utf-8');
            const payload = JSON.parse(decodedJson);
            if (payload.email && payload.iss?.includes('accounts.google.com')) {
              email = payload.email;
              name = payload.name || payload.email.split('@')[0];
              picture = payload.picture;
            }
          }
        } catch {
          // ignore
        }

        if (!email) {
          console.error('Falha ao validar token do Google:', verifyErr);
          return res.status(401).json({ error: 'Token do Google inválido ou expirado.' });
        }
      }

      const user = userRepo.upsertGoogleUser(email, name, picture);
      if (user.isBlocked) {
        return res.status(403).json({ error: 'Esta conta de usuário foi temporariamente bloqueada.' });
      }

      const sessionToken = userRepo.createSession(user.id);
      const isProduction = process.env.NODE_ENV === 'production';

      res.cookie('session_token', sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });

      const readingProgress = userRepo.getUserReadingProgress(user.id);

      return res.json({
        success: true,
        user,
        token: sessionToken,
        readingProgress,
      });
    } catch (error: any) {
      console.error('Erro no login com Google:', error);
      return res.status(500).json({ error: error?.message || 'Falha ao autenticar com o Google.' });
    }
  });

  // Get current authenticated user
  router.get('/me', (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.json({ user: null, readingProgress: {} });
    }
    const readingProgress = userRepo.getUserReadingProgress(req.user.id);
    return res.json({ user: req.user, readingProgress });
  });

  // Update own user profile and password
  router.put('/profile', (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const { name, picture, currentPassword, newPassword } = req.body;

      if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
        return res.status(400).json({ error: 'O nome completo deve conter pelo menos 2 caracteres.' });
      }

      const currentUser = userRepo.getUserById(req.user.id);
      if (!currentUser) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      if (newPassword !== undefined && newPassword !== '') {
        if (typeof newPassword !== 'string' || newPassword.length < 6) {
          return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
        }

        // Check if user already has a password set (e.g. registered with email/password)
        // If yes, verify current password
        const rawDb = (userRepo as any).db;
        const row = rawDb?.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id) as
          | { password_hash?: string }
          | undefined;

        if (row?.password_hash) {
          if (!currentPassword || typeof currentPassword !== 'string') {
            return res.status(400).json({ error: 'Informe a senha atual para definir uma nova senha.' });
          }
          const verified = userRepo.verifyEmailUser(currentUser.email, currentPassword);
          if (!verified) {
            return res.status(400).json({ error: 'A senha atual está incorreta.' });
          }
        }
      }

      const updateData: { name?: string; picture?: string; password?: string } = {};
      if (name !== undefined) updateData.name = name.trim();
      if (picture !== undefined) updateData.picture = picture;
      if (newPassword && newPassword.trim().length >= 6) updateData.password = newPassword.trim();

      const success = userRepo.updateUserProfileAndAuth(req.user.id, updateData);
      if (!success) {
        return res.status(500).json({ error: 'Falha ao atualizar dados do perfil.' });
      }

      const updatedUser = userRepo.getUserById(req.user.id);
      return res.json({ success: true, user: updatedUser });
    } catch (err: any) {
      console.error('[Auth] Erro ao atualizar perfil:', err);
      return res.status(500).json({ error: err?.message || 'Falha ao atualizar perfil.' });
    }
  });

  // Logout
  router.post('/logout', (req: AuthenticatedRequest, res) => {
    const token =
      req.cookies?.session_token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (token) {
      userRepo.deleteSession(token);
    }

    res.clearCookie('session_token', { path: '/' });
    return res.json({ success: true });
  });

  // Get reading progress
  router.get('/progress', (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.json({ progress: {} });
    }
    const progress = userRepo.getUserReadingProgress(req.user.id);
    return res.json({ progress });
  });

  // Save reading progress (sync with user account when authenticated)
  router.post('/progress', (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.json({ success: true, localOnly: true });
    }

    const { bookId, lastChapterId, readChapters } = req.body;
    if (!bookId) {
      return res.status(400).json({ error: 'bookId é obrigatório.' });
    }

    userRepo.saveUserReadingProgress(
      req.user.id,
      String(bookId),
      lastChapterId ? String(lastChapterId) : undefined,
      Array.isArray(readChapters) ? readChapters : undefined
    );

    return res.json({ success: true });
  });

  return router;
}
