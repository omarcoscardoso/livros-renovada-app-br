import React from 'react';
import { ArrowUpDown, Filter, Grid3X3, List } from 'lucide-react';
import { LibrarialTheme, SortOption } from '../../types/librarial';

interface FloatingFilterBarProps {
  sortBy: SortOption;
  onChangeSort: (sort: SortOption) => void;
  viewMode: 'grid' | 'list';
  onChangeViewMode: (mode: 'grid' | 'list') => void;
  theme: LibrarialTheme;
  totalBooks: number;
}

export const FloatingFilterBar: React.FC<FloatingFilterBarProps> = ({
  sortBy,
  onChangeSort,
  viewMode,
  onChangeViewMode,
  theme,
  totalBooks,
}) => {
  const isDark = theme === 'dark' || theme === 'contrast';
  const isSepia = theme === 'sepia';

  const containerBg = isDark
    ? 'bg-[#18181B]/85 border-neutral-800 text-neutral-200 shadow-xl shadow-black/60'
    : isSepia
    ? 'bg-[#FBF0D9]/90 border-[#E8DCBF] text-[#5F4B32] shadow-xl shadow-amber-950/15'
    : 'bg-white/90 border-slate-200/90 text-slate-700 shadow-xl shadow-slate-900/10';

  const sortLabels: Record<SortOption, string> = {
    popular: 'Mais Lidos',
    recent: 'Recentes',
    title: 'Título A-Z',
    author: 'Autor',
    rating: 'Melhores Notas',
  };

  const handleNextSort = () => {
    const sequence: SortOption[] = ['popular', 'recent', 'title', 'rating'];
    const currentIdx = sequence.indexOf(sortBy);
    const nextSort = sequence[(currentIdx + 1) % sequence.length];
    onChangeSort(nextSort);
  };

  return (
    <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-1.5 p-1 rounded-full border backdrop-blur-md text-xs font-semibold transition-all ${containerBg}`}
      >
        {/* Sort Toggle Button */}
        <button
          onClick={handleNextSort}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title="Clique para alternar ordenação"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[#5C6BC0]" />
          <span>{sortLabels[sortBy] || 'Ordenar'}</span>
        </button>

        <span className="w-px h-4 bg-current opacity-20" />

        {/* View mode toggle */}
        <button
          onClick={() => onChangeViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title={`Alternar para visão em ${viewMode === 'grid' ? 'lista' : 'grade'}`}
        >
          {viewMode === 'grid' ? (
            <>
              <List className="w-3.5 h-3.5 text-[#5C6BC0]" />
              <span className="hidden sm:inline">Lista</span>
            </>
          ) : (
            <>
              <Grid3X3 className="w-3.5 h-3.5 text-[#5C6BC0]" />
              <span className="hidden sm:inline">Grade</span>
            </>
          )}
        </button>

        <span className="w-px h-4 bg-current opacity-20" />

        {/* Total counter badge */}
        <div className="px-2.5 py-1 text-[11px] font-mono opacity-70">
          {totalBooks} obras
        </div>
      </div>
    </div>
  );
};
