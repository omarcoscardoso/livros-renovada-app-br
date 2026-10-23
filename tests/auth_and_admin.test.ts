import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getDatabase } from '../src/server/db/database';
import { SqliteUserRepository } from '../src/server/repositories/userRepository';

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
});
