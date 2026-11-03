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
  unreadCount = 0,
  userAvatar,
  userName,
  onOpenUpload,
}) => {
  const containerBg =
    'bg-[#171B38]/95 border-slate-700/70 text-slate-300 shadow-2xl shadow-black/80';

  return (
    <nav
      aria-label="Navegação Principal Lumi"
      className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 flex justify-center pointer-events-none"
    >
      <div
        className={`pointer-events-auto w-full max-w-lg flex items-center justify-around p-1.5 rounded-full border backdrop-blur-2xl transition-all duration-300 ${containerBg}`}
      >
        {/* 1. Explorar */}
        <button
          onClick={() => onSelectTab('browse')}
          className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 py-2 px-3 sm:px-3.5 rounded-full text-[11px] font-outfit font-semibold transition-all duration-300 cursor-pointer ${
            currentTab === 'browse'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-[1.03]'
              : 'hover:text-emerald-300 hover:bg-white/5 opacity-85 hover:opacity-100'
          }`}
        >
          <Compass className="w-5 h-5 transition-transform duration-200" />
          <span className={`text-[10px] sm:text-xs tracking-tight ${currentTab === 'browse' ? 'font-bold' : ''}`}>
            Início
          </span>
        </button>

        {/* 2. Livros */}
        <button
          onClick={() => onSelectTab('books')}
          className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 py-2 px-3 sm:px-3.5 rounded-full text-[11px] font-outfit font-semibold transition-all duration-300 cursor-pointer ${
            currentTab === 'books'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-[1.03]'
              : 'hover:text-emerald-300 hover:bg-white/5 opacity-85 hover:opacity-100'
          }`}
        >
          <BookOpen className="w-5 h-5 transition-transform duration-200" />
          <span className={`text-[10px] sm:text-xs tracking-tight ${currentTab === 'books' ? 'font-bold' : ''}`}>
            Catálogo
          </span>
        </button>

        {/* 3. Minha Biblioteca */}
        <button
          onClick={() => onSelectTab('library')}
          className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 py-2 px-3 sm:px-3.5 rounded-full text-[11px] font-outfit font-semibold transition-all duration-300 cursor-pointer ${
            currentTab === 'library'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-[1.03]'
              : 'hover:text-emerald-300 hover:bg-white/5 opacity-85 hover:opacity-100'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Bookmark className="w-5 h-5 transition-transform duration-200" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[15px] h-3.5 px-1 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center border border-white dark:border-neutral-900 shadow-sm">
                {unreadCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] sm:text-xs tracking-tight ${currentTab === 'library' ? 'font-bold' : ''}`}>
            Salvos
          </span>
        </button>

        {/* 4. Botão Discreto: Adicionar (antes de Perfil) */}
        {onOpenUpload && (
          <button
            onClick={onOpenUpload}
            className="relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 py-2 px-2.5 sm:px-3 rounded-full text-[11px] font-outfit font-semibold transition-all duration-300 hover:text-emerald-300 hover:bg-white/5 opacity-85 hover:opacity-100 cursor-pointer text-current"
            title="Adicionar livro em PDF"
          >
            <PlusCircle className="w-5 h-5 text-emerald-400 transition-transform duration-200 hover:scale-110" />
            <span className="text-[10px] sm:text-xs tracking-tight font-medium">
              Adicionar
            </span>
          </button>
        )}

        {/* 5. Perfil */}
        <button
          onClick={() => onSelectTab('account')}
          className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 py-2 px-3 sm:px-3.5 rounded-full text-[11px] font-outfit font-semibold transition-all duration-300 cursor-pointer ${
            currentTab === 'account'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-[1.03]'
              : 'hover:text-emerald-300 hover:bg-white/5 opacity-85 hover:opacity-100'
          }`}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName || 'Perfil'}
              className="w-5 h-5 rounded-full object-cover border border-emerald-400"
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
