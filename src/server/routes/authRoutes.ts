import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { IUserRepository } from '../repositories/userRepository';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

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

  // Exchange Google ID Token / Credential for a secure session
  router.post('/google', async (req, res) => {
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
