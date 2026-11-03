import rateLimit from 'express-rate-limit';

/**
 * Middleware de limitação de taxa (Rate Limiting) para rotas sensíveis de autenticação.
 * Previne ataques de força bruta, credential stuffing e abuso de endpoints de login e cadastro.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  limit: process.env.NODE_ENV === 'test' ? 1000 : 30, // 30 tentativas por IP a cada 15 min em dev/prod
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de autenticação a partir deste endereço IP. Por favor, tente novamente em alguns minutos.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});
