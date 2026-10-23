import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { BookSummary, Chapter, StoredBook, BookStatus } from '../../data/bookTypes';
import { bookInfo, allChapters } from '../../data/bookData';
import {
  getDatabase,
  PROJECT_ROOT,
  DEFAULT_DB_PATH,
} from '../db/database';
import { getStorageService, IStorageService } from '../services/storageService';

export interface CreateBookInput {
  id: string;
  slug: string;
  titlePt: string;
  titleEn: string;
  subtitlePt: string;
  subtitleEn: string;
  author: string;
  originalYear: number;
  publisher: string;
  translatorNote: string;
  coverColor?: string;
  coverImageFilename?: string | null;
  coverPageNumber?: number;
  pdfFilename?: string | null;
  originalPdfName?: string | null;
  status?: BookStatus;
  conversionProgress?: string;
  conversionPercent?: number;
  chapters: Chapter[];
}

export interface IBookRepository {
  seedDefaultBookIfNeeded(): void;
  listBooks(): BookSummary[];
  getBookByIdOrSlug(idOrSlug: string): StoredBook | null;
  getPdfFilePath(idOrSlug: string): { filePath: string; downloadName: string } | null;
  getPdfMetadata(idOrSlug: string): { filename: string; downloadName: string } | null;
  getCoverImagePath(idOrSlug: string): string | null;
  getCoverFilename(idOrSlug: string): string | null;
  createBook(input: CreateBookInput): StoredBook;
  updateBookConversionStatus(
    id: string,
    status: BookStatus,
    progress: string,
    percent: number,
    errorMessage?: string | null
  ): void;
  updateBookContent(
    id: string,
    data: Partial<Omit<CreateBookInput, 'id' | 'slug'>> & {
      status?: BookStatus;
      conversionPercent?: number;
      conversionProgress?: string;
    }
  ): StoredBook | null;
  deleteBook(id: string): boolean;
  getSetting(key: string): string | null;
  setSetting(key: string, value: string): void;
}

export const DEFAULT_BOOK_ID = 'cell-church-larry-stockstill';

export class SqliteBookRepository implements IBookRepository {
  private db: DatabaseSync;
  private storage: IStorageService;
  private isDefaultDb: boolean;

  constructor(db?: DatabaseSync, storage?: IStorageService) {
    this.isDefaultDb = !db;
    this.db = db || getDatabase();
    this.storage = storage || getStorageService();
  }

  private triggerRemoteDbSync(): void {
    if (this.isDefaultDb) {
      void this.storage.syncDatabaseSnapshot(DEFAULT_DB_PATH);
    }
  }

  public seedDefaultBookIfNeeded(): void {
    if (this.getSetting('default_book_deleted') === 'true') {
      // User explicitly deleted the default book, do not re-seed it
      return;
    }

    const existing = this.db
      .prepare('SELECT id, cover_image_filename FROM books WHERE id = ? OR slug = ?')
      .get(DEFAULT_BOOK_ID, DEFAULT_BOOK_ID) as
      | { id: string; cover_image_filename?: string | null }
      | undefined;

    const defaultPdfSource = path.join(
      PROJECT_ROOT,
      'public',
      'assets',
      'aistudio',
      'The_Cell_Church_-_Larry_Stockstill_020021f2.pdf'
    );
    const defaultPdfFilename = 'The_Cell_Church_-_Larry_Stockstill_020021f2.pdf';

    const defaultCoverSource = path.join(
      PROJECT_ROOT,
      'public',
      'assets',
      'aistudio',
      'The_Cell_Church_Cover.png'
    );
    const defaultCoverFilename = `${DEFAULT_BOOK_ID}_cover.png`;

    void this.storage.ensureDefaultAssets(
      defaultPdfSource,
      defaultPdfFilename,
      defaultCoverSource,
      defaultCoverFilename
    );

    if (!existing) {
      this.createBook({
        id: DEFAULT_BOOK_ID,
        slug: DEFAULT_BOOK_ID,
        titlePt: bookInfo.titlePt,
        titleEn: bookInfo.titleEn,
        subtitlePt: bookInfo.subtitlePt,
        subtitleEn: bookInfo.subtitleEn,
        author: bookInfo.author,
        originalYear: bookInfo.originalYear,
        publisher: bookInfo.publisher,
        translatorNote: bookInfo.translatorNote,
        coverColor: 'amber',
        coverImageFilename: defaultCoverFilename,
        coverPageNumber: 1,
        pdfFilename: defaultPdfFilename,
        originalPdfName: 'The_Cell_Church_Larry_Stockstill_Original.pdf',
        status: 'ready',
        conversionProgress: 'Livro completo traduzido e revisado',
        conversionPercent: 100,
        chapters: allChapters,
      });
    } else if (!existing.cover_image_filename) {
      this.db
        .prepare(
          'UPDATE books SET cover_image_filename = ?, cover_page_number = 1 WHERE id = ?'
        )
        .run(defaultCoverFilename, existing.id);
    }
  }

  private resolveCoverImageUrl(row: Record<string, any>): string | undefined {
    const id = String(row.id);
    if (row.cover_image_filename || id === DEFAULT_BOOK_ID) {
      return `/api/books/${encodeURIComponent(id)}/cover`;
    }
    return undefined;
  }

  public listBooks(): BookSummary[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM books ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, created_at DESC`
      )
      .all(DEFAULT_BOOK_ID) as Record<string, any>[];

    return rows.map((row) => {
      let chapters: Chapter[] = [];
      try {
        chapters = JSON.parse(row.chapters_json || '[]');
      } catch {
        chapters = [];
      }

      const totalEstimatedMinutes = chapters.reduce(
        (acc, ch) => acc + (Number(ch.estimatedReadTimeMinutes) || 5),
        0
      );

      return {
        id: String(row.id),
        slug: String(row.slug),
        titlePt: String(row.title_pt),
        titleEn: String(row.title_en),
        subtitlePt: String(row.subtitle_pt),
        subtitleEn: String(row.subtitle_en),
        author: String(row.author),
        originalYear: Number(row.original_year),
        publisher: String(row.publisher),
        translatorNote: String(row.translator_note),
        coverColor: String(row.cover_color || 'amber'),
        coverImageUrl: this.resolveCoverImageUrl(row),
        coverPageNumber: Number(row.cover_page_number || 1),
        chapterCount: chapters.length,
        totalEstimatedMinutes,
        hasOriginalPdf: Boolean(row.pdf_filename),
        originalPdfName: row.original_pdf_name ? String(row.original_pdf_name) : undefined,
        status: (row.status as BookStatus) || 'ready',
        conversionProgress: row.conversion_progress ? String(row.conversion_progress) : undefined,
        conversionPercent:
          row.conversion_percent !== null && row.conversion_percent !== undefined
            ? Number(row.conversion_percent)
            : 100,
        errorMessage: row.error_message ? String(row.error_message) : undefined,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
    });
  }

  public getBookByIdOrSlug(idOrSlug: string): StoredBook | null {
    const row = this.db
      .prepare('SELECT * FROM books WHERE id = ? OR slug = ?')
      .get(idOrSlug, idOrSlug) as Record<string, any> | undefined;

    if (!row) return null;

    let chapters: Chapter[] = [];
    try {
      chapters = JSON.parse(row.chapters_json || '[]');
    } catch {
      chapters = [];
    }

    return {
      id: String(row.id),
      slug: String(row.slug),
      titlePt: String(row.title_pt),
      titleEn: String(row.title_en),
      subtitlePt: String(row.subtitle_pt),
      subtitleEn: String(row.subtitle_en),
      author: String(row.author),
      originalYear: Number(row.original_year),
      publisher: String(row.publisher),
      translatorNote: String(row.translator_note),
      coverColor: String(row.cover_color || 'amber'),
      coverImageUrl: this.resolveCoverImageUrl(row),
      coverPageNumber: Number(row.cover_page_number || 1),
      hasOriginalPdf: Boolean(row.pdf_filename),
      originalPdfName: row.original_pdf_name ? String(row.original_pdf_name) : undefined,
      status: (row.status as BookStatus) || 'ready',
      conversionProgress: row.conversion_progress ? String(row.conversion_progress) : undefined,
      conversionPercent:
        row.conversion_percent !== null && row.conversion_percent !== undefined
          ? Number(row.conversion_percent)
          : 100,
      errorMessage: row.error_message ? String(row.error_message) : undefined,
      chapters,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  public getCoverFilename(idOrSlug: string): string | null {
    const row = this.db
      .prepare('SELECT id, cover_image_filename FROM books WHERE id = ? OR slug = ?')
      .get(idOrSlug, idOrSlug) as Record<string, any> | undefined;

    if (row?.cover_image_filename) {
      return String(row.cover_image_filename);
    }
    if (idOrSlug === DEFAULT_BOOK_ID || row?.id === DEFAULT_BOOK_ID) {
      return `${DEFAULT_BOOK_ID}_cover.png`;
    }
    return null;
  }

  public getCoverImagePath(idOrSlug: string): string | null {
    if (idOrSlug === DEFAULT_BOOK_ID) {
      const fallbackPublic = path.join(
        PROJECT_ROOT,
        'public',
        'assets',
        'aistudio',
        'The_Cell_Church_Cover.png'
      );
      if (fs.existsSync(fallbackPublic)) {
        return fallbackPublic;
      }
    }
    return null;
  }

  public getPdfMetadata(idOrSlug: string): { filename: string; downloadName: string } | null {
    const row = this.db
      .prepare('SELECT pdf_filename, original_pdf_name, slug FROM books WHERE id = ? OR slug = ?')
      .get(idOrSlug, idOrSlug) as Record<string, any> | undefined;

    if (!row || !row.pdf_filename) return null;

    return {
      filename: String(row.pdf_filename),
      downloadName: String(row.original_pdf_name || `${row.slug}.pdf`),
    };
  }

  public getPdfFilePath(idOrSlug: string): { filePath: string; downloadName: string } | null {
    const row = this.db
      .prepare('SELECT pdf_filename, original_pdf_name, slug FROM books WHERE id = ? OR slug = ?')
      .get(idOrSlug, idOrSlug) as Record<string, any> | undefined;

    if (!row || !row.pdf_filename) return null;

    const candidatePublic = path.join(
      PROJECT_ROOT,
      'public',
      'assets',
      'aistudio',
      String(row.pdf_filename)
    );
    if (fs.existsSync(candidatePublic)) {
      return {
        filePath: candidatePublic,
        downloadName: String(row.original_pdf_name || `${row.slug}.pdf`),
      };
    }

    return null;
  }

  public createBook(input: CreateBookInput): StoredBook {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO books (
        id, slug, title_pt, title_en, subtitle_pt, subtitle_en,
        author, original_year, publisher, translator_note, cover_color,
        cover_image_filename, cover_page_number,
        pdf_filename, original_pdf_name, status, conversion_progress,
        conversion_percent, chapters_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      input.id,
      input.slug,
      input.titlePt,
      input.titleEn,
      input.subtitlePt,
      input.subtitleEn,
      input.author,
      input.originalYear,
      input.publisher,
      input.translatorNote,
      input.coverColor || 'amber',
      input.coverImageFilename || null,
      input.coverPageNumber ?? 1,
      input.pdfFilename || null,
      input.originalPdfName || null,
      input.status || 'ready',
      input.conversionProgress || 'Pronto para leitura',
      input.conversionPercent ?? 100,
      JSON.stringify(input.chapters || []),
      now,
      now
    );

    this.triggerRemoteDbSync();
    return this.getBookByIdOrSlug(input.id)!;
  }

  public updateBookConversionStatus(
    id: string,
    status: BookStatus,
    progress: string,
    percent: number,
    errorMessage: string | null = null
  ): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE books
         SET status = ?, conversion_progress = ?, conversion_percent = ?, error_message = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(status, progress, percent, errorMessage, now, id);
    this.triggerRemoteDbSync();
  }

  public updateBookContent(
    id: string,
    data: Partial<Omit<CreateBookInput, 'id' | 'slug'>> & {
      status?: BookStatus;
      conversionPercent?: number;
      conversionProgress?: string;
    }
  ): StoredBook | null {
    const existingRow = this.db
      .prepare('SELECT * FROM books WHERE id = ?')
      .get(id) as Record<string, any> | undefined;
    if (!existingRow) return null;

    const existing = this.getBookByIdOrSlug(id)!;
    const now = new Date().toISOString();

    const updatedTitlePt = data.titlePt ?? existing.titlePt;
    const updatedTitleEn = data.titleEn ?? existing.titleEn;
    const updatedSubtitlePt = data.subtitlePt ?? existing.subtitlePt;
    const updatedSubtitleEn = data.subtitleEn ?? existing.subtitleEn;
    const updatedAuthor = data.author ?? existing.author;
    const updatedYear = data.originalYear ?? existing.originalYear;
    const updatedPublisher = data.publisher ?? existing.publisher;
    const updatedNote = data.translatorNote ?? existing.translatorNote;
    const updatedColor = data.coverColor ?? existing.coverColor;
    const updatedCoverFilename =
      data.coverImageFilename !== undefined
        ? data.coverImageFilename
        : (existingRow.cover_image_filename as string | null);
    const updatedCoverPageNumber =
      data.coverPageNumber !== undefined
        ? data.coverPageNumber
        : Number(existingRow.cover_page_number || 1);
    const updatedStatus = data.status ?? existing.status;
    const updatedProgress = data.conversionProgress ?? existing.conversionProgress ?? 'Concluído';
    const updatedPercent = data.conversionPercent ?? existing.conversionPercent ?? 100;
    const updatedChapters = data.chapters ?? existing.chapters;

    this.db
      .prepare(
        `UPDATE books SET
          title_pt = ?, title_en = ?, subtitle_pt = ?, subtitle_en = ?,
          author = ?, original_year = ?, publisher = ?, translator_note = ?,
          cover_color = ?, cover_image_filename = ?, cover_page_number = ?,
          status = ?, conversion_progress = ?, conversion_percent = ?,
          error_message = NULL, chapters_json = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        updatedTitlePt,
        updatedTitleEn,
        updatedSubtitlePt,
        updatedSubtitleEn,
        updatedAuthor,
        updatedYear,
        updatedPublisher,
        updatedNote,
        updatedColor,
        updatedCoverFilename,
        updatedCoverPageNumber,
        updatedStatus,
        updatedProgress,
        updatedPercent,
        JSON.stringify(updatedChapters),
        now,
        id
      );

    this.triggerRemoteDbSync();
    return this.getBookByIdOrSlug(id);
  }

  public deleteBook(id: string): boolean {
    if (id === DEFAULT_BOOK_ID) {
      this.setSetting('default_book_deleted', 'true');
    }

    const pdfMeta = this.getPdfMetadata(id);
    const coverFilename = this.getCoverFilename(id);
    const result = this.db.prepare('DELETE FROM books WHERE id = ?').run(id);

    if (pdfMeta?.filename) {
      void this.storage.deletePdf(pdfMeta.filename);
    }

    if (coverFilename) {
      void this.storage.deleteCover(coverFilename);
    }

    this.triggerRemoteDbSync();
    return result.changes > 0;
  }

  public getSetting(key: string): string | null {
    const row = this.db
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  public setSetting(key: string, value: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(key, value, now);
    this.triggerRemoteDbSync();
  }
}
