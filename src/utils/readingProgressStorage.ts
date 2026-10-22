const PROGRESS_MAP_KEY = 'ipr_library_read_chapters_map_v1';
const LAST_CHAPTER_MAP_KEY = 'ipr_library_last_chapter_map_v1';
const LEGACY_CELL_CHURCH_KEY = 'cell_church_read_chapters';
const DEFAULT_BOOK_ID = 'cell-church-larry-stockstill';

export type ReadChaptersMap = Record<string, string[]>;
export type LastChapterMap = Record<string, string>;

export function loadAllReadChaptersMap(): ReadChaptersMap {
  try {
    const raw = localStorage.getItem(PROGRESS_MAP_KEY);
    const map: ReadChaptersMap = raw ? JSON.parse(raw) : {};

    // Migrate or merge legacy key for the default book if present
    const legacyRaw = localStorage.getItem(LEGACY_CELL_CHURCH_KEY);
    if (legacyRaw) {
      const legacyArr = JSON.parse(legacyRaw);
      if (Array.isArray(legacyArr)) {
        const currentDefault = map[DEFAULT_BOOK_ID] || [];
        const merged = Array.from(new Set([...currentDefault, ...legacyArr]));
        map[DEFAULT_BOOK_ID] = merged;
      }
    }

    return map;
  } catch {
    return {};
  }
}

export function getBookReadChapters(bookId: string): string[] {
  const map = loadAllReadChaptersMap();
  return Array.isArray(map[bookId]) ? map[bookId] : [];
}

export function saveBookReadChapters(bookId: string, chapterIds: string[]): string[] {
  const uniqueIds = Array.from(new Set(chapterIds));
  try {
    const map = loadAllReadChaptersMap();
    map[bookId] = uniqueIds;
    localStorage.setItem(PROGRESS_MAP_KEY, JSON.stringify(map));

    // Also keep per-book key and legacy key in sync
    localStorage.setItem(`library_read_chapters_${bookId}`, JSON.stringify(uniqueIds));
    if (bookId === DEFAULT_BOOK_ID) {
      localStorage.setItem(LEGACY_CELL_CHURCH_KEY, JSON.stringify(uniqueIds));
    }
  } catch (e) {
    console.error('Erro ao salvar progresso de leitura no navegador:', e);
  }
  return uniqueIds;
}

export function toggleBookChapterRead(bookId: string, chapterId: string): string[] {
  const current = getBookReadChapters(bookId);
  const next = current.includes(chapterId)
    ? current.filter((id) => id !== chapterId)
    : [...current, chapterId];
  return saveBookReadChapters(bookId, next);
}

export function getBookLastVisitedChapter(bookId: string): string | null {
  try {
    const raw = localStorage.getItem(LAST_CHAPTER_MAP_KEY);
    if (!raw) return null;
    const map: LastChapterMap = JSON.parse(raw);
    return map[bookId] || null;
  } catch {
    return null;
  }
}

export function saveBookLastVisitedChapter(bookId: string, chapterId: string): void {
  try {
    const raw = localStorage.getItem(LAST_CHAPTER_MAP_KEY);
    const map: LastChapterMap = raw ? JSON.parse(raw) : {};
    map[bookId] = chapterId;
    localStorage.setItem(LAST_CHAPTER_MAP_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Erro ao salvar último capítulo visitado:', e);
  }
}
