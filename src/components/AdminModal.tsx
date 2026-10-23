import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ShieldAlert,
  Users,
  BookOpen,
  KeyRound,
  Trash2,
  Edit3,
  RefreshCw,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  UserCheck,
  UserX,
  Sparkles,
} from 'lucide-react';
import { BookSummary } from '../data/bookTypes';
import { ReaderTheme } from './Navbar';
import { useAuth } from '../context/AuthContext';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: BookSummary[];
  onRefreshLibrary: () => void;
  onEditBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onReprocessBook: (bookId: string) => void;
  onOpenPdfForBook: (bookId: string) => void;
  theme: ReaderTheme;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'user';
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminStats {
  totalBooks: number;
  totalUsers: number;
  adminCount: number;
  hasGeminiKey: boolean;
  booksByStatus: {
    ready: number;
    processing: number;
    error: number;
  };
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  books,
  onRefreshLibrary,
  onEditBook,
  onDeleteBook,
  onReprocessBook,
  onOpenPdfForBook,
  theme,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'library' | 'users' | 'apikey'>('library');
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  // Gemini API key state
  const [apiKeyStatus, setApiKeyStatus] = useState<{ isConfigured: boolean; maskedKey: string | null }>({
    isConfigured: false,
    maskedKey: null,
  });
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [savingKey, setSavingKey] = useState<boolean>(false);
  const [keyFeedback, setKeyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const modalBg = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : isSepia
    ? 'bg-[#f7f3e8] border-[#e3dac7] text-[#2c2217]'
    : 'bg-white border-slate-200 text-slate-900';

  const subCardBg = isDark
    ? 'bg-slate-950/70 border-slate-800'
    : isSepia
    ? 'bg-[#ece4d0]/80 border-[#dccfb4]'
    : 'bg-slate-50 border-slate-200';

  const mutedText = isDark ? 'text-slate-400' : isSepia ? 'text-[#705e4d]' : 'text-slate-500';

  const fetchUsersAndStats = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const [usersRes, statsRes, keyRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
        fetch('/api/admin/api-key'),
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsersList(uData.users || []);
      }
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }
      if (keyRes.ok) {
        const kData = await keyRes.json();
        setApiKeyStatus(kData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados administrativos:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsersAndStats();
    }
  }, [isOpen, fetchUsersAndStats]);

  const handleToggleRole = async (targetUser: AdminUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    if (targetUser.id === user?.id && newRole !== 'admin') {
      alert('Você não pode revogar seu próprio papel de administrador.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(targetUser.id)}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        await fetchUsersAndStats();
      } else {
        const err = await res.json();
        alert(err.error || 'Falha ao alterar papel.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBlock = async (targetUser: AdminUser) => {
    const willBlock = !targetUser.isBlocked;
    if (targetUser.id === user?.id && willBlock) {
      alert('Você não pode bloquear sua própria conta.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja ${willBlock ? 'bloquear' : 'desbloquear'} ${targetUser.name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(targetUser.id)}/block`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: willBlock }),
      });
      if (res.ok) {
        await fetchUsersAndStats();
      } else {
        const err = await res.json();
        alert(err.error || 'Falha ao alterar bloqueio.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKey.trim()) return;

    setSavingKey(true);
    setKeyFeedback(null);

    try {
      const res = await fetch('/api/admin/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newApiKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setApiKeyStatus({ isConfigured: data.isConfigured, maskedKey: data.maskedKey });
        setNewApiKey('');
        setKeyFeedback({ type: 'success', message: 'Chave Gemini salva e validada com sucesso!' });
        onRefreshLibrary();
      } else {
        setKeyFeedback({ type: 'error', message: data.error || 'Chave inválida.' });
      }
    } catch (err: any) {
      setKeyFeedback({ type: 'error', message: err?.message || 'Erro ao conectar ao servidor.' });
    } finally {
      setSavingKey(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden ${modalBg}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/10 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-editorial">
                Painel Administrativo da Biblioteca
              </h2>
              <p className={`text-xs ${mutedText}`}>
                Gestão global do acervo, usuários e inteligência artificial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl border border-transparent hover:border-current/10 ${mutedText} hover:text-current transition-colors`}
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-black/10 dark:border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'library'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-current'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Biblioteca ({books.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-current'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuários ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('apikey')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'apikey'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-current'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Chave de API Gemini</span>
            {apiKeyStatus.isConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ativa" />
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: LIBRARY MANAGEMENT */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-4 rounded-2xl border ${subCardBg}`}>
                    <p className={`text-[11px] uppercase tracking-wider ${mutedText}`}>Total Livros</p>
                    <p className="text-2xl font-bold font-mono mt-1">{stats.totalBooks}</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${subCardBg}`}>
                    <p className={`text-[11px] uppercase tracking-wider ${mutedText}`}>Livros Prontos</p>
                    <p className="text-2xl font-bold font-mono text-emerald-500 mt-1">
                      {stats.booksByStatus.ready}
                    </p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${subCardBg}`}>
                    <p className={`text-[11px] uppercase tracking-wider ${mutedText}`}>Em Conversão</p>
                    <p className="text-2xl font-bold font-mono text-amber-500 mt-1">
                      {stats.booksByStatus.processing}
                    </p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${subCardBg}`}>
                    <p className={`text-[11px] uppercase tracking-wider ${mutedText}`}>Usuários Ativos</p>
                    <p className="text-2xl font-bold font-mono text-blue-500 mt-1">{stats.totalUsers}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Gerenciar Obras do Acervo
                </h3>
                <div className="divide-y divide-black/10 dark:divide-white/10 rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
                  {books.map((b) => {
                    const isBaseBook = b.id === 'cell-church-larry-stockstill';
                    return (
                      <div
                        key={b.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${subCardBg}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {b.coverImageUrl ? (
                            <img
                              src={b.coverImageUrl}
                              alt={b.titlePt}
                              className="w-12 h-16 object-cover rounded-lg border border-black/10 dark:border-white/10 shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-16 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-500">
                              <BookOpen className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm truncate">{b.titlePt}</h4>
                            <p className={`text-xs truncate ${mutedText}`}>
                              {b.author} • {b.originalYear} • {b.chapterCount} capítulos
                            </p>
                            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/15 text-amber-600 dark:text-amber-300">
                              {b.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {b.hasOriginalPdf && (
                            <button
                              onClick={() => onOpenPdfForBook(b.id)}
                              className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-rose-500 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Ver PDF Original"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">PDF</span>
                            </button>
                          )}

                          <button
                            onClick={() => onEditBook(b.id)}
                            className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            title="Editar Metadados e Capítulos"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Editar</span>
                          </button>

                          {b.hasOriginalPdf && (
                            <button
                              onClick={() => onReprocessBook(b.id)}
                              className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-amber-500 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Reprocessar com Gemini AI"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Reprocessar</span>
                            </button>
                          )}

                          <button
                            onClick={() => onDeleteBook(b.id)}
                            className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-rose-500/15 text-rose-500 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            title="Excluir livro da biblioteca"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Excluir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Usuários Autenticados com Google
                  </h3>
                  <p className={`text-xs ${mutedText}`}>
                    Gerencie papéis de acesso e permissões na biblioteca
                  </p>
                </div>
                <button
                  onClick={fetchUsersAndStats}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingUsers ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center p-8 text-amber-500 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs">Carregando usuários...</span>
                </div>
              ) : (
                <div className="divide-y divide-black/10 dark:divide-white/10 rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
                  {usersList.map((u) => {
                    const isSelf = u.id === user?.id;
                    const isAdmin = u.role === 'admin';

                    return (
                      <div
                        key={u.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${subCardBg}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {u.picture ? (
                            <img
                              src={u.picture}
                              alt={u.name}
                              className="w-10 h-10 rounded-full border border-black/10 dark:border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm truncate">{u.name}</h4>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-semibold">
                                  Você
                                </span>
                              )}
                              {isAdmin ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                  <Shield className="w-3 h-3" /> Admin
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-500/20 text-slate-400">
                                  Leitor
                                </span>
                              )}
                              {u.isBlocked && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-500">
                                  Bloqueado
                                </span>
                              )}
                            </div>
                            <p className={`text-xs truncate ${mutedText}`}>{u.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => handleToggleRole(u)}
                            disabled={isSelf}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isAdmin
                                ? 'border-amber-500/40 text-amber-500 hover:bg-amber-500/10'
                                : 'border-slate-400/40 text-slate-400 hover:bg-slate-400/10'
                            } disabled:opacity-40`}
                            title={isAdmin ? 'Rebaixar para Leitor' : 'Promover a Administrador'}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>{isAdmin ? 'Tornar Leitor' : 'Tornar Admin'}</span>
                          </button>

                          <button
                            onClick={() => handleToggleBlock(u)}
                            disabled={isSelf}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              u.isBlocked
                                ? 'border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10'
                                : 'border-rose-500/40 text-rose-500 hover:bg-rose-500/10'
                            } disabled:opacity-40`}
                            title={u.isBlocked ? 'Desbloquear conta' : 'Bloquear conta'}
                          >
                            {u.isBlocked ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Desbloquear</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Bloquear</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GEMINI API KEY MANAGEMENT */}
          {activeTab === 'apikey' && (
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <h3 className="text-base font-bold font-editorial">
                  Chave de API do Google Gemini AI
                </h3>
                <p className={`text-xs ${mutedText} leading-relaxed`}>
                  A chave do Gemini AI permite realizar a extração óptica (OCR) de livros em PDF digitalizados,
                  tradução fiel para o Português do Brasil, divisão automática de capítulos, geração de resumos executivos,
                  perguntas reflexivas e roteiros completos de reunião de célula.
                </p>
              </div>

              {/* Status Card */}
              <div className={`p-5 rounded-2xl border flex items-center justify-between ${subCardBg}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status Atual:</span>
                    {apiKeyStatus.isConfigured ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5" /> Configurada e Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3.5 h-3.5" /> Não Configurada
                      </span>
                    )}
                  </div>
                  {apiKeyStatus.maskedKey && (
                    <p className="font-mono text-xs text-slate-400">
                      Chave em uso: <span className="text-amber-400">{apiKeyStatus.maskedKey}</span>
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>

              {/* Form to update key */}
              <form onSubmit={handleSaveApiKey} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Atualizar Chave GEMINI_API_KEY
                  </label>
                  <input
                    type="password"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="Cole aqui a nova chave do Google AI Studio (AIza...)"
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-mono outline-none focus:border-amber-500 transition-colors ${
                      isDark ? 'bg-slate-950 border-slate-800' : isSepia ? 'bg-[#ece4d0] border-[#d8c7a7]' : 'bg-white border-slate-200'
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    A chave será armazenada de forma segura na tabela de configurações e persistida no banco do Cloud Run.
                  </p>
                </div>

                {keyFeedback && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      keyFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                    }`}
                  >
                    {keyFeedback.type === 'success' ? (
                      <Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{keyFeedback.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingKey || !newApiKey.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md"
                >
                  {savingKey ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validando e Salvando...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Salvar Nova Chave de API</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
