import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  GraduationCap,
  Video,
  Users,
  Award,
  BookOpen,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  Training,
  TrainingLesson,
  LessonReferenceLink,
  TrainingCategory,
  TrainingReportSummary,
  VideoType,
  StudentEnrollment,
  UserCertificate,
} from '../../types/training';
import { BookSummary } from '../../data/bookTypes';
import { ReaderTheme } from '../Navbar';
import { useAuth, User } from '../../context/AuthContext';

// Extracted Sub-Tabs (SRP)
import { MetricsTab } from './admin/tabs/MetricsTab';
import { CoursesTab } from './admin/tabs/CoursesTab';
import { LessonsTab } from './admin/tabs/LessonsTab';
import { StudentsTab } from './admin/tabs/StudentsTab';
import { CertificatesTab } from './admin/tabs/CertificatesTab';
import { MinistriesTab } from './admin/tabs/MinistriesTab';
import { LibraryTab } from './admin/tabs/LibraryTab';

// Extracted Modals (SRP)
import { TrainingModal } from './admin/modals/TrainingModal';
import { LessonModal } from './admin/modals/LessonModal';
import { LessonPreviewModal } from './admin/modals/LessonPreviewModal';
import { CategoryModal } from './admin/modals/CategoryModal';
import { ConfirmActionModal } from './admin/modals/ConfirmActionModal';
import { IssueCertificateModal } from './admin/modals/IssueCertificateModal';
import { RevokeCertificateModal } from './admin/modals/RevokeCertificateModal';
import { CertificatePreviewModal } from './admin/modals/CertificatePreviewModal';

export type LmsAdminTab =
  | 'metrics'
  | 'trainings'
  | 'lessons'
  | 'students'
  | 'certificates'
  | 'ministries'
  | 'library';

export interface LmsAdminDashboardProps {
  books: BookSummary[];
  onRefreshData: () => void;
  onBackToLms: () => void;
  onEditBook?: (bookId: string) => void;
  onDeleteBook?: (bookId: string) => void;
  onReprocessBook?: (bookId: string) => void;
  onOpenPdfForBook?: (bookId: string) => void;
  onOpenUpload?: () => void;
  initialTab?: LmsAdminTab;
  theme?: ReaderTheme;
}

export const LmsAdminDashboard: React.FC<LmsAdminDashboardProps> = ({
  books,
  onRefreshData,
  onBackToLms,
  onEditBook,
  onDeleteBook,
  onReprocessBook,
  onOpenPdfForBook,
  onOpenUpload,
  initialTab = 'metrics',
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<LmsAdminTab>(initialTab);

  // Synchronize initialTab if changed by parent
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Base Data State
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [report, setReport] = useState<TrainingReportSummary | null>(null);
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Course Filtering & Search
  const [publicationFilter, setPublicationFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [courseSearch, setCourseSearch] = useState('');

  // Lessons State
  const [selectedTrainingForLessons, setSelectedTrainingForLessons] = useState<string>('');
  const [lessonsList, setLessonsList] = useState<TrainingLesson[]>([]);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<TrainingLesson | null>(null);
  const [previewingLesson, setPreviewingLesson] = useState<TrainingLesson | null>(null);
  const [lessonForm, setLessonForm] = useState<{
    title: string;
    description: string;
    videoType: VideoType;
    videoUrl: string;
    durationMinutes: number;
    orderIndex: number;
    referenceLinks: LessonReferenceLink[];
  }>({
    title: '',
    description: '',
    videoType: 'youtube' as VideoType,
    videoUrl: '',
    durationMinutes: 20,
    orderIndex: 1,
    referenceLinks: [],
  });

  // Students State
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [studentTrainingFilter, setStudentTrainingFilter] = useState<string>('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [completingStudent, setCompletingStudent] = useState<StudentEnrollment | null>(null);
  const [resettingStudent, setResettingStudent] = useState<StudentEnrollment | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Certificates State
  const [certificates, setCertificates] = useState<UserCertificate[]>([]);
  const [certSearch, setCertSearch] = useState('');
  const [certTrainingFilter, setCertTrainingFilter] = useState('all');
  const [isCertificatesLoading, setIsCertificatesLoading] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [showIssueCertModal, setShowIssueCertModal] = useState(false);
  const [issueCertForm, setIssueCertForm] = useState({
    userId: '',
    trainingId: '',
    userName: '',
    workloadHours: 5,
  });
  const [isIssuingCert, setIsIssuingCert] = useState(false);
  const [revokingCert, setRevokingCert] = useState<UserCertificate | null>(null);
  const [revocationResetProgress, setRevocationResetProgress] = useState(true);
  const [isRevokingCert, setIsRevokingCert] = useState(false);
  const [previewingCert, setPreviewingCert] = useState<UserCertificate | null>(null);

  // Category Management State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TrainingCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', prerequisiteCategoryId: '' });
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  // Library State
  const [bookSearch, setBookSearch] = useState('');
  const [bookStatusFilter, setBookStatusFilter] = useState<'all' | 'ready' | 'processing' | 'error' | 'featured'>('all');
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);
  const [reprocessingBookId, setReprocessingBookId] = useState<string | null>(null);

  // Training Modal Form State
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [trainingForm, setTrainingForm] = useState<{
    title: string;
    description: string;
    category: string;
    targetAudience: string;
    coverImageUrl: string;
    bannerImageUrl: string;
    isRequired: boolean;
    isFeatured: boolean;
    isCategoryFeatured: boolean;
    isPublished: boolean;
    workloadHours: number;
    autoWorkload?: boolean;
    complementaryBookId: string;
    prerequisiteTrainingId: string;
  }>({
    title: '',
    description: '',
    category: 'Liderança',
    targetAudience: 'Líderes e Voluntários',
    coverImageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
    bannerImageUrl: '',
    isRequired: true,
    isFeatured: true,
    isCategoryFeatured: false,
    isPublished: false,
    workloadHours: 3,
    autoWorkload: true,
    complementaryBookId: '',
    prerequisiteTrainingId: '',
  });

  // Fetch Handlers
  const fetchTrainings = useCallback(async () => {
    try {
      const res = await fetch('/api/trainings?includeDrafts=true', { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao carregar cursos');
      const data = await res.json();
      const list: Training[] = data.trainings || [];
      setTrainings(list);
      if (!selectedTrainingForLessons && list.length > 0) {
        setSelectedTrainingForLessons(list[0].id);
        if (list[0].lessons?.length) {
          setLessonsList(list[0].lessons);
        }
      } else if (selectedTrainingForLessons) {
        const current = list.find((t) => t.id === selectedTrainingForLessons);
        if (current?.lessons?.length && lessonsList.length === 0) {
          setLessonsList(current.lessons);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedTrainingForLessons, lessonsList.length]);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch('/api/trainings/admin/report', { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao carregar relatório');
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setIsStudentsLoading(true);
    try {
      const params = new URLSearchParams();
      if (studentTrainingFilter && studentTrainingFilter !== 'all') {
        params.append('trainingId', studentTrainingFilter);
      }
      if (studentSearch.trim()) {
        params.append('search', studentSearch.trim());
      }
      const res = await fetch(`/api/trainings/admin/students?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao buscar alunos');
      const data = await res.json();
      setStudents(data.enrollments || data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsStudentsLoading(false);
    }
  }, [studentTrainingFilter, studentSearch]);

  const fetchLessons = useCallback(async (trainingId: string) => {
    if (!trainingId) return;
    try {
      const res = await fetch(`/api/trainings/${trainingId}/lessons`, { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao carregar aulas');
      const data = await res.json();
      setLessonsList(data.lessons || []);
    } catch (err) {
      console.error(err);
      const local = trainings.find((t) => t.id === trainingId);
      if (local?.lessons?.length) {
        setLessonsList(local.lessons);
      }
    }
  }, [trainings]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/trainings/categories', { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao buscar categorias');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchCertificates = useCallback(async () => {
    setIsCertificatesLoading(true);
    try {
      const params = new URLSearchParams();
      if (certSearch.trim()) params.append('search', certSearch.trim());
      if (certTrainingFilter && certTrainingFilter !== 'all') params.append('trainingId', certTrainingFilter);

      const res = await fetch(`/api/trainings/admin/certificates?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao buscar certificados');
      const data = await res.json();
      setCertificates(data.certificates || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao carregar certificados', 'error');
    } finally {
      setIsCertificatesLoading(false);
    }
  }, [certSearch, certTrainingFilter]);

  const fetchRegisteredUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setRegisteredUsers(data.users || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTrainings();
    fetchReport();
    fetchCategories();
  }, [fetchTrainings, fetchReport, fetchCategories]);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
      fetchRegisteredUsers();
    }
  }, [activeTab, fetchStudents, fetchRegisteredUsers]);

  useEffect(() => {
    if (activeTab === 'certificates') {
      fetchCertificates();
      fetchRegisteredUsers();
    }
  }, [activeTab, fetchCertificates, fetchRegisteredUsers]);

  useEffect(() => {
    if (selectedTrainingForLessons) {
      fetchLessons(selectedTrainingForLessons);
    }
  }, [selectedTrainingForLessons, fetchLessons]);

  // Actions: Publications
  const handleTogglePublish = async (training: Training) => {
    const nextStatus = !training.isPublished;
    try {
      const res = await fetch(`/api/trainings/${training.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...training,
          isPublished: nextStatus,
        }),
      });
      if (!res.ok) throw new Error('Falha ao alterar status de publicação');
      showToast(
        nextStatus
          ? `Curso "${training.title}" publicado com sucesso! Agora visível para todos os membros.`
          : `Curso "${training.title}" movido para Rascunho. Oculto para membros comuns.`,
        'success'
      );
      fetchTrainings();
      fetchReport();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar publicação', 'error');
    }
  };

  const handleToggleCategoryFeatured = async (training: Training) => {
    const nextVal = !training.isCategoryFeatured;
    try {
      const res = await fetch(`/api/trainings/${training.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCategoryFeatured: nextVal }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar destaque na categoria');
      showToast(nextVal ? 'Curso destacado na categoria!' : 'Destaque de categoria removido.');
      fetchTrainings();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar destaque na categoria', 'error');
    }
  };

  const handleToggleHomeFeatured = async (training: Training) => {
    const nextVal = !training.isFeatured;
    try {
      const res = await fetch(`/api/trainings/${training.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: nextVal }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar destaque na página inicial');
      showToast(nextVal ? 'Curso destacado na página inicial!' : 'Destaque na página inicial removido.');
      fetchTrainings();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar destaque na página inicial', 'error');
    }
  };

  // Actions: Categories
  const handleOpenCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', prerequisiteCategoryId: '' });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (cat: TrainingCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
      prerequisiteCategoryId: cat.prerequisiteCategoryId || '',
    });
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', prerequisiteCategoryId: '' });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = categoryForm.name.trim();
    if (!trimmed) {
      showToast('O nome da categoria é obrigatório.', 'error');
      return;
    }
    setIsCategoryLoading(true);
    try {
      const url = editingCategory
        ? `/api/trainings/categories/${editingCategory.id}`
        : '/api/trainings/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          description: categoryForm.description.trim(),
          prerequisiteCategoryId: categoryForm.prerequisiteCategoryId || null,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar categoria');
      }

      showToast(editingCategory ? 'Categoria atualizada com sucesso!' : 'Categoria cadastrada com sucesso!');
      setCategoryForm({ name: '', description: '', prerequisiteCategoryId: '' });
      setEditingCategory(null);
      fetchCategories();
      fetchTrainings();
      fetchReport();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar categoria', 'error');
    } finally {
      setIsCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (cat: TrainingCategory) => {
    if (!window.confirm(`Tem certeza que deseja excluir a categoria "${cat.name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/trainings/categories/${cat.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir categoria');
      }

      showToast(`Categoria "${cat.name}" excluída.`);
      if (editingCategory?.id === cat.id) {
        setEditingCategory(null);
        setCategoryForm({ name: '', description: '', prerequisiteCategoryId: '' });
      }
      fetchCategories();
      fetchTrainings();
      fetchReport();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir categoria', 'error');
    }
  };

  // Actions: Trainings
  const handleOpenCreateTraining = () => {
    setEditingTraining(null);
    setTrainingForm({
      title: '',
      description: '',
      category: categories[0]?.name || 'Liderança',
      targetAudience: 'Líderes e Voluntários',
      coverImageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
      bannerImageUrl: '',
      isRequired: true,
      isFeatured: true,
      isCategoryFeatured: false,
      isPublished: false,
      workloadHours: 3,
      autoWorkload: true,
      complementaryBookId: '',
      prerequisiteTrainingId: '',
    });
    setShowTrainingModal(true);
  };

  const handleOpenEditTraining = (training: Training) => {
    setEditingTraining(training);
    setTrainingForm({
      title: training.title,
      description: training.description,
      category: training.category,
      targetAudience: training.targetAudience,
      coverImageUrl: training.coverImageUrl,
      bannerImageUrl: training.bannerImageUrl || '',
      isRequired: training.isRequired,
      isFeatured: training.isFeatured,
      isCategoryFeatured: Boolean(training.isCategoryFeatured),
      isPublished: training.isPublished,
      workloadHours: training.workloadHours,
      autoWorkload: training.autoWorkload !== undefined ? training.autoWorkload : true,
      complementaryBookId: training.complementaryBookId || '',
      prerequisiteTrainingId: training.prerequisiteTrainingId || '',
    });
    setShowTrainingModal(true);
  };

  const handleSaveTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const url = editingTraining ? `/api/trainings/${editingTraining.id}` : '/api/trainings';
      const method = editingTraining ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trainingForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar curso');
      setShowTrainingModal(false);
      showToast(editingTraining ? 'Curso atualizado com sucesso!' : 'Curso criado com sucesso!');
      fetchTrainings();
      fetchReport();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTraining = async (id: string, title: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o curso "${title}" e todas as suas aulas?`)) return;
    try {
      const res = await fetch(`/api/trainings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir curso');
      showToast(`Curso "${title}" excluído.`);
      fetchTrainings();
      fetchReport();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir', 'error');
    }
  };

  // Actions: Lessons
  const handleOpenCreateLesson = () => {
    setEditingLesson(null);
    setLessonForm({
      title: '',
      description: '',
      videoType: 'youtube',
      videoUrl: '',
      durationMinutes: 20,
      orderIndex: lessonsList.length + 1,
      referenceLinks: [],
    });
    setShowLessonModal(true);
  };

  const handleOpenEditLesson = (lesson: TrainingLesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      videoType: lesson.videoType,
      videoUrl: lesson.videoUrl,
      durationMinutes: lesson.durationMinutes,
      orderIndex: lesson.orderIndex,
      referenceLinks: lesson.referenceLinks ? [...lesson.referenceLinks] : [],
    });
    setShowLessonModal(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainingForLessons) return;
    setIsLoading(true);
    try {
      const url = editingLesson
        ? `/api/trainings/${selectedTrainingForLessons}/lessons/${editingLesson.id}`
        : `/api/trainings/${selectedTrainingForLessons}/lessons`;
      const method = editingLesson ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonForm),
      });

      if (!res.ok) throw new Error('Falha ao salvar aula');
      setShowLessonModal(false);
      showToast(editingLesson ? 'Aula atualizada com sucesso!' : 'Aula adicionada com sucesso!');
      fetchLessons(selectedTrainingForLessons);
      fetchTrainings();
      fetchReport();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar aula', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string, title: string) => {
    if (!window.confirm(`Excluir aula "${title}"?`)) return;
    try {
      const res = await fetch(`/api/trainings/${selectedTrainingForLessons}/lessons/${lessonId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao excluir aula');
      showToast(`Aula "${title}" excluída.`);
      fetchLessons(selectedTrainingForLessons);
      fetchTrainings();
      fetchReport();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir aula', 'error');
    }
  };

  // Actions: Students
  const handleConfirmCompleteStudent = async () => {
    if (!completingStudent) return;
    setActionInProgress(true);
    try {
      const res = await fetch(
        `/api/trainings/admin/students/${encodeURIComponent(completingStudent.userId)}/trainings/${encodeURIComponent(
          completingStudent.trainingId
        )}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminName: 'Aprovação Pastoral LUMI' }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao aprovar curso para o aluno');
      }
      const data = await res.json();
      showToast(
        `Curso concluído com sucesso para ${completingStudent.userName}! Certificado #${data.certificate?.validationCode || ''} emitido.`
      );
      setCompletingStudent(null);
      fetchStudents();
      fetchReport();
    } catch (err: any) {
      showToast(err.message || 'Erro ao aprovar conclusão', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleConfirmResetStudent = async () => {
    if (!resettingStudent) return;
    setActionInProgress(true);
    try {
      const res = await fetch(
        `/api/trainings/admin/students/${encodeURIComponent(resettingStudent.userId)}/trainings/${encodeURIComponent(
          resettingStudent.trainingId
        )}/progress`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao reiniciar progresso');
      }
      showToast(`Progresso de ${resettingStudent.userName} reiniciado com sucesso.`);
      setResettingStudent(null);
      fetchStudents();
      fetchReport();
    } catch (err: any) {
      showToast(err.message || 'Erro ao reiniciar progresso', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Actions: User Role & Status (Promotion to Admin)
  const handleToggleUserRole = async (targetUser: User) => {
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao atualizar papel do usuário');
      }
      showToast(
        nextRole === 'admin'
          ? `Usuário ${targetUser.name} promovido a Administrador!`
          : `Permissão de administrador revogada para ${targetUser.name}.`
      );
      fetchRegisteredUsers();
      fetchReport();
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar papel', 'error');
    }
  };

  const handleToggleUserBlock = async (targetUser: User) => {
    const nextBlocked = !targetUser.isBlocked;
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/block`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isBlocked: nextBlocked }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao atualizar status do usuário');
      }
      showToast(
        nextBlocked
          ? `Usuário ${targetUser.name} bloqueado.`
          : `Usuário ${targetUser.name} desbloqueado.`
      );
      fetchRegisteredUsers();
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar status', 'error');
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao excluir usuário');
      }
      showToast(`Usuário ${targetUser.name} removido com sucesso.`);
      fetchRegisteredUsers();
      fetchStudents();
      fetchReport();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir usuário', 'error');
    }
  };

  const handleUpdateUser = async (
    targetUser: User,
    data: { name: string; email: string; password?: string; role?: 'admin' | 'user' }
  ) => {
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao atualizar cadastro');
      }
      showToast(`Cadastro de ${data.name} atualizado com sucesso!`);
      fetchRegisteredUsers();
      fetchStudents();
      fetchReport();
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar usuário', 'error');
      throw err;
    }
  };

  // Actions: Certificates
  const handleOpenIssueModal = () => {
    fetchRegisteredUsers();
    const defaultTraining = trainings[0];
    setIssueCertForm({
      userId: registeredUsers[0]?.id || '',
      trainingId: defaultTraining?.id || '',
      userName: '',
      workloadHours: defaultTraining?.workloadHours || 5,
    });
    setShowIssueCertModal(true);
  };

  const handleIssueCertificateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueCertForm.userId || !issueCertForm.trainingId) {
      showToast('Selecione o aluno e o treinamento.', 'error');
      return;
    }
    setIsIssuingCert(true);
    try {
      const res = await fetch('/api/trainings/admin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issueCertForm),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao emitir certificado');
      }
      showToast('Certificado oficial fornecido e registrado com sucesso!', 'success');
      setShowIssueCertModal(false);
      fetchCertificates();
      fetchReport();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao emitir certificado', 'error');
    } finally {
      setIsIssuingCert(false);
    }
  };

  const handleRevokeCertificateSubmit = async () => {
    if (!revokingCert) return;
    setIsRevokingCert(true);
    try {
      const res = await fetch(
        `/api/trainings/admin/certificates/${revokingCert.id}?resetProgress=${revocationResetProgress}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao revogar certificado');
      }
      showToast(
        revocationResetProgress
          ? `Certificado ${revokingCert.validationCode} revogado e progresso do aluno redefinido.`
          : `Certificado ${revokingCert.validationCode} revogado com sucesso.`,
        'success'
      );
      setRevokingCert(null);
      fetchCertificates();
      fetchReport();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao revogar certificado', 'error');
    } finally {
      setIsRevokingCert(false);
    }
  };

  // Actions: Library
  const handleToggleBookFeatured = async (bookId: string, currentFeatured: boolean) => {
    if (togglingFeaturedId) return;
    setTogglingFeaturedId(bookId);
    try {
      const res = await fetch(`/api/admin/books/${encodeURIComponent(bookId)}/featured`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !currentFeatured }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar destaque');
      showToast(!currentFeatured ? 'Obra adicionada aos destaques!' : 'Obra removida dos destaques.');
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar destaque', 'error');
    } finally {
      setTogglingFeaturedId(null);
    }
  };

  const handleExecuteReprocess = async (bookId: string) => {
    if (reprocessingBookId) return;
    setReprocessingBookId(bookId);
    try {
      if (onReprocessBook) {
        onReprocessBook(bookId);
      } else {
        await fetch(`/api/books/${encodeURIComponent(bookId)}/reprocess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }
      showToast('Reprocessamento com IA Gemini iniciado.');
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Falha ao reprocessar livro', 'error');
    } finally {
      setReprocessingBookId(null);
    }
  };

  return (
    <div className={`space-y-6 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 transition-all transform animate-in slide-in-from-bottom-5 ${
            notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/50">
        <div>
          <button
            onClick={onBackToLms}
            className={`text-xs font-semibold uppercase tracking-wider mb-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
              isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
            }`}
          >
            <span>&larr; Voltar para LUMI</span>
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight">Painel Geral de Gestão LUMI</h1>
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider ${
                isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}
            >
              Administrador
            </span>
          </div>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Controle integrado de cursos, aulas, alunos matriculados e acervo digital da biblioteca.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center space-x-2">
          {activeTab === 'trainings' && (
            <>
              <button
                onClick={handleOpenCategoryModal}
                className={`flex items-center space-x-2 px-3.5 py-2 border font-medium rounded-xl text-sm transition-all cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
                title="Cadastrar e gerenciar categorias de ministério"
              >
                <Tag className="w-4 h-4 text-blue-500" />
                <span>Categorias ({categories.length})</span>
              </button>
              <button
                onClick={handleOpenCreateTraining}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Curso</span>
              </button>
            </>
          )}

          {activeTab === 'lessons' && selectedTrainingForLessons && (
            <button
              onClick={handleOpenCreateLesson}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Aula</span>
            </button>
          )}

          {activeTab === 'library' && onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Enviar Livro</span>
            </button>
          )}

          {activeTab === 'certificates' && (
            <button
              onClick={handleOpenIssueModal}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium rounded-xl text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Fornecer Certificado</span>
            </button>
          )}

          <button
            onClick={() => {
              fetchTrainings();
              fetchReport();
              fetchCategories();
              if (activeTab === 'students') fetchStudents();
              if (activeTab === 'certificates') fetchCertificates();
              onRefreshData();
            }}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Atualizar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex items-center space-x-1 border-b border-slate-700/50 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'metrics'
              ? isLight
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-blue-500 text-blue-400 font-semibold'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Métricas & Gráficos</span>
        </button>

        <button
          onClick={() => setActiveTab('trainings')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'trainings'
              ? isLight
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-blue-500 text-blue-400 font-semibold'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Cursos ({trainings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lessons')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'lessons'
              ? isLight
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-blue-500 text-blue-400 font-semibold'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Aulas & Vídeos</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'students'
              ? isLight
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-blue-500 text-blue-400 font-semibold'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gerenciar Alunos</span>
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'certificates'
              ? isLight
                ? 'border-amber-600 text-amber-600 font-semibold'
                : 'border-amber-500 text-amber-400 font-semibold'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Certificados ({certificates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ministries')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ministries'
              ? isLight
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-blue-500 text-blue-400 font-semibold'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Categorias ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'library'
              ? isLight
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-blue-500 text-blue-400 font-semibold'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Biblioteca Digital ({books.length})</span>
        </button>
      </div>

      {/* Tabs View Renderer */}
      {activeTab === 'metrics' && (
        <MetricsTab
          report={report}
          trainings={trainings}
          students={students}
          booksCount={books.length}
          theme={theme}
        />
      )}

      {activeTab === 'trainings' && (
        <CoursesTab
          trainings={trainings}
          courseSearch={courseSearch}
          setCourseSearch={setCourseSearch}
          publicationFilter={publicationFilter}
          setPublicationFilter={setPublicationFilter}
          onTogglePublish={handleTogglePublish}
          onToggleCategoryFeatured={handleToggleCategoryFeatured}
          onToggleHomeFeatured={handleToggleHomeFeatured}
          onOpenEditTraining={handleOpenEditTraining}
          onDeleteTraining={handleDeleteTraining}
          onManageLessons={(trainingId, lessons) => {
            setSelectedTrainingForLessons(trainingId);
            if (lessons?.length) {
              setLessonsList(lessons);
            }
            setActiveTab('lessons');
          }}
          onManageStudents={(trainingId) => {
            setStudentTrainingFilter(trainingId);
            setActiveTab('students');
          }}
          theme={theme}
        />
      )}

      {activeTab === 'lessons' && (
        <LessonsTab
          trainings={trainings}
          selectedTrainingForLessons={selectedTrainingForLessons}
          onSelectTraining={(id) => {
            setSelectedTrainingForLessons(id);
            const selected = trainings.find((t) => t.id === id);
            if (selected?.lessons?.length) {
              setLessonsList(selected.lessons);
            }
          }}
          lessonsList={lessonsList}
          onOpenCreateLesson={handleOpenCreateLesson}
          onOpenEditLesson={handleOpenEditLesson}
          onDeleteLesson={handleDeleteLesson}
          onPreviewLesson={(lesson) => setPreviewingLesson(lesson)}
          theme={theme}
        />
      )}

      {activeTab === 'students' && (
        <StudentsTab
          students={students}
          users={registeredUsers}
          currentUser={currentUser}
          trainings={trainings}
          studentSearch={studentSearch}
          setStudentSearch={setStudentSearch}
          studentTrainingFilter={studentTrainingFilter}
          setStudentTrainingFilter={setStudentTrainingFilter}
          studentStatusFilter={studentStatusFilter}
          setStudentStatusFilter={setStudentStatusFilter}
          isStudentsLoading={isStudentsLoading}
          onRefreshStudents={fetchStudents}
          onRefreshUsers={fetchRegisteredUsers}
          onCompleteStudent={(enrollment) => setCompletingStudent(enrollment)}
          onResetStudent={(enrollment) => setResettingStudent(enrollment)}
          onToggleUserRole={handleToggleUserRole}
          onToggleUserBlock={handleToggleUserBlock}
          onDeleteUser={handleDeleteUser}
          onUpdateUser={handleUpdateUser}
          theme={theme}
        />
      )}

      {activeTab === 'certificates' && (
        <CertificatesTab
          certificates={certificates}
          trainings={trainings}
          certSearch={certSearch}
          setCertSearch={setCertSearch}
          certTrainingFilter={certTrainingFilter}
          setCertTrainingFilter={setCertTrainingFilter}
          isCertificatesLoading={isCertificatesLoading}
          onOpenIssueModal={handleOpenIssueModal}
          onPreviewCert={(cert) => setPreviewingCert(cert)}
          onRevokeCert={(cert) => {
            setRevokingCert(cert);
            setRevocationResetProgress(true);
          }}
          theme={theme}
        />
      )}

      {activeTab === 'ministries' && (
        <MinistriesTab
          categories={categories}
          editingCategory={editingCategory}
          categoryForm={categoryForm}
          setCategoryForm={setCategoryForm}
          onCancelEditCategory={handleCancelEditCategory}
          onEditCategory={handleEditCategory}
          onSaveCategory={handleSaveCategory}
          onDeleteCategory={handleDeleteCategory}
          isCategoryLoading={isCategoryLoading}
          theme={theme}
        />
      )}

      {activeTab === 'library' && (
        <LibraryTab
          books={books}
          bookSearch={bookSearch}
          setBookSearch={setBookSearch}
          bookStatusFilter={bookStatusFilter}
          setBookStatusFilter={setBookStatusFilter}
          togglingFeaturedId={togglingFeaturedId}
          reprocessingBookId={reprocessingBookId}
          onToggleBookFeatured={handleToggleBookFeatured}
          onExecuteReprocess={handleExecuteReprocess}
          onOpenUpload={onOpenUpload}
          onOpenPdfForBook={onOpenPdfForBook}
          onEditBook={onEditBook}
          onDeleteBook={onDeleteBook}
          theme={theme}
        />
      )}

      {/* Modals */}
      <TrainingModal
        isOpen={showTrainingModal}
        onClose={() => setShowTrainingModal(false)}
        editingTraining={editingTraining}
        trainingForm={trainingForm}
        setTrainingForm={setTrainingForm}
        onSaveTraining={handleSaveTraining}
        isLoading={isLoading}
        categories={categories}
        trainings={trainings}
        books={books}
        onOpenCategoryModal={handleOpenCategoryModal}
        theme={theme}
      />

      <LessonModal
        isOpen={showLessonModal}
        onClose={() => setShowLessonModal(false)}
        editingLesson={editingLesson}
        lessonForm={lessonForm}
        setLessonForm={setLessonForm}
        onSaveLesson={handleSaveLesson}
        isLoading={isLoading}
        theme={theme}
      />

      <LessonPreviewModal
        lesson={previewingLesson}
        onClose={() => setPreviewingLesson(null)}
        trainingTitle={trainings.find((t) => t.id === selectedTrainingForLessons)?.title}
        theme={theme}
      />

      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
          setCategoryForm({ name: '', description: '', prerequisiteCategoryId: '' });
        }}
        categories={categories}
        editingCategory={editingCategory}
        categoryForm={categoryForm}
        setCategoryForm={setCategoryForm}
        onCancelEditCategory={handleCancelEditCategory}
        onEditCategory={handleEditCategory}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
        isCategoryLoading={isCategoryLoading}
        theme={theme}
      />

      <ConfirmActionModal
        completingStudent={completingStudent}
        onCancelComplete={() => setCompletingStudent(null)}
        onConfirmComplete={handleConfirmCompleteStudent}
        resettingStudent={resettingStudent}
        onCancelReset={() => setResettingStudent(null)}
        onConfirmReset={handleConfirmResetStudent}
        actionInProgress={actionInProgress}
        theme={theme}
      />

      <IssueCertificateModal
        isOpen={showIssueCertModal}
        onClose={() => setShowIssueCertModal(false)}
        registeredUsers={registeredUsers}
        trainings={trainings}
        issueCertForm={issueCertForm}
        setIssueCertForm={setIssueCertForm}
        onIssueCertificateSubmit={handleIssueCertificateSubmit}
        isIssuingCert={isIssuingCert}
        theme={theme}
      />

      <RevokeCertificateModal
        revokingCert={revokingCert}
        onClose={() => setRevokingCert(null)}
        revocationResetProgress={revocationResetProgress}
        setRevocationResetProgress={setRevocationResetProgress}
        onRevokeSubmit={handleRevokeCertificateSubmit}
        isRevokingCert={isRevokingCert}
        theme={theme}
      />

      <CertificatePreviewModal
        certificate={previewingCert}
        onClose={() => setPreviewingCert(null)}
        theme={theme}
      />
    </div>
  );
};
