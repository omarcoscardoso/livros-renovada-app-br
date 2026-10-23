import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
export const DEFAULT_DB_PATH =
  process.env.SQLITE_DB_PATH || path.join(os.tmpdir(), 'livros-renovada-library.sqlite');

let dbInstance: DatabaseSync | null = null;

export function getDatabase(customDbPath?: string): DatabaseSync {
  if (dbInstance && !customDbPath) {
    return dbInstance;
  }

  const dbPath = customDbPath || DEFAULT_DB_PATH;
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title_pt TEXT NOT NULL,
      title_en TEXT NOT NULL,
      subtitle_pt TEXT NOT NULL,
      subtitle_en TEXT NOT NULL,
      author TEXT NOT NULL,
      original_year INTEGER NOT NULL,
      publisher TEXT NOT NULL,
      translator_note TEXT NOT NULL,
      cover_color TEXT NOT NULL DEFAULT 'amber',
      cover_image_filename TEXT,
      cover_page_number INTEGER DEFAULT 1,
      pdf_filename TEXT,
      original_pdf_name TEXT,
      status TEXT NOT NULL DEFAULT 'ready',
      conversion_progress TEXT,
      conversion_percent INTEGER DEFAULT 100,
      error_message TEXT,
      chapters_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      picture TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      is_blocked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_reading_progress (
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      last_chapter_id TEXT,
      read_chapters_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, book_id)
    );
  `);

  const cols = db.prepare(`PRAGMA table_info(books)`).all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has('cover_image_filename')) {
    db.exec(`ALTER TABLE books ADD COLUMN cover_image_filename TEXT`);
  }
  if (!colNames.has('cover_page_number')) {
    db.exec(`ALTER TABLE books ADD COLUMN cover_page_number INTEGER DEFAULT 1`);
  }

  // Ensure default admin user cardoso.oliveira@gmail.com exists and has admin privileges (Requirement 4)
  const adminEmail = 'cardoso.oliveira@gmail.com';
  const existingAdmin = db.prepare('SELECT id, role FROM users WHERE email = ?').get(adminEmail) as
    | { id: string; role: string }
    | undefined;
  if (!existingAdmin) {
    const now = new Date().toISOString();
    const adminId = 'usr_admin_cardoso';
    db.prepare(`
      INSERT INTO users (id, email, name, picture, role, is_blocked, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', 0, ?, ?)
    `).run(adminId, adminEmail, 'Cardoso Oliveira', null, now, now);
  } else if (existingAdmin.role !== 'admin') {
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existingAdmin.id);
  }

  if (!customDbPath) {
    dbInstance = db;
  }

  return db;
}
