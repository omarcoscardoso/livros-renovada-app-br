import React from 'react';
import { GraduationCap, X, Eye, EyeOff, Plus } from 'lucide-react';
import { Training, TrainingCategory } from '../../../../types/training';
import { BookSummary } from '../../../../data/bookTypes';
import { ReaderTheme } from '../../../Navbar';

export interface TrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTraining: Training | null;
  trainingForm: {
    title: string;
    description: string;
    category: string;
    targetAudience: string;
    coverImageUrl: string;
    bannerImageUrl: string;
    isRequired: boolean;
    isFeatured: boolean;
    isPublished: boolean;
    workloadHours: number;
    complementaryBookId: string;
    prerequisiteTrainingId: string;
  };
  setTrainingForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      category: string;
      targetAudience: string;
      coverImageUrl: string;
      bannerImageUrl: string;
      isRequired: boolean;
      isFeatured: boolean;
      isPublished: boolean;
      workloadHours: number;
      complementaryBookId: string;
      prerequisiteTrainingId: string;
    }>
  >;
  onSaveTraining: (e: React.FormEvent) => void;
  isLoading: boolean;
  categories: TrainingCategory[];
  trainings: Training[];
  books: BookSummary[];
  onOpenCategoryModal: () => void;
  theme?: ReaderTheme;
}

export const TrainingModal: React.FC<TrainingModalProps> = ({
  isOpen,
  onClose,
  editingTraining,
  trainingForm,
  setTrainingForm,
  onSaveTraining,
  isLoading,
  categories,
  trainings,
  books,
  onOpenCategoryModal,
  theme = 'dark',
}) => {
  if (!isOpen) return null;
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#171B38] border-slate-800 text-slate-100'
        }`}
      >
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-blue-500" />
            <span>{editingTraining ? 'Editar Curso' : 'Novo Curso de Capacitação'}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={onSaveTraining} className="p-6 space-y-4 overflow-y-auto">
          {/* Publication Status Radio Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Status de Publicação:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                  trainingForm.isPublished
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : isLight
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-slate-700 bg-slate-900/50'
                }`}
              >
                <input
                  type="radio"
                  name="isPublished"
                  checked={trainingForm.isPublished}
                  onChange={() => setTrainingForm({ ...trainingForm, isPublished: true })}
                  className="mt-1 mr-2.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="block font-bold text-sm text-emerald-400 flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>Publicado</span>
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 block leading-relaxed">
                    Visível para todos os membros na página inicial do LUMI.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                  !trainingForm.isPublished
                    ? 'border-amber-500 bg-amber-500/10'
                    : isLight
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-slate-700 bg-slate-900/50'
                }`}
              >
                <input
                  type="radio"
                  name="isPublished"
                  checked={!trainingForm.isPublished}
                  onChange={() => setTrainingForm({ ...trainingForm, isPublished: false })}
                  className="mt-1 mr-2.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="block font-bold text-sm text-amber-400 flex items-center space-x-1">
                    <EyeOff className="w-4 h-4" />
                    <span>Rascunho</span>
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 block leading-relaxed">
                    Oculto para membros. Apenas administradores podem editar e adicionar aulas.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Título do Curso</label>
            <input
              type="text"
              required
              value={trainingForm.title}
              onChange={(e) => setTrainingForm({ ...trainingForm, title: e.target.value })}
              placeholder="Ex: Formação em Diaconia & Ação Social"
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900/80 border-slate-700 text-slate-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Descrição</label>
            <textarea
              rows={3}
              required
              value={trainingForm.description}
              onChange={(e) => setTrainingForm({ ...trainingForm, description: e.target.value })}
              placeholder="Breve resumo dos objetivos pastorais e conteúdos do curso..."
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900/80 border-slate-700 text-slate-100'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold">Categoria de Ministério</label>
                <button
                  type="button"
                  onClick={onOpenCategoryModal}
                  className="text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Cadastrar / Gerenciar</span>
                </button>
              </div>
              <select
                value={trainingForm.category}
                onChange={(e) => setTrainingForm({ ...trainingForm, category: e.target.value })}
                className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-slate-900/80 border-slate-700 text-slate-100'
                }`}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {trainingForm.category && !categories.some((c) => c.name === trainingForm.category) && (
                  <option value={trainingForm.category}>{trainingForm.category}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Público-Alvo</label>
              <input
                type="text"
                required
                value={trainingForm.targetAudience}
                onChange={(e) => setTrainingForm({ ...trainingForm, targetAudience: e.target.value })}
                placeholder="Ex: Novos Líderes, Diáconos, Toda a Igreja"
                className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-slate-900/80 border-slate-700 text-slate-100'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Carga Horária (horas)</label>
              <input
                type="number"
                min={1}
                required
                value={trainingForm.workloadHours}
                onChange={(e) => setTrainingForm({ ...trainingForm, workloadHours: Number(e.target.value) })}
                className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-slate-900/80 border-slate-700 text-slate-100'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Livro Complementar da Biblioteca</label>
              <select
                value={trainingForm.complementaryBookId}
                onChange={(e) => setTrainingForm({ ...trainingForm, complementaryBookId: e.target.value })}
                className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-slate-900/80 border-slate-700 text-slate-100'
                }`}
              >
                <option value="">Nenhum livro associado</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.titlePt} ({b.author})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 flex items-center justify-between">
              <span>Treinamento Pré-requisito (Dependência entre Cursos)</span>
              <span className="text-[11px] text-slate-400 font-normal">Opcional</span>
            </label>
            <select
              value={trainingForm.prerequisiteTrainingId}
              onChange={(e) => setTrainingForm({ ...trainingForm, prerequisiteTrainingId: e.target.value })}
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none cursor-pointer ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900/80 border-slate-700 text-slate-100'
              }`}
            >
              <option value="">Nenhum (Acesso Livre / Sem pré-requisito)</option>
              <optgroup label={`Mesma Categoria (${trainingForm.category})`}>
                {trainings
                  .filter(
                    (t) =>
                      (!editingTraining || t.id !== editingTraining.id) &&
                      t.category.toLowerCase() === trainingForm.category.toLowerCase()
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Outras Categorias">
                {trainings
                  .filter(
                    (t) =>
                      (!editingTraining || t.id !== editingTraining.id) &&
                      t.category.toLowerCase() !== trainingForm.category.toLowerCase()
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.category}] {t.title}
                    </option>
                  ))}
              </optgroup>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              O aluno só poderá iniciar este treinamento após concluir integralmente todas as aulas do curso selecionado como pré-requisito.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">URL da Imagem de Capa</label>
            <input
              type="url"
              required
              value={trainingForm.coverImageUrl}
              onChange={(e) => setTrainingForm({ ...trainingForm, coverImageUrl: e.target.value })}
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900/80 border-slate-700 text-slate-100'
              }`}
            />
          </div>

          <div className="flex items-center space-x-6 pt-2">
            <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={trainingForm.isRequired}
                onChange={(e) => setTrainingForm({ ...trainingForm, isRequired: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Capacitação Obrigatória</span>
            </label>

            <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={trainingForm.isFeatured}
                onChange={(e) => setTrainingForm({ ...trainingForm, isFeatured: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Destaque na Página Inicial</span>
            </label>
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
              {isLoading ? 'Salvando...' : 'Salvar Curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
