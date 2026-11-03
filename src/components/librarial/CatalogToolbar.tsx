import React from 'react';
import { ArrowUpDown, Grid3X3, List } from 'lucide-react';
import { LibrarialTheme, SortOption } from '../../types/librarial';

interface CatalogToolbarProps {
  sortBy: SortOption;
  onChangeSort: (sort: SortOption) => void;
  viewMode: 'grid' | 'list';
  onChangeViewMode: (mode: 'grid' | 'list') => void;
  theme: LibrarialTheme;
  totalBooks: number;
}

export const CatalogToolbar: React.FC<CatalogToolbarProps> = ({
  sortBy,
  onChangeSort,
  viewMode,
  onChangeViewMode,
  theme,
  totalBooks,
}) => {
  const isLight = theme === 'light';
  const containerBg = isLight
    ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
    : 'bg-[#171B38] border-slate-700/60 text-slate-300 backdrop-blur-xl shadow-lg shadow-black/40';

  const pillBg = isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-[#212642] border-slate-700/80 text-slate-200';

  const buttonActive =
    'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold font-outfit shadow-md shadow-emerald-500/25';
  const buttonInactive = isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-current opacity-70 hover:opacity-100';

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: 'popular', label: 'Mais Lidos' },
    { id: 'recent', label: 'Recentes' },
    { id: 'title', label: 'Título A-Z' },
    { id: 'rating', label: 'Melhores Notas' },
  ];

  return (
    <div
      className={`w-full flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl border transition-all ${containerBg}`}
    >
      {/* Left side: Sort and View Mode */}
      <div className="flex items-center flex-wrap gap-2">
        {/* Sort dropdown */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold font-outfit ${pillBg}`}>
          <ArrowUpDown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="hidden sm:inline text-xs opacity-70">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => onChangeSort(e.target.value as SortOption)}
            className="bg-transparent border-none text-current font-semibold text-xs outline-none cursor-pointer pr-1"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id} className="text-slate-900 bg-white dark:text-slate-100 dark:bg-[#212642]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* View mode toggle (Grid / List) */}
        <div className={`flex items-center p-1 rounded-xl border ${pillBg}`}>
          <button
            type="button"
            onClick={() => onChangeViewMode('grid')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold font-outfit transition-all cursor-pointer ${
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
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold font-outfit transition-all cursor-pointer ${
              viewMode === 'list' ? buttonActive : buttonInactive
            }`}
            title="Visualização em Lista"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Lista</span>
          </button>
        </div>
      </div>

      {/* Right side: Counter badge */}
      <div className="text-xs font-mono font-medium opacity-75 pr-1">
        <span>Total: </span>
        <strong className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{totalBooks}</strong>
      </div>
    </div>
  );
};

