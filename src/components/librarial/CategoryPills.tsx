import React from 'react';
import { LibrarialTheme } from '../../types/librarial';

interface CategoryPillsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  theme: LibrarialTheme;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  theme,
}) => {
  const isDark = theme === 'dark' || theme === 'contrast';
  const isSepia = theme === 'sepia';

  const pillActive = 'bg-[#5C6BC0] text-white font-bold shadow-md shadow-[#5C6BC0]/25';

  const pillInactive = isDark
    ? 'bg-[#18181B] text-neutral-300 border border-neutral-800 hover:border-neutral-700'
    : isSepia
    ? 'bg-[#FBF0D9] text-[#5F4B32] border border-[#E8DCBF] hover:border-[#5C6BC0]/50'
    : 'bg-white text-slate-600 border border-slate-200/90 hover:border-slate-300';

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              isSelected ? pillActive : pillInactive
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};
