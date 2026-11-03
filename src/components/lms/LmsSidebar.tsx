import React from 'react';
import {
  Home,
  Bookmark,
  FolderArchive,
  Award,
  BarChart3,
  X,
  Sparkles,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ReaderTheme } from '../Navbar';

export type LmsNavTab = 'home' | 'bookmarks' | 'bookshelf' | 'certificates' | 'profile' | 'admin';

interface LmsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: LmsNavTab;
  onSelectTab: (tab: LmsNavTab) => void;
  certificatesCount?: number;
  theme?: ReaderTheme;
  onChangeTheme?: (theme: ReaderTheme) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const LmsSidebar: React.FC<LmsSidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  certificatesCount = 0,
  theme = 'dark',
  onChangeTheme,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { isAdmin } = useAuth();
  const isLight = theme === 'light';

  const navItems: { id: LmsNavTab; label: string; icon: any; badge?: number }[] = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'bookshelf', label: 'Biblioteca', icon: FolderArchive },
    { id: 'bookmarks', label: 'Favoritos', icon: Bookmark },
    {
      id: 'certificates',
      label: 'Meus Certificados',
      icon: Award,
      badge: certificatesCount > 0 ? certificatesCount : undefined,
    },
    { id: 'profile', label: 'Meu Perfil & Aluno', icon: UserIcon },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Painel de Gestão', icon: BarChart3 });
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col justify-between transition-all duration-300 shadow-2xl lg:translate-x-0 ${
          isCollapsed ? 'lg:w-20 w-64' : 'w-64'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isLight
            ? 'bg-white border-r border-slate-200 text-slate-900'
            : 'bg-[#121630] border-r border-slate-800/90 text-slate-100'
        }`}
      >
        <div>
          {/* Header & Unified Brand LUMI Treinamento */}
          <div
            className={`p-4 border-b flex items-center justify-between transition-colors ${
              isLight
                ? 'border-slate-200 bg-slate-50/80'
                : 'border-slate-800/80 bg-[#0F132C]/60'
            } ${isCollapsed ? 'lg:p-3 lg:justify-center' : 'sm:p-5'}`}
          >
            <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'lg:justify-center' : ''}`}>
              <div
                className="relative group shrink-0 cursor-pointer"
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Expandir menu' : undefined}
              >
                <img src="/assets/icon.svg" alt="Lumi Ícone" className="w-9 h-9 object-contain" />
              </div>

              {/* Title & Brand (hidden on collapsed desktop) */}
              <div className={`min-w-0 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                <div className="flex items-center gap-2">
                  <img src="/assets/logo_text.svg" alt="LUMI" className="h-4 w-auto object-contain" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <p
                    className={`text-[10px] font-medium font-sans truncate ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    Igreja Presbiteriana Renovada
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Collapse Toggle Button (apenas quando expandido) */}
            {onToggleCollapse && !isCollapsed && (
              <button
                onClick={onToggleCollapse}
                className={`hidden lg:flex p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                  isLight
                    ? 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                    : 'border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Recolher menu lateral"
                aria-label="Recolher menu lateral"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl lg:hidden cursor-pointer transition-colors shrink-0 ml-2 ${
                isLight
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              aria-label="Fechar Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className={`p-3 space-y-1.5 ${isCollapsed ? 'lg:px-2' : 'sm:p-3.5'}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  title={item.label}
                  aria-label={item.label}
                  className={`w-full flex items-center transition-all cursor-pointer rounded-xl text-xs font-outfit ${
                    isCollapsed
                      ? 'lg:justify-center lg:py-3 lg:px-0 justify-between px-3.5 py-2.5 font-semibold'
                      : 'justify-between px-3.5 py-2.5 font-semibold'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40 font-bold'
                      : isLight
                      ? 'text-slate-700 hover:text-blue-700 hover:bg-slate-100'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`flex items-center gap-3 relative ${isCollapsed ? 'lg:gap-0' : ''}`}>
                    <Icon
                      className={`w-4 h-4 ${
                        isActive
                          ? 'text-white'
                          : isLight
                          ? 'text-slate-500'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className={isCollapsed ? 'lg:hidden' : 'block'}>{item.label}</span>

                    {/* Dot Badge when collapsed on desktop */}
                    {isCollapsed && item.badge !== undefined && (
                      <span className="hidden lg:block absolute -top-1.5 -right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                    )}
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isCollapsed ? 'lg:hidden' : 'block'
                      } ${
                        isActive
                          ? 'bg-white text-blue-700'
                          : isLight
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer: Theme Toggle & Church Brand */}
        <div
          className={`p-3 border-t transition-colors ${
            isLight
              ? 'border-slate-200 bg-slate-50/80 text-slate-700'
              : 'border-slate-800/80 bg-[#0F1224]/40 text-slate-400'
          } ${isCollapsed ? 'lg:p-2 lg:space-y-2' : 'p-4 space-y-3'}`}
        >
          {/* Accessible Theme Switcher */}
          {onChangeTheme && (
            <div className="space-y-1.5">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block text-slate-500 ${
                  isCollapsed ? 'lg:hidden' : 'block'
                }`}
              >
                Acessibilidade • Tema
              </span>
              <div
                className={`p-1 rounded-2xl flex items-center gap-1 border transition-colors ${
                  isLight
                    ? 'bg-slate-200/80 border-slate-300'
                    : 'bg-[#171B38] border-slate-700/80'
                } ${isCollapsed ? 'lg:flex-col lg:p-1' : ''}`}
                role="radiogroup"
                aria-label="Escolher tema visual"
              >
                <button
                  type="button"
                  onClick={() => onChangeTheme('light')}
                  role="radio"
                  aria-checked={isLight}
                  title="Modo Claro"
                  aria-label="Mudar para Modo Claro"
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-outfit font-bold transition-all cursor-pointer ${
                    isCollapsed ? 'lg:w-full lg:p-2' : ''
                  } ${
                    isLight
                      ? 'bg-white text-slate-900 shadow-md border border-slate-200'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className={`w-3.5 h-3.5 ${isLight ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className={isCollapsed ? 'lg:hidden' : 'inline'}>Claro</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeTheme('dark')}
                  role="radio"
                  aria-checked={!isLight}
                  title="Modo Escuro"
                  aria-label="Mudar para Modo Escuro"
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-outfit font-bold transition-all cursor-pointer ${
                    isCollapsed ? 'lg:w-full lg:p-2' : ''
                  } ${
                    !isLight
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Moon className={`w-3.5 h-3.5 ${!isLight ? 'text-blue-200' : 'text-slate-500'}`} />
                  <span className={isCollapsed ? 'lg:hidden' : 'inline'}>Escuro</span>
                </button>
              </div>
            </div>
          )}

          {/* Expand Button when Collapsed */}
          {isCollapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`hidden lg:flex w-full items-center justify-center p-2 rounded-xl border transition-colors cursor-pointer ${
                isLight
                  ? 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  : 'border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          <div className={isCollapsed ? 'lg:hidden' : 'block'}>
            <div className="flex items-center justify-between text-[11px]">
              <span
                className={`font-outfit font-bold truncate ${
                  isLight ? 'text-slate-900' : 'text-slate-200'
                }`}
              >
                IPR Viamão
              </span>
              <span className="text-blue-500 font-mono text-[10px] shrink-0 font-bold">
                v2.0 LMS
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
              Igreja Presbiteriana Renovada • Glorificando a Deus, servindo a comunidade.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
