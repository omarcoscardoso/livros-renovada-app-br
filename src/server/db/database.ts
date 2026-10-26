import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
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

/**
 * Recupera um banco SQLite corrompido exportando os dados via `.recover` ou `.dump`
 * e reconstruindo um novo arquivo de banco íntegro.
 */
export function recoverCorruptedDatabaseFile(dbPath: string): boolean {
  if (!fs.existsSync(dbPath) || dbPath === ':memory:') return false;

  const tempRecoveredSql = path.join(
    os.tmpdir(),
    `recover_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`
  );
  const tempCleanDb = path.join(
    os.tmpdir(),
    `rebuilt_${Date.now()}_${Math.random().toString(36).slice(2)}.sqlite`
  );

  try {
    console.warn(`[SQLite] Iniciando recuperação de integridade para: ${dbPath}`);
    // 1. Tenta `.recover` do sqlite3 CLI
    let dump = spawnSync('sqlite3', [dbPath, '.recover'], {
      encoding: 'utf-8',
      maxBuffer: 100 * 1024 * 1024,
    });

    // Se .recover falhar, tenta .dump
    if (dump.status !== 0 || !dump.stdout || dump.stdout.trim().length === 0) {
      dump = spawnSync('sqlite3', [dbPath, '.dump'], {
        encoding: 'utf-8',
        maxBuffer: 100 * 1024 * 1024,
      });
    }

    if (dump.status === 0 && dump.stdout && dump.stdout.trim().length > 0) {
      fs.writeFileSync(tempRecoveredSql, dump.stdout, 'utf-8');

      const rebuild = spawnSync('sqlite3', [tempCleanDb], {
        input: dump.stdout,
        encoding: 'utf-8',
        maxBuffer: 100 * 1024 * 1024,
      });

      if (rebuild.status === 0 && fs.existsSync(tempCleanDb)) {
        // Valida se o banco reconstruído é de fato íntegro
        const testRecovered = new DatabaseSync(tempCleanDb);
        const check = testRecovered.prepare('PRAGMA integrity_check').all() as Array<{
          integrity_check: string;
        }>;
        testRecovered.close();

        if (check.length === 1 && check[0].integrity_check === 'ok') {
          // Backup do arquivo corrompido
          const corruptedBackup = `${dbPath}.corrupted-${Date.now()}`;
          try {
            fs.copyFileSync(dbPath, corruptedBackup);
          } catch {
            // ignore
          }

          // Remove arquivos WAL residuais antigos
          for (const ext of ['-wal', '-shm', '-journal']) {
            const sidecar = `${dbPath}${ext}`;
            if (fs.existsSync(sidecar)) {
              try {
                fs.unlinkSync(sidecar);
              } catch {
                // ignore
              }
            }
          }

          // Substitui atomicamente pelo banco recuperado
          fs.copyFileSync(tempCleanDb, dbPath);
          console.log(`[SQLite] Banco de dados recuperado com sucesso em ${dbPath}`);
          return true;
        }
      }
    }
  } catch (err) {
    console.error(`[SQLite] Falha ao tentar recuperar banco corrompido ${dbPath}:`, err);
  } finally {
    if (fs.existsSync(tempRecoveredSql)) {
      try {
        fs.unlinkSync(tempRecoveredSql);
      } catch {
        // ignore
      }
    }
    if (fs.existsSync(tempCleanDb)) {
      try {
        fs.unlinkSync(tempCleanDb);
      } catch {
        // ignore
      }
    }
  }

  return false;
}

/**
 * Valida a integridade física do arquivo SQLite. Se houver corrupção, executa auto-recuperação.
 */
export function verifyAndRepairDatabase(dbPath: string): boolean {
  if (!fs.existsSync(dbPath) || dbPath === ':memory:') return true;

  try {
    const testDb = new DatabaseSync(dbPath);
    const result = testDb.prepare('PRAGMA integrity_check').all() as Array<{
      integrity_check: string;
    }>;
    testDb.close();

    if (result.length === 1 && result[0].integrity_check === 'ok') {
      return true;
    }

    console.warn(`[SQLite] Integridade comprometida em ${dbPath}:`, result[0]?.integrity_check);
  } catch (err: any) {
    console.warn(`[SQLite] Erro ao abrir ${dbPath} para checagem de integridade:`, err?.message);
  }

  return recoverCorruptedDatabaseFile(dbPath);
}

/**
 * Cria um snapshot atômico e transacionalmente seguro do banco via VACUUM INTO
 */
export function createDatabaseSnapshot(targetPath: string): boolean {
  if (!dbInstance) return false;
  try {
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    dbInstance.exec(`VACUUM INTO '${targetPath}'`);
    return true;
  } catch (err) {
    console.warn('[SQLite] Erro ao criar snapshot seguro via VACUUM INTO:', err);
    return false;
  }
}

export function getDatabase(customDbPath?: string): DatabaseSync {
  if (dbInstance && !customDbPath) {
    return dbInstance;
  }

  const dbPath = customDbPath || DEFAULT_DB_PATH;

  // Valida e auto-recupera arquivo caso esteja com imagem de disco corrompida
  verifyAndRepairDatabase(dbPath);

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);

  // Ativa PRAGMAs essenciais para alta concorrência e resiliência a quedas
  try {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA busy_timeout = 5000;
    `);
  } catch {
    // Ignora para bancos em memória
  }

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
      rating REAL DEFAULT 0,
      reviews_count INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS book_ratings (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(book_id, user_id)
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
  if (!colNames.has('rating')) {
    db.exec(`ALTER TABLE books ADD COLUMN rating REAL DEFAULT 0`);
  }
  if (!colNames.has('reviews_count')) {
    db.exec(`ALTER TABLE books ADD COLUMN reviews_count INTEGER DEFAULT 0`);
  }
  if (!colNames.has('is_featured')) {
    db.exec(`ALTER TABLE books ADD COLUMN is_featured INTEGER DEFAULT 0`);
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
