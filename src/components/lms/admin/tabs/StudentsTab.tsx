import React, { useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Users,
  Check,
  Clock,
  UserCheck,
  Award,
  RotateCcw,
  Shield,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  BookOpen,
  Lock,
  Unlock,
  AlertTriangle,
  X,
  Pencil,
  Trash2,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Training, StudentEnrollment } from '../../../../types/training';
import { User } from '../../../../context/AuthContext';
import { ReaderTheme } from '../../../Navbar';

export interface StudentsTabProps {
  students: StudentEnrollment[];
  users: User[];
  currentUser?: User | null;
  trainings: Training[];
  studentSearch: string;
  setStudentSearch: (search: string) => void;
  studentTrainingFilter: string;
  setStudentTrainingFilter: (val: string) => void;
  studentStatusFilter: 'all' | 'in_progress' | 'completed';
  setStudentStatusFilter: (val: 'all' | 'in_progress' | 'completed') => void;
  isStudentsLoading: boolean;
  onRefreshStudents: () => void;
  onRefreshUsers?: () => void;
  onCompleteStudent: (enrollment: StudentEnrollment) => void;
  onResetStudent: (enrollment: StudentEnrollment) => void;
  onToggleUserRole: (targetUser: User) => void;
  onToggleUserBlock: (targetUser: User) => void;
  onDeleteUser: (targetUser: User) => void;
  onUpdateUser: (
    targetUser: User,
    data: { name: string; email: string; password?: string; role?: 'admin' | 'user' }
  ) => Promise<void>;
  theme?: ReaderTheme;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  users,
  currentUser,
  trainings,
  studentSearch,
  setStudentSearch,
  studentTrainingFilter,
  setStudentTrainingFilter,
  studentStatusFilter,
  setStudentStatusFilter,
  isStudentsLoading,
  onRefreshStudents,
  onRefreshUsers,
  onCompleteStudent,
  onResetStudent,
  onToggleUserRole,
  onToggleUserBlock,
  onDeleteUser,
  onUpdateUser,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  // Sub-view: 'users' (Todos os Usuários/Alunos) vs 'enrollments' (Matrículas por Curso)
  const [subView, setSubView] = useState<'users' | 'enrollments'>('users');

  // Filters for Registered Users sub-view
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Confirmation Modal State for Role Change
  const [roleChangeTarget, setRoleChangeTarget] = useState<User | null>(null);

  // Delete User Confirmation State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Edit User / Change Password Modal State
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'user';
  }>({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Filtered Enrollments
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (studentStatusFilter === 'completed' && !s.isCompleted) return false;
      if (studentStatusFilter === 'in_progress' && s.isCompleted) return false;
      return true;
    });
  }, [students, studentStatusFilter]);

  // Filtered Registered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userRoleFilter === 'admin' && u.role !== 'admin') return false;
      if (userRoleFilter === 'user' && u.role !== 'user') return false;
      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      return true;
    });
  }, [users, userRoleFilter, userSearchQuery]);

  const handleConfirmRoleChange = () => {
    if (!roleChangeTarget) return;
    onToggleUserRole(roleChangeTarget);
    setRoleChangeTarget(null);
  };

  const handleOpenEdit = (user: User) => {
    setUserToEdit(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'user',
    });
    setShowPassword(false);
    setEditError(null);
  };

  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setEditError('Nome e E-mail são obrigatórios.');
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      setEditError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    try {
      await onUpdateUser(userToEdit, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        password: editForm.password.trim() || undefined,
      });
      setUserToEdit(null);
    } catch (err: any) {
      setEditError(err.message || 'Falha ao atualizar usuário.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    onDeleteUser(userToDelete);
    setUserToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Sub-view Navigation Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          className={`inline-flex p-1 rounded-2xl border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <button
            onClick={() => setSubView('users')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              subView === 'users'
                ? isLight
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Alunos & Usuários Cadastrados</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                subView === 'users'
                  ? isLight
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-blue-800/80 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setSubView('enrollments')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              subView === 'enrollments'
                ? isLight
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Matrículas & Progresso em Cursos</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                subView === 'enrollments'
                  ? isLight
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-blue-800/80 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {students.length}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              onRefreshStudents();
              if (onRefreshUsers) onRefreshUsers();
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isStudentsLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar Dados</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUB-VIEW 1: ALUNOS & USUÁRIOS CADASTRADOS (GESTÃO DE ACESSO)  */}
      {/* ============================================================== */}
      {subView === 'users' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Filters Bar */}
          <div
            className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
            }`}
          >
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar usuário por nome ou email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-900/80 border-slate-700 text-slate-100 placeholder-slate-500'
                }`}
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <span className="text-xs text-slate-400">Papel:</span>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-slate-900/80 border-slate-700 text-slate-100'
                }`}
              >
                <option value="all">Todos os Papéis ({users.length})</option>
                <option value="admin">Administradores ({users.filter((u) => u.role === 'admin').length})</option>
                <option value="user">Alunos / Membros ({users.filter((u) => u.role === 'user').length})</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div
            className={`rounded-2xl border overflow-hidden ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
            }`}
          >
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-semibold">
                  Membros Cadastrados na Plataforma ({filteredUsers.length})
                </h2>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Promova alunos a Administrador, altere senhas, edite dados ou remova cadastros indevidos.
              </p>
            </div>

            {filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr
                      className={`text-[11px] font-bold uppercase tracking-wider border-b ${
                        isLight
                          ? 'bg-slate-50 text-slate-500 border-slate-200'
                          : 'bg-slate-900/60 text-slate-400 border-slate-700/50'
                      }`}
                    >
                      <th className="py-3 px-4">Aluno / Usuário</th>
                      <th className="py-3 px-4">Papel & Acesso</th>
                      <th className="py-3 px-4">Engajamento em Cursos</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações & Gestão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {filteredUsers.map((u) => {
                      const isAdmin = u.role === 'admin';
                      const isSelf = currentUser?.id === u.id;
                      const formattedDate = u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—';

                      return (
                        <tr
                          key={u.id}
                          className={`transition-colors ${
                            isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/30'
                          }`}
                        >
                          {/* User Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              {u.picture ? (
                                <img
                                  src={u.picture}
                                  alt={u.name}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-600"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs">
                                  {u.name ? u.name.substring(0, 2).toUpperCase() : 'US'}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-sm flex items-center space-x-2">
                                  <span>{u.name || 'Sem Nome'}</span>
                                  {isSelf && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono">
                                      Você
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400">{u.email}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">Cadastrado em {formattedDate}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            {isAdmin ? (
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Administrador</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>Aluno / Membro</span>
                              </span>
                            )}
                          </td>

                          {/* LMS Engagement */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`px-2 py-0.5 rounded-lg border font-medium ${
                                  isLight
                                    ? 'bg-slate-100 border-slate-200 text-slate-700'
                                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                                }`}
                                title="Cursos em que este usuário iniciou aulas"
                              >
                                {u.enrollmentsCount || 0} matriculados
                              </span>
                              {(u.completedCount || 0) > 0 && (
                                <span className="px-2 py-0.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium">
                                  {u.completedCount} concluídos
                                </span>
                              )}
                              {(u.certificatesCount || 0) > 0 && (
                                <span className="px-2 py-0.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 font-medium flex items-center space-x-1">
                                  <Award className="w-3.5 h-3.5" />
                                  <span>{u.certificatesCount} cert.</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Account Status */}
                          <td className="py-3.5 px-4">
                            {u.isBlocked ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Bloqueado</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <Check className="w-3.5 h-3.5" />
                                <span>Ativo</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Promotion / Demotion Button */}
                              {isAdmin ? (
                                <button
                                  onClick={() => setRoleChangeTarget(u)}
                                  disabled={isSelf}
                                  title={
                                    isSelf
                                      ? 'Você não pode revogar seu próprio papel de Administrador.'
                                      : 'Revogar papel de Administrador'
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1 transition-all ${
                                    isSelf
                                      ? 'opacity-40 cursor-not-allowed border-slate-700 text-slate-500'
                                      : isLight
                                      ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer'
                                      : 'bg-rose-950/30 border-rose-800 text-rose-300 hover:bg-rose-900/50 cursor-pointer'
                                  }`}
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Revogar</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setRoleChangeTarget(u)}
                                  title="Promover este aluno a Administrador da plataforma"
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white transition-all flex items-center space-x-1 shadow-sm shadow-purple-600/30 cursor-pointer"
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Promover</span>
                                </button>
                              )}

                              {/* Edit Profile & Password Button */}
                              <button
                                onClick={() => handleOpenEdit(u)}
                                title="Editar dados e redefinir senha do usuário"
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  isLight
                                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {/* Block / Unblock Toggle */}
                              {!isSelf && (
                                <button
                                  onClick={() => onToggleUserBlock(u)}
                                  title={u.isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário'}
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    u.isBlocked
                                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30'
                                      : isLight
                                      ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {u.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                </button>
                              )}

                              {/* Delete User Button */}
                              {!isSelf && (
                                <button
                                  onClick={() => setUserToDelete(u)}
                                  title="Excluir usuário cadastrado por engano"
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    isLight
                                      ? 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 hover:text-rose-700'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900/50'
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <h3 className="text-base font-semibold">Nenhum usuário encontrado</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                  Ajuste a busca ou os filtros de papel para localizar os alunos cadastrados.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 2: MATRÍCULAS & PROGRESSO EM CURSOS                   */}
      {/* ============================================================== */}
      {subView === 'enrollments' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Filter & Search Bar */}
          <div
            className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
            }`}
          >
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por aluno, email, curso..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-900/80 border-slate-700 text-slate-100 placeholder-slate-500'
                }`}
              />
            </div>

            {/* Course & Status Dropdowns */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Curso:</span>
                <select
                  value={studentTrainingFilter}
                  onChange={(e) => setStudentTrainingFilter(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs border font-medium focus:outline-none cursor-pointer ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-slate-900/80 border-slate-700 text-slate-100'
                  }`}
                >
                  <option value="all">Todos os Cursos</option>
                  {trainings.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Status:</span>
                <select
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs border font-medium focus:outline-none cursor-pointer ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-slate-900/80 border-slate-700 text-slate-100'
                  }`}
                >
                  <option value="all">Todos</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="completed">Concluídos</option>
                </select>
              </div>

              <button
                onClick={onRefreshStudents}
                className={`p-2 rounded-xl border text-xs font-medium flex items-center space-x-1 cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isStudentsLoading ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>
          </div>

          {/* Students List Table */}
          <div
            className={`rounded-2xl border overflow-hidden ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
            }`}
          >
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>Alunos Matriculados ({filteredStudents.length} registros)</span>
              </h2>
            </div>

            {isStudentsLoading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 text-blue-500" />
                <p className="text-sm">Carregando matrículas e histórico de progresso...</p>
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr
                      className={`text-[11px] font-bold uppercase tracking-wider border-b ${
                        isLight
                          ? 'bg-slate-50 text-slate-500 border-slate-200'
                          : 'bg-slate-900/60 text-slate-400 border-slate-700/50'
                      }`}
                    >
                      <th className="py-3 px-4">Aluno</th>
                      <th className="py-3 px-4">Treinamento</th>
                      <th className="py-3 px-4">Progresso</th>
                      <th className="py-3 px-4">Status & Certificado</th>
                      <th className="py-3 px-4 text-right">Ações de Gestão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {filteredStudents.map((enrollment) => {
                      const isDone = enrollment.isCompleted;
                      return (
                        <tr
                          key={`${enrollment.userId}-${enrollment.trainingId}`}
                          className={`transition-colors ${
                            isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/30'
                          }`}
                        >
                          {/* Student Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              {enrollment.userPicture ? (
                                <img
                                  src={enrollment.userPicture}
                                  alt={enrollment.userName}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-600"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs">
                                  {enrollment.userName ? enrollment.userName.substring(0, 2).toUpperCase() : 'AL'}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-sm">{enrollment.userName || 'Aluno sem nome'}</div>
                                <div className="text-xs text-slate-400">{enrollment.userEmail || '—'}</div>
                              </div>
                            </div>
                          </td>

                          {/* Training Title */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-sm">{enrollment.trainingTitle}</div>
                            <span className="text-xs text-slate-400">{enrollment.trainingCategory}</span>
                          </td>

                          {/* Progress */}
                          <td className="py-3.5 px-4">
                            <div className="w-40 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold">{enrollment.progressPercent}%</span>
                                <span className="text-slate-400">
                                  {enrollment.completedLessonsCount}/{enrollment.totalLessonsCount} aulas
                                </span>
                              </div>
                              <div className="h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    isDone
                                      ? 'bg-emerald-500'
                                      : enrollment.progressPercent > 0
                                      ? 'bg-blue-500'
                                      : 'bg-slate-500'
                                  }`}
                                  style={{ width: `${Math.min(100, enrollment.progressPercent)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Status & Certificate */}
                          <td className="py-3.5 px-4">
                            {isDone ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <Check className="w-3 h-3" />
                                  <span>Concluído</span>
                                </span>
                                {enrollment.certificateCode && (
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    Cód: #{enrollment.certificateCode}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                <Clock className="w-3 h-3" />
                                <span>Em Andamento</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {!isDone ? (
                                <button
                                  onClick={() => onCompleteStudent(enrollment)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center space-x-1 shadow-sm cursor-pointer"
                                  title="Aprovar manualmente a conclusão deste curso"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Concluir</span>
                                </button>
                              ) : (
                                <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1 mr-2">
                                  <Award className="w-3.5 h-3.5" />
                                  <span>Aprovado</span>
                                </span>
                              )}

                              <button
                                onClick={() => onResetStudent(enrollment)}
                                className={`p-1.5 rounded-lg border text-slate-400 hover:text-rose-400 transition-colors cursor-pointer ${
                                  isLight
                                    ? 'bg-slate-100 border-slate-200 hover:bg-rose-50'
                                    : 'bg-slate-900 border-slate-800 hover:bg-rose-950/30'
                                }`}
                                title="Reiniciar progresso do aluno neste curso"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <GraduationCap className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <h3 className="text-base font-semibold">Nenhuma matrícula encontrada</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                  Assim que os membros acessarem e iniciarem as videoaulas, seus históricos aparecerão aqui.
                  Para conferir todos os membros cadastrados, clique na aba <strong>"Alunos & Usuários Cadastrados"</strong> acima.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDITAR CADASTRO & REDEFINIR SENHA                        */}
      {/* ============================================================== */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#171B38] border-slate-800 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Editar Cadastro do Usuário</h3>
                  <p className="text-xs text-slate-400">Atualize dados cadastrais ou redefina a senha de acesso.</p>
                </div>
              </div>
              <button
                onClick={() => setUserToEdit(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-slate-900 border-slate-700 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Endereço de E-mail</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-slate-900 border-slate-700 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Papel na Plataforma</label>
                <select
                  value={editForm.role}
                  disabled={currentUser?.id === userToEdit.id}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value as any }))}
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none cursor-pointer ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-slate-900 border-slate-700 text-slate-100'
                  } ${currentUser?.id === userToEdit.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value="user">Aluno / Membro Regular</option>
                  <option value="admin">Administrador Geral</option>
                </select>
                {currentUser?.id === userToEdit.id && (
                  <p className="text-[11px] text-slate-500 mt-1">Você não pode alterar seu próprio papel de admin.</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Redefinir Senha (Opcional)</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Mínimo 6 dígitos</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Deixe em branco para manter a senha atual"
                    value={editForm.password}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                    className={`w-full pl-3 pr-10 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setUserToEdit(null)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    isLight
                      ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-600/30 flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE USUÁRIO                           */}
      {/* ============================================================== */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#171B38] border-slate-800 text-slate-100'
            }`}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto border bg-rose-500/20 text-rose-400 border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-lg text-rose-400">Excluir Cadastro Definitivamente?</h3>
              <p className="text-xs text-slate-400 mt-1.5">
                Esta ação é irreversível. O cadastro do usuário, bem como seu histórico de aulas, matrículas e certificados emitidos, serão removidos do sistema.
              </p>

              <div
                className={`mt-4 p-3 rounded-xl border text-left text-xs space-y-1 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-700/50'
                }`}
              >
                <div>
                  <span className="text-slate-400">Nome:</span>{' '}
                  <span className="font-semibold">{userToDelete.name}</span>
                </div>
                <div>
                  <span className="text-slate-400">E-mail:</span>{' '}
                  <span className="font-semibold">{userToDelete.email}</span>
                </div>
                <div>
                  <span className="text-slate-400">Papel:</span>{' '}
                  <span className="font-semibold">{userToDelete.role === 'admin' ? 'Administrador' : 'Aluno'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isLight
                    ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CONFIRMATION MODAL: PROMOVER OU REVOGAR ADMIN                  */}
      {/* ============================================================== */}
      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#171B38] border-slate-800 text-slate-100'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${
                roleChangeTarget.role === 'admin'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
              }`}
            >
              {roleChangeTarget.role === 'admin' ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>

            <div className="text-center">
              <h3 className="font-bold text-lg">
                {roleChangeTarget.role === 'admin'
                  ? 'Revogar Permissão de Administrador?'
                  : 'Promover Aluno a Administrador?'}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5">
                {roleChangeTarget.role === 'admin'
                  ? 'O usuário deixará de ter acesso ao Painel Administrativo e passará a ser um aluno regular.'
                  : 'O usuário terá acesso completo ao Painel Admin: poderá criar/editar cursos, gerenciar outros alunos e emitir certificados.'}
              </p>

              <div
                className={`mt-4 p-3 rounded-xl border text-left text-xs space-y-1 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-700/50'
                }`}
              >
                <div>
                  <span className="text-slate-400">Nome:</span>{' '}
                  <span className="font-semibold">{roleChangeTarget.name}</span>
                </div>
                <div>
                  <span className="text-slate-400">E-mail:</span>{' '}
                  <span className="font-semibold">{roleChangeTarget.email}</span>
                </div>
                <div>
                  <span className="text-slate-400">Papel Atual:</span>{' '}
                  <span className="font-semibold">
                    {roleChangeTarget.role === 'admin' ? 'Administrador' : 'Aluno / Membro'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Novo Papel:</span>{' '}
                  <span
                    className={`font-bold ${
                      roleChangeTarget.role === 'admin' ? 'text-amber-400' : 'text-purple-400'
                    }`}
                  >
                    {roleChangeTarget.role === 'admin' ? 'Aluno / Membro' : 'Administrador'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRoleChangeTarget(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isLight
                    ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-md cursor-pointer ${
                  roleChangeTarget.role === 'admin'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                }`}
              >
                {roleChangeTarget.role === 'admin' ? 'Confirmar Revogação' : 'Confirmar Promoção'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
