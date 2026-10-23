import React from 'react';
import { Compass, BookOpen, Headphones, Bookmark, User } from 'lucide-react';
import { LibrarialNavTab, LibrarialTheme } from '../../types/librarial';

interface BottomNavigationProps {
  currentTab: LibrarialNavTab;
  onSelectTab: (tab: LibrarialNavTab) => void;
  theme: LibrarialTheme;
  unreadCount?: number;
  userAvatar?: string | null;
  userName?: string | null;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onSelectTab,
  theme,
  unreadCount = 0,
  userAvatar,
  userName,
}) => {
  const isDark = theme === 'dark' || theme === 'contrast';
  const isSepia = theme === 'sepia';

  const containerBg = isDark
    ? 'bg-[#18181B]/90 border-neutral-800 text-neutral-400 shadow-2xl shadow-black/80'
    : isSepia
    ? 'bg-[#F5ECD7]/90 border-[#E8DCBF] text-[#705E4D] shadow-2xl shadow-amber-950/15'
    : 'bg-white/90 border-slate-200/90 text-slate-500 shadow-2xl shadow-slate-900/10';

  const navItems: { id: LibrarialNavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'browse',
      label: 'Explorar',
      icon: <Compass className="w-5 h-5 transition-transform duration-200" />,
    },
    {
      id: 'books',
      label: 'Livros',
      icon: <BookOpen className="w-5 h-5 transition-transform duration-200" />,
    },
    {
      id: 'library',
      label: 'Biblioteca',
      icon: <Bookmark className="w-5 h-5 transition-transform duration-200" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'account',
      label: 'Perfil',
      icon: userAvatar ? (
        <img
          src={userAvatar}
          alt={userName || 'Perfil'}
          className="w-5 h-5 rounded-full object-cover border border-[#5C6BC0]"
        />
      ) : (
        <User className="w-5 h-5 transition-transform duration-200" />
      ),
    },
  ];

  return (
    <nav
      aria-label="Navegação Principal Librarial"
      className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 flex justify-center pointer-events-none"
    >
      <div
        className={`pointer-events-auto w-full max-w-lg flex items-center justify-around p-1.5 rounded-full border backdrop-blur-md transition-all duration-300 ${containerBg}`}
      >
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 py-2 px-2.5 sm:px-3 rounded-full text-[11px] font-semibold transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-[#5C6BC0] text-white shadow-md shadow-[#5C6BC0]/30 scale-[1.02]'
                  : 'hover:text-[#5C6BC0] hover:bg-black/5 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-[15px] h-3.5 px-1 rounded-full bg-[#FF3B30] text-white text-[9px] font-bold flex items-center justify-center border border-white dark:border-neutral-900">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] sm:text-xs tracking-tight ${isActive ? 'inline font-bold' : 'inline'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
