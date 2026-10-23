import React from 'react';
import { Compass, BookOpen, Bookmark, User, PlusCircle } from 'lucide-react';
import { LibrarialNavTab, LibrarialTheme } from '../../types/librarial';

interface BottomNavigationProps {
  currentTab: LibrarialNavTab;
  onSelectTab: (tab: LibrarialNavTab) => void;
  theme: LibrarialTheme;
  unreadCount?: number;
  userAvatar?: string | null;
  userName?: string | null;
  onOpenUpload?: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onSelectTab,
  theme,
  unreadCount = 0,
  userAvatar,
  userName,
  onOpenUpload,
}) => {
  const isDark = theme === 'dark' || theme === 'contrast';
  const isSepia = theme === 'sepia';

  const containerBg = isDark
    ? 'bg-[#18181B]/90 border-neutral-800 text-neutral-400 shadow-2xl shadow-black/80'
    : isSepia
    ? 'bg-[#F5ECD7]/90 border-[#E8DCBF] text-[#705E4D] shadow-2xl shadow-amber-950/15'
    : 'bg-white/90 border-slate-200/90 text-slate-500 shadow-2xl shadow-slate-900/10';

  return (
    <nav
      aria-label="Navegação Principal Lumi"
      className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 flex justify-center pointer-events-none"
    >
      <div
        className={`pointer-events-auto w-full max-w-lg flex items-center justify-around p-1.5 rounded-full border backdrop-blur-md transition-all duration-300 ${containerBg}`}
      >
        {/* 1. Explorar */}
        <button
          onClick={() => onSelectTab('browse')}
          className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 py-2 px-2.5 sm:px-3 rounded-full text-[11px] font-semibold transition-all duration-300 cursor-pointer ${
            currentTab === 'browse'
              ? 'bg-[#5C6BC0] text-white shadow-md shadow-[#5C6BC0]/30 scale-[1.02]'
              : 'hover:text-[#5C6BC0] hover:bg-black/5 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
          }`}
        >
          <Compass className="w-5 h-5 transition-transform duration-200" />
          <span className={`text-[10px] sm:text-xs tracking-tight ${currentTab === 'browse' ? 'font-bold' : ''}`}>
            Explorar
          </span>
        </button>

        {/* 2. Livros */}
        <button
          onClick={() => onSelectTab('books')}
          className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 py-2 px-2.5 sm:px-3 rounded-full text-[11px] font-semibold transition-all duration-300 cursor-pointer ${
            currentTab === 'books'
              ? 'bg-[#5C6BC0] text-white shadow-md shadow-[#5C6BC0]/30 scale-[1.02]'
              : 'hover:text-[#5C6BC0] hover:bg-black/5 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
          }`}
        >
          <BookOpen className="w-5 h-5 transition-transform duration-200" />
          <span className={`text-[10px] sm:text-xs tracking-tight ${currentTab === 'books' ? 'font-bold' : ''}`}>
            Livros
          </span>
        </button>

        {/* 3. Minha Biblioteca */}
        <button
          onClick={() => onSelectTab('library')}
          className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 py-2 px-2.5 sm:px-3 rounded-full text-[11px] font-semibold transition-all duration-300 cursor-pointer ${
            currentTab === 'library'
              ? 'bg-[#5C6BC0] text-white shadow-md shadow-[#5C6BC0]/30 scale-[1.02]'
              : 'hover:text-[#5C6BC0] hover:bg-black/5 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Bookmark className="w-5 h-5 transition-transform duration-200" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[15px] h-3.5 px-1 rounded-full bg-[#FF3B30] text-white text-[9px] font-bold flex items-center justify-center border border-white dark:border-neutral-900">
                {unreadCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] sm:text-xs tracking-tight ${currentTab === 'library' ? 'font-bold' : ''}`}>
            Biblioteca
          </span>
        </button>

        {/* 4. Botão Discreto: Adicionar (antes de Perfil) */}
        {onOpenUpload && (
          <button
            onClick={onOpenUpload}
            className="relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 py-2 px-2.5 sm:px-3 rounded-full text-[11px] font-semibold transition-all duration-300 hover:text-[#5C6BC0] hover:bg-black/5 dark:hover:bg-white/5 opacity-85 hover:opacity-100 cursor-pointer text-current"
            title="Adicionar livro em PDF"
          >
            <PlusCircle className="w-5 h-5 text-[#5C6BC0] transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[10px] sm:text-xs tracking-tight font-medium">
              Adicionar
            </span>
          </button>
        )}

        {/* 5. Perfil */}
        <button
          onClick={() => onSelectTab('account')}
          className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 py-2 px-2.5 sm:px-3 rounded-full text-[11px] font-semibold transition-all duration-300 cursor-pointer ${
            currentTab === 'account'
              ? 'bg-[#5C6BC0] text-white shadow-md shadow-[#5C6BC0]/30 scale-[1.02]'
              : 'hover:text-[#5C6BC0] hover:bg-black/5 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
          }`}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName || 'Perfil'}
              className="w-5 h-5 rounded-full object-cover border border-[#5C6BC0]"
            />
          ) : (
            <User className="w-5 h-5 transition-transform duration-200" />
          )}
          <span className={`text-[10px] sm:text-xs tracking-tight ${currentTab === 'account' ? 'font-bold' : ''}`}>
            Perfil
          </span>
        </button>
      </div>
    </nav>
  );
};
