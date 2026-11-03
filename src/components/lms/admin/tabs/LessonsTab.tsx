import React from 'react';
import {
  Video,
  Plus,
  Clock,
  ExternalLink,
  Play,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Training, TrainingLesson } from '../../../../types/training';
import { ReaderTheme } from '../../../Navbar';

export interface LessonsTabProps {
  trainings: Training[];
  selectedTrainingForLessons: string;
  onSelectTraining: (trainingId: string) => void;
  lessonsList: TrainingLesson[];
  onOpenCreateLesson: () => void;
  onOpenEditLesson: (lesson: TrainingLesson) => void;
  onDeleteLesson: (lessonId: string, title: string) => void;
  onPreviewLesson: (lesson: TrainingLesson) => void;
  theme?: ReaderTheme;
}

export const LessonsTab: React.FC<LessonsTabProps> = ({
  trainings,
  selectedTrainingForLessons,
  onSelectTraining,
  lessonsList,
  onOpenCreateLesson,
  onOpenEditLesson,
  onDeleteLesson,
  onPreviewLesson,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const selectedTrainingObj = trainings.find((t) => t.id === selectedTrainingForLessons);

  return (
    <div className="space-y-6">
      {/* Training Selector Header */}
      <div
        className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
        }`}
      >
        <div className="w-full md:w-auto">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Selecione o Curso para Gerenciar Aulas:
          </label>
          <select
            value={selectedTrainingForLessons}
            onChange={(e) => onSelectTraining(e.target.value)}
            className={`w-full md:w-96 px-3.5 py-2 rounded-xl text-sm border font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-slate-900/80 border-slate-700 text-slate-100'
            }`}
          >
            {trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} {t.isPublished ? '(Publicado)' : '(Rascunho)'}
              </option>
            ))}
          </select>
        </div>

        {selectedTrainingObj && (
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                selectedTrainingObj.isPublished
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {selectedTrainingObj.isPublished ? 'Curso Publicado' : 'Curso em Rascunho'}
            </span>
            <button
              onClick={onOpenCreateLesson}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Aula</span>
            </button>
          </div>
        )}
      </div>

      {/* Lessons Table / List */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
        }`}
      >
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center space-x-2">
            <Video className="w-4 h-4 text-blue-500" />
            <span>Grade Curricular ({lessonsList.length} aulas cadastradas)</span>
          </h2>
        </div>

        {lessonsList.length > 0 ? (
          <div className="divide-y divide-slate-700/40">
            {lessonsList.map((lesson, idx) => (
              <div
                key={lesson.id}
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-sm">{lesson.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          lesson.videoType === 'youtube'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {lesson.videoType === 'youtube' ? 'YouTube' : 'Google Drive'}
                      </span>
                    </div>
                    {lesson.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{lesson.description}</p>
                    )}
                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1.5">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{lesson.durationMinutes} minutos</span>
                      </span>
                      <a
                        href={lesson.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Link original</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-center">
                  <button
                    onClick={() => onPreviewLesson(lesson)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      isLight
                        ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-sm'
                        : 'bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25'
                    }`}
                    title="Assistir e pré-visualizar vídeo"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-blue-500" />
                    <span>Assistir Vídeo</span>
                  </button>
                  <button
                    onClick={() => onOpenEditLesson(lesson)}
                    className={`p-2 rounded-lg border text-blue-400 transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                    }`}
                    title="Editar aula"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteLesson(lesson.id, lesson.title)}
                    className={`p-2 rounded-lg border text-rose-400 transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                    }`}
                    title="Excluir aula"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Video className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-semibold">Nenhuma aula cadastrada</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Adicione videoaulas do YouTube ou Google Drive para estruturar este treinamento.
            </p>
            <button
              onClick={onOpenCreateLesson}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all inline-flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeira Aula</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
