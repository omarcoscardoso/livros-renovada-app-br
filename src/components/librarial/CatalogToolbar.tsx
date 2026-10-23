import React from 'react';
import { ArrowUpDown, Grid3X3, List, Upload } from 'lucide-react';
import { LibrarialTheme, SortOption } from '../../types/librarial';

interface CatalogToolbarProps {
  sortBy: SortOption;
  onChangeSort: (sort: SortOption) => void;
  viewMode: 'grid' | 'list';
  onChangeViewMode: (mode: 'grid' | 'list') => void;
  theme: LibrarialTheme;
  totalBooks: number;
  onOpenUpload?: () => void;
}

export const CatalogToolbar: React.FC<CatalogToolbarProps> = ({
  sortBy,
  onChangeSort,
  viewMode,
  onChangeViewMode,
  theme,
  totalBooks,
  onOpenUpload,
}) => {
  const isDark = theme === 'dark' || theme === 'contrast';
  const isSepia = theme === 'sepia';

  const containerBg = isDark
    ? 'bg-[#18181B] border-neutral-800 text-neutral-300'
    : isSepia
    ? 'bg-[#F2E8D2] border-[#DFD4BD] text-[#5F4B32]'
    : 'bg-slate-100 border-slate-200 text-slate-700';

  const buttonActive = 'bg-[#5C6BC0] text-white shadow-sm';
  const buttonInactive = 'hover:bg-black/5 dark:hover:bg-white/10 text-current opacity-80 hover:opacity-100';

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: 'popular', label: 'Mais Lidos' },
    { id: 'recent', label: 'Recentes' },
    { id: 'title', label: 'Título A-Z' },
    { id: 'rating', label: 'Melhores Notas' },
  ];

  return (
    <div
      className={`w-full flex flex-wrap items-center justify-between gap-3 p-2 sm:p-2.5 rounded-2xl border transition-all ${containerBg}`}
    >
      {/* Left side: Sort and View Mode */}
      <div className="flex items-center flex-wrap gap-2">
        {/* Sort dropdown */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 text-xs font-semibold">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#5C6BC0] shrink-0" />
          <span className="hidden sm:inline text-xs opacity-70">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => onChangeSort(e.target.value as SortOption)}
            className="bg-transparent border-none text-current font-semibold text-xs outline-none cursor-pointer pr-1"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id} className="text-slate-900 dark:text-neutral-100 dark:bg-neutral-900">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* View mode toggle (Grid / List) */}
        <div className="flex items-center p-1 rounded-xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={() => onChangeViewMode('grid')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'grid' ? buttonActive : buttonInactive
            }`}
            title="Visualização em Grade"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Grade</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('list')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'list' ? buttonActive : buttonInactive
            }`}
            title="Visualização em Lista"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Lista</span>
          </button>
        </div>

        {/* Total count */}
        <span className="text-xs font-mono font-medium px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 opacity-75">
          {totalBooks} {totalBooks === 1 ? 'obra' : 'obras'}
        </span>
      </div>

      {/* Right side: Action Button */}
      {onOpenUpload && (
        <button
          type="button"
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5C6BC0] hover:bg-[#4D5AB5] text-white text-xs font-bold transition-all shadow-sm cursor-pointer ml-auto"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Adicionar PDF</span>
        </button>
      )}
    </div>
  );
};
