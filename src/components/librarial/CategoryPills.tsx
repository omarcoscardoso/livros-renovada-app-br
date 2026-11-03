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

  const pillActive =
    'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold font-outfit shadow-lg shadow-emerald-500/25 border border-emerald-400/40 scale-105';

  const pillInactive =
    'bg-[#171B38] text-slate-300 border border-slate-700/60 hover:border-slate-500 hover:text-white backdrop-blur-md font-outfit font-medium';

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs whitespace-nowrap transition-all duration-200 cursor-pointer ${
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
