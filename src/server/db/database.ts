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
  `);

  const cols = db.prepare(`PRAGMA table_info(books)`).all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has('cover_image_filename')) {
    db.exec(`ALTER TABLE books ADD COLUMN cover_image_filename TEXT`);
  }
  if (!colNames.has('cover_page_number')) {
    db.exec(`ALTER TABLE books ADD COLUMN cover_page_number INTEGER DEFAULT 1`);
  }

  if (!customDbPath) {
    dbInstance = db;
  }

  return db;
}
