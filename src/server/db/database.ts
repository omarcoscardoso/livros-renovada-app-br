import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
export const STORAGE_DIR = path.join(PROJECT_ROOT, 'storage');
export const PDF_STORAGE_DIR = path.join(STORAGE_DIR, 'pdfs');
export const COVER_STORAGE_DIR = path.join(STORAGE_DIR, 'covers');
export const DEFAULT_DB_PATH = path.join(STORAGE_DIR, 'library.sqlite');

let dbInstance: DatabaseSync | null = null;

export function ensureStorageDirectories(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(PDF_STORAGE_DIR)) {
    fs.mkdirSync(PDF_STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(COVER_STORAGE_DIR)) {
    fs.mkdirSync(COVER_STORAGE_DIR, { recursive: true });
  }
}

export function getDatabase(customDbPath?: string): DatabaseSync {
  if (dbInstance && !customDbPath) {
    return dbInstance;
  }

  ensureStorageDirectories();
  const dbPath = customDbPath || path.join(STORAGE_DIR, 'library.sqlite');
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

  // Safe migration for existing databases that may not have cover_image_filename / cover_page_number
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
