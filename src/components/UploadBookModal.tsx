import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  BookOpen,
} from 'lucide-react';
import { StoredBook } from '../data/bookTypes';

interface UploadBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasGeminiKey: boolean;
  onBookReady: (book: StoredBook) => void;
  onRefreshLibrary: () => void;
}

const COLOR_OPTIONS = [
  { id: 'amber', label: 'Âmbar Clássico', bg: 'bg-amber-500' },
  { id: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-500' },
  { id: 'blue', label: 'Azul Real', bg: 'bg-blue-500' },
  { id: 'rose', label: 'Rubi Editorial', bg: 'bg-rose-500' },
  { id: 'violet', label: 'Violeta', bg: 'bg-violet-500' },
];

export const UploadBookModal: React.FC<UploadBookModalProps> = ({
  isOpen,
  onClose,
  hasGeminiKey,
  onBookReady,
  onRefreshLibrary,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [titlePt, setTitlePt] = useState('');
  const [author, setAuthor] = useState('');
  const [originalYear, setOriginalYear] = useState<number>(new Date().getFullYear());
  const [publisher, setPublisher] = useState('Edição Digital — Biblioteca IPR Viamão');
  const [coverColor, setCoverColor] = useState('amber');
  const [customInstructions, setCustomInstructions] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [convertingBook, setConvertingBook] = useState<StoredBook | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI-assisted metadata extraction state
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [metadataExtracted, setMetadataExtracted] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setTitlePt('');
      setAuthor('');
      setCustomInstructions('');
      setError(null);
      setIsUploading(false);
      setConvertingBook(null);
      setIsExtractingMetadata(false);
      setMetadataExtracted(false);
    }
  }, [isOpen]);

  // Poll conversion status while book is processing
  useEffect(() => {
    if (!convertingBook || convertingBook.status !== 'processing') return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/books/${encodeURIComponent(convertingBook.id)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.book) {
          setConvertingBook(data.book);
          onRefreshLibrary();
          if (data.book.status === 'ready') {
            clearInterval(timer);
          } else if (data.book.status === 'error') {
            setError(data.book.errorMessage || 'Erro ao converter o PDF.');
            clearInterval(timer);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar status da conversão:', err);
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [convertingBook, onRefreshLibrary]);

  if (!isOpen) return null;

  const handleAutoFillWithAi = async (fileToUse?: File) => {
    const file = fileToUse || selectedFile;
    if (!file) return;

    setIsExtractingMetadata(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      if (apiKeyInput.trim()) {
        formData.append('apiKey', apiKeyInput.trim());
      }

      const res = await fetch('/api/books/extract-metadata', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao analisar PDF com IA.');
      }

      if (data.metadata) {
        if (data.metadata.titlePt) setTitlePt(data.metadata.titlePt);
        if (data.metadata.author) setAuthor(data.metadata.author);
        if (data.metadata.originalYear) setOriginalYear(data.metadata.originalYear);
        if (data.metadata.publisher) setPublisher(data.metadata.publisher);
        if (data.metadata.synopsis) setCustomInstructions(data.metadata.synopsis);
        setMetadataExtracted(true);
      }
    } catch (err: any) {
      console.warn('Extração de metadados com IA:', err);
      // Don't block upload if metadata extraction fails
    } finally {
      setIsExtractingMetadata(false);
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo no formato PDF (.pdf).');
      return;
    }
    setError(null);
    setSelectedFile(file);
    setMetadataExtracted(false);
    if (!titlePt.trim()) {
      const cleanName = file.name
        .replace(/\.pdf$/i, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b[0-9a-f]{6,}\b/gi, '')
        .trim();
      setTitlePt(cleanName);
    }

    // Auto-trigger metadata extraction with Gemini AI
    void handleAutoFillWithAi(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Selecione um arquivo PDF antes de iniciar a conversão.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      formData.append('titlePt', titlePt.trim() || selectedFile.name.replace(/\.pdf$/i, ''));
      formData.append('author', author.trim() || 'Autor Desconhecido');
      formData.append('originalYear', String(originalYear || new Date().getFullYear()));
      formData.append('publisher', publisher.trim());
      formData.append('coverColor', coverColor);
      formData.append('customInstructions', customInstructions.trim());
      if (apiKeyInput.trim()) {
        formData.append('apiKey', apiKeyInput.trim());
      }

      const res = await fetch('/api/books/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha no upload do arquivo PDF.');
      }

      setConvertingBook(data.book);
      onRefreshLibrary();
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar o PDF.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 font-display">
                Subir Livro em PDF & Converter para Leitura
              </h2>
              <p className="text-xs text-slate-400">
                Converte automaticamente o PDF em capítulos, seções, resumos e perguntas de reflexão.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {convertingBook ? (
            <div className="py-8 text-center space-y-6">
              {convertingBook.status === 'processing' && (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <div className="space-y-2 max-w-md mx-auto">
                    <h3 className="text-lg font-bold text-slate-100 font-editorial">
                      Estruturando "{convertingBook.titlePt}"
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-300 font-medium">
                      {convertingBook.conversionProgress || 'Extraindo páginas e capítulos...'}
                    </p>
                  </div>

                  <div className="max-w-md mx-auto space-y-2">
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.max(8, convertingBook.conversionPercent ?? 10)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      {convertingBook.conversionPercent ?? 10}% concluído
                    </p>
                  </div>
                </>
              )}

              {convertingBook.status === 'ready' && (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div className="space-y-2 max-w-md mx-auto">
                    <h3 className="text-xl font-bold text-slate-100 font-editorial">
                      Livro Convertido com Sucesso!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300">
                      <strong>{convertingBook.titlePt}</strong> foi estruturado com{' '}
                      <strong>{convertingBook.chapters.length} capítulos</strong> prontos para leitura, busca e exportação.
                    </p>
                    {convertingBook.conversionProgress && (
                      <p className="text-[11px] text-slate-400 italic">
                        {convertingBook.conversionProgress}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        onBookReady(convertingBook);
                        onClose();
                      }}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors shadow-lg"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Abrir Livro no Leitor Agora</span>
                    </button>
                  </div>
                </>
              )}

              {convertingBook.status === 'error' && (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-2 max-w-md mx-auto">
                    <h3 className="text-lg font-bold text-slate-100">
                      Falha ao Converter o PDF
                    </h3>
                    <p className="text-xs text-rose-300">{error || convertingBook.errorMessage}</p>
                  </div>
                  <button
                    onClick={() => {
                      setConvertingBook(null);
                      setIsUploading(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Tentar Novamente
                  </button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0] || null;
                  handleFileChange(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-amber-400 bg-amber-500/10'
                    : selectedFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-amber-500/50 bg-slate-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <FileText className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-slate-100">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Clique para trocar o arquivo
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-xl bg-slate-800 text-amber-400">
                      <Upload className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">
                      Arraste e solte o arquivo PDF aqui ou clique para selecionar
                    </p>
                    <p className="text-xs text-slate-400">
                      Suporta livros em Português, Inglês ou Espanhol (até 60 MB)
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* AI Metadata Assistant Status / Button */}
              {selectedFile && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-800/60 border border-indigo-500/30 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {isExtractingMetadata ? (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                    ) : metadataExtracted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <div>
                      {isExtractingMetadata ? (
                        <p className="font-semibold text-amber-300">
                          IA analisando PDF... Identificando título, autor, ano e sinopse.
                        </p>
                      ) : metadataExtracted ? (
                        <p className="font-semibold text-emerald-300">
                          Metadados preenchidos por IA a partir do PDF! Você pode revisá-los abaixo.
                        </p>
                      ) : (
                        <p className="font-medium text-slate-300">
                          Gostaria de preencher os metadados do livro automaticamente com IA?
                        </p>
                      )}
                    </div>
                  </div>

                  {!isExtractingMetadata && (
                    <button
                      type="button"
                      onClick={() => handleAutoFillWithAi()}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-[11px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{metadataExtracted ? 'Reanalisar com IA' : 'Preencher com IA'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Título do Livro (PT-BR)
                  </label>
                  <input
                    type="text"
                    value={titlePt}
                    onChange={(e) => setTitlePt(e.target.value)}
                    placeholder="Ex: A Igreja em Células"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs sm:text-sm outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Autor(a)
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Ex: Larry Stockstill"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs sm:text-sm outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ano de Publicação
                  </label>
                  <input
                    type="number"
                    value={originalYear}
                    onChange={(e) => setOriginalYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs sm:text-sm outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Editora / Fonte
                  </label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs sm:text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Cover Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cor de Destaque na Estante
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCoverColor(c.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-all ${
                        coverColor === c.id
                          ? 'bg-slate-800 border-amber-400 text-slate-100 font-semibold'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions for AI Conversion */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Instruções de Tradução / Estruturação (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Ex: Traduza do inglês para o Português do Brasil com foco pastoral e crie perguntas práticas para líderes de célula ao final de cada capítulo."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
                />
              </div>

              {/* Gemini API Key Status / Configuration */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-semibold text-slate-200">
                      Motor de Conversão IA (Gemini 2.5 Flash):
                    </span>
                    {hasGeminiKey || apiKeyInput.trim().length > 10 ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        Ativo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        Modo Extração Local (Sem Chave IA)
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowKeyInput((prev) => !prev)}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{showKeyInput ? 'Ocultar chave' : 'Configurar GEMINI_API_KEY'}</span>
                  </button>
                </div>

                {showKeyInput && (
                  <div className="pt-1">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Cole sua GEMINI_API_KEY aqui para tradução e estruturação avançada via IA..."
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm transition-colors shadow-lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando e Convertendo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Converter PDF para Formato de Leitura</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
