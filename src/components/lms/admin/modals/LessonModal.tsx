import React from 'react';
import { Video, X } from 'lucide-react';
import { TrainingLesson, VideoType } from '../../../../types/training';
import { getEmbedVideoUrl, detectVideoType } from '../../../../utils/videoEmbed';
import { ReaderTheme } from '../../../Navbar';

export interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLesson: TrainingLesson | null;
  lessonForm: {
    title: string;
    description: string;
    videoType: VideoType;
    videoUrl: string;
    durationMinutes: number;
    orderIndex: number;
  };
  setLessonForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      videoType: VideoType;
      videoUrl: string;
      durationMinutes: number;
      orderIndex: number;
    }>
  >;
  onSaveLesson: (e: React.FormEvent) => void;
  isLoading: boolean;
  theme?: ReaderTheme;
}

export const LessonModal: React.FC<LessonModalProps> = ({
  isOpen,
  onClose,
  editingLesson,
  lessonForm,
  setLessonForm,
  onSaveLesson,
  isLoading,
  theme = 'dark',
}) => {
  if (!isOpen) return null;
  const isLight = theme === 'light';

  const handleVideoUrlChange = (url: string) => {
    const detected = detectVideoType(url);
    setLessonForm((prev) => ({
      ...prev,
      videoUrl: url,
      videoType: detected,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#171B38] border-slate-800 text-slate-100'
        }`}
      >
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center space-x-2">
            <Video className="w-5 h-5 text-blue-500" />
            <span>{editingLesson ? 'Editar Aula' : 'Nova Videoaula'}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={onSaveLesson} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold mb-1">Título da Aula</label>
            <input
              type="text"
              required
              value={lessonForm.title}
              onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
              placeholder="Ex: Aula 01 - Fundamentos e Vocação Pastoral"
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900/80 border-slate-700 text-slate-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Descrição dos Tópicos Abordados</label>
            <textarea
              rows={2}
              value={lessonForm.description}
              onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
              placeholder="Principais versículos bíblicos e temas explicados nesta aula..."
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900/80 border-slate-700 text-slate-100'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Provedor do Vídeo</label>
              <select
                value={lessonForm.videoType}
                onChange={(e) => setLessonForm({ ...lessonForm, videoType: e.target.value as VideoType })}
                className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-slate-900/80 border-slate-700 text-slate-100'
                }`}
              >
                <option value="youtube">YouTube (Vídeo / Não listado)</option>
                <option value="google_drive">Google Drive (Link compartilhado)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Duração (Minutos)</label>
              <input
                type="number"
                min={1}
                required
                value={lessonForm.durationMinutes}
                onChange={(e) => setLessonForm({ ...lessonForm, durationMinutes: Number(e.target.value) })}
                className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-slate-900/80 border-slate-700 text-slate-100'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">URL do Vídeo</label>
            <input
              type="url"
              required
              placeholder="https://www.youtube.com/watch?v=... ou link do Drive"
              value={lessonForm.videoUrl}
              onChange={(e) => handleVideoUrlChange(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900/80 border-slate-700 text-slate-100'
              }`}
            />
          </div>

          {/* Live Video Preview Box */}
          {lessonForm.videoUrl && (
            <div className="pt-2">
              <span className="block text-xs font-semibold text-slate-400 mb-1.5">
                Pré-visualização do Player Embed:
              </span>
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-700">
                <iframe
                  src={getEmbedVideoUrl(lessonForm.videoUrl, lessonForm.videoType)}
                  title="Preview"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-700/50 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-sm font-medium border cursor-pointer ${
                isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Salvando...' : 'Salvar Aula'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
