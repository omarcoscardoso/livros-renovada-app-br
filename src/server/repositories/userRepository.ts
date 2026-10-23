import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDatabase, DEFAULT_DB_PATH } from '../db/database';
import { IStorageService, getStorageService } from '../services/storageService';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'user';
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProgressData {
  lastChapterId?: string;
  readChapters: string[];
}

export interface IUserRepository {
  upsertGoogleUser(email: string, name: string, picture?: string): User;
  getUserById(id: string): User | null;
  getUserByEmail(email: string): User | null;
  listUsers(): User[];
  updateUserRole(id: string, role: 'admin' | 'user'): boolean;
  setUserBlocked(id: string, isBlocked: boolean): boolean;
  createSession(userId: string, ttlDays?: number): string;
  getUserBySessionToken(token: string): User | null;
  deleteSession(token: string): boolean;
  getUserReadingProgress(userId: string): Record<string, UserProgressData>;
  saveUserReadingProgress(
    userId: string,
    bookId: string,
    lastChapterId?: string,
    readChapters?: string[]
  ): void;
}

export const INITIAL_ADMIN_EMAILS = [
  'cardoso.oliveira@gmail.com',
  ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()) : []),
];

export class SqliteUserRepository implements IUserRepository {
  private db: DatabaseSync;
  private storage: IStorageService;
  private isDefaultDb: boolean;

  constructor(db?: DatabaseSync, storage?: IStorageService) {
    this.isDefaultDb = !db;
    this.db = db || getDatabase();
    this.storage = storage || getStorageService();
  }

  private triggerRemoteSync(): void {
    if (this.isDefaultDb) {
      void this.storage.syncDatabaseSnapshot(DEFAULT_DB_PATH);
    }
  }

  public upsertGoogleUser(email: string, name: string, picture?: string): User {
    const cleanEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();

    const existing = this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(cleanEmail) as Record<string, any> | undefined;

    const isAdmin =
      INITIAL_ADMIN_EMAILS.includes(cleanEmail) ||
      (existing && existing.role === 'admin');
    const role: 'admin' | 'user' = isAdmin ? 'admin' : (existing?.role || 'user');

    if (existing) {
      this.db
        .prepare(
          `UPDATE users SET name = ?, picture = ?, role = ?, updated_at = ? WHERE id = ?`
        )
        .run(name.trim(), picture || existing.picture || null, role, now, existing.id);
      this.triggerRemoteSync();
      return this.getUserById(String(existing.id))!;
    }

    const id = `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    this.db
      .prepare(
        `INSERT INTO users (id, email, name, picture, role, is_blocked, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .run(id, cleanEmail, name.trim(), picture || null, role, now, now);

    this.triggerRemoteSync();
    return this.getUserById(id)!;
  }

  public getUserById(id: string): User | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as Record<string, any> | undefined;

    if (!row) return null;

    return {
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      picture: row.picture ? String(row.picture) : undefined,
      role: (row.role as 'admin' | 'user') || 'user',
      isBlocked: Boolean(row.is_blocked),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  public getUserByEmail(email: string): User | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email.trim().toLowerCase()) as Record<string, any> | undefined;

    if (!row) return null;
    return this.getUserById(String(row.id));
  }

  public listUsers(): User[] {
    const rows = this.db
      .prepare('SELECT * FROM users ORDER BY role DESC, created_at ASC')
      .all() as Record<string, any>[];

    return rows.map((row) => ({
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      picture: row.picture ? String(row.picture) : undefined,
      role: (row.role as 'admin' | 'user') || 'user',
      isBlocked: Boolean(row.is_blocked),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  public updateUserRole(id: string, role: 'admin' | 'user'): boolean {
    const now = new Date().toISOString();
    const res = this.db
      .prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .run(role, now, id);
    this.triggerRemoteSync();
    return res.changes > 0;
  }

  public setUserBlocked(id: string, isBlocked: boolean): boolean {
    const now = new Date().toISOString();
    const res = this.db
      .prepare('UPDATE users SET is_blocked = ?, updated_at = ? WHERE id = ?')
      .run(isBlocked ? 1 : 0, now, id);

    if (isBlocked) {
      // Invalidate all active sessions for blocked user
      this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    }

    this.triggerRemoteSync();
    return res.changes > 0;
  }

  public createSession(userId: string, ttlDays: number = 30): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    this.db
      .prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(token, userId, now.toISOString(), expiresAt);

    this.triggerRemoteSync();
    return token;
  }

  public getUserBySessionToken(token: string): User | null {
    if (!token || typeof token !== 'string' || token.length < 32) {
      return null;
    }

    const session = this.db
      .prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?')
      .get(token) as { user_id: string; expires_at: string } | undefined;

    if (!session) return null;

    if (new Date(session.expires_at).getTime() < Date.now()) {
      this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return null;
    }

    const user = this.getUserById(session.user_id);
    if (!user || user.isBlocked) {
      return null;
    }

    return user;
  }

  public deleteSession(token: string): boolean {
    const res = this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    this.triggerRemoteSync();
    return res.changes > 0;
  }

  public getUserReadingProgress(userId: string): Record<string, UserProgressData> {
    const rows = this.db
      .prepare('SELECT book_id, last_chapter_id, read_chapters_json FROM user_reading_progress WHERE user_id = ?')
      .all(userId) as Record<string, any>[];

    const result: Record<string, UserProgressData> = {};
    for (const row of rows) {
      let readChapters: string[] = [];
      try {
        readChapters = JSON.parse(row.read_chapters_json || '[]');
      } catch {
        readChapters = [];
      }
      result[String(row.book_id)] = {
        lastChapterId: row.last_chapter_id ? String(row.last_chapter_id) : undefined,
        readChapters,
      };
    }
    return result;
  }

  public saveUserReadingProgress(
    userId: string,
    bookId: string,
    lastChapterId?: string,
    readChapters?: string[]
  ): void {
    const now = new Date().toISOString();
    const chaptersJson = JSON.stringify(readChapters || []);

    this.db
      .prepare(
        `INSERT INTO user_reading_progress (user_id, book_id, last_chapter_id, read_chapters_json, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, book_id) DO UPDATE SET
           last_chapter_id = coalesce(excluded.last_chapter_id, user_reading_progress.last_chapter_id),
           read_chapters_json = coalesce(excluded.read_chapters_json, user_reading_progress.read_chapters_json),
           updated_at = excluded.updated_at`
      )
      .run(userId, bookId, lastChapterId || null, chaptersJson, now);

    this.triggerRemoteSync();
  }
}
