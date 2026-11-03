import React from 'react';
import { Tag, X, Edit2, Trash2, AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { TrainingCategory } from '../../../../types/training';
import { ReaderTheme } from '../../../Navbar';

export interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: TrainingCategory[];
  editingCategory: TrainingCategory | null;
  categoryForm: { name: string; description: string; prerequisiteCategoryId: string };
  setCategoryForm: React.Dispatch<
    React.SetStateAction<{ name: string; description: string; prerequisiteCategoryId: string }>
  >;
  onCancelEditCategory: () => void;
  onEditCategory: (cat: TrainingCategory) => void;
  onSaveCategory: (e: React.FormEvent) => void;
  onDeleteCategory: (cat: TrainingCategory) => void;
  isCategoryLoading: boolean;
  theme?: ReaderTheme;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  categories,
  editingCategory,
  categoryForm,
  setCategoryForm,
  onCancelEditCategory,
  onEditCategory,
  onSaveCategory,
  onDeleteCategory,
  isCategoryLoading,
  theme = 'dark',
}) => {
  if (!isOpen) return null;
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        className={`relative w-full max-w-2xl rounded-3xl overflow-hidden border shadow-2xl flex flex-col max-h-[90vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#151934] border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Tag className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-base">Categorias de Ministério</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cadastre e gerencie as áreas ministeriais para organização dos cursos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Form: Nova / Editar Categoria */}
          <form
            onSubmit={onSaveCategory}
            className={`p-4 rounded-2xl border space-y-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {editingCategory ? `Editar Categoria: ${editingCategory.name}` : 'Cadastrar Nova Categoria'}
              </h4>
              {editingCategory && (
                <button
                  type="button"
                  onClick={onCancelEditCategory}
                  className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Missões Urbanas, Ação Social..."
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-slate-900 border-slate-700 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Descrição / Finalidade</label>
                <input
                  type="text"
                  placeholder="Ex: Treinamentos para o corpo de diáconos..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-slate-900 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* Hierarquia de Dependência entre Categorias */}
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center justify-between">
                <span>Pré-requisito Ministerial (Dependência entre Áreas)</span>
                <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
              </label>
              <select
                value={categoryForm.prerequisiteCategoryId}
                onChange={(e) => setCategoryForm({ ...categoryForm, prerequisiteCategoryId: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-slate-900 border-slate-700 text-slate-100'
                }`}
              >
                <option value="">Nenhum (Livre acesso)</option>
                {categories
                  .filter((c) => !editingCategory || c.id !== editingCategory.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Se definido, os alunos só poderão cursar treinamentos desta categoria após concluírem todos os cursos obrigatórios da categoria pré-requisito.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isCategoryLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isCategoryLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>{editingCategory ? 'Atualizar Categoria' : 'Salvar Categoria'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* List: Categorias Cadastradas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Categorias Existentes ({categories.length})
            </h4>

            <div className="divide-y divide-slate-700/50 border border-slate-700/50 rounded-2xl overflow-hidden">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`p-3.5 flex items-center justify-between gap-3 text-xs ${
                    isLight ? 'bg-white hover:bg-slate-50' : 'bg-slate-900/40 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm">{cat.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          (cat.trainingsCount || 0) > 0
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-700/50 text-slate-400'
                        }`}
                      >
                        {cat.trainingsCount || 0} curso(s)
                      </span>
                    </div>

                    {cat.description && (
                      <p className="text-slate-400 line-clamp-1">{cat.description}</p>
                    )}

                    {cat.prerequisiteCategoryName ? (
                      <div className="text-[11px] text-amber-400 flex items-center space-x-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>
                          Pré-requisito: <strong>{cat.prerequisiteCategoryName}</strong>
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 block">Sem pré-requisito</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditCategory(cat)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
                      }`}
                      title="Editar Categoria"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat)}
                      disabled={(cat.trainingsCount || 0) > 0}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        (cat.trainingsCount || 0) > 0
                          ? 'opacity-30 cursor-not-allowed border-transparent text-slate-500'
                          : isLight
                          ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600 cursor-pointer'
                          : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400 cursor-pointer'
                      }`}
                      title={
                        (cat.trainingsCount || 0) > 0
                          ? `Não pode excluir: ${cat.trainingsCount} curso(s) associado(s)`
                          : 'Excluir Categoria'
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
