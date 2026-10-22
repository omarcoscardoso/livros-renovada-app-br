import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  originalYear: number;
  originalPdfName?: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  bookId,
  bookTitle,
  bookAuthor,
  originalYear,
  originalPdfName,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pdfEndpoint = `/api/books/${encodeURIComponent(bookId)}/pdf`;
  const downloadFileName =
    originalPdfName || `${bookTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Original.pdf`;

  useEffect(() => {
    let currentUrl: string | null = null;

    if (isOpen) {
      setIsLoading(true);
      setError(null);

      fetch(pdfEndpoint)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Falha ao obter o arquivo PDF do servidor.');
          }
          return res.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          currentUrl = url;
          setBlobUrl(url);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Erro ao carregar PDF:', err);
          setError('Não foi possível carregar o visualizador embutido.');
          setIsLoading(false);
        });
    }

    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [isOpen, pdfEndpoint]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.location.href = pdfEndpoint;
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    } else {
      window.open(pdfEndpoint, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[90vh] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 truncate">
                PDF Original: {bookTitle}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {bookAuthor} ({originalYear}) • {downloadFileName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
              title="Baixar arquivo PDF original"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar PDF Original</span>
            </button>

            <button
              onClick={handleOpenNewTab}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Abrir PDF em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-slate-950 relative flex flex-col">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs">Carregando documento PDF original...</p>
            </div>
          )}

          {!isLoading && blobUrl && (
            <object data={blobUrl} type="application/pdf" className="w-full h-full">
              <embed src={blobUrl} type="application/pdf" className="w-full h-full" />
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                <FileText className="w-12 h-12 text-amber-400" />
                <h4 className="text-base font-semibold text-slate-200">
                  Visualização de PDF embutida bloqueada pelas permissões do navegador
                </h4>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                  Você pode baixar o arquivo original completo ou abri-lo em uma nova guia:
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    <Download className="w-4 h-4" />
                    Baixar PDF Original (.pdf)
                  </button>
                  <button
                    onClick={handleOpenNewTab}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir em Nova Aba
                  </button>
                </div>
              </div>
            </object>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <p className="text-sm text-slate-300 font-medium">{error}</p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                <Download className="w-4 h-4" />
                Tentar Download Direto
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
