import React from 'react';
import { Compass, Headphones, Library, User } from 'lucide-react';
import { ReaderTheme } from './Navbar';

export type LibrarialNavTab = 'explore' | 'audiobooks' | 'library' | 'profile';

interface BottomNavBarProps {
  currentTab: LibrarialNavTab;
  onSelectTab: (tab: LibrarialNavTab) => void;
  theme: ReaderTheme;
  unreadCount?: number;
  userAvatar?: string | null;
  userName?: string | null;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
  theme,
  unreadCount = 0,
  userAvatar,
  userName,
}) => {
  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const containerBg = isDark
    ? 'bg-slate-900/85 border-slate-800/80 text-slate-300 shadow-2xl shadow-black/60'
    : isSepia
    ? 'bg-[#ede5d2]/90 border-[#ded2bb] text-[#423322] shadow-2xl shadow-amber-950/15'
    : 'bg-white/90 border-slate-200/90 text-slate-600 shadow-2xl shadow-slate-900/10';

  const navItems: { id: LibrarialNavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'explore',
      label: 'Explorar',
      icon: <Compass className="w-5 h-5 transition-transform duration-200" />,
    },
    {
      id: 'audiobooks',
      label: 'Audiolivros',
      icon: <Headphones className="w-5 h-5 transition-transform duration-200" />,
    },
    {
      id: 'library',
      label: 'Biblioteca',
      icon: <Library className="w-5 h-5 transition-transform duration-200" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: userAvatar ? (
        <img
          src={userAvatar}
          alt={userName || 'Perfil'}
          className="w-5 h-5 rounded-full object-cover border border-amber-500/50"
        />
      ) : (
        <User className="w-5 h-5 transition-transform duration-200" />
      ),
    },
  ];

  return (
    <nav
      aria-label="Navegação Principal"
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md px-2"
    >
      <div
        className={`relative flex items-center justify-around p-1.5 rounded-full border backdrop-blur-2xl transition-all duration-300 ${containerBg}`}
      >
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex items-center gap-2 py-2 px-3 sm:px-4 rounded-full text-xs font-semibold transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.03]'
                  : 'hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-900">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs tracking-tight ${isActive ? 'inline' : 'hidden sm:inline'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
