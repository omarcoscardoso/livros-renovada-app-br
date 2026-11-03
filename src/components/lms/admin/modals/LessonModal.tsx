import React from 'react';
import { Video, X, Plus, Trash2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { TrainingLesson, VideoType, LessonReferenceLink } from '../../../../types/training';
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
    referenceLinks: LessonReferenceLink[];
  };
  setLessonForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      videoType: VideoType;
      videoUrl: string;
      durationMinutes: number;
      orderIndex: number;
      referenceLinks: LessonReferenceLink[];
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

  const handleAddReferenceLink = () => {
    setLessonForm((prev) => ({
      ...prev,
      referenceLinks: [
        ...(prev.referenceLinks || []),
        { title: '', url: '', description: '' },
      ],
    }));
  };

  const handleUpdateReferenceLink = (
    index: number,
    field: keyof LessonReferenceLink,
    value: string
  ) => {
    setLessonForm((prev) => {
      const updated = [...(prev.referenceLinks || [])];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...prev,
        referenceLinks: updated,
      };
    });
  };

  const handleRemoveReferenceLink = (index: number) => {
    setLessonForm((prev) => ({
      ...prev,
      referenceLinks: (prev.referenceLinks || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
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
            <div className="pt-1">
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

          {/* Reference Links Section */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#121630]/80 border-slate-700/70'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold font-outfit uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>Links de Referência & Materiais Externos</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Adicione referências bibliográficas, materiais de apoio, pastas do Drive ou links de outras igrejas.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddReferenceLink}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-500 dark:text-blue-400 text-xs font-bold font-outfit transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Link</span>
              </button>
            </div>

            {(lessonForm.referenceLinks || []).length === 0 ? (
              <div
                className={`py-4 px-3 rounded-xl border border-dashed text-center text-xs ${
                  isLight ? 'border-slate-300 text-slate-500' : 'border-slate-700/80 text-slate-400'
                }`}
              >
                Nenhum link complementar adicionado a esta aula.
              </div>
            ) : (
              <div className="space-y-2.5">
                {(lessonForm.referenceLinks || []).map((link, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border space-y-2 relative ${
                      isLight
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-900/90 border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-blue-500 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        <span>Referência #{idx + 1}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveReferenceLink(idx)}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remover link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          Título do Link / Material *
                        </label>
                        <input
                          type="text"
                          required
                          value={link.title}
                          onChange={(e) => handleUpdateReferenceLink(idx, 'title', e.target.value)}
                          placeholder="Ex: Apostila em PDF no Drive / Artigo Bíblico"
                          className={`w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                            isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-900'
                              : 'bg-slate-950/70 border-slate-700 text-slate-100'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          URL (Endereço Web) *
                        </label>
                        <input
                          type="url"
                          required
                          value={link.url}
                          onChange={(e) => handleUpdateReferenceLink(idx, 'url', e.target.value)}
                          placeholder="https://drive.google.com/... ou https://..."
                          className={`w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                            isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-900'
                              : 'bg-slate-950/70 border-slate-700 text-slate-100'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                        Observação / Descrição Breve (Opcional)
                      </label>
                      <input
                        type="text"
                        value={link.description || ''}
                        onChange={(e) => handleUpdateReferenceLink(idx, 'description', e.target.value)}
                        placeholder="Ex: Referência bibliográfica cap. 3 / Material cedido pela Igreja..."
                        className={`w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                          isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-900'
                            : 'bg-slate-950/70 border-slate-700 text-slate-100'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
