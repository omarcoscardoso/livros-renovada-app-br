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
  });
});
