import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Gauge,
  FastForward,
  Rewind,
  Headphones,
} from 'lucide-react';
import { ReaderTheme } from './Navbar';

interface AudiobookPlayerProps {
  paragraphs: string[];
  bookTitle: string;
  chapterTitle: string;
  theme: ReaderTheme;
  onClose: () => void;
  onParagraphChange?: (index: number) => void;
}

export const AudiobookPlayer: React.FC<AudiobookPlayerProps> = ({
  paragraphs,
  bookTitle,
  chapterTitle,
  theme,
  onClose,
  onParagraphChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const speakParagraph = (index: number) => {
    if (!synthRef.current || index < 0 || index >= paragraphs.length) {
      setIsPlaying(false);
      return;
    }

    synthRef.current.cancel();

    const textToSpeak = paragraphs[index].trim();
    if (!textToSpeak) {
      // Skip empty paragraph
      if (index + 1 < paragraphs.length) {
        speakParagraph(index + 1);
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    utterance.rate = rate;
    utterance.volume = isMuted ? 0 : 1;

    // Try to pick a natural pt-BR voice if available
    const voices = synthRef.current.getVoices();
    const ptVoice = voices.find((v) => v.lang.startsWith('pt') || v.lang.includes('BR'));
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    utterance.onend = () => {
      if (index + 1 < paragraphs.length) {
        setCurrentIndex(index + 1);
        if (onParagraphChange) onParagraphChange(index + 1);
        speakParagraph(index + 1);
      } else {
        setIsPlaying(false);
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled') {
        console.error('TTS error:', e);
        setIsPlaying(false);
      }
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
    setIsPlaying(true);
    setCurrentIndex(index);
    if (onParagraphChange) onParagraphChange(index);
  };

  const handleTogglePlay = () => {
    if (!synthRef.current) return;

    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
    } else {
      speakParagraph(currentIndex);
    }
  };

  const handlePrevParagraph = () => {
    const nextIdx = Math.max(0, currentIndex - 1);
    setCurrentIndex(nextIdx);
    if (isPlaying) {
      speakParagraph(nextIdx);
    } else if (onParagraphChange) {
      onParagraphChange(nextIdx);
    }
  };

  const handleNextParagraph = () => {
    const nextIdx = Math.min(paragraphs.length - 1, currentIndex + 1);
    setCurrentIndex(nextIdx);
    if (isPlaying) {
      speakParagraph(nextIdx);
    } else if (onParagraphChange) {
      onParagraphChange(nextIdx);
    }
  };

  const handleCycleRate = () => {
    const rates = [0.8, 1.0, 1.25, 1.5, 2.0];
    const currentPos = rates.indexOf(rate);
    const nextRate = rates[(currentPos + 1) % rates.length];
    setRate(nextRate);
    if (isPlaying) {
      speakParagraph(currentIndex);
    }
  };

  const progressPercent = Math.min(
    100,
    Math.round(((currentIndex + 1) / Math.max(1, paragraphs.length)) * 100)
  );

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const containerBg = isDark
    ? 'bg-slate-950/90 border-slate-800 text-slate-100 shadow-2xl shadow-black/80'
    : isSepia
    ? 'bg-[#ece4d0]/95 border-[#d8c7a7] text-[#2c2217] shadow-2xl shadow-amber-950/20'
    : 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl shadow-slate-900/15';

  if (!speechSupported) {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl bg-rose-950 border border-rose-800 text-rose-200 text-xs">
        Seu navegador não oferece suporte à síntese de voz (Web Speech API).
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg px-2 animate-in slide-in-from-bottom duration-300">
      <div
        className={`relative rounded-3xl border backdrop-blur-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 ${containerBg}`}
      >
        {/* Header: Book & Chapter info + close button */}
        <div className="flex items-center justify-between gap-3 border-b border-current/10 pb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-amber-500 truncate uppercase tracking-wider">
                Audiobook Ativo • {bookTitle}
              </p>
              <h4 className="text-xs font-semibold truncate opacity-90">{chapterTitle}</h4>
            </div>
          </div>

          <button
            onClick={() => {
              if (synthRef.current) synthRef.current.cancel();
              onClose();
            }}
            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors cursor-pointer"
            title="Fechar Audiobook"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar & Paragraph Counter */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono opacity-70">
            <span>
              Parágrafo {currentIndex + 1} de {paragraphs.length}
            </span>
            <span className="font-bold text-amber-500">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Controls: Prev, Play/Pause, Next, Speed, Mute */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={handleCycleRate}
              className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
              title="Velocidade de Leitura"
            >
              <Gauge className="w-3 h-3 text-amber-500" />
              <span>{rate}x</span>
            </button>

            <button
              onClick={() => {
                setIsMuted((prev) => !prev);
                if (utteranceRef.current) {
                  utteranceRef.current.volume = !isMuted ? 0 : 1;
                }
              }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer opacity-70 hover:opacity-100"
              title={isMuted ? 'Desmutar' : 'Silenciar'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevParagraph}
              disabled={currentIndex === 0}
              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
              title="Voltar um parágrafo"
            >
              <Rewind className="w-4 h-4" />
            </button>

            <button
              onClick={handleTogglePlay}
              className="w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-amber-500/30 transition-all transform hover:scale-105 cursor-pointer"
              title={isPlaying ? 'Pausar áudio' : 'Ouvir capítulo'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={handleNextParagraph}
              disabled={currentIndex >= paragraphs.length - 1}
              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
              title="Avançar um parágrafo"
            >
              <FastForward className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setCurrentIndex(0);
              if (isPlaying) speakParagraph(0);
            }}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
            title="Recomeçar capítulo do início"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
