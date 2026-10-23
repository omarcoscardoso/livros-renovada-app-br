import fs from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
import { BookInfo, Chapter } from '../../data/bookTypes';
import { IBookRepository } from '../repositories/bookRepository';
import {
  BookMetadataHints,
  ExtractedPdfData,
  PdfExtractorService,
} from './pdfExtractorService';

const BOOK_OUTLINE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    titlePt: {
      type: 'string',
      description: 'Título do livro em Português do Brasil.',
    },
    titleEn: {
      type: 'string',
      description: 'Título original do livro (ou em inglês).',
    },
    subtitlePt: {
      type: 'string',
      description: 'Subtítulo do livro em Português do Brasil.',
    },
    subtitleEn: {
      type: 'string',
      description: 'Subtítulo original do livro.',
    },
    author: {
      type: 'string',
      description: 'Nome do autor ou autores do livro.',
    },
    originalYear: {
      type: 'integer',
      description: 'Ano de publicação do livro.',
    },
    publisher: {
      type: 'string',
      description: 'Editora ou organização responsável pela obra.',
    },
    translatorNote: {
      type: 'string',
      description: 'Nota editorial sobre a tradução/estruturação da obra em Português do Brasil.',
    },
    coverPageNumber: {
      type: 'integer',
      description:
        'Número da página do PDF (1-indexada) onde está a capa principal ou folha de rosto do livro (normalmente 1).',
    },
    tableOfContentsPages: {
      type: 'array',
      description:
        'Lista com os números exatos de todas as páginas onde está localizado o Sumário ou Índice no PDF (ex: [3, 4]). Estas páginas NUNCA devem ser atribuídas como texto de leitura a nenhum capítulo.',
      items: { type: 'integer' },
    },
    chapterPlan: {
      type: 'array',
      description: 'Lista estruturada das seções preliminares e capítulos identificados no livro.',
      items: {
        type: 'object',
        properties: {
          number: {
            type: 'integer',
            description: 'Número sequencial: 0 para Dedicatória, Prefácio ou Introdução; 1..N para capítulos.',
          },
          type: {
            type: 'string',
            enum: ['dedication', 'preface', 'intro', 'chapter', 'appendix', 'conclusion'],
            description: 'Tipo da seção: dedication, preface, intro, chapter, appendix ou conclusion.',
          },
          titlePt: { type: 'string', description: 'Título da seção ou capítulo em Português do Brasil.' },
          titleEn: { type: 'string', description: 'Título original no PDF.' },
          subtitlePt: { type: 'string', description: 'Subtítulo da seção/capítulo em Português (se houver).' },
          startPage: {
            type: 'integer',
            description:
              'Página inicial exata no PDF onde este capítulo/seção realmente começa (NUNCA incluir páginas de Sumário ou Capa).',
          },
          endPage: { type: 'integer', description: 'Página final exata no PDF (1-indexada).' },
        },
        required: ['number', 'type', 'titlePt', 'startPage', 'endPage'],
      },
    },
  },
  required: [
    'titlePt',
    'titleEn',
    'subtitlePt',
    'author',
    'originalYear',
    'publisher',
    'translatorNote',
    'chapterPlan',
  ],
};

const CHAPTER_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    titlePt: { type: 'string', description: 'Título do capítulo em Português do Brasil.' },
    titleEn: { type: 'string', description: 'Título original do capítulo.' },
    subtitlePt: { type: 'string', description: 'Subtítulo descritivo do capítulo em Português do Brasil.' },
    subtitleEn: { type: 'string', description: 'Subtítulo original.' },
    estimatedReadTimeMinutes: { type: 'integer', description: 'Tempo estimado de leitura em minutos.' },
    summaryPt: {
      type: 'string',
      description: 'Resumo executivo denso e claro do capítulo em Português do Brasil (2 a 4 frases).',
    },
    keyPointsPt: {
      type: 'array',
      description: 'De 3 a 5 pontos-chave principais do capítulo em Português do Brasil.',
      items: { type: 'string' },
    },
    studyQuestionsPt: {
      type: 'array',
      description: 'De 3 a 4 perguntas práticas para reflexão, liderança ou estudo em grupo.',
      items: { type: 'string' },
    },
    sections: {
      type: 'array',
      description: 'Seções completas que compõem o texto integral do capítulo em Português do Brasil.',
      items: {
        type: 'object',
        properties: {
          titlePt: { type: 'string', description: 'Título da seção em Português do Brasil.' },
          titleEn: { type: 'string', description: 'Título original da seção.' },
          paragraphsPt: {
            type: 'array',
            description:
              'Parágrafos completos e fiéis ao texto original, traduzidos/redigidos em Português do Brasil de alta qualidade editorial.',
            items: { type: 'string' },
          },
          paragraphsEn: {
            type: 'array',
            description: 'Parágrafos correspondentes no idioma original (se aplicável).',
            items: { type: 'string' },
          },
        },
        required: ['titlePt', 'paragraphsPt'],
      },
    },
  },
  required: [
    'titlePt',
    'summaryPt',
    'keyPointsPt',
    'studyQuestionsPt',
    'sections',
  ],
};

export class GeminiConversionService {
  private repo: IBookRepository;
  private extractor: PdfExtractorService;

  constructor(repo: IBookRepository, extractor: PdfExtractorService) {
    this.repo = repo;
    this.extractor = extractor;
  }

  public resolveApiKey(overrideKey?: string): string {
    if (overrideKey && overrideKey.trim().length > 10) {
      return overrideKey.trim();
    }
    const storedKey = this.repo.getSetting('gemini_api_key');
    if (storedKey && storedKey.trim().length > 10) {
      return storedKey.trim();
    }
    const envKey = process.env.GEMINI_API_KEY || '';
    if (envKey && envKey !== 'MY_GEMINI_API_KEY' && envKey.trim().length > 10) {
      return envKey.trim();
    }
    return '';
  }

  private getClient(overrideKey?: string): GoogleGenAI | null {
    const key = this.resolveApiKey(overrideKey);
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
  }

  private async toBuffer(input: string | Buffer | Uint8Array): Promise<Buffer> {
    if (Buffer.isBuffer(input)) return input;
    if (input instanceof Uint8Array) return Buffer.from(input);
    return fs.readFile(input);
  }

  /**
   * Processes an uploaded PDF into the full BookInfo + Chapter[] reading format.
   * Accepts either a file path or a Buffer/Uint8Array.
   * Updates progress in SQLite at each step.
   */
  public async processUploadedBook(
    bookId: string,
    pdfInput: string | Buffer | Uint8Array,
    originalFilename: string,
    hints: BookMetadataHints = {},
    customInstructions?: string,
    overrideApiKey?: string
  ): Promise<void> {
    try {
      this.repo.updateBookConversionStatus(
        bookId,
        'processing',
        'Identificando capa e extraindo páginas do arquivo PDF...',
        8
      );

      // Extract cover image right away (defaults to first non-blank page among 1..3)
      const initialCover = await this.extractor.extractBookCoverImage(pdfInput, bookId);
      if (initialCover) {
        this.repo.updateBookContent(bookId, {
          coverImageFilename: initialCover.filename,
          coverPageNumber: initialCover.pageNumber,
          status: 'processing',
          conversionProgress: 'Capa identificada! Extraindo páginas e estrutura do PDF...',
          conversionPercent: 14,
        });
      }

      const extracted = await this.extractor.extractPdfPages(pdfInput);
      const localBaseline = this.extractor.buildStructuredBookFromPages(
        extracted,
        originalFilename,
        hints
      );

      const client = this.getClient(overrideApiKey);

      // If no Gemini API key is configured, finalize immediately with the local structured conversion
      if (!client) {
        this.repo.updateBookConversionStatus(
          bookId,
          'processing',
          'Estruturando capítulos, seções e guia de leitura localmente...',
          75
        );

        this.repo.updateBookContent(bookId, {
          ...localBaseline,
          coverColor: hints.coverColor || 'amber',
          coverImageFilename: initialCover?.filename,
          coverPageNumber: initialCover?.pageNumber ?? 1,
          status: 'ready',
          conversionProgress: 'Convertido localmente com capa extraída do PDF',
          conversionPercent: 100,
        });
        return;
      }

      // With Gemini API key: use Gemini 3.8 Flash via Interactions API
      this.repo.updateBookConversionStatus(
        bookId,
        'processing',
        'Analisando capa, sumário, metadados e capítulos com Gemini AI...',
        22
      );

      const { book: aiBook, aiCoverPage } = await this.convertWithGemini(
        client,
        bookId,
        pdfInput,
        extracted,
        localBaseline,
        hints,
        customInstructions
      );

      let finalCover = initialCover;
      if (
        aiCoverPage &&
        aiCoverPage >= 1 &&
        (!initialCover || aiCoverPage !== initialCover.pageNumber)
      ) {
        const refinedCover = await this.extractor.extractBookCoverImage(
          pdfInput,
          bookId,
          aiCoverPage
        );
        if (refinedCover) {
          finalCover = refinedCover;
        }
      }

      this.repo.updateBookContent(bookId, {
        ...aiBook,
        coverColor: hints.coverColor || 'amber',
        coverImageFilename: finalCover?.filename,
        coverPageNumber: finalCover?.pageNumber ?? 1,
        status: 'ready',
        conversionProgress: 'Conversão e estruturação com IA concluída com sucesso!',
        conversionPercent: 100,
      });
    } catch (error: any) {
      console.error(`Erro na conversão do livro ${bookId}:`, error);
      // Attempt graceful fallback to local extraction if possible so user still gets a readable book
      try {
        const extracted = await this.extractor.extractPdfPages(pdfInput);
        const fallbackBook = this.extractor.buildStructuredBookFromPages(
          extracted,
          originalFilename,
          hints
        );
        this.repo.updateBookContent(bookId, {
          ...fallbackBook,
          coverColor: hints.coverColor || 'amber',
          status: 'ready',
          conversionProgress: `Estruturado no modo local (Aviso IA: ${error?.message || 'falha na API'})`,
          conversionPercent: 100,
        });
      } catch (innerErr: any) {
        this.repo.updateBookConversionStatus(
          bookId,
          'error',
          'Falha ao processar o arquivo PDF.',
          0,
          innerErr?.message || error?.message || 'Erro desconhecido'
        );
      }
    }
  }

  private async convertWithGemini(
    client: GoogleGenAI,
    bookId: string,
    pdfInput: string | Buffer | Uint8Array,
    extracted: ExtractedPdfData,
    localBaseline: BookInfo,
    hints: BookMetadataHints,
    customInstructions?: string
  ): Promise<{ book: BookInfo; aiCoverPage?: number }> {
    const pdfBuffer = await this.toBuffer(pdfInput);
    const isSmallEnoughForInlinePdf = pdfBuffer.length <= 15 * 1024 * 1024; // <= 15MB
    const hasSelectableText = extracted.fullText.trim().length > 300;

    let pdfBase64: string | null = null;
    if (isSmallEnoughForInlinePdf && (!hasSelectableText || extracted.totalPages <= 80)) {
      pdfBase64 = pdfBuffer.toString('base64');
    }

    // Sample text from beginning/middle/end of book for outline extraction
    const samplePagesText = extracted.pages
      .slice(0, Math.min(25, extracted.pages.length))
      .map((p, i) => `--- PÁGINA ${i + 1} ---\n${p.slice(0, 1500)}`)
      .join('\n\n');

    const outlinePrompt = `Você é um arquiteto especialista em conservação e estruturação editorial de livros em PDF.
Analise as páginas extraídas deste livro em PDF (${extracted.totalPages} páginas) e mapeie sua estrutura com rigor absoluto, reproduzindo com fidelidade a ordem e a organização do livro físico original:

1. IDENTIFICAÇÃO E ISOLAMENTO DO SUMÁRIO / ÍNDICE (TABLE OF CONTENTS):
   - Localize exatamente em quais páginas está o Sumário ou Índice do livro (geralmente entre as páginas 3 e 12).
   - Preencha "tableOfContentsPages" com a lista de páginas do Sumário (ex.: [3, 4]).
   - ATENÇÃO CRÍTICA: As páginas do Sumário servem unicamente como índice de navegação. Elas NUNCA devem fazer parte do intervalo de leitura de nenhum capítulo! O primeiro capítulo do livro deve começar APÓS o Sumário (ou após a introdução).

2. SEÇÕES PRELIMINARES (FRONT MATTER):
   - Dedicatória / Agradecimentos: Se o livro contiver Dedicatória (Dedication) ou Agradecimentos (Acknowledgments), crie uma seção separada com type: "dedication" e number: 0, antes de qualquer capítulo.
   - Prefácio / Prólogo / Introdução: Se o livro contiver Prefácio (Preface/Foreword), Prólogo (Prologue) ou Introdução (Introduction), crie uma seção separada com type: "preface" ou type: "intro" e number: 0, antes de iniciar o Capítulo 1.

3. CAPÍTULOS PRINCIPAIS DO LIVRO (EXATIDÃO DA ESTRUTURA):
   - Mapeie cada capítulo (Capítulo 1, 2, ... N) respeitando rigorosamente a divisão e os títulos originais do livro.
   - Para cada capítulo, determine com precisão a página onde ele realmente começa (startPage) e onde termina (endPage).
   - Se houver Apêndices ou Conclusão ao final, adicione-os com type: "appendix" ou type: "conclusion".
   - Assegure que nenhum capítulo comece antes do término do Sumário.

${hints.titlePt ? `Título sugerido pelo usuário: "${hints.titlePt}"` : ''}
${hints.author ? `Autor sugerido pelo usuário: "${hints.author}"` : ''}
${customInstructions ? `Instruções específicas: ${customInstructions}` : ''}`;

    const outlineInputs: any[] = [];
    if (pdfBase64) {
      outlineInputs.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      });
    }
    outlineInputs.push({
      text: `${outlinePrompt}\n\nAmostra das páginas extraídas:\n${samplePagesText.slice(0, 30000)}`,
    });

    const outlineResponse = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: outlineInputs,
      config: {
        responseMimeType: 'application/json',
        responseSchema: BOOK_OUTLINE_JSON_SCHEMA,
      },
    });

    const outlineJson = JSON.parse(outlineResponse.text || '{}');
    const tocPagesSet = new Set<number>(
      Array.isArray(outlineJson.tableOfContentsPages) ? outlineJson.tableOfContentsPages : []
    );

    const chapterPlan: Array<{
      number: number;
      type?: 'dedication' | 'preface' | 'intro' | 'chapter' | 'appendix' | 'conclusion';
      titlePt: string;
      titleEn?: string;
      subtitlePt?: string;
      startPage: number;
      endPage: number;
    }> =
      Array.isArray(outlineJson.chapterPlan) && outlineJson.chapterPlan.length > 0
        ? outlineJson.chapterPlan
        : localBaseline.chapters.map((c, idx) => ({
            number: c.number || idx + 1,
            type:
              c.id === 'dedication'
                ? 'dedication'
                : c.id === 'preface'
                ? 'preface'
                : c.id === 'intro' || c.number === 0
                ? 'intro'
                : 'chapter',
            titlePt: c.titlePt,
            titleEn: c.titleEn,
            subtitlePt: c.subtitlePt,
            startPage: 1,
            endPage: Math.max(1, extracted.totalPages),
          }));

    const chapters: Chapter[] = [];
    const totalCh = chapterPlan.length;

    for (let idx = 0; idx < totalCh; idx++) {
      const plan = chapterPlan[idx];
      const progressPercent = Math.min(95, Math.round(25 + ((idx + 1) / totalCh) * 70));

      this.repo.updateBookConversionStatus(
        bookId,
        'processing',
        `Convertendo e estruturando ${plan.titlePt} (${idx + 1} de ${totalCh})...`,
        progressPercent
      );

      const startIdx = Math.max(0, (plan.startPage || 1) - 1);
      const endIdx = Math.min(
        extracted.pages.length,
        Math.max(startIdx + 1, plan.endPage || extracted.pages.length)
      );

      // Filtra páginas para garantir que páginas de Sumário NUNCA entrem no texto de leitura
      const chapterPagesFiltered = extracted.pages
        .slice(startIdx, endIdx)
        .map((p, i) => {
          const pageNum = startIdx + i + 1;
          if (tocPagesSet.has(pageNum)) {
            return null; // Exclui página do Sumário
          }
          return `[Página ${pageNum}]\n${p}`;
        })
        .filter(Boolean);

      const chapterPagesText = chapterPagesFiltered.join('\n\n');

      const chapterPrompt = `Você é um especialista em transcrição e preservação editorial fiel de livros em PDF.
Converta com rigor e fidelidade absoluta o conteúdo de "${plan.titlePt}" (Páginas ${plan.startPage} a ${plan.endPage}) do livro "${outlineJson.titlePt || hints.titlePt || localBaseline.titlePt}" de ${outlineJson.author || hints.author || localBaseline.author}.

DIRETRIZES DE MÁXIMA FIDELIDADE E EXATIDÃO DO TEXTO ORIGINAL:

1. FIDELIDADE TEXTUAL ABSOLUTA AO PDF:
   - Transcreva e preserve rigorosamente o texto exato do autor presente nestas páginas do PDF.
   - NÃO sintetize, NÃO resuma e NÃO omita parágrafos. Todos os argumentos, anedotas, citações, versículos bíblicos e exemplos do autor devem ser mantidos com total exatidão, exatamente como escritos no original.
   - NÃO faça adaptações ou conversões de textos bíblicos: mantenha as citações, versículos e referências bíblicas EXATAMENTE como constam no PDF original.
   - Se o livro estiver em outro idioma e precisar de tradução para o Português, traduza mantendo fidelidade estrita ao sentido original, sem alterar o estilo ou encurtar o texto.

2. ESTRUTURAÇÃO EM SEÇÕES E PARÁGRAFOS LÓGICOS:
   - Divida o texto em seções lógicas baseadas nos subtítulos e tópicos do próprio capítulo do livro.
   - Cada seção deve conter os parágrafos completos e densos extraídos das páginas (paragraphsPt).
   - Remova ruídos residuais de cabeçalhos de corrida repetitivos ou números de página soltos que possam ter ficado no texto.
   - NUNCA inclua partes de sumário, índices de outros capítulos ou notas de rodapé perdidas.

3. METADADOS DIDÁTICOS DO CAPÍTULO:
   - summaryPt: Síntese concisa da mensagem central deste capítulo (2 a 3 frases).
   - keyPointsPt: 3 a 5 pontos centrais discutidos pelo autor.
   - studyQuestionsPt: 3 a 4 perguntas reflexivas baseadas exclusivamente no conteúdo deste capítulo.
   - estimatedReadTimeMinutes: Tempo estimado de leitura baseado no volume real de palavras (~180 a 200 palavras por minuto).`;

      const chapterInputs: any[] = [];
      if (!hasSelectableText && pdfBase64) {
        chapterInputs.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64,
          },
        });
      }
      chapterInputs.push({
        text: `${chapterPrompt}\n\nTexto das páginas ${plan.startPage} a ${plan.endPage}:\n${chapterPagesText.slice(0, 45000)}`,
      });

      try {
        const chResponse = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: chapterInputs,
          config: {
            responseMimeType: 'application/json',
            responseSchema: CHAPTER_CONTENT_JSON_SCHEMA,
          },
        });

        const chData = JSON.parse(chResponse.text || '{}');
        const chNumber = typeof plan.number === 'number' ? plan.number : idx + 1;

        let chId = `chapter-${chNumber}`;
        if (plan.type === 'dedication' || plan.titlePt.toLowerCase().includes('dedicat')) {
          chId = 'dedication';
        } else if (plan.type === 'preface' || plan.titlePt.toLowerCase().includes('pref')) {
          chId = 'preface';
        } else if (plan.type === 'intro' || plan.titlePt.toLowerCase().includes('introdu') || chNumber === 0) {
          chId = 'intro';
        } else if (plan.type === 'appendix' || plan.titlePt.toLowerCase().startsWith('apêndice')) {
          chId = `appendix-${chNumber}`;
        }

        const sections = (Array.isArray(chData.sections) ? chData.sections : []).map(
          (sec: any, sIdx: number) => ({
            id: `${chId}-sec-${sIdx + 1}`,
            titlePt: String(sec.titlePt || `Seção ${sIdx + 1}`),
            titleEn: String(sec.titleEn || sec.titlePt || `Section ${sIdx + 1}`),
            paragraphsPt: Array.isArray(sec.paragraphsPt)
              ? sec.paragraphsPt.map(String)
              : [String(sec.paragraphsPt || '')],
            paragraphsEn: Array.isArray(sec.paragraphsEn)
              ? sec.paragraphsEn.map(String)
              : [],
          })
        );

        chapters.push({
          id: chId,
          number: chNumber,
          titlePt: String(chData.titlePt || plan.titlePt),
          titleEn: String(chData.titleEn || plan.titleEn || plan.titlePt),
          subtitlePt: chData.subtitlePt ? String(chData.subtitlePt) : plan.subtitlePt,
          subtitleEn: chData.subtitleEn ? String(chData.subtitleEn) : undefined,
          pages:
            plan.startPage === plan.endPage
              ? `${plan.startPage}`
              : `${plan.startPage}-${plan.endPage}`,
          estimatedReadTimeMinutes: Number(chData.estimatedReadTimeMinutes) || 6,
          summaryPt: String(
            chData.summaryPt || `Síntese de ${plan.titlePt}.`
          ),
          keyPointsPt: Array.isArray(chData.keyPointsPt)
            ? chData.keyPointsPt.map(String)
            : ['Texto integral preservado a partir do documento original.'],
          studyQuestionsPt: Array.isArray(chData.studyQuestionsPt)
            ? chData.studyQuestionsPt.map(String)
            : ['Como podemos aplicar os princípios deste capítulo na prática?'],
          sections:
            sections.length > 0
              ? sections
              : localBaseline.chapters[idx]?.sections || localBaseline.chapters[0].sections,
        });
      } catch (chErr) {
        console.warn(`Aviso ao converter capítulo ${idx + 1} via IA, usando extração local:`, chErr);
        const fallbackCh = localBaseline.chapters[idx] || localBaseline.chapters[0];
        chapters.push({
          ...fallbackCh,
          id: `chapter-${idx + 1}`,
          number: idx + 1,
          titlePt: plan.titlePt || fallbackCh.titlePt,
        });
      }
    }

    return {
      book: {
        titlePt: String(hints.titlePt || outlineJson.titlePt || localBaseline.titlePt),
        titleEn: String(outlineJson.titleEn || localBaseline.titleEn),
        subtitlePt: String(outlineJson.subtitlePt || localBaseline.subtitlePt),
        subtitleEn: String(outlineJson.subtitleEn || localBaseline.subtitleEn),
        author: String(hints.author || outlineJson.author || localBaseline.author),
        originalYear: Number(
          hints.originalYear || outlineJson.originalYear || localBaseline.originalYear
        ),
        publisher: String(hints.publisher || outlineJson.publisher || localBaseline.publisher),
        translatorNote: String(
          outlineJson.translatorNote ||
            'Edição digital estruturada e traduzida para o Português do Brasil com auxílio de inteligência artificial.'
        ),
        chapters,
      },
      aiCoverPage: Number(outlineJson.coverPageNumber) || 1,
    };
  }

  public async askStudyAssistant(params: {
    prompt: string;
    bookTitle?: string;
    bookAuthor?: string;
    chapterTitle?: string;
    contextText?: string;
    overrideApiKey?: string;
  }): Promise<string> {
    const client = this.getClient(params.overrideApiKey);
    if (!client) {
      throw new Error('GEMINI_KEY_MISSING');
    }

    const bookTitle = params.bookTitle || 'A Igreja em Células';
    const bookAuthor = params.bookAuthor || 'Larry Stockstill';

    const systemInstruction = `Você é um mentor pastoral, teólogo e especialista literário na obra "${bookTitle}" de ${bookAuthor}.
Responda em Português do Brasil com tom encorajador, prático, bíblico e fundamentado nos ensinamentos do livro em leitura.
Seja claro, organizado (use tópicos quando adequado) e cite passagens bíblicas e referências do capítulo quando relevante.`;

    const contents = `Livro: ${bookTitle} (${bookAuthor})
Capítulo em foco: ${params.chapterTitle || 'Geral'}
${params.contextText ? `Trecho de referência: "${params.contextText.slice(0, 2000)}..."\n\n` : ''}
Pergunta/Solicitação do leitor:
${params.prompt}`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text || 'Não foi possível gerar uma resposta.';
  }

  public async generateCellLesson(params: {
    topic?: string;
    chapterNumber?: number | string;
    audience?: string;
    bookTitle?: string;
    bookAuthor?: string;
    chapterSummary?: string;
    overrideApiKey?: string;
  }): Promise<string> {
    const client = this.getClient(params.overrideApiKey);
    if (!client) {
      throw new Error('GEMINI_KEY_MISSING');
    }

    const bookTitle = params.bookTitle || 'A Igreja em Células';
    const bookAuthor = params.bookAuthor || 'Larry Stockstill';

    const systemInstruction = `Você é um pastor e treinador de líderes de células e pequenos grupos. Crie um Roteiro Completo e Pronto para uma Reunião de Célula / Estudo em Grupo de 90 Minutos baseado no livro "${bookTitle}" (${bookAuthor}).
Estrutura obrigatória:
1. Título do Encontro e Texto Bíblico Central
2. Quebra-gelo Divertido e Relacional (15 min)
3. Momento de Louvor & Ação de Graças (10 min - sugestão de 2 a 3 cânticos conhecidos)
4. Compartilhamento da Palavra (30 min - 4 perguntas abertas para debate participativo em formato cruzado, NÃO monólogo)
5. Aplicação Prática e Oração em Trios (15 min)
6. Visão e Alvos de Multiplicação/Evangelismo (15 min - orar por amigos e visitantes)
7. Comunhão e Lanche (Confraternização final)

Formate em Markdown atraente com Português do Brasil de alto nível.`;

    const contents = `Gere uma lição baseada no Capítulo ${params.chapterNumber ?? '1'} do livro '${bookTitle}' com o tema: "${params.topic || 'Estudo do Capítulo'}".
${params.chapterSummary ? `Resumo do capítulo: ${params.chapterSummary}\n` : ''}
Público-alvo: ${params.audience || 'Geral (Jovens e Adultos)'}`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text || 'Não foi possível gerar o roteiro.';
  }

  public async extractMetadataWithAi(
    pagesText: string,
    overrideApiKey?: string,
    fallbackMetadata?: {
      titlePt?: string;
      titleEn?: string;
      subtitlePt?: string;
      author?: string;
      originalYear?: number;
      publisher?: string;
      synopsis?: string;
      category?: string;
    }
  ): Promise<{
    titlePt: string;
    titleEn?: string;
    subtitlePt?: string;
    author: string;
    originalYear: number;
    publisher?: string;
    synopsis?: string;
    category?: string;
    source: 'gemini' | 'local';
    error?: string;
  }> {
    const client = this.getClient(overrideApiKey);
    if (!client) {
      return {
        titlePt: fallbackMetadata?.titlePt || 'Novo Livro',
        titleEn: fallbackMetadata?.titleEn,
        subtitlePt: fallbackMetadata?.subtitlePt,
        author: fallbackMetadata?.author || 'Autor Desconhecido',
        originalYear: fallbackMetadata?.originalYear || new Date().getFullYear(),
        publisher: fallbackMetadata?.publisher || 'Edição Digital — Biblioteca IPR Viamão',
        synopsis: fallbackMetadata?.synopsis || 'Obra selecionada para leitura e estudo.',
        category: fallbackMetadata?.category || 'Vida Cristã',
        source: 'local',
      };
    }

    try {
      const prompt = `Você é um editor literário experiente e bibliotecário digital.
Analise a amostra de texto das primeiras páginas deste livro em PDF (capa, folha de rosto, ficha catalográfica e sumário) para identificar e traduzir com máxima fidelidade os metadados da obra para o Português do Brasil:
- Título principal em Português
- Título original (se houver)
- Subtítulo (se houver)
- Autor(es)
- Ano original de publicação
- Editora (publisher)
- Sinopse (2 a 4 frases cativantes resumindo a mensagem central para o leitor cristão)
- Categoria temática principal (escolha exatamente uma entre: Liderança, Células, Discipulado, Teologia, Biografias, Vida Cristã).

Amostra de texto das primeiras páginas:
${pagesText.slice(0, 20000)}`;

      const METADATA_EXTRACTION_JSON_SCHEMA = {
        type: 'object',
        properties: {
          titlePt: { type: 'string', description: 'Título em Português do Brasil.' },
          titleEn: { type: 'string', description: 'Título original ou em inglês.' },
          subtitlePt: { type: 'string', description: 'Subtítulo da obra em Português.' },
          author: { type: 'string', description: 'Nome completo do autor ou autores.' },
          originalYear: { type: 'integer', description: 'Ano de publicação.' },
          publisher: { type: 'string', description: 'Editora.' },
          synopsis: { type: 'string', description: 'Sinopse editorial clara e cativante em Português.' },
          category: { type: 'string', description: 'Categoria temática.' },
        },
        required: ['titlePt', 'author', 'originalYear', 'synopsis'],
      };

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: METADATA_EXTRACTION_JSON_SCHEMA,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        titlePt: parsed.titlePt || fallbackMetadata?.titlePt || 'Novo Livro',
        titleEn: parsed.titleEn || fallbackMetadata?.titleEn,
        subtitlePt: parsed.subtitlePt || fallbackMetadata?.subtitlePt,
        author: parsed.author || fallbackMetadata?.author || 'Autor Desconhecido',
        originalYear: Number(parsed.originalYear) || fallbackMetadata?.originalYear || new Date().getFullYear(),
        publisher: parsed.publisher || fallbackMetadata?.publisher || 'Edição Digital — Biblioteca IPR Viamão',
        synopsis: parsed.synopsis || fallbackMetadata?.synopsis || 'Obra selecionada para leitura e estudo.',
        category: parsed.category || fallbackMetadata?.category || 'Vida Cristã',
        source: 'gemini',
      };
    } catch (err: any) {
      console.warn('Erro ao chamar Gemini para metadados, revertendo para metadados locais:', err?.message || err);
      return {
        titlePt: fallbackMetadata?.titlePt || 'Novo Livro',
        titleEn: fallbackMetadata?.titleEn,
        subtitlePt: fallbackMetadata?.subtitlePt,
        author: fallbackMetadata?.author || 'Autor Desconhecido',
        originalYear: fallbackMetadata?.originalYear || new Date().getFullYear(),
        publisher: fallbackMetadata?.publisher || 'Edição Digital — Biblioteca IPR Viamão',
        synopsis: fallbackMetadata?.synopsis || 'Obra selecionada para leitura e estudo.',
        category: fallbackMetadata?.category || 'Vida Cristã',
        source: 'local',
        error: err?.message,
      };
    }
  }
}
