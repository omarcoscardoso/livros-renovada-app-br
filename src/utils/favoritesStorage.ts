const FAVORITES_STORAGE_KEY = 'ipr_library_favorites';

export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(bookId: string): string[] {
  try {
    const current = loadFavorites();
    const updated = current.includes(bookId)
      ? current.filter((id) => id !== bookId)
      : [...current, bookId];
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
