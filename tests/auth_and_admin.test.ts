import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getDatabase } from '../src/server/db/database';
import { SqliteUserRepository } from '../src/server/repositories/userRepository';
import { SqliteBookRepository } from '../src/server/repositories/bookRepository';
import { createAdminRouter } from '../src/server/routes/adminRoutes';
import { GeminiConversionService } from '../src/server/services/geminiConversionService';
import { PdfExtractorService } from '../src/server/services/pdfExtractorService';
import { InMemoryStorageService } from '../src/server/services/storageService';
import { createAuthMiddleware } from '../src/server/middleware/authMiddleware';
import { authRateLimiter } from '../src/server/middleware/rateLimitMiddleware';

describe('Segurança, Autenticação Google e Administração', () => {
  let tempDbPath: string;
  let userRepo: SqliteUserRepository;

  beforeEach(() => {
    tempDbPath = path.join(
      os.tmpdir(),
      `test_auth_${Date.now()}_${Math.random().toString(36).slice(2)}.sqlite`
    );
    const db = getDatabase(tempDbPath);
    userRepo = new SqliteUserRepository(db);
  });

  afterEach(() => {
    if (tempDbPath && fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        // ignore
      }
    }
  });

  it('deve semear o administrador padrão cardoso.oliveira@gmail.com', () => {
    const admin = userRepo.getUserByEmail('cardoso.oliveira@gmail.com');
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe('admin');
    expect(admin?.isBlocked).toBe(false);
  });

  it('deve criar ou atualizar um usuário Google e gerenciar sessões seguras', () => {
    const newUser = userRepo.upsertGoogleUser(
      'membro@renovada.com.br',
      'Membro da Igreja',
      'https://example.com/avatar.jpg'
    );

    expect(newUser.id).toBeDefined();
    expect(newUser.email).toBe('membro@renovada.com.br');
    expect(newUser.role).toBe('user');
    expect(newUser.isBlocked).toBe(false);

    // Criar sessão de 7 dias
    const token = userRepo.createSession(newUser.id, 7);
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThanOrEqual(32);

    // Validar sessão ativa
    const sessionUser = userRepo.getUserBySessionToken(token);
    expect(sessionUser).not.toBeNull();
    expect(sessionUser?.id).toBe(newUser.id);
    expect(sessionUser?.email).toBe('membro@renovada.com.br');

    // Deletar sessão (logout)
    userRepo.deleteSession(token);
    const expiredSessionUser = userRepo.getUserBySessionToken(token);
    expect(expiredSessionUser).toBeNull();
  });

  it('deve registrar e autenticar usuário com e-mail e senha sem necessidade de Google OAuth', () => {
    const registered = userRepo.registerEmailUser(
      'lider.novo@renovada.com.br',
      'Novo Líder de Célula',
      'senhaForte123'
    );

    expect(registered.id).toBeDefined();
    expect(registered.email).toBe('lider.novo@renovada.com.br');
    expect(registered.name).toBe('Novo Líder de Célula');
    expect(registered.role).toBe('user');

    // Autenticar com credenciais corretas
    const verified = userRepo.verifyEmailUser('lider.novo@renovada.com.br', 'senhaForte123');
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(registered.id);

    // Rejeitar senha incorreta
    const wrongPwd = userRepo.verifyEmailUser('lider.novo@renovada.com.br', 'senhaIncorreta');
    expect(wrongPwd).toBeNull();

    // Rejeitar e-mail duplicado
    expect(() => {
      userRepo.registerEmailUser(
        'lider.novo@renovada.com.br',
        'Outro Nome',
        'outraSenha123'
      );
    }).toThrow(/Já existe uma conta cadastrada/);
  });

  it('deve salvar e sincronizar o progresso de leitura individual por usuário no SQLite', () => {
    const user = userRepo.upsertGoogleUser(
      'leitor@renovada.com.br',
      'Leitor Teste'
    );

    // Salvar progresso do livro A Igreja em Células
    userRepo.saveUserReadingProgress(
      user.id,
      'cell-church-larry-stockstill',
      'cap-03',
      ['intro', 'cap-01', 'cap-02', 'cap-03']
    );

    const progressMap = userRepo.getUserReadingProgress(user.id);
    expect(progressMap['cell-church-larry-stockstill']).toBeDefined();
    expect(progressMap['cell-church-larry-stockstill'].lastChapterId).toBe('cap-03');
    expect(progressMap['cell-church-larry-stockstill'].readChapters).toEqual([
      'intro',
      'cap-01',
      'cap-02',
      'cap-03',
    ]);
  });

  it('deve permitir ao administrador alterar papéis e bloquear/desbloquear usuários', () => {
    const user = userRepo.upsertGoogleUser(
      'colaborador@renovada.com.br',
      'Colaborador'
    );

    expect(user.role).toBe('user');
    expect(user.isBlocked).toBe(false);

    // Promover para admin
    userRepo.updateUserRole(user.id, 'admin');
    let updated = userRepo.getUserById(user.id);
    expect(updated?.role).toBe('admin');

    // Bloquear usuário
    userRepo.setUserBlocked(user.id, true);
    updated = userRepo.getUserById(user.id);
    expect(updated?.isBlocked).toBe(true);

    // Sessão deve ser rejeitada se bloqueado
    const token = userRepo.createSession(user.id, 1);
    const sessionUser = userRepo.getUserBySessionToken(token);
    expect(sessionUser).toBeNull(); // Usuários bloqueados não conseguem sessão ativa
  });

  it('deve listar usuários com métricas de engajamento e suportar promoção para admin', () => {
    const user = userRepo.upsertGoogleUser('membro.ativo@renovada.com.br', 'Membro Ativo');
    expect(user.role).toBe('user');

    // Listar usuários e verificar métricas de engajamento
    const users = userRepo.listUsers();
    const found = users.find((u) => u.id === user.id);
    expect(found).toBeDefined();
    expect(typeof found?.enrollmentsCount).toBe('number');
    expect(typeof found?.completedCount).toBe('number');
    expect(typeof found?.certificatesCount).toBe('number');

    // Promover para admin e re-verificar lista
    userRepo.updateUserRole(user.id, 'admin');
    const usersAfterPromotion = userRepo.listUsers();
    const promotedUser = usersAfterPromotion.find((u) => u.id === user.id);
    expect(promotedUser?.role).toBe('admin');

    // Revogar admin
    userRepo.updateUserRole(user.id, 'user');
    const usersAfterRevocation = userRepo.listUsers();
    const demotedUser = usersAfterRevocation.find((u) => u.id === user.id);
    expect(demotedUser?.role).toBe('user');
  });

  it('deve permitir ao admin editar cadastro, redefinir senha e excluir usuário', () => {
    const user = userRepo.registerEmailUser('usuario.para.editar@exemplo.com', 'Nome Antigo', 'senhaAntiga123');
    expect(user.name).toBe('Nome Antigo');

    // Editar nome e trocar senha
    const updateSuccess = userRepo.updateUserProfileAndAuth(user.id, {
      name: 'Nome Atualizado',
      password: 'novaSenhaSegura456',
    });
    expect(updateSuccess).toBe(true);

    const updatedUser = userRepo.getUserById(user.id);
    expect(updatedUser?.name).toBe('Nome Atualizado');

    // Validar nova senha
    const verified = userRepo.verifyEmailUser('usuario.para.editar@exemplo.com', 'novaSenhaSegura456');
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(user.id);

    // Senha antiga não deve mais funcionar
    const oldLogin = userRepo.verifyEmailUser('usuario.para.editar@exemplo.com', 'senhaAntiga123');
    expect(oldLogin).toBeNull();

    // Excluir usuário
    const deleteSuccess = userRepo.deleteUser(user.id);
    expect(deleteSuccess).toBe(true);

    const deletedCheck = userRepo.getUserById(user.id);
    expect(deletedCheck).toBeNull();
  });

  it('deve permitir ao admin definir e desmarcar destaque editorial (isFeatured)', () => {
    const db = getDatabase(tempDbPath);
    const bookRepo = new SqliteBookRepository(db);
    bookRepo.seedDefaultBookIfNeeded();

    const initialBook = bookRepo.getBookByIdOrSlug('cell-church-larry-stockstill');
    expect(initialBook).not.toBeNull();
    expect(initialBook?.isFeatured).toBe(false);

    // Marcar como destaque editorial
    const success = bookRepo.setBookFeatured('cell-church-larry-stockstill', true);
    expect(success).toBe(true);

    const featuredBook = bookRepo.getBookByIdOrSlug('cell-church-larry-stockstill');
    expect(featuredBook?.isFeatured).toBe(true);

    // Desmarcar destaque editorial
    bookRepo.setBookFeatured('cell-church-larry-stockstill', false);
    const unfeaturedBook = bookRepo.getBookByIdOrSlug('cell-church-larry-stockstill');
    expect(unfeaturedBook?.isFeatured).toBe(false);
  });

  it('deve gerenciar avaliações reais de usuários e calcular a média ponderada de estrelas', () => {
    const db = getDatabase(tempDbPath);
    const bookRepo = new SqliteBookRepository(db);
    bookRepo.seedDefaultBookIfNeeded();

    const user1 = userRepo.upsertGoogleUser('leitor1@renovada.com.br', 'Leitor Um');
    const user2 = userRepo.upsertGoogleUser('leitor2@renovada.com.br', 'Leitor Dois');

    const bookId = 'cell-church-larry-stockstill';

    // Inicialmente sem avaliações de usuário
    const initialUserRating = bookRepo.getUserRating(bookId, user1.id);
    expect(initialUserRating).toBeNull();

    // Leitor 1 avalia com 5 estrelas
    const rate1Result = bookRepo.rateBook(bookId, user1.id, 5);
    expect(rate1Result.rating).toBe(5.0);
    expect(rate1Result.reviewsCount).toBe(1);

    // Leitor 2 avalia com 4 estrelas
    const rate2Result = bookRepo.rateBook(bookId, user2.id, 4);
    expect(rate2Result.rating).toBe(4.5);
    expect(rate2Result.reviewsCount).toBe(2);

    // Verificar se o livro retorna a nota e contagem reais
    const updatedBook = bookRepo.getBookByIdOrSlug(bookId);
    expect(updatedBook?.rating).toBe(4.5);
    expect(updatedBook?.reviewsCount).toBe(2);

    // Leitor 1 atualiza sua nota para 3 estrelas (média (3 + 4) / 2 = 3.5)
    const updateResult = bookRepo.rateBook(bookId, user1.id, 3);
    expect(updateResult.rating).toBe(3.5);
    expect(updateResult.reviewsCount).toBe(2);
    expect(bookRepo.getUserRating(bookId, user1.id)).toBe(3);
  });

  it('deve disponibilizar as rotas administrativas de reprocessamento no router admin', () => {
    const db = getDatabase(tempDbPath);
    const bookRepo = new SqliteBookRepository(db);
    bookRepo.seedDefaultBookIfNeeded();

    const storage = new InMemoryStorageService();
    const extractor = new PdfExtractorService(storage);
    const conversion = new GeminiConversionService(bookRepo, extractor);

    const router = createAdminRouter(userRepo, bookRepo, conversion, storage);
    expect(router).toBeDefined();

    // Verifica que as rotas de reprocessamento estão registradas
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    const hasReprocess1 = routes.some(
      (r: any) => r.path === '/reprocess/:id' && r.methods.includes('post')
    );
    const hasReprocess2 = routes.some(
      (r: any) => r.path === '/books/:id/reprocess' && r.methods.includes('post')
    );
    expect(hasReprocess1).toBe(true);
    expect(hasReprocess2).toBe(true);

    const hasAdminKeyGet = routes.some(
      (r: any) => r.path === '/admin-key' && r.methods.includes('get')
    );
    const hasAdminKeyPost = routes.some(
      (r: any) => r.path === '/admin-key' && r.methods.includes('post')
    );
    expect(hasAdminKeyGet).toBe(true);
    expect(hasAdminKeyPost).toBe(true);
  });

  it('deve semear e gerenciar a chave de API de administração (admin_api_key) para scripts de automação', () => {
    const db = getDatabase(tempDbPath);
    const bookRepo = new SqliteBookRepository(db);
    bookRepo.seedDefaultBookIfNeeded();

    const seededKey = bookRepo.getSetting('admin_api_key');
    expect(seededKey).toBeDefined();
    expect(seededKey).not.toBeNull();
    expect(typeof seededKey).toBe('string');
    expect(seededKey!.startsWith('lumi_')).toBe(true);
    expect(seededKey!.length).toBeGreaterThanOrEqual(32);

    const auth = createAuthMiddleware(userRepo, bookRepo);

    // 1. Requisição com cabeçalho X-Admin-Api-Key válido
    let nextCalled = false;
    const mockReqValid: any = {
      headers: { 'x-admin-api-key': seededKey },
      cookies: {},
    };
    const mockRes: any = {
      status: (code: number) => ({
        json: (data: any) => ({ statusCode: code, data }),
      }),
    };

    auth.attachUser(mockReqValid, mockRes, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(mockReqValid.user).toBeDefined();
    expect(mockReqValid.user?.role).toBe('admin');
    expect(mockReqValid.user?.id).toBe('admin_api_service');

    // 2. Requisição com Bearer token usando a chave admin
    let bearerNextCalled = false;
    const mockReqBearer: any = {
      headers: { authorization: `Bearer ${seededKey}` },
      cookies: {},
    };
    auth.attachUser(mockReqBearer, mockRes, () => {
      bearerNextCalled = true;
    });
    expect(bearerNextCalled).toBe(true);
    expect(mockReqBearer.user?.role).toBe('admin');

    // 3. Requisição com chave inválida deve ser rejeitada em requireAuth / requireAdmin
    let invalidNextCalled = false;
    let authErrorResponse: any = null;
    const mockReqInvalid: any = {
      headers: { 'x-admin-api-key': 'chave_invalida_com_tamanho_errado' },
      cookies: {},
    };
    const mockResInvalid: any = {
      status: (code: number) => ({
        json: (data: any) => {
          authErrorResponse = { code, data };
          return authErrorResponse;
        },
      }),
    };

    auth.attachUser(mockReqInvalid, mockResInvalid, () => {
      invalidNextCalled = true;
    });
    expect(invalidNextCalled).toBe(true);
    expect(mockReqInvalid.user).toBeUndefined();

    auth.requireAdmin(mockReqInvalid, mockResInvalid, () => {});
    expect(authErrorResponse).not.toBeNull();
    expect(authErrorResponse.code).toBe(401);
  });

  it('deve exportar e configurar o middleware de rate limiting para rotas de autenticação', () => {
    expect(authRateLimiter).toBeDefined();
    expect(typeof authRateLimiter).toBe('function');
  });

  it('deve permitir ao aluno atualizar seu próprio perfil e senha via PUT /profile com validação de senha atual', async () => {
    const student = userRepo.registerEmailUser('aluno.perfil@renovada.com.br', 'Aluno Original', 'senhaAntiga123');
    const { createAuthRouter } = await import('../src/server/routes/authRoutes');
    const authRouter = createAuthRouter(userRepo);

    const profileLayer = authRouter.stack.find(
      (layer: any) => layer.route?.path === '/profile' && layer.route?.methods?.put
    );
    expect(profileLayer).toBeDefined();

    // 1. Atualizar nome e foto com sucesso
    let resData: any = null;
    let resCode = 200;
    const mockReq: any = {
      user: student,
      body: { name: 'Aluno Nome Atualizado', picture: 'https://example.com/nova-foto.jpg' },
    };
    const mockRes: any = {
      status: (c: number) => {
        resCode = c;
        return mockRes;
      },
      json: (d: any) => {
        resData = d;
        return d;
      },
    };

    const noop = () => {};
    profileLayer.route.stack[0].handle(mockReq, mockRes, noop);
    expect(resCode).toBe(200);
    expect(resData.success).toBe(true);
    expect(resData.user.name).toBe('Aluno Nome Atualizado');
    expect(resData.user.picture).toBe('https://example.com/nova-foto.jpg');

    // 2. Rejeitar alteração de senha se a senha atual estiver incorreta
    let errorResCode = 200;
    let errorResData: any = null;
    const mockReqWrongPwd: any = {
      user: student,
      body: { currentPassword: 'senhaIncorreta', newPassword: 'novaSenha123' },
    };
    const mockResWrong: any = {
      status: (c: number) => {
        errorResCode = c;
        return mockResWrong;
      },
      json: (d: any) => {
        errorResData = d;
        return d;
      },
    };

    profileLayer.route.stack[0].handle(mockReqWrongPwd, mockResWrong, noop);
    expect(errorResCode).toBe(400);
    expect(errorResData.error).toMatch(/A senha atual está incorreta/);

    // 3. Atualizar senha com sucesso quando a senha atual for informada corretamente
    let pwdResCode = 200;
    let pwdResData: any = null;
    const mockReqValidPwd: any = {
      user: student,
      body: { currentPassword: 'senhaAntiga123', newPassword: 'novaSenhaForte456' },
    };
    const mockResValid: any = {
      status: (c: number) => {
        pwdResCode = c;
        return mockResValid;
      },
      json: (d: any) => {
        pwdResData = d;
        return d;
      },
    };

    profileLayer.route.stack[0].handle(mockReqValidPwd, mockResValid, noop);
    expect(pwdResCode).toBe(200);
    expect(pwdResData.success).toBe(true);

    // Validar autenticação com nova senha
    const loginNew = userRepo.verifyEmailUser('aluno.perfil@renovada.com.br', 'novaSenhaForte456');
    expect(loginNew).not.toBeNull();
    const loginOld = userRepo.verifyEmailUser('aluno.perfil@renovada.com.br', 'senhaAntiga123');
    expect(loginOld).toBeNull();
  });

  it('deve retornar detalhes e status de armazenamento (storageDetails) em InMemoryStorageService e no admin router', async () => {
    const { InMemoryStorageService } = await import('../src/server/services/storageService');
    const storage = new InMemoryStorageService('test-bucket');
    await storage.savePdf('livro-teste.pdf', Buffer.from('%PDF-1.4 test'));
    await storage.saveCover('livro-teste_cover.png', Buffer.from('png-data'));

    const details = await storage.getStorageDetails();
    expect(details.driver).toBe('memory');
    expect(details.bucketName).toBe('test-bucket');
    expect(details.isHealthy).toBe(true);
    expect(details.pdfCount).toBe(1);
    expect(details.coverCount).toBe(1);
  });

  it('deve validar estrutura do Web App Manifest e rotas PWA', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifestContent.name).toBe('Lumi - Plataforma Digital & Treinamentos');
    expect(manifestContent.short_name).toBe('Lumi');
    expect(manifestContent.display).toBe('standalone');
    expect(manifestContent.icons.length).toBeGreaterThanOrEqual(3);

    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);
    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toMatch(/CACHE_VERSION/);
    expect(swContent).toMatch(/self\.skipWaiting\(\)/);
  });
});
