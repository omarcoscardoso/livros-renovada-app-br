import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
export const STORAGE_DIR = path.join(PROJECT_ROOT, 'storage');
export const PDF_STORAGE_DIR = path.join(STORAGE_DIR, 'pdfs');

let dbInstance: DatabaseSync | null = null;

export function ensureStorageDirectories(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(PDF_STORAGE_DIR)) {
    fs.mkdirSync(PDF_STORAGE_DIR, { recursive: true });
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

  if (!customDbPath) {
    dbInstance = db;
  }

  return db;
}
