import React, { useMemo } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  Clock,
  Video,
  Users,
  Edit2,
  Trash2,
  GraduationCap,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Training } from '../../../../types/training';
import { ReaderTheme } from '../../../Navbar';
import { formatWorkload } from '../../../../utils/workloadFormat';

export interface CoursesTabProps {
  trainings: Training[];
  courseSearch: string;
  setCourseSearch: (search: string) => void;
  publicationFilter: 'all' | 'published' | 'draft';
  setPublicationFilter: (filter: 'all' | 'published' | 'draft') => void;
  onTogglePublish: (training: Training) => void;
  onToggleCategoryFeatured?: (training: Training) => void;
  onToggleHomeFeatured?: (training: Training) => void;
  onOpenEditTraining: (training: Training) => void;
  onDeleteTraining: (id: string, title: string) => void;
  onManageLessons: (trainingId: string, lessons?: any[]) => void;
  onManageStudents: (trainingId: string) => void;
  theme?: ReaderTheme;
}

export const CoursesTab: React.FC<CoursesTabProps> = ({
  trainings,
  courseSearch,
  setCourseSearch,
  publicationFilter,
  setPublicationFilter,
  onTogglePublish,
  onToggleCategoryFeatured,
  onToggleHomeFeatured,
  onOpenEditTraining,
  onDeleteTraining,
  onManageLessons,
  onManageStudents,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  const filteredTrainings = useMemo(() => {
    return trainings.filter((t) => {
      const matchesPub =
        publicationFilter === 'all'
          ? true
          : publicationFilter === 'published'
          ? t.isPublished
          : !t.isPublished;
      const q = courseSearch.toLowerCase();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.targetAudience.toLowerCase().includes(q);
      return matchesPub && matchesSearch;
    });
  }, [trainings, publicationFilter, courseSearch]);

  return (
    <div className="space-y-6">
      {/* Course Search & Filter Bar */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
        }`}
      >
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por curso, categoria..."
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                : 'bg-slate-900/80 border-slate-700 text-slate-100 placeholder-slate-500'
            }`}
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs font-medium text-slate-400">Filtrar:</span>
          <button
            onClick={() => setPublicationFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              publicationFilter === 'all'
                ? 'bg-blue-600 text-white'
                : isLight
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todos ({trainings.length})
          </button>
          <button
            onClick={() => setPublicationFilter('published')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
              publicationFilter === 'published'
                ? 'bg-emerald-600 text-white'
                : isLight
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Publicados ({trainings.filter((t) => t.isPublished).length})</span>
          </button>
          <button
            onClick={() => setPublicationFilter('draft')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
              publicationFilter === 'draft'
                ? 'bg-amber-600 text-white'
                : isLight
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <EyeOff className="w-3 h-3" />
            <span>Rascunhos ({trainings.filter((t) => !t.isPublished).length})</span>
          </button>
        </div>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrainings.map((training) => (
          <div
            key={training.id}
            className={`rounded-2xl border overflow-hidden transition-all duration-200 flex flex-col ${
              isLight
                ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                : 'bg-[#171B38] border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Course Cover with Status Badges */}
            <div className="relative h-44 w-full bg-slate-900 overflow-hidden group">
              <img
                src={training.coverImageUrl}
                alt={training.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

              {/* Status Badges */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                {training.isPublished ? (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/90 text-white backdrop-blur-md flex items-center space-x-1 shadow">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Publicado</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/90 text-white backdrop-blur-md flex items-center space-x-1 shadow">
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Rascunho</span>
                  </span>
                )}

                <span className="px-2 py-1 text-xs font-medium rounded-lg bg-black/60 text-slate-200 backdrop-blur-md">
                  {training.category}
                </span>

                {training.prerequisiteTrainingTitle && (
                  <span className="px-2 py-1 text-xs font-bold rounded-lg bg-amber-500/80 text-white backdrop-blur-md flex items-center space-x-1 shadow">
                    <Lock className="w-3 h-3 text-amber-200" />
                    <span>Requer: {training.prerequisiteTrainingTitle}</span>
                  </span>
                )}

                {training.isFeatured && (
                  <span className="px-2 py-1 text-xs font-bold rounded-lg bg-blue-600/90 text-white backdrop-blur-md flex items-center space-x-1 shadow">
                    <Sparkles className="w-3 h-3 fill-current text-blue-200" />
                    <span>Destaque Home</span>
                  </span>
                )}

                {training.isCategoryFeatured && (
                  <span className="px-2 py-1 text-xs font-bold rounded-lg bg-amber-500/90 text-white backdrop-blur-md flex items-center space-x-1 shadow">
                    <Sparkles className="w-3 h-3 fill-current text-amber-200" />
                    <span>Destaque Categoria</span>
                  </span>
                )}
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-200">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>{formatWorkload(training.workloadHours)} de carga horária</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Video className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{training.lessonsCount || 0} aulas</span>
                </span>
              </div>
            </div>

            {/* Course Details */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base line-clamp-1 mb-1">{training.title}</h3>
                <p className={`text-xs line-clamp-2 mb-3 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {training.description}
                </p>
                <div className="text-xs text-slate-400">
                  Público-alvo: <span className="font-medium">{training.targetAudience}</span>
                </div>
                {training.prerequisiteTrainingTitle && (
                  <div className="mt-2 text-xs flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span className="line-clamp-1">
                      Pré-requisito: <strong>{training.prerequisiteTrainingTitle}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Publication Toggle Switch & Actions */}
              <div className="mt-4 pt-4 border-t border-slate-700/40 space-y-3">
                {/* Toggle Button */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Status de Acesso:</span>
                  <button
                    onClick={() => onTogglePublish(training)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      training.isPublished
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
                    }`}
                  >
                    {training.isPublished ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Mudar para Rascunho</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Publicar Curso</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Destaques (Home & Categoria) */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-400">Destaques:</span>
                  <div className="flex items-center gap-1.5">
                    {onToggleHomeFeatured && (
                      <button
                        onClick={() => onToggleHomeFeatured(training)}
                        title={training.isFeatured ? 'Remover destaque da Home' : 'Destacar na Página Inicial'}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer ${
                          training.isFeatured
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 hover:bg-blue-600/30'
                            : isLight
                            ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <Sparkles className={`w-3 h-3 ${training.isFeatured ? 'fill-current' : ''}`} />
                        <span>Home</span>
                      </button>
                    )}

                    {onToggleCategoryFeatured && (
                      <button
                        onClick={() => onToggleCategoryFeatured(training)}
                        title={training.isCategoryFeatured ? 'Remover destaque da Categoria' : 'Destacar em 1º na Categoria'}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer ${
                          training.isCategoryFeatured
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                            : isLight
                            ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <Sparkles className={`w-3 h-3 ${training.isCategoryFeatured ? 'fill-current' : ''}`} />
                        <span>Categoria</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Secondary Navigation & Management Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        onManageLessons(
                          training.id,
                          training.lessons?.length ? training.lessons : undefined
                        )
                      }
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors flex items-center space-x-1 ${
                        isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Aulas ({training.lessonsCount || training.lessons?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => onManageStudents(training.id)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors flex items-center space-x-1 ${
                        isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Alunos</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onOpenEditTraining(training)}
                      title="Editar curso"
                      className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTraining(training.id, training.title)}
                      title="Excluir curso"
                      className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTrainings.length === 0 && (
        <div
          className={`p-12 text-center rounded-2xl border ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#171B38] border-slate-800'
          }`}
        >
          <GraduationCap className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold">Nenhum curso encontrado</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Tente ajustar os filtros de busca ou crie uma nova capacitação com o botão acima.
          </p>
        </div>
      )}
    </div>
  );
};
