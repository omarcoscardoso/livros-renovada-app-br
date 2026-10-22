import { Router } from 'express';
import { GeminiConversionService } from '../services/geminiConversionService';

export function createAiRouter(conversionService: GeminiConversionService): Router {
  const router = Router();

  // AI Route: Study Assistant & Question Answering
  router.post('/assistant', async (req, res) => {
    try {
      const { prompt, chapterTitle, contextText, bookTitle, bookAuthor } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt é obrigatório.' });
      }

      const text = await conversionService.askStudyAssistant({
        prompt,
        chapterTitle,
        contextText,
        bookTitle,
        bookAuthor,
      });

      return res.json({ text });
    } catch (error: any) {
      if (error?.message === 'GEMINI_KEY_MISSING') {
        return res.status(503).json({
          error: 'Chave do Gemini API não configurada no servidor.',
          fallbackResponse:
            'O serviço de IA aguarda a configuração da chave GEMINI_API_KEY (você pode configurá-la no botão "Subir PDF / IA" ou no arquivo .env).',
        });
      }
      console.error('Erro na API Gemini:', error);
      return res.status(500).json({
        error: 'Falha ao processar solicitação de IA.',
        details: error?.message || 'Erro interno',
      });
    }
  });

  // AI Route: Gerador de Estudo de Célula (Roteiro Completo de Reunião de 90 min)
  router.post('/generate-lesson', async (req, res) => {
    try {
      const { topic, chapterNumber, audience, bookTitle, bookAuthor, chapterSummary } = req.body;

      const lesson = await conversionService.generateCellLesson({
        topic,
        chapterNumber,
        audience,
        bookTitle,
        bookAuthor,
        chapterSummary,
      });

      return res.json({ lesson });
    } catch (error: any) {
      if (error?.message === 'GEMINI_KEY_MISSING') {
        return res.status(503).json({
          error: 'Chave do Gemini API não configurada no servidor.',
        });
      }
      console.error('Erro ao gerar lição:', error);
      return res.status(500).json({ error: error?.message || 'Erro ao gerar lição' });
    }
  });

  return router;
}
