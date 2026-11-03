import React from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  FolderTree,
} from 'lucide-react';
import { TrainingCategory } from '../../../../types/training';
import { ReaderTheme } from '../../../Navbar';

export interface MinistriesTabProps {
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

export const MinistriesTab: React.FC<MinistriesTabProps> = ({
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
  const isLight = theme === 'light';

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Tag className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg">Categorias de Ministério & Hierarquia</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Defina as áreas ministeriais e seus pré-requisitos para organizar a trilha de capacitação.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <FolderTree className="w-4 h-4" />
          <span>{categories.length} Categorias cadastradas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form: Nova / Editar Categoria */}
        <div className="lg:col-span-5">
          <form
            onSubmit={onSaveCategory}
            className={`p-5 rounded-2xl border space-y-4 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <Tag className="w-4 h-4 text-blue-500" />
                <span>{editingCategory ? `Editar: ${editingCategory.name}` : 'Cadastrar Nova Categoria'}</span>
              </h3>
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

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Diaconia, Liderança, Missões..."
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-slate-900 border-slate-700 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Descrição / Finalidade</label>
                <input
                  type="text"
                  placeholder="Ex: Treinamentos para o corpo diaconal e voluntários..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-slate-900 border-slate-700 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 flex items-center justify-between">
                  <span>Pré-requisito Ministerial</span>
                  <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                </label>
                <select
                  value={categoryForm.prerequisiteCategoryId}
                  onChange={(e) => setCategoryForm({ ...categoryForm, prerequisiteCategoryId: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
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
                  O aluno precisará concluir todos os cursos obrigatórios da categoria pré-requisito antes de cursar esta área.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCategoryLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isCategoryLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando Categoria...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>{editingCategory ? 'Atualizar Categoria' : 'Salvar Categoria'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* List: Categorias Cadastradas */}
        <div className="lg:col-span-7">
          <div
            className={`rounded-2xl border overflow-hidden ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
            }`}
          >
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Categorias Existentes ({categories.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-700/40 max-h-[550px] overflow-y-auto">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                    isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/30'
                  }`}
                >
                  <div className="space-y-1">
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
                      <p className="text-xs text-slate-400 line-clamp-1">{cat.description}</p>
                    )}

                    {cat.prerequisiteCategoryName ? (
                      <div className="text-[11px] text-amber-400 flex items-center space-x-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>
                          Pré-requisito: <strong>{cat.prerequisiteCategoryName}</strong>
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 block">Sem pré-requisito</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditCategory(cat)}
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      }`}
                      title="Editar Categoria"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat)}
                      disabled={(cat.trainingsCount || 0) > 0}
                      className={`p-2 rounded-lg border transition-colors ${
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

              {categories.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhuma categoria cadastrada ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
