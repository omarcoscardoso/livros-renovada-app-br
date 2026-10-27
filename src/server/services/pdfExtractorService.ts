import fs from 'node:fs/promises';
import { extractText, getDocumentProxy, renderPageAsImage } from 'unpdf';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { BookInfo, BookSection, Chapter } from '../../data/bookTypes';
import { getStorageService, IStorageService } from './storageService';

export interface ExtractedPdfData {
  totalPages: number;
  pages: string[];
  fullText: string;
}

export interface BookMetadataHints {
  titlePt?: string;
  subtitlePt?: string;
  author?: string;
  originalYear?: number;
  publisher?: string;
  coverColor?: string;
}

export interface ExtractedCoverResult {
  filename: string;
  pageNumber: number;
}

export interface ExtractedLocalMetadata {
  titlePt: string;
  titleEn?: string;
  subtitlePt?: string;
  author: string;
  originalYear: number;
  publisher?: string;
  synopsis?: string;
  category?: string;
  source: 'local';
}

function formatTitleCase(text: string): string {
  if (!text) return '';
  const minorWords = new Set([
    'de', 'da', 'do', 'das', 'dos', 'em', 'e', 'of', 'and', 'the', 'in', 'a', 'an',
    'por', 'by', 'ao', 'aos', 'à', 'às', 'na', 'no', 'nas', 'nos', 'com', 'para', 'se'
  ]);
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && minorWords.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export class PdfExtractorService {
  private storageService: IStorageService;

  constructor(storageService?: IStorageService) {
    this.storageService = storageService || getStorageService();
  }

  private async toBuffer(input: string | Buffer | Uint8Array): Promise<Buffer> {
    if (Buffer.isBuffer(input)) return input;
    if (input instanceof Uint8Array) return Buffer.from(input);
    return fs.readFile(input);
  }

  public async extractPdfPages(pdfInput: string | Buffer | Uint8Array): Promise<ExtractedPdfData> {
    const buffer = await this.toBuffer(pdfInput);
    const uint8Array = new Uint8Array(buffer);

    const pdf = await getDocumentProxy(uint8Array);
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    let rawPages = Array.isArray(text)
      ? text.map((p) => String(p || ''))
      : [String(text || '')];

    // Phase 2, Step 3.0: Normalização de faux-bold em glyphs repetidos
    rawPages = rawPages.map((p) => this.collapseFauxBold(p));

    // Phase 2, Step 3.1: Expurgar cabeçalhos e rodapés de corrida repetitivos
    rawPages = this.stripRunningHeadersAndFooters(rawPages);

    // Phase 2, Step 3.1b: Expurgar notas de rodapé isoladas na base das páginas
    rawPages = rawPages.map((p) => this.stripFootnotes(p));

    // Phase 2, Steps 3.2 & 3.3: Desfazer quebras forçadas, des-hifenizar e normalizar tipografia por página
    const pages = rawPages.map((p) => this.cleanExtractedText(p));

    return {
      totalPages: totalPages || pages.length,
      pages,
      fullText: pages.join('\n\n'),
    };
  }

  /**
   * Fast, reliable local heuristic metadata extraction from PDF properties and first pages.
   * Runs in milliseconds without requiring external API keys.
   */
  public async extractLocalMetadata(
    pdfInput: string | Buffer | Uint8Array,
    originalFilename?: string
  ): Promise<ExtractedLocalMetadata> {
    const buffer = await this.toBuffer(pdfInput);

    const { pages } = await this.extractPdfPages(Buffer.from(buffer));
    const firstPagesText = pages.slice(0, 6).join('\n\n');

    let docMeta: any = null;
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      docMeta = await pdf.getMetadata();
    } catch {
      // Ignore metadata read error, continue with text
    }

    // 0. Extração de Ficha Catalográfica / CIP (Câmara Brasileira do Livro / SNEL / Catalogação na publicação)
    let cipAuthor = '';
    let cipTitle = '';
    let cipSubtitle = '';
    let cipPublisher = '';
    let cipYear: number | null = null;
    let cipCategory = '';

    const cipMatch = firstPagesText.match(
      /(?:Dados Internacionais de Catalogação na Publicação|Catalogação na fonte|CIP-Brasil|Ficha catalográfica)[\s\S]+?(?=Índice para catálogo|Todos os direitos|\n{3,}|$)/i
    );

    if (cipMatch) {
      const cipText = cipMatch[0];

      // Autor no formato Sobrenome, Nome
      const cipAuthorMatch = cipText.match(
        /([A-ZÀ-Ú][a-zà-ú]+),\s*([A-ZÀ-Úa-zà-ú.\s]+?)(?:[-—\n]|$)/
      );
      if (cipAuthorMatch) {
        cipAuthor = `${cipAuthorMatch[2].trim()} ${cipAuthorMatch[1].trim()}`.trim();
      }

      // Título : Subtítulo / Autor ... — Cidade : Editora, Ano
      const cipTitleSubMatch = cipText.match(
        /([A-ZÀ-Úa-zà-ú0-9\s—,'.]+?)\s*:\s*([A-ZÀ-Úa-zà-ú0-9\s—,'.]+?)\s*\/\s*([\s\S]+?)\s*—\s*([^:]+?)\s*:\s*([^,]+?),\s*(\d{4})/
      );
      if (cipTitleSubMatch) {
        const rawTitle = cipTitleSubMatch[1]
          .replace(/^[A-ZÀ-Ú][a-zà-ú]+,\s*[^:\n]+?[-—\n]\s*/i, '')
          .replace(/^[A-ZÀ-Ú][a-zà-ú]+,\s*[A-ZÀ-Úa-zà-ú.\s]+[-—\n]?/i, '')
          .replace(/^[\s\S]*?(?:[-—\n]|\s+)\s*(?=Os\b|[A-ZÀ-Ú0-9])/i, (m) => (m.includes(',') ? '' : m))
          .replace(/\n+/g, ' ')
          .trim();
        cipTitle = formatTitleCase(rawTitle);
        cipSubtitle = formatTitleCase(cipTitleSubMatch[2].replace(/\n+/g, ' ').trim());
        const credits = cipTitleSubMatch[3].split(';')[0].replace(/\n+/g, ' ').trim();
        if (credits && credits.includes(',')) {
          cipAuthor = credits.replace(/\s+/g, ' ');
        }
        cipPublisher = formatTitleCase(cipTitleSubMatch[5].replace(/\n+/g, ' ').trim());
        cipYear = parseInt(cipTitleSubMatch[6], 10);
      }

      // Identificação de assuntos/CDD da CIP
      const subjectMatch = cipText.match(/\b1\.\s*([^2\n]+)/);
      if (subjectMatch) {
        const subj = subjectMatch[1].toLowerCase();
        if (/hist[óo]ria|cristianismo|igreja/i.test(subj)) {
          cipCategory = 'História da Igreja';
        } else if (/consci[êe]ncia|neuro|mente|c[ée]rebro|psico/i.test(subj)) {
          cipCategory = 'Neurociência & Psicologia';
        } else if (/teologia|b[íi]blia|deus|crist[ãa]/i.test(subj)) {
          cipCategory = 'Teologia';
        } else if (/filosofia/i.test(subj)) {
          cipCategory = 'Filosofia';
        }
      }
    }

    // 1. Extração de Autor preliminar (a partir de CIP ou padrões de copyright/by/por)
    let author = cipAuthor || '';
    if (!author) {
      const authorPatterns = [
        /(?:by|por|autor|author)(?::|\s)\s*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s.]{2,35})/i,
        /(?:by|por)\s*\n+([A-ZÀ-Ú\s]{3,35})\b/i,
        /(?:©|\(c\))\s*\d{4}\s+by\s+([A-ZÀ-Úa-zà-ú\s]{3,35})/i,
      ];

      for (const pat of authorPatterns) {
        const m = firstPagesText.match(pat);
        if (m && m[1]) {
          const candidate = m[1].split('\n')[0].trim().replace(/[.,;]+$/, '');
          if (
            candidate.length >= 3 &&
            !/chapter|copyright|rights|editora|publishing|press|books|livros|inc|ltda|corp/i.test(
              candidate
            )
          ) {
            author = formatTitleCase(candidate);
            break;
          }
        }
      }
    }

    if (!author && docMeta?.info?.Author) {
      const rawAuthor = String(docMeta.info.Author).trim();
      const genericAuthors = ['writer', 'admin', 'user', 'openoffice', 'microsoft', 'word', 'zoran'];
      if (rawAuthor.length >= 3 && !genericAuthors.includes(rawAuthor.toLowerCase())) {
        author = formatTitleCase(rawAuthor);
      }
    }

    // 2. Extração da Folha de Rosto (páginas 1 a 4)
    let titlePageTitle = '';
    let titlePageSubtitle = '';
    let titlePageAuthor = '';
    let titlePagePublisher = '';

    for (let pIdx = 0; pIdx < Math.min(4, pages.length); pIdx++) {
      const pageText = pages[pIdx];
      if (/Dados Internacionais de Catalogação|copyright ©|todos os direitos/i.test(pageText)) {
        continue;
      }
      const lines = pageText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 2 && !/^\d+$/.test(l) && !/^page\s+\d+/i.test(l));

      if (lines.length >= 2 && lines.length <= 15) {
        const line0 = lines[0];
        const line1 = lines[1];
        const line2 = lines[2];
        const lastLine = lines[lines.length - 1];

        const isLine1ByAuthor = /^(?:by|por|autor|author)\b/i.test(line1);
        const isLine0MatchesAuthor = Boolean(
          author && line0.toLowerCase().includes(author.toLowerCase())
        );

        if (isLine1ByAuthor) {
          titlePageTitle = formatTitleCase(line0);
          if (!author) {
            titlePageAuthor = formatTitleCase(
              line1.replace(/^(?:by|por|autor|author)\s*[:.—-]?\s*/i, '')
            );
          }
          if (line2 && !/^(?:by|por|copyright|isbn|tradu)/i.test(line2)) {
            titlePageSubtitle = formatTitleCase(line2);
          }
        } else if (isLine0MatchesAuthor && line1 && line1.length >= 3 && line1.length <= 80) {
          titlePageTitle = formatTitleCase(line1);
          if (
            line2 &&
            line2.length >= 3 &&
            line2.length <= 100 &&
            !/tradu[çc][ãa]o|revis[ãa]o|edi[çc][ãa]o|editora|publicado/i.test(line2)
          ) {
            titlePageSubtitle = formatTitleCase(line2);
          }
        } else if (line0 && line0.length >= 3 && line0.length <= 80) {
          titlePageTitle = formatTitleCase(line0);
          if (
            line1 &&
            line1.length >= 3 &&
            line1.length <= 100 &&
            !/tradu[çc][ãa]o|revis[ãa]o|edi[çc][ãa]o|editora|publicado|por |by /i.test(line1)
          ) {
            titlePageSubtitle = formatTitleCase(line1);
          }
        }

        if (
          lastLine &&
          /companhia das letras|editora|press|books|publica[çc]|vozes|record|rocco/i.test(lastLine)
        ) {
          titlePagePublisher = formatTitleCase(lastLine);
        }

        if (titlePageTitle) break;
      }
    }

    if (!author && titlePageAuthor) {
      author = titlePageAuthor;
    }

    // 3. Extração de Ano (copyright / publicação)
    let originalYear = cipYear || new Date().getFullYear();
    if (!cipYear) {
      const copyrightMatch =
        firstPagesText.match(/(?:©|\(c\)|copyright)\s*(19\d{2}|20\d{2})/i) ||
        firstPagesText.match(/\b(19\d{2}|20\d{2})\b/);
      if (copyrightMatch) {
        originalYear = parseInt(copyrightMatch[1], 10);
      } else if (docMeta?.info?.CreationDate) {
        const dateStr = String(docMeta.info.CreationDate);
        const match = dateStr.match(/(19\d{2}|20\d{2})/);
        if (match) {
          originalYear = parseInt(match[1], 10);
        }
      }
    }

    // 4. Extração de Título e Subtítulo
    const cleanFilename = originalFilename
      ? originalFilename
          .replace(/\.pdf$/i, '')
          .replace(/[-_]+/g, ' ')
          .replace(/\b[0-9a-f]{6,}\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
      : '';

    let titlePt = cipTitle || titlePageTitle || '';
    let subtitlePt = cipSubtitle || titlePageSubtitle || '';

    // Se o título detectado for igual ao nome do autor, descarte e busque título real
    if (titlePt && author && titlePt.toLowerCase() === author.toLowerCase()) {
      titlePt = titlePageSubtitle || '';
      subtitlePt = '';
    }

    if (!titlePt && docMeta?.info?.Title) {
      const rawTitle = String(docMeta.info.Title).trim();
      if (rawTitle.length >= 3 && !/untitled|document/i.test(rawTitle)) {
        titlePt = formatTitleCase(rawTitle);
      }
    }

    if (!titlePt && cleanFilename) {
      if (cleanFilename.includes(' - ')) {
        const parts = cleanFilename.split(' - ');
        titlePt = formatTitleCase(parts[0].trim());
        if (!author && parts[1]) {
          author = formatTitleCase(parts[1].trim());
        }
      } else {
        titlePt = formatTitleCase(cleanFilename);
      }
    }

    if (!titlePt) titlePt = 'Livro sem Título';
    if (!author) author = 'Autor Desconhecido';

    // 5. Extração de Editora / Publisher
    let publisher = cipPublisher || titlePagePublisher || '';
    if (!publisher) {
      const pubMatch =
        firstPagesText.match(
          /(?:published by|publicado por|editora|editores)\s+([A-ZÀ-Úa-zà-ú0-9\s,.-]{3,60})/i
        ) ||
        firstPagesText.match(
          /\b(companhia das letras|editora vida|editora vozes|cpad|vida nova|editora record|rocco|editora intr[íi]nseca|sextante|zahar)\b/i
        );
      if (pubMatch && pubMatch[1]) {
        publisher = formatTitleCase(pubMatch[1].split('\n')[0].trim().replace(/[.,;]+$/, ''));
      }
    }
    if (!publisher) {
      publisher = 'Edição Digital';
    }

    // 6. Categoria e Sinopse
    let category = cipCategory || '';
    let synopsis = `Obra "${titlePt}" de ${author}. Leitura e estudo aprofundado com rigor e integridade textual.`;

    if (!category) {
      const normalizedTitleAndCip = (titlePt + ' ' + subtitlePt + ' ' + (cipMatch ? cipMatch[0] : ''))
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const normalizedAll = (firstPagesText + ' ' + titlePt + ' ' + subtitlePt)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (
        normalizedTitleAndCip.includes('cristianismo') ||
        normalizedTitleAndCip.includes('historia da igreja') ||
        normalizedTitleAndCip.includes('historia eclesiastica')
      ) {
        category = 'História da Igreja';
        synopsis = `Relato histórico e documental dos acontecimentos e marcos mais decisivos na história da igreja cristã.`;
      } else if (
        normalizedTitleAndCip.includes('cerebro') ||
        normalizedTitleAndCip.includes('neurolog') ||
        normalizedTitleAndCip.includes('neuroci') ||
        normalizedTitleAndCip.includes('psicol') ||
        (normalizedTitleAndCip.includes('consciencia') &&
          (normalizedTitleAndCip.includes('mente') ||
            normalizedTitleAndCip.includes('misterio') ||
            normalizedTitleAndCip.includes('corpo')))
      ) {
        category = 'Neurociência & Psicologia';
        synopsis = `Investigação aprofundada de ${author} sobre os fundamentos biológicos da mente, emoção e a construção da consciência de si.`;
      } else if (
        normalizedAll.includes('celula') ||
        normalizedAll.includes('cell group') ||
        normalizedAll.includes('pequeno grupo')
      ) {
        category = 'Células';
        synopsis = `Estudo fundamental sobre a visão e dinâmica da igreja em células e pequenos grupos.`;
      } else if (
        normalizedAll.includes('lider') ||
        normalizedAll.includes('lideranca') ||
        normalizedAll.includes('leadership')
      ) {
        category = 'Liderança';
        synopsis = `Princípios essenciais para formação, mentoria e capacitação de líderes ministeriais.`;
      } else if (
        normalizedAll.includes('discipulado') ||
        normalizedAll.includes('disciple')
      ) {
        category = 'Discipulado';
        synopsis = `Guia prático para acompanhamento espiritual, consolidação e formação de discípulos.`;
      } else if (
        normalizedAll.includes('teologia') ||
        normalizedAll.includes('doutrina') ||
        normalizedAll.includes('theology')
      ) {
        category = 'Teologia';
        synopsis = `Fundamentos teológicos e doutrinários para aprofundamento das Escrituras Sagradas.`;
      } else if (
        normalizedAll.includes('filosofia') ||
        normalizedAll.includes('filosof')
      ) {
        category = 'Filosofia';
        synopsis = `Ensaio e reflexões filosóficas sobre o conhecimento, a mente e a existência humana.`;
      } else if (
        normalizedAll.includes('vida crista') ||
        normalizedAll.includes('oracao') ||
        normalizedAll.includes('fe')
      ) {
        category = 'Vida Cristã';
        synopsis = `Leitura para edificação pessoal, oração e fortalecimento da caminhada diária de fé.`;
      } else {
        category = 'Geral';
      }
    }

    return {
      titlePt,
      subtitlePt: subtitlePt || undefined,
      author,
      originalYear,
      publisher,
      synopsis,
      category,
      source: 'local',
    };
  }

  /**
   * Discovers the cover page of the PDF (typically page 1, or page 2/3 if page 1 is blank,
   * or the page number identified by Gemini AI), renders it as a high-res PNG, crops excess
   * white scanner margins if needed, and saves it via IStorageService.
   */
  public async extractBookCoverImage(
    pdfInput: string | Buffer | Uint8Array,
    bookId: string,
    preferredPageNumber?: number
  ): Promise<ExtractedCoverResult | null> {
    try {
      const rawBuffer = await this.toBuffer(pdfInput);
      if (!rawBuffer || rawBuffer.length === 0) {
        return null;
      }
      const pdfDoc = await getDocumentProxy(new Uint8Array(rawBuffer));
      const totalPages = pdfDoc.numPages || 1;

      const candidatePages: number[] = [];
      if (
        preferredPageNumber &&
        preferredPageNumber >= 1 &&
        preferredPageNumber <= totalPages
      ) {
        candidatePages.push(preferredPageNumber);
      }
      for (let p = 1; p <= Math.min(3, totalPages); p++) {
        if (!candidatePages.includes(p)) {
          candidatePages.push(p);
        }
      }

      let selectedPage = candidatePages[0] || 1;
      let selectedCropBuffer: Buffer | null = null;

      for (const pageNum of candidatePages) {
        let renderedArrayBuffer: Uint8Array | ArrayBuffer | null = await renderPageAsImage(
          new Uint8Array(rawBuffer),
          pageNum,
          {
            canvasImport: () => import('@napi-rs/canvas'),
            scale: 2.0,
          }
        );

        let pagePngBuffer: Buffer | null = Buffer.from(renderedArrayBuffer);
        renderedArrayBuffer = null;

        const analysis = await this.analyzeAndCropCoverPage(pagePngBuffer);
        pagePngBuffer = null;

        if (analysis.hasVisualContent) {
          selectedPage = pageNum;
          selectedCropBuffer = analysis.croppedBuffer;
          break;
        }

        // Keep fallback to page 1 even if nearly blank
        if (!selectedCropBuffer) {
          selectedCropBuffer = analysis.croppedBuffer;
        }
      }

      if (!selectedCropBuffer) {
        return null;
      }

      const safeId = bookId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeId}_cover.png`;
      await this.storageService.saveCover(filename, selectedCropBuffer);

      return {
        filename,
        pageNumber: selectedPage,
      };
    } catch (error) {
      console.error('Aviso ao extrair capa do PDF:', error);
      return null;
    }
  }

  private async analyzeAndCropCoverPage(
    pngBuffer: Buffer
  ): Promise<{ hasVisualContent: boolean; croppedBuffer: Buffer }> {
    const img = await loadImage(pngBuffer);
    const width = img.width;
    const height = img.height;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);

    const { data } = ctx.getImageData(0, 0, width, height);
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let nonWhitePixels = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a > 15 && (r < 246 || g < 246 || b < 246)) {
          nonWhitePixels++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    const totalPixels = width * height;
    const nonWhiteRatio = nonWhitePixels / Math.max(1, totalPixels);
    const hasVisualContent = nonWhiteRatio > 0.004;

    if (!hasVisualContent || minX >= maxX || minY >= maxY) {
      canvas.width = 1;
      canvas.height = 1;
      return { hasVisualContent: false, croppedBuffer: pngBuffer };
    }

    const contentW = maxX - minX + 1;
    const contentH = maxY - minY + 1;

    // Check if the cover is an embedded graphic surrounded by wide white margins (e.g. < 85% of page width/height)
    const widthRatio = contentW / width;
    const heightRatio = contentH / height;
    const aspect = contentW / Math.max(1, contentH);

    if (
      widthRatio > 0.25 &&
      heightRatio > 0.25 &&
      (widthRatio < 0.88 || heightRatio < 0.88) &&
      aspect >= 0.45 &&
      aspect <= 0.9
    ) {
      const pad = Math.round(Math.min(width, height) * 0.01);
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(width - cropX, contentW + pad * 2);
      const cropH = Math.min(height - cropY, contentH + pad * 2);

      const outCanvas = createCanvas(cropW, cropH);
      const outCtx = outCanvas.getContext('2d');
      outCtx.fillStyle = '#ffffff';
      outCtx.fillRect(0, 0, cropW, cropH);
      outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const croppedBuffer = outCanvas.toBuffer('image/png');
      canvas.width = 1;
      canvas.height = 1;
      outCanvas.width = 1;
      outCanvas.height = 1;

      return {
        hasVisualContent: true,
        croppedBuffer,
      };
    }

    const croppedBuffer = canvas.toBuffer('image/png');
    canvas.width = 1;
    canvas.height = 1;

    return {
      hasVisualContent: true,
      croppedBuffer,
    };
  }

  /**
   * Phase 2, Step 3.1: Identifica e expurga cabeçalhos e rodapés de corrida repetitivos
   * e números de página isolados em todas as páginas do livro.
   */
  public stripRunningHeadersAndFooters(pages: string[]): string[] {
    if (pages.length <= 2) return pages;

    // Frequência das primeiras 2 linhas de cada página
    const headerFreq = new Map<string, number>();
    for (const page of pages) {
      const lines = page.split('\n').map((l) => l.trim()).filter(Boolean);
      for (let i = 0; i < Math.min(2, lines.length); i++) {
        const candidate = lines[i];
        if (candidate.length >= 3 && candidate.length <= 65) {
          headerFreq.set(candidate, (headerFreq.get(candidate) || 0) + 1);
        }
      }
    }

    // Limiar: linha repetida em >20% das páginas (ou >= 3 páginas) é tratada como running header
    const threshold = Math.max(3, Math.floor(pages.length * 0.2));
    const runningHeaders = new Set<string>();
    for (const [line, count] of headerFreq.entries()) {
      if (count >= threshold) {
        runningHeaders.add(line);
      }
    }

    // Determina se o documento possui numeração de página no topo (em mais de 35% das páginas)
    let topNumberPageCount = 0;
    for (const page of pages) {
      const firstLine = page.split('\n').map((l) => l.trim()).find(Boolean) || '';
      if (/^\s*(?:-\s*)?\d{1,4}(?:\s*-)?\s*$/.test(firstLine)) {
        topNumberPageCount++;
      }
    }
    const isTopPageNumberDoc = topNumberPageCount / Math.max(1, pages.length) > 0.35;

    return pages.map((page, pageIndex) => {
      let lines = page.split('\n');

      // Remove números isolados e cabeçalhos de corrida no topo
      while (lines.length > 0) {
        const first = lines[0].trim();
        const isIsolatedNum =
          /^\s*(?:-\s*)?\d{1,4}(?:\s*-)?\s*$/.test(first) ||
          /^(?:c\.\s*)?\d{1,4}(?:\s*[-–—]\s*\d{1,4})?$/i.test(first) ||
          /^(?:p[aá]gina|page)\s+\d{1,4}\s*$/i.test(first);
        const isRunning = runningHeaders.has(first);

        // Se for um número/ano isolado, mas a próxima linha parece ser um título de capítulo ou evento
        // (ex: "1\nPrimeiro século...", "64\nO incêndio de Roma", "70\nTito destrói Jerusalém"), NÃO devemos remover o número, pois é o cabeçalho do capítulo!
        if (isIsolatedNum && !isRunning && lines.length > 1) {
          const next = lines.slice(1).find((l) => l.trim().length > 0)?.trim() || '';
          const isNextTitle =
            next.length >= 2 &&
            next.length <= 80 &&
            /^[A-ZÀ-Ú0-9]/.test(next) &&
            !runningHeaders.has(next) &&
            !/[.!?]$/.test(next);

          // Só consideramos número de página no topo se coincidir aproximadamente com a página física (±3)
          const num = parseInt(first.replace(/\D/g, ''), 10);
          const isLikelyPageNumber = isTopPageNumberDoc && !isNaN(num) && Math.abs(num - (pageIndex + 1)) <= 3;

          if (isNextTitle && !isLikelyPageNumber) {
            break; // Preserva o ano/número do capítulo!
          }
        }

        if (isIsolatedNum || isRunning) {
          lines.shift();
        } else {
          break;
        }
      }

      // Remove números isolados e rodapés repetitivos na base
      while (lines.length > 0) {
        const last = lines[lines.length - 1].trim();
        const isIsolatedNum =
          /^\s*(?:-\s*)?\d{1,4}(?:\s*-)?\s*$/.test(last) ||
          /^(?:p[aá]gina|page)\s+\d{1,4}\s*$/i.test(last);
        const isRunning = runningHeaders.has(last);

        if (isIsolatedNum || isRunning) {
          lines.pop();
        } else {
          break;
        }
      }

      return lines.join('\n');
    });
  }

  public static readonly KNOWN_COMPOUND_WORDS = new Set<string>([
    'guarda-chuva', 'guarda-roupa', 'guarda-costas', 'guarda-civil', 'guarda-vidas', 'guarda-noturno',
    'porta-voz', 'porta-malas', 'porta-bandeira', 'porta-joias', 'porta-retratos',
    'beija-flor', 'couve-flor', 'ano-luz', 'segunda-feira', 'terça-feira', 'quarta-feira',
    'quinta-feira', 'sexta-feira', 'fim-de-semana', 'cor-de-rosa', 'arco-íris', 'pingue-pongue',
    'para-quedas', 'para-raios', 'bate-papo', 'alto-falante', 'baixo-relevo', 'meio-dia',
    'meio-termo', 'decreto-lei', 'médico-cirurgião', 'primeiro-ministro', 'tenente-coronel',
    'sul-americano', 'norte-americano', 'latino-americano', 'afro-brasileiro', 'luso-brasileiro',
    'bem-sucedido', 'bem-aventurado', 'bem-vindo', 'bem-estar', 'bem-nascido', 'bem-criado',
    'mal-estar', 'mal-humorado', 'mal-sucedido', 'mal-educado', 'recém-nascido', 'recém-casado',
    'recém-formado', 'recém-chegado', 'ex-presidente', 'ex-aluno', 'ex-diretor', 'ex-ministro',
    'vice-presidente', 'vice-diretor', 'vice-líder', 'vice-governador', 'pré-requisito',
    'pré-história', 'pós-graduação', 'pró-ativo', 'pró-atividade', 'pró-reitor', 'sem-terra',
    'sem-teto', 'sem-vergonha', 'joão-de-barro', 'joão-ninguém'
  ]);

  public static readonly STRICT_HYPHEN_PREFIXES = new Set<string>([
    'ex', 'vice', 'recém', 'além', 'aquém', 'sem', 'pós', 'pré', 'pró'
  ]);

  /**
   * Identifica e expurga notas de rodapé intercaladas ou situadas na base das páginas,
   * evitando que citações bibliográficas e notas se fundam com o texto contínuo do parágrafo.
   */
  public stripFootnotes(text: string): string {
    if (!text) return '';

    // Se o texto for um Sumário ou Índice, não deve expurgar linhas numeradas da listagem
    if (/^\s*(?:sum[áa]rio|índice|contents|table of contents)\b/i.test(text.trim())) {
      return text;
    }

    const lines = text.split('\n');
    if (lines.length <= 1) return text;

    // 1. Procura por divisor de rodapé (ex.: "___", "----", "–––") da metade inferior para baixo
    let dividerIndex = -1;
    for (let i = Math.floor(lines.length * 0.35); i < lines.length; i++) {
      const lineTrim = lines[i].trim();
      if (/^[_\-–—*]{3,}\s*$/.test(lineTrim)) {
        dividerIndex = i;
        break;
      }
    }

    if (dividerIndex !== -1) {
      return lines.slice(0, dividerIndex).join('\n').trimEnd();
    }

    // 2. Se não houver linha divisória explícita, detecta na base linhas com números sobrescritos
    // ou marcadores inequívocos de nota (¹²³, [1], (1), *, Nota:, N. do T.)
    let cutoffIndex = lines.length;
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 6); i--) {
      const line = lines[i].trim();
      if (!line) continue;

      const isSuperscriptOrSymbolFootnote =
        /^(?:[¹²³⁴⁵⁶⁷⁸⁹]|\[\d{1,2}\]|\(\d{1,2}\)|[\*†‡])\s+[A-ZÀ-Úa-zà-ú]/.test(line) ||
        /^(?:nota(?:\s+\d+)?|n\.\s*do\s*[te]|footnote|n\.t\.|n\.e\.)[:.\s]/i.test(line);

      // Nota numerada na base (ex: "1 Larry Stockstill...") com citação bibliográfica explícita
      const isExplicitNumberedFootnote =
        /^\d{1,2}[\.\)]\s+[A-ZÀ-Ú]/.test(line) &&
        /\b(?:p\.|pp\.|p[aá]g(?:ina)?s?|ed\.|editora|vol\.|ibid|op\.\s*cit|tradu[çc][ãa]o|citad[ao])\b/i.test(line);

      if (isSuperscriptOrSymbolFootnote || isExplicitNumberedFootnote) {
        cutoffIndex = i;
      } else {
        // Se encontramos uma linha que não é nota, interrompe a varredura da base
        break;
      }
    }

    if (cutoffIndex < lines.length) {
      return lines.slice(0, cutoffIndex).join('\n').trimEnd();
    }

    return text;
  }

  /**
   * Des-hifenização inteligente de final de linha:
   * Une palavras partidas por quebra de linha (ex: con-\nteúdo -> conteúdo, transi-\nção -> transição),
   * preservando hífens legítimos em palavras compostas reconhecidas (ex: guarda-\nchuva -> guarda-chuva, segunda-\nfeira -> segunda-feira).
   */
  public dehyphenateText(text: string): string {
    if (!text) return '';

    // Preserva travessão duplo/em-dash no final de linha com espaço: palavra--\noutra ou palavra—\noutra -> palavra — outra
    let result = text.replace(/(\p{L}+)[ \t]*(?:--|—|–)\n+([ \t]*)(\p{L}+)/gu, '$1 — $3');

    // Regex para hífens de final de linha: -, soft-hyphen (\u00AD), hyphen (\u2010), non-breaking hyphen (\u2011), figure dash (\u2012)
    const hyphenPattern = /(\p{L}+)[ \t]*[-\u00AD\u2010\u2011\u2012]\n+([ \t]*)(\p{L}+)/gu;

    result = result.replace(hyphenPattern, (_match, part1: string, _indent: string, part2: string) => {
      // Se a próxima linha começar com maiúscula, preserva o hífen ou travessão (ex: Curtis-\nKenneth)
      if (/^\p{Lu}/u.test(part2)) {
        return `${part1} - ${part2}`;
      }

      const p1Lower = part1.toLowerCase();
      const p2Lower = part2.toLowerCase();
      const candidateCompound = `${p1Lower}-${p2Lower}`;

      // 1. Checa se é palavra composta legítima conhecida
      if (PdfExtractorService.KNOWN_COMPOUND_WORDS.has(candidateCompound)) {
        return `${part1}-${part2}`;
      }

      // 2. Checa se o prefixo exige hífen obrigatório
      if (PdfExtractorService.STRICT_HYPHEN_PREFIXES.has(p1Lower)) {
        return `${part1}-${part2}`;
      }

      // 3. Prefixos que exigem hífen antes de 'h' ou mesma vogal (ex: anti-inflamatório, micro-ondas, auto-observação, sub-humano)
      const vowelHyphenPrefixes = new Set([
        'anti', 'auto', 'contra', 'extra', 'infra', 'intra', 'micro', 'macro',
        'neo', 'proto', 'pseudo', 'retro', 'semi', 'sobre', 'sub', 'super', 'ultra'
      ]);
      if (vowelHyphenPrefixes.has(p1Lower)) {
        if (p2Lower.startsWith('h') || p1Lower.slice(-1) === p2Lower[0]) {
          return `${part1}-${part2}`;
        }
      }

      // 4. Caso geral: palavra partida na quebra de linha do livro físico -> des-hifeniza unindo diretamente
      return `${part1}${part2}`;
    });

    // Casos residuais de hífen solto no final de linha
    result = result.replace(/[-\u00AD\u2010\u2011\u2012\u2013]\n+(\p{L})/gu, '$1');

    return result;
  }

  /**
   * Phase 2, Steps 3.2 & 3.3: Higienização rigorosa, dewrapping de linhas cortadas,
   * preservação de poesias/versículos e normalização tipográfica.
   */
  public cleanExtractedText(raw: string): string {
    if (!raw) return '';

    // 0. Expurgo inicial de notas de rodapé residuais na base do texto
    let text = this.stripFootnotes(raw);

    // 1. Normalização de quebras de linha e remoção de caracteres de controle
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // 1.5. Normalização de Faux Bold (double-strike glyphs em fontes não embutidas: ex: "OO iinnccêênnddiioo" -> "O incêndio")
    text = this.collapseFauxBold(text);

    // 2. Correção de anomalias conhecidas de OCR
    text = text
      .replace(/C™te\s*d[’']Ivoire/g, 'Côte d’Ivoire')
      .replace(/C™te/g, 'Côte')
      .replace(/(?<=\s|^)0\s+([a-zà-ú]+)/g, 'O $1');

    // 2.5. Des-hifenização inteligente de final de linha e preservação de palavras compostas
    text = this.dehyphenateText(text);

    // 3. Normalização tipográfica (travessões e aspas)
    text = text
      .replace(/--/g, '—')
      .replace(/\s+-\s+/g, ' — ')
      .replace(/[“”]/g, '"');

    // 4. Dewrapping de quebras de coluna forçadas sem pontuação terminal, com preservação de poesias/versículos
    const rawParagraphs = text.split(/\n{2,}/);
    const cleanedParas: string[] = [];

    for (const para of rawParagraphs) {
      const lines = para
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length <= 1) {
        if (lines[0]) cleanedParas.push(lines[0]);
        continue;
      }

      let joined = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!joined) {
          joined = line;
          continue;
        }

        const prevLine = lines[i - 1];
        const prevEndsWithPunct = /[.!?:;—"']$/.test(joined);
        const isHeadingLike = /^(?:cap[íi]tulo|chapter|parte|part|[A-ZÀ-Ú\s]{4,60}$)/i.test(line);
        const isAuthorOrMeta = /^(?:by|por|autor|author|copyright|editora|published by|publicado por|\(c\)|©)\b/i.test(line);
        const isTitleLine = line.length <= 50 && /^[A-ZÀ-Ú0-9\s:—-]+$/.test(line);
        const isNumberedItem = /^\d{1,3}\s*[.—-]\s+[A-ZÀ-Ú0-9]/.test(line);
        const isNumberedStandalone = /^(?:c\.\s*)?\d{1,4}(?:\s*[-–—]\s*\d{1,4})?$/i.test(line);
        const isPrevToc = /(?:^|[\s\p{P}])(?:sumario|indice|contents|table of contents)(?:[\s\p{P}]|$)/iu.test(
          joined.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        );

        const isPrevStandaloneNumber = i > 0 && /^(?:c\.\s*)?\d{1,4}(?:\s*[-–—]\s*\d{1,4})?$/i.test(lines[i - 1]);
        const isPrevTitleAfterNumber = i > 1 && /^(?:c\.\s*)?\d{1,4}(?:\s*[-–—]\s*\d{1,4})?$/i.test(lines[i - 2]) && lines[i - 1].length <= 80;

        const isCurrentTocHeading = /^(?:sum[áa]rio|índice|contents|table of contents)[:\s]*$/i.test(line.trim());
        const isCurrentTocLine = this.isTocLine(line);

        // Detecção de poesia / versículos bíblicos / citações recuadas:
        // Linhas curtas consecutivas (<=65 caracteres) ou com numeração de versículo / aspas de citação
        const isPoeticVerse =
          (prevLine.length <= 65 && line.length <= 65 && !/[-–—]$/.test(prevLine)) ||
          /^\d{1,3}\s+[A-ZÀ-Ú]/.test(line) ||
          /^[>«"“]/.test(line);

        const shouldBreak =
          prevEndsWithPunct ||
          isHeadingLike ||
          isAuthorOrMeta ||
          isTitleLine ||
          isNumberedItem ||
          isNumberedStandalone ||
          isPrevStandaloneNumber ||
          isPrevTitleAfterNumber ||
          isPrevToc ||
          isCurrentTocHeading ||
          isCurrentTocLine;

        if (isPoeticVerse) {
          // Em poesias e versículos, preserva a quebra de linha direta (\n)
          joined += '\n' + line;
        } else if (shouldBreak) {
          // Em prosa com quebra semântica ou pontuação terminal, separa parágrafos (\n\n)
          joined += '\n\n' + line;
        } else {
          // Em prosa contínua com quebra forçada de coluna física, unifica com espaço
          joined += ' ' + line;
        }
      }

      if (joined.trim()) {
        cleanedParas.push(joined.trim());
      }
    }

    return cleanedParas.join('\n\n').trim();
  }

  /**
   * Normaliza textos com espaçamento tipográfico expandido (letter tracking/kerning),
   * comum em cabeçalhos de capítulos, partes e sumários em PDFs e OCRs, ex.:
   * "C a p í t u l o 1" -> "Capítulo 1"
   * "S u m á r i o" -> "Sumário"
   * "P A R T E   A Z U L" -> "PARTE AZUL"
   * "E P Í L O G O" -> "EPÍLOGO"
   */
  public collapseSpacedLetters(text: string): string {
    if (!text) return text;
    return text
      .split('\n')
      .map((line) =>
        line
          .split(/[ \t]{2,}/)
          .map((segment) =>
            segment.replace(/\b([a-zA-ZÀ-ÿ])(?:[ \t]+([a-zA-ZÀ-ÿ])){2,}\b/g, (match) => {
              const chars = match.split(/[ \t]+/);
              if (chars.every((c) => c.length === 1)) {
                return chars.join('');
              }
              return match;
            })
          )
          .join(' ')
          .trim()
      )
      .join('\n')
      .trim();
  }

  /**
   * Normaliza textos gerados com faux-bold (double-strike de caracteres idênticos adjacentes)
   * comum em impressoras virtuais e geradores de PDF sem fontes bold embutidas.
   * Ex: "OO iinnccêênnddiioo ddee RRoommaa" -> "O incêndio de Roma"
   *     "6644" -> "64"
   *     "CC.. 115500" -> "C. 150"
   */
  public collapseFauxBold(text: string): string {
    if (!text) return text;

    const isWordFauxBold = (word: string): boolean => {
      const m = word.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}._-]+)([^\p{L}\p{N}]*)$/u);
      if (!m) return false;
      const core = m[2];
      if (/^\d{2}$/.test(core)) return false;
      const chars = Array.from(core);
      if (chars.length < 2 || chars.length % 2 !== 0) return false;
      for (let i = 0; i < chars.length; i += 2) {
        if (chars[i].toLowerCase() !== chars[i + 1].toLowerCase()) return false;
      }
      return true;
    };

    const collapseWord = (word: string, inFauxBoldLine: boolean): string => {
      const m = word.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}._-]+)([^\p{L}\p{N}]*)$/u);
      if (!m) return word;
      const [_, lead, core, trail] = m;
      const chars = Array.from(core);

      // Se for apenas 2 dígitos numéricos (como 22, 33, 44, 66, 88), é um número real de 2 dígitos
      if (/^\d{2}$/.test(core)) {
        return word;
      }

      // Algarismos romanos II, XX, CC em linhas normais não devem ser colapsados para uma única letra
      if (!inFauxBoldLine && /^(?:II|XX|CC)$/.test(core)) {
        return word;
      }

      if (chars.length >= 2 && chars.length % 2 === 0) {
        let isFaux = true;
        for (let i = 0; i < chars.length; i += 2) {
          if (chars[i].toLowerCase() !== chars[i + 1].toLowerCase()) {
            isFaux = false;
            break;
          }
        }
        if (isFaux) {
          return lead + chars.filter((_, idx) => idx % 2 === 0).join('') + trail;
        }
      }
      return word;
    };

    return text
      .split('\n')
      .map((line) => {
        const words = line.split(' ');
        const fauxWordCount = words.filter((w) => isWordFauxBold(w)).length;
        const inFauxBoldLine = fauxWordCount >= 2 || (words.length <= 2 && fauxWordCount >= 1);
        return words.map((w) => collapseWord(w, inFauxBoldLine)).join(' ');
      })
      .join('\n');
  }

  /**
   * Normaliza títulos para comparação flexível entre entradas do sumário e linhas do corpo do texto
   */
  public normalizeTitleForComparison(t: string): string {
    return t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^(?:cap[íi]tulo|capitulo|\d+)\s*[:.—-]?\s*/, '')
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Identifica se uma página pertence à ficha catalográfica (CIP / Catalogação na fonte / Dados internacionais)
   */
  public isCatalogingPage(pageText: string): boolean {
    if (!pageText) return false;
    return /(?:CIP-Brasil|catalogação-na-fonte|catalogação na publicação|dados internacionais de catalogação|ficha catalográfica)\b/i.test(
      pageText
    );
  }

  /**
   * Divide o conteúdo de uma página de Sumário que compartilha espaço com o corpo do texto:
   * 1. tocText: as linhas que compõem as entradas do Sumário
   * 2. bodyText: as linhas posteriores que já pertencem ao texto do livro
   */
  public splitTocPageContent(pageText: string): { tocText: string; bodyText: string } {
    const lines = pageText.split('\n');
    let firstTocLineIdx = -1;
    let lastTocLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const normLine = this.collapseSpacedLetters(line);
      const asciiLine = normLine.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const isTocHead = /(?:^|[\s\p{P}])(?:sumario|indice|contents|table of contents)(?:[\s\p{P}]|$)/iu.test(asciiLine);
      if (this.isTocLine(normLine) || isTocHead) {
        if (firstTocLineIdx === -1) firstTocLineIdx = i;
        lastTocLineIdx = i;
      }
    }

    if (lastTocLineIdx === -1) {
      return { tocText: '', bodyText: pageText };
    }

    const tocLines = lines.slice(firstTocLineIdx, lastTocLineIdx + 1);
    const bodyLines = [
      ...lines.slice(0, firstTocLineIdx),
      ...lines.slice(lastTocLineIdx + 1)
    ];

    const cleanBodyLines = bodyLines.filter(
      (l) => !/^\s*(?:-\s*)?\d{1,4}(?:\s*-)?\s*$/.test(l.trim())
    );

    return {
      tocText: tocLines.join('\n').trim(),
      bodyText: cleanBodyLines.join('\n').trim(),
    };
  }

  /**
   * Verifica se uma linha corresponde à estrutura típica de entrada de Sumário (título + pontilhado/espaços + número de página)
   */
  public isTocLine(line: string): boolean {
    const trimmed = this.collapseSpacedLetters(line.trim());
    if (!trimmed || trimmed.length < 3) return false;
    // 1. Linha terminando com sequência de pontos/espaços/tabs e número de página: "1. Sair à luz ... 17"
    if (/(?:\.{2,}|\s{3,}|\t+)\s*\d{1,4}\s*$/.test(trimmed)) {
      return true;
    }
    // 1.5. Linha no formato de entrada de sumário com título e número de página (mesmo com espaço simples): "O incêndio de Roma 10"
    if (/^[A-ZÀ-Ú].*?\s+\d{1,4}\s*$/.test(trimmed) && !/^(?:parte|cap[íi]tulo|chapter)\s+\d+$/i.test(trimmed)) {
      const match = trimmed.match(/^(.*?)\s+(\d{1,4})\s*$/);
      if (match && match[1].length <= 85 && match[1].length >= 3 && !/[.!?:;]$/.test(match[1].trim())) {
        return true;
      }
    }
    // 2. Linhas no padrão "Capítulo X ... 12" ou "Parte 1 ... 15"
    if (/^(?:parte\s+\d+|parte\s+[ivxlcdm]+|cap[íi]tulo\s+\d+|\d+\s*[.—-]).*?\s+\d{1,4}$/i.test(trimmed)) {
      return true;
    }
    // 3. Entrada de sumário numerada sem número de página: "1. Primeiro século da Era Cristã" ou "Capítulo 1"
    if (/^(?:\d{1,2}\s*[.—-]\s+[A-ZÀ-Ú0-9]|cap[íi]tulo\s+\d+\b)/i.test(trimmed)) {
      return true;
    }
    return false;
  }

  /**
   * Identifica se uma página isolada pertence ao Sumário / Índice do livro
   */
  public isTableOfContentsPage(pageText: string): boolean {
    if (!pageText) return false;
    if (this.isCatalogingPage(pageText)) return false;
    const normalizedText = this.collapseSpacedLetters(pageText);
    const lines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return false;

    const firstLines = lines.slice(0, 12).join(' ');
    const asciiFirstLines = firstLines.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const isBackMatterIndex = /(?:^|[\s\p{P}])indice\s+(?:remissivo|onom[áa]stico|alfab[ée]tico|tem[áa]tico|anal[íi]tico|de\s+assuntos|de\s+nomes)\b/iu.test(asciiFirstLines);
    if (isBackMatterIndex) return false;

    const hasTocHeading = /(?:^|[\s\p{P}])(?:sumario|indice|contents|table of contents|sumario geral|indice geral)(?:[\s\p{P}]|$)/iu.test(asciiFirstLines);

    let tocLineCount = 0;
    for (const line of lines) {
      if (this.isTocLine(line)) {
        tocLineCount++;
      }
    }

    if (hasTocHeading && (tocLineCount >= 1 || lines.length <= 35)) {
      return true;
    }

    return tocLineCount >= 3;
  }

  /**
   * Identifica de maneira contínua o bloco integral de páginas do Sumário (incluindo sumários multi-páginas como páginas 6 a 12)
   */
  public identifyTableOfContentsPages(
    pages: Array<{ pageNumber: number; text: string }>
  ): Set<number> {
    const tocPageNumbers = new Set<number>();
    let inTocBlock = false;

    for (const page of pages.slice(0, 35)) {
      const pageText = page.text.trim();
      if (!pageText) continue;
      if (this.isCatalogingPage(pageText)) continue;

      const normalizedText = this.collapseSpacedLetters(pageText);
      const lines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean);
      const firstLines = lines.slice(0, 12).join(' ');
      const asciiFirstLines = firstLines.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const isBackMatterIndex = /(?:^|[\s\p{P}])indice\s+(?:remissivo|onom[áa]stico|alfab[ée]tico|tem[áa]tico|anal[íi]tico|de\s+assuntos|de\s+nomes)\b/iu.test(asciiFirstLines);

      const hasTocHeading =
        !isBackMatterIndex &&
        /(?:^|[\s\p{P}])(?:sumario|indice|contents|table of contents|sumario geral|indice geral)(?:[\s\p{P}]|$)/iu.test(asciiFirstLines);

      const dotLeaderMatches = (pageText.match(/(?:\.{2,}|\s{4,})\s*\d{1,4}/g) || []).length;

      let tocLineCount = 0;
      for (const line of lines) {
        if (this.isTocLine(line)) {
          tocLineCount++;
        }
      }

      if (hasTocHeading && (dotLeaderMatches >= 1 || tocLineCount >= 1 || lines.length <= 35)) {
        inTocBlock = true;
        tocPageNumbers.add(page.pageNumber);
        continue;
      }

      if (inTocBlock) {
        // Continua o bloco de sumário se a página contiver líderes pontilhados ou múltiplas entradas de índice
        if (dotLeaderMatches >= 1 || tocLineCount >= 3) {
          tocPageNumbers.add(page.pageNumber);
        } else {
          // Encerra o sumário ao encontrar uma página sem líderes de pontos e com conteúdo
          inTocBlock = false;
          break;
        }
      } else if (dotLeaderMatches >= 3 || tocLineCount >= 3) {
        inTocBlock = true;
        tocPageNumbers.add(page.pageNumber);
      }
    }

    return tocPageNumbers;
  }

  /**
   * Converte números arábicos, numerais romanos ou por extenso em inteiros
   */
  public parseNumberToken(token?: string): number | null {
    if (!token) return null;
    const clean = token.replace(/[:.—-]$/, '').trim();
    const arabic = parseInt(clean, 10);
    if (!isNaN(arabic)) return arabic;

    const romanMap: Record<string, number> = {
      i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
      xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20,
      xxi: 21, xxii: 22, xxiii: 23, xxiv: 24, xxv: 25, xxx: 30,
    };
    const lower = clean.toLowerCase();
    if (romanMap[lower]) return romanMap[lower];

    const wordMap: Record<string, number> = {
      um: 1, primeiro: 1, primeira: 1, one: 1, first: 1,
      dois: 2, segundo: 2, segunda: 2, two: 2, second: 2,
      tres: 3, três: 3, terceiro: 3, terceira: 3, three: 3, third: 3,
      quatro: 4, quarto: 4, quarta: 4, four: 4, fourth: 4,
      cinco: 5, quinto: 5, quinta: 5, five: 5, fifth: 5,
      seis: 6, sexto: 6, sexta: 6, six: 6, sixth: 6,
      sete: 7, setimo: 7, sétimo: 7, setima: 7, sétima: 7, seven: 7, seventh: 7,
      oito: 8, oitavo: 8, oitava: 8, eight: 8, eighth: 8,
      nove: 9, nono: 9, nona: 9, nine: 9, ninth: 9,
      dez: 10, decimo: 10, décimo: 10, decima: 10, décima: 10, ten: 10, tenth: 10,
    };
    if (wordMap[lower]) return wordMap[lower];

    return null;
  }

  /**
   * Verifica se uma linha corresponde a qualquer delimitador estrutural (Parte, Capítulo, Prefácio, Introdução, Conclusão, Apêndice, Notas, Agradecimentos)
   */
  public isAnyDelimiter(line: string): boolean {
    const trimmed = this.collapseSpacedLetters(line.trim());
    if (!trimmed || trimmed.length > 80) return false;
    if (
      /^(?:cap[íi]tulo|capitulo|chapter|pref[áa]cio|prefacio|preface|pr[óo]logo|prologue|introdu[çc][ãa]o|introduction|conclus[ãa]o|conclusion|ep[íi]logo|epilogue|ap[êe]ndice|appendix|notas|agradecimentos|leia[, ]+por\s+favor|parte\s+[a-z0-9à-ú\s]+|(?:primeira|segunda|terceira|quarta|quinta)\s+parte)\b/i.test(
        trimmed
      )
    ) {
      return true;
    }
    // Padrão de capítulo numerado direto sem a palavra "Capítulo": "1. Sair à luz" ou "4- O vago sinal"
    if (/^\d{1,2}\s*[.—-]\s+[A-ZÀ-Ú]/.test(trimmed)) {
      const rest = trimmed.replace(/^\d{1,2}\s*[.—-]\s+/, '').trim();
      if (
        rest.length <= 60 &&
        !/[,;:-]$/.test(rest) &&
        !/^[,\s]/.test(rest) &&
        !/\((?:Nova York|Oxford|op\. cit\.|Paris|Cambridge|Berkeley|São Paulo|Basic Books)/i.test(rest) &&
        !/^(?:mesmo sendo|todas as|foram chamadas|várias dessas|comprometimentos da|todos os|o hipocampo|os cortices|os mapas|as mudanças|uma lesão|as regiões|essas mesmas|acionamento do|esta é uma|para um exemplo|a síndrome do|ver\s+[A-Z]|discuti esse|já descrevi)\b/i.test(rest)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Identifica se uma linha atua como delimitador estrito de capítulo, prefácio, introdução ou seção estrutural
   */
  public matchDelimiter(
    line: string,
    nextLine?: string,
    context?: {
      currentChapterNumber?: number;
      inBackMatter?: boolean;
      currentUnitType?: string;
      tocEntries?: any[];
      pageNumber?: number;
      bookTitle?: string;
      afterNextLine?: string;
    }
  ): {
    type: 'preface' | 'intro' | 'chapter' | 'conclusion' | 'appendix' | 'part';
    number?: number;
    title: string;
    consumedNextLine?: boolean | number;
    titleRemainder?: string;
  } | null {
    const rawTrimmed = line.trim();
    if (!rawTrimmed) return null;
    const trimmed = this.collapseSpacedLetters(rawTrimmed);
    if (!trimmed) return null;
    if (trimmed.length > 130 && !/^(?:notas|agradecimentos|ap[êe]ndice)\b/i.test(trimmed)) return null;

    // Rejeição estrita de linhas de ficha catalográfica (CIP) que contêm numeração
    if (/\b(?:I+\.\s*Título|CDD\b|CDU\b|colab\.)/i.test(trimmed)) return null;

    // Se já estivermos no pós-textual de Notas, não criamos novos capítulos ou apêndices
    if (context?.currentUnitType === 'notes') {
      const endMatch = trimmed.match(
        /^(?:conclus[ãa]o|conclusion|ep[íi]logo|epilogue|agradecimentos|acknowledgements|acknowledgments|bibliografia|refer[êe]ncias)\b/i
      );
      if (endMatch) {
        return {
          type: 'conclusion',
          title: 'Agradecimentos',
        };
      }
      return null;
    }

    // 0. Delimitador de Parte (PARTE 1, PARTE 2 – SENTIR E CONHECER, PARTE AZUL, PARTE NEGRA)
    const partRegex =
      /^(?:parte\s+([a-z0-9à-ú\s]+)|(?:primeira|segunda|terceira|quarta|quinta|sexta|s[ée]tima|oitava|nona|d[ée]cima)\s+parte)\b(?:\s*[—–-]\s*(.*))?$/i;
    const partMatch = trimmed.match(partRegex);
    if (partMatch) {
      const rawPart = (partMatch[1] || partMatch[0]).trim();
      const rest = partMatch[2]?.trim() || '';
      let title = `Parte ${formatTitleCase(rawPart.replace(/^parte\s+/i, ''))}`;
      let consumedNextLine = false;

      if (rest) {
        title = `${title} — ${rest.replace(/^[:.—-\s]+/, '')}`;
      } else if (
        nextLine &&
        nextLine.trim().length > 2 &&
        nextLine.trim().length < 80 &&
        !this.isAnyDelimiter(nextLine) &&
        !/[.!?]$/.test(nextLine.trim()) &&
        !(context?.tocEntries && context.tocEntries.some((e) => !e.isPart && this.normalizeTitleForComparison(e.title) === this.normalizeTitleForComparison(nextLine)))
      ) {
        const nextNorm = this.collapseSpacedLetters(nextLine.trim());
        if (!/^(?:cap[íi]tulo|chapter|\d+)\b/i.test(nextNorm)) {
          title = `${title} — ${nextLine.trim()}`;
          consumedNextLine = true;
        }
      }

      return {
        type: 'part',
        title,
        consumedNextLine,
      };
    }

    // 1. Delimitador Prefácio / Nota da Autora
    const prefaceRegex =
      /^(?:pref[áa]cio|prefacio|preface|pr[óo]logo|prologue|leia[, ]+por\s+favor)\b(?:\s*[:.—-]?\s*(.*))?$/i;
    const prefMatch = trimmed.match(prefaceRegex);
    if (prefMatch) {
      const rest = prefMatch[1]?.trim() || '';
      let title = /^leia/i.test(trimmed) ? 'Leia, por favor' : 'Prefácio';
      let consumedNextLine = false;

      if (rest) {
        title = `${title}: ${rest.replace(/^[:.—-\s]+/, '')}`;
      } else if (
        nextLine &&
        nextLine.trim().length > 2 &&
        nextLine.trim().length < 80 &&
        !this.isAnyDelimiter(nextLine) &&
        !/[.!?]$/.test(nextLine.trim())
      ) {
        title = `${title}: ${nextLine.trim()}`;
        consumedNextLine = true;
      }

      return {
        type: 'preface',
        number: 0,
        title,
        consumedNextLine,
      };
    }

    // 2. Delimitador Capítulo explícito: 'Capítulo 1', 'C a p í t u l o 1', 'Capítulo 1: O Começo'
    if (!context?.inBackMatter) {
      const chapterRegex =
        /^(?:cap[íi]tulo|capitulo|chapter)\b(?:\s*[:.—-]?\s*([a-z0-9à-ú]+))?(?:\s*[:.—-]?\s*(.*))?$/i;
      const chapMatch = trimmed.match(chapterRegex);
      if (chapMatch) {
        const rawNum = chapMatch[1]?.trim();
        const parsedNum = this.parseNumberToken(rawNum);
        const rest = chapMatch[2]?.trim() || '';

        // Se for menção adverbial no texto como 'capítulo 7, comprometimentos...' -> rejeita
        const isCommaRef = /^,/.test(rest);
        const isShort = rest.length <= 60;

        let isSequential = true;
        if (context?.currentChapterNumber !== undefined && parsedNum !== null) {
          if (context.currentChapterNumber === 0) {
            isSequential = parsedNum === 1;
          } else {
            isSequential = parsedNum === context.currentChapterNumber + 1;
          }
        }

        if (isSequential && !isCommaRef && isShort) {
          let title = trimmed;
          let consumedNextLine = false;

          if (parsedNum !== null && rest) {
            title = `Capítulo ${parsedNum} — ${formatTitleCase(rest.replace(/^[:.—-\s]+/, ''))}`;
          } else if (
            parsedNum !== null &&
            !rest &&
            nextLine &&
            nextLine.trim().length > 2 &&
            nextLine.trim().length < 80 &&
            !this.isAnyDelimiter(nextLine) &&
            !/[.!?]$/.test(nextLine.trim())
          ) {
            title = `Capítulo ${parsedNum} — ${formatTitleCase(nextLine.trim())}`;
            consumedNextLine = true;
          } else if (parsedNum !== null && !rest) {
            title = `Capítulo ${parsedNum}`;
          }

          return {
            type: 'chapter',
            number: parsedNum ?? undefined,
            title,
            consumedNextLine,
          };
        }
      }
    }

    // 3. Delimitador Capítulo numerado direto: '1. Sair à luz', '4- O vago sinal', '10. Usando a consciência'
    if (!context?.inBackMatter) {
      const numberedChapRegex = /^(\d{1,2})\s*[.—-]\s*([A-ZÀ-Ú].*)$/;
      const numMatch = trimmed.match(numberedChapRegex);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        const rest = numMatch[2].trim();

        const isShort = rest.length <= 60;
        const noTerminalPunctuation = !/[,;:-]$/.test(rest);
        const noLeadingPunctuation = !/^[,\s]/.test(rest);
        const noCitation = !/\((?:Nova York|Oxford|op\. cit\.|Paris|Cambridge|Berkeley|São Paulo|Basic Books)/i.test(rest);
        const noNarrativePhrases = !/^(?:mesmo sendo|todas as|foram chamadas|várias dessas|comprometimentos da|todos os|o hipocampo|os cortices|os mapas|as mudanças|uma lesão|as regiões|essas mesmas|acionamento do|esta é uma|para um exemplo|a síndrome do|ver\s+[A-Z]|discuti esse|já descrevi|recentemente está|outros autores|a separação da)\b/i.test(rest);

        let isSequential = true;
        if (context?.currentChapterNumber !== undefined) {
          if (context.currentChapterNumber === 0) {
            isSequential = num === 1;
          } else {
            isSequential = num === context.currentChapterNumber + 1;
          }
        }

        if (isShort && noTerminalPunctuation && noLeadingPunctuation && noCitation && noNarrativePhrases && isSequential) {
          let consumedNextLine = false;
          if (
            nextLine &&
            this.normalizeTitleForComparison(nextLine) === this.normalizeTitleForComparison(rest)
          ) {
            consumedNextLine = true;
          }
          const title = `Capítulo ${num}: ${rest}`;
          return {
            type: 'chapter',
            number: num,
            title,
            consumedNextLine,
          };
        }
      }
    }

    // 3.5 Delimitador Capítulo por número isolado seguido de título na linha seguinte:
    // Ex: line = "1", nextLine = "Primeiro século da Era cristã"
    // Ou guiado pelo sumário: line = "1" e nextLine corresponde ao título do sumário daquele capítulo
    if (!context?.inBackMatter) {
      const standaloneNumMatch = trimmed.match(/^(\d{1,2})$/);
      if (standaloneNumMatch && nextLine) {
        const num = parseInt(standaloneNumMatch[1], 10);
        const cleanNext = nextLine.trim();

        let isSequential = true;
        if (context?.currentChapterNumber !== undefined) {
          if (context.currentChapterNumber === 0) {
            isSequential = num === 1;
          } else {
            isSequential = num === context.currentChapterNumber + 1;
          }
        }

        const matchingTocEntry = context?.tocEntries?.find((e: any) => {
          if (e.isPart) return false;
          if (e.chapterNumber === num) return true;
          return this.normalizeTitleForComparison(e.title) === this.normalizeTitleForComparison(cleanNext);
        });

        const isNextLineTitle =
          cleanNext.length >= 2 &&
          cleanNext.length <= 80 &&
          !/[.!?:;]$/.test(cleanNext) &&
          !this.isAnyDelimiter(cleanNext) &&
          (/^[A-ZÀ-Ú]/.test(cleanNext) || /^[0-9]/.test(cleanNext));

        // Se houver correspondência com entrada de sumário mas o número isolado não for sequencial e nem for o chapterNumber do sumário,
        // o número isolado é na verdade uma data histórica (ex.: "64" para o ano de Roma), não o número do capítulo!
        const isValidChapterNumber =
          matchingTocEntry?.chapterNumber === num ||
          (isSequential && (!matchingTocEntry || matchingTocEntry.chapterNumber === undefined));

        if (isValidChapterNumber && isNextLineTitle) {
          const title = matchingTocEntry?.title
            ? `Capítulo ${num} — ${formatTitleCase(matchingTocEntry.title)}`
            : `Capítulo ${num} — ${formatTitleCase(cleanNext)}`;

          return {
            type: 'chapter',
            number: num,
            title,
            consumedNextLine: true,
          };
        }
      }
    }

    // 3.6 Delimitador para capítulos que começam com cabeçalho de data/ano seguido do título do evento
    // Ex: "64\nO incêndio de Roma", "C. 150\nJustino Mártir escreve sua Apologia", "1966-1976\nA igreja chinesa..."
    if (!context?.inBackMatter && context?.tocEntries && nextLine) {
      const isDateHeader = /^(?:c\.\s*)?\d{1,4}(?:\s*[-–—]\s*\d{1,4})?$/i.test(trimmed);
      if (isDateHeader) {
        const cleanNext = nextLine.trim();
        const normNext = this.normalizeTitleForComparison(cleanNext);
        const normCombined = context.afterNextLine
          ? this.normalizeTitleForComparison(`${cleanNext} ${context.afterNextLine.trim()}`)
          : '';

        let titleRemainder: string | undefined = undefined;

        const matchingEntry = context.tocEntries.find((entry) => {
          if (entry.isPart) return false;
          const normEntry = this.normalizeTitleForComparison(entry.title);
          if (context.pageNumber !== undefined && entry.targetPage !== undefined) {
            if (Math.abs(context.pageNumber - entry.targetPage) > 3) return false;
          }

          if (normEntry === normNext || (Boolean(normCombined) && normEntry === normCombined)) {
            return true;
          }

          if (normEntry.startsWith(normNext) && context.afterNextLine) {
            const remainderNorm = normEntry.slice(normNext.length);
            const normAfter = this.normalizeTitleForComparison(context.afterNextLine);
            if (normAfter.startsWith(remainderNorm)) {
              const entryWords = entry.title.trim().split(/\s+/);
              const nextWords = cleanNext.split(/\s+/);
              titleRemainder = entryWords.slice(nextWords.length).join(' ');
              return true;
            }
          }

          return false;
        });

        if (matchingEntry) {
          const nextNum = (context?.currentChapterNumber || 0) + 1;
          const chapNum = matchingEntry.chapterNumber ?? nextNum;
          const isCombined = Boolean(normCombined) && this.normalizeTitleForComparison(matchingEntry.title) === normCombined;
          return {
            type: 'chapter',
            number: chapNum,
            title: `Capítulo ${chapNum} — ${formatTitleCase(matchingEntry.title)}`,
            consumedNextLine: isCombined ? 2 : true,
            titleRemainder,
          };
        }
      }
    }

    // 4. Delimitador Introdução
    const introRegex = /^(?:introdu[çc][ãa]o|introduction)\b(?:\s*[:.—-]?\s*(.*))?$/i;
    const introMatch = trimmed.match(introRegex);
    if (introMatch) {
      const rest = introMatch[1]?.trim() || '';
      let title = 'Introdução';
      let consumedNextLine = false;

      if (rest) {
        title = `Introdução: ${rest.replace(/^[:.—-\s]+/, '')}`;
      } else if (
        nextLine &&
        nextLine.trim().length > 2 &&
        nextLine.trim().length < 80 &&
        !this.isAnyDelimiter(nextLine) &&
        !/[.!?]$/.test(nextLine.trim())
      ) {
        title = `Introdução: ${nextLine.trim()}`;
        consumedNextLine = true;
      }

      return {
        type: 'intro',
        number: 0,
        title,
        consumedNextLine,
      };
    }

    // 5. Delimitador Apêndice
    const appRegex = /^(?:ap[êe]ndice|appendix)\b(?:\s*[:.—-]?\s*(.*))?$/i;
    const appMatch = trimmed.match(appRegex);
    if (appMatch) {
      const rest = appMatch[1]?.trim() || '';
      let title = 'Apêndice';
      let consumedNextLine = false;

      if (rest) {
        title = `Apêndice: ${rest.replace(/^[:.—-\s]+/, '')}`;
      } else if (
        nextLine &&
        nextLine.trim().length > 2 &&
        nextLine.trim().length < 80 &&
        (!this.isAnyDelimiter(nextLine) || /^notas\s+sobre\b/i.test(nextLine.trim())) &&
        !/[.!?]$/.test(nextLine.trim())
      ) {
        title = `Apêndice: ${nextLine.trim()}`;
        consumedNextLine = true;
      }

      return {
        type: 'appendix',
        title,
        consumedNextLine,
      };
    }

    // 6. Delimitador Notas / Fonte de ilustrações / Índice remissivo (seção pós-textual)
    if (/^notas\b/i.test(trimmed) && !/^notas\s+sobre\b/i.test(trimmed)) {
      return {
        type: 'appendix',
        title: 'Notas',
      };
    }
    if (/^(?:fonte\s+das\s+ilustra[çc][õo]es|cr[ée]ditos\s+(?:das\s+)?(?:ilustra[çc][õo]es|imagens)|[íi]ndice\s+remissivo)\b/i.test(trimmed)) {
      return {
        type: 'appendix',
        title: formatTitleCase(trimmed),
        consumedNextLine: false,
      };
    }

    // 7. Delimitador Agradecimentos / Conclusão / Epílogo
    const endRegex =
      /^(?:conclus[ãa]o|conclusion|ep[íi]logo|epilogue|agradecimentos|acknowledgements|acknowledgments)\b(?:\s*[:.—-]?\s*(.*))?$/i;
    const endMatch = trimmed.match(endRegex);
    if (endMatch) {
      const rest = endMatch[1]?.trim() || '';
      let title = /agradecimentos/i.test(trimmed)
        ? 'Agradecimentos'
        : /ep[íi]logo/i.test(trimmed)
        ? 'Epílogo'
        : 'Conclusão';
      let consumedNextLine = false;

      if (rest) {
        title = `${title}: ${rest.replace(/^[:.—-\s]+/, '')}`;
      } else if (
        nextLine &&
        nextLine.trim().length > 2 &&
        nextLine.trim().length < 80 &&
        !this.isAnyDelimiter(nextLine) &&
        !/[.!?]$/.test(nextLine.trim())
      ) {
        title = `${title}: ${nextLine.trim()}`;
        consumedNextLine = true;
      }

      return {
        type: 'conclusion',
        title,
        consumedNextLine,
      };
    }

    // 8. Delimitador baseado em entradas do Sumário (TOC-Driven matching)
    if (context?.tocEntries && context.tocEntries.length > 0 && !context?.inBackMatter) {
      const normLine = this.normalizeTitleForComparison(trimmed);
      const currentPage = context.pageNumber;

      const matchingEntry = context.tocEntries.find((entry) => {
        if (entry.isPart) return false;
        const normEntry = this.normalizeTitleForComparison(entry.title);
        if (normEntry !== normLine) return false;

        if (currentPage !== undefined && entry.targetPage !== undefined) {
          return Math.abs(currentPage - entry.targetPage) <= 6;
        }
        return true;
      });

      if (matchingEntry) {
        if (matchingEntry.isPrefaceOrIntro) {
          return {
            type: 'preface',
            number: 0,
            title: formatTitleCase(matchingEntry.title),
            consumedNextLine: false,
          };
        }
        if (matchingEntry.isConclusionOrEpilogue) {
          return {
            type: 'conclusion',
            number: 0,
            title: formatTitleCase(matchingEntry.title),
            consumedNextLine: false,
          };
        }

        const isIntroCandidate =
          (context?.currentChapterNumber || 0) === 0 &&
          !matchingEntry.chapterNumber &&
          (matchingEntry.isPrefaceOrIntro ||
            /^(?:introdu[çc][ãa]o|pref[áa]cio|pr[óo]logo|apresenta[çc][ãa]o|ao\s+leitor|leia[, ]+por\s+favor)\b/i.test(matchingEntry.title) ||
            (context?.bookTitle && this.normalizeTitleForComparison(matchingEntry.title) === this.normalizeTitleForComparison(context.bookTitle)));

        if (isIntroCandidate) {
          return {
            type: 'intro',
            number: 0,
            title: formatTitleCase(matchingEntry.title),
            consumedNextLine: false,
          };
        }

        if (
          matchingEntry.chapterNumber !== undefined &&
          context?.currentChapterNumber !== undefined &&
          matchingEntry.chapterNumber <= context.currentChapterNumber
        ) {
          return null;
        }

        const nextNum = (context?.currentChapterNumber || 0) + 1;
        const chapNum = matchingEntry.chapterNumber ?? nextNum;

        return {
          type: 'chapter',
          number: chapNum,
          title: matchingEntry.title.toLowerCase().startsWith('cap')
            ? formatTitleCase(matchingEntry.title)
            : `Capítulo ${chapNum} — ${formatTitleCase(matchingEntry.title)}`,
          consumedNextLine: false,
        };
      }
    }

    return null;
  }

  /**
   * Identifica se uma página pertence a seções de Dedicatória / Agradecimentos
   */
  public isDedicationPage(pageText: string, pageNumber: number): boolean {
    if (!pageText || pageNumber > 10) return false;
    const trimmed = pageText.trim();
    const firstLines = trimmed.split('\n').slice(0, 4).join(' ').toLowerCase();

    if (/\b(dedicat[óo]ria|dedication|agradecimentos|acknowledgements|acknowledgments)\b/i.test(firstLines)) {
      return true;
    }

    // Dedicações informais curtas antes do sumário: "Para Hanna", "Para meus pais", "To my wife", "À memória de...", etc.
    if (trimmed.length <= 250 && trimmed.split(/\s+/).length <= 35) {
      if (
        /^(?:para\s+|to\s+|for\s+|dedico\s+|dedicado\s+|à\s+|ao\s+|aos\s+|in\s+memoriam\b)/i.test(trimmed) &&
        !/^para\s+(?:que|isso|fazer|obter|alcançar|garantir|evitar)\b/i.test(trimmed)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Identifica se uma página pertence a Prefácio ou Introdução
   */
  public isIntroOrPrefacePage(pageText: string, pageNumber: number): 'preface' | 'intro' | null {
    if (!pageText || pageNumber > 25) return null;
    const firstLines = pageText.split('\n').slice(0, 4).join(' ').toLowerCase();
    if (/\b(pref[áa]cio|preface|foreword|pr[óo]logo|prologue)\b/i.test(firstLines)) {
      return 'preface';
    }
    if (/\b(introdu[çc][ãa]o|introduction)\b/i.test(firstLines)) {
      return 'intro';
    }
    return null;
  }

  /**
   * Identifica se uma página inicia um novo capítulo com base em cabeçalhos explícitos
   */
  public isChapterHeading(text: string): boolean {
    const firstLines = text.split('\n').slice(0, 4).join('\n');
    return /^(?:cap[íi]tulo|capitulo|chapter|li[çc][ãa]o|lesson|parte|part|ap[êe]ndice|appendix|notas|agradecimentos|conclus[ãa]o|conclusion|ep[íi]logo|epilogue|\d{1,2}\s*[.—-]\s+[A-ZÀ-Ú])\b/im.test(
      firstLines
    );
  }

  /**
   * Tenta extrair itens de Sumário com seus respectivos números de página de destino (ou pageless)
   */
  public parseTableOfContentsEntries(
    tocPages: Array<{ pageNumber: number; text: string }>
  ): Array<{
    title: string;
    chapterNumber?: number;
    targetPage?: number;
    isPart?: boolean;
    isPrefaceOrIntro?: boolean;
    isConclusionOrEpilogue?: boolean;
  }> {
    const entries: Array<{
      title: string;
      chapterNumber?: number;
      targetPage?: number;
      isPart?: boolean;
      isPrefaceOrIntro?: boolean;
      isConclusionOrEpilogue?: boolean;
    }> = [];
    const entryRegex =
      /^(?:(?:cap[íi]tulo|chapter|\d+)\s*[:.—-]?\s*)?(.*?)(?:\.{2,}|\s{3,}|\t+)\s*(\d+)\s*$/i;

    for (const page of tocPages) {
      const normalizedText = this.collapseSpacedLetters(page.text);
      const rawLines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean);

      // Dewrapping de entradas de sumário quebradas em 2 linhas (ex: coluna estreita)
      const lines: string[] = [];
      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        if (/^(?:sum[áa]rio|índice|contents|table of contents)[:\s]*$/i.test(line)) {
          continue;
        }
        if (!/\d{1,4}$/.test(line) && i + 1 < rawLines.length) {
          const nextLine = rawLines[i + 1];
          if (/^\d{1,4}$/.test(nextLine)) {
            lines.push(`${line} ${nextLine}`);
            i++;
            continue;
          } else if (/\d{1,4}$/.test(nextLine) && nextLine.length <= 60) {
            lines.push(`${line} ${nextLine}`);
            i++;
            continue;
          }
        }
        lines.push(line);
      }

      for (const line of lines) {
        // Formato com número de capítulo e página: "1. Título ... 12"
        const capNumMatch = line.match(/^(\d{1,2})\s*[.—-]\s*(.*?)(?:\.{2,}|\s{3,}|\t+)\s*(\d+)/);
        if (capNumMatch) {
          const title = capNumMatch[2].replace(/\.+$/, '').trim();
          entries.push({
            chapterNumber: parseInt(capNumMatch[1], 10),
            title,
            targetPage: parseInt(capNumMatch[3], 10),
            isPart: /^parte\b/i.test(title),
            isPrefaceOrIntro: /^(?:pref[áa]cio|pr[óo]logo|introdu[çc][ãa]o|leia[, ]+por\s+favor)\b/i.test(title),
            isConclusionOrEpilogue: /^(?:conclus[ãa]o|ep[íi]logo|posf[áa]cio|ap[êe]ndice|notas|agradecimentos)\b/i.test(title),
          });
          continue;
        }

        // Formato com página simples (espaço simples antes da página): "O incêndio de Roma 10"
        const singleSpaceMatch = line.match(/^([A-ZÀ-Ú].*?)\s+(\d{1,4})$/);
        if (singleSpaceMatch) {
          const rawTitle = singleSpaceMatch[1].trim();
          const targetPage = parseInt(singleSpaceMatch[2], 10);
          if (rawTitle.length <= 85 && !isNaN(targetPage) && targetPage > 0 && !/[.!?:;]$/.test(rawTitle)) {
            const cleanTitle = rawTitle.replace(/\.+$/, '').trim();
            const isPart = /^parte\b/i.test(cleanTitle);
            const isPrefaceOrIntro =
              /^(?:pref[áa]cio|pr[óo]logo|introdu[çc][ãa]o|leia[, ]+por\s+favor)\b/i.test(cleanTitle);
            const isConclusionOrEpilogue =
              /^(?:conclus[ãa]o|ep[íi]logo|posf[áa]cio|ap[êe]ndice|notas|agradecimentos)\b/i.test(cleanTitle);

            const chapNumMatch = cleanTitle.match(/^cap[íi]tulo\s+(\d+)\b/i);
            const chapterNumber = chapNumMatch ? parseInt(chapNumMatch[1], 10) : undefined;

            entries.push({
              title: cleanTitle,
              chapterNumber,
              targetPage,
              isPart,
              isPrefaceOrIntro,
              isConclusionOrEpilogue,
            });
            continue;
          }
        }

        // Formato genérico com página: "Título ... 12"
        const match = line.match(entryRegex);
        if (match) {
          const rawTitle = match[1]?.trim() || line;
          const targetPage = parseInt(match[2], 10);
          if (!isNaN(targetPage) && targetPage > 0) {
            const cleanTitle = rawTitle.replace(/\.+$/, '').trim();
            const isPart = /^parte\b/i.test(cleanTitle);
            const isPrefaceOrIntro =
              /^(?:pref[áa]cio|pr[óo]logo|introdu[çc][ãa]o|leia[, ]+por\s+favor)\b/i.test(cleanTitle);
            const isConclusionOrEpilogue =
              /^(?:conclus[ãa]o|ep[íi]logo|posf[áa]cio|ap[êe]ndice|notas|agradecimentos)\b/i.test(cleanTitle);

            const chapNumMatch = cleanTitle.match(/^cap[íi]tulo\s+(\d+)\b/i);
            const chapterNumber = chapNumMatch ? parseInt(chapNumMatch[1], 10) : undefined;

            entries.push({
              title: cleanTitle,
              chapterNumber,
              targetPage,
              isPart,
              isPrefaceOrIntro,
              isConclusionOrEpilogue,
            });
            continue;
          }
        }

        // Formato pageless numerado: "1. Primeiro século da Era Cristã"
        const pagelessNumberedMatch = line.match(/^(\d{1,2})\s*[.—-]\s*([A-ZÀ-Ú0-9].*?)$/);
        if (pagelessNumberedMatch) {
          const chapterNumber = parseInt(pagelessNumberedMatch[1], 10);
          const cleanTitle = pagelessNumberedMatch[2].replace(/\.+$/, '').trim();
          entries.push({
            chapterNumber,
            title: cleanTitle,
            targetPage: undefined,
            isPart: /^parte\b/i.test(cleanTitle),
            isPrefaceOrIntro: /^(?:pref[áa]cio|pr[óo]logo|introdu[çc][ãa]o|leia[, ]+por\s+favor)\b/i.test(cleanTitle),
            isConclusionOrEpilogue: /^(?:conclus[ãa]o|ep[íi]logo|posf[áa]cio|ap[êe]ndice|notas|agradecimentos)\b/i.test(cleanTitle),
          });
          continue;
        }

        // Formato pageless explícito: "Capítulo 1 — O Começo"
        const pagelessChapMatch = line.match(/^(?:cap[íi]tulo|chapter)\s+(\d+)\b(?:\s*[:.—-]\s*(.*))?$/i);
        if (pagelessChapMatch) {
          const chapterNumber = parseInt(pagelessChapMatch[1], 10);
          const cleanTitle = pagelessChapMatch[2]?.replace(/\.+$/, '').trim() || `Capítulo ${chapterNumber}`;
          entries.push({
            chapterNumber,
            title: cleanTitle,
            targetPage: undefined,
            isPart: false,
            isPrefaceOrIntro: false,
            isConclusionOrEpilogue: false,
          });
          continue;
        }

        // Formato pageless seções nomeadas: Prefácio, Introdução, Epílogo, etc.
        const pagelessNamedMatch = line.match(/^(pref[áa]cio|pr[óo]logo|introdu[çc][ãa]o|conclus[ãa]o|ep[íi]logo|posf[áa]cio|ap[êe]ndice|notas|agradecimentos)\b(?:\s*[:.—-]\s*(.*))?$/i);
        if (pagelessNamedMatch) {
          const cleanTitle = line.trim();
          entries.push({
            title: cleanTitle,
            targetPage: undefined,
            isPart: false,
            isPrefaceOrIntro: /^(?:pref|pró|intro)/i.test(cleanTitle),
            isConclusionOrEpilogue: /^(?:conclu|epí|posf|apên|notas|agrad)/i.test(cleanTitle),
          });
          continue;
        }
      }
    }

    return entries;
  }

  /**
   * Builds a complete structured BookInfo + Chapter[] directly from extracted PDF pages.
   * Used both as a structural baseline and as a full local converter when Gemini API key is not configured.
   */
  public buildStructuredBookFromPages(
    extracted: ExtractedPdfData,
    originalFilename: string,
    hints: BookMetadataHints = {}
  ): BookInfo {
    const cleanFileTitle = originalFilename
      .replace(/\.pdf$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b[0-9a-f]{6,}\b/gi, '')
      .trim();

    const inferredTitle = hints.titlePt?.trim() || cleanFileTitle || 'Novo Livro Digital';
    const inferredSubtitle = hints.subtitlePt?.trim() || '';
    const inferredAuthor = hints.author?.trim() || 'Autor Desconhecido';
    const inferredYear = hints.originalYear || new Date().getFullYear();
    const inferredPublisher =
      hints.publisher?.trim() || 'Edição Digital — Biblioteca IPR Viamão';

    const nonEmptyPages = extracted.pages
      .map((text, idx) => ({ pageNumber: idx + 1, text: text.trim() }))
      .filter((p) => p.text.length > 5);

    if (nonEmptyPages.length === 0) {
      const placeholderChapter: Chapter = {
        id: 'cap-1',
        number: 1,
        titlePt: 'Capítulo 1 — Conteúdo do Documento',
        titleEn: 'Chapter 1 — Document Content',
        subtitlePt: inferredTitle,
        pages: `1-${Math.max(1, extracted.totalPages)}`,
        estimatedReadTimeMinutes: 5,
        summaryPt: `Documento PDF importado (${originalFilename}) contendo ${extracted.totalPages} página(s).`,
        keyPointsPt: [
          'Documento PDF armazenado na biblioteca digital.',
          'Você pode visualizar o PDF original clicando no ícone de PDF na barra superior.',
          'Configure a chave GEMINI_API_KEY para transcrição e tradução visual via IA de PDFs digitalizados.',
        ],
        studyQuestionsPt: [
          'Quais são os ensinamentos centrais apresentados neste material?',
          'Como podemos aplicar os princípios deste livro em nossa comunidade local?',
        ],
        sections: [
          {
            id: 'cap-1-sec-1',
            titlePt: '',
            titleEn: '',
            paragraphsPt: [
              'Este arquivo PDF parece ser composto principalmente por imagens digitalizadas (sem camada de texto selecionável) ou possui texto mínimo.',
              'Você pode abrir o PDF original a qualquer momento no botão "Ver PDF Original" na barra superior, editar os capítulos manualmente, ou reprocessar com a chave da API Gemini ativa para leitura óptica (OCR) e tradução automática.',
            ],
            paragraphsEn: [],
          },
        ],
      };

      return {
        titlePt: inferredTitle,
        titleEn: inferredTitle,
        subtitlePt: inferredSubtitle || 'Edição Estruturada para Leitura e Estudo',
        subtitleEn: 'Structured Reading Edition',
        author: inferredAuthor,
        originalYear: inferredYear,
        publisher: inferredPublisher,
        translatorNote:
          'Livro importado e estruturado automaticamente a partir do documento PDF original.',
        chapters: [placeholderChapter],
      };
    }

    // 1. Identificar bloco de Sumário / Índice (NUNCA incluir no texto de leitura dos capítulos)
    const tocPageNumbers = this.identifyTableOfContentsPages(nonEmptyPages);
    const firstTocPage = tocPageNumbers.size > 0 ? Math.min(...tocPageNumbers) : Infinity;
    const lastTocPage = tocPageNumbers.size > 0 ? Math.max(...tocPageNumbers) : 0;

    // 2. Identificar seções de Front Matter preliminares (Dedicatória / Epígrafe) e separar TOC / Body
    const dedicationPages: Array<{ pageNumber: number; text: string }> = [];
    const candidateBodyPages: Array<{ pageNumber: number; text: string }> = [];
    const tocPages: Array<{ pageNumber: number; text: string }> = [];

    let mainContentStarted = false;
    for (const page of nonEmptyPages) {
      // Se for página de ficha catalográfica (CIP), descarta do corpo e das preliminares de leitura
      if (this.isCatalogingPage(page.text)) {
        continue;
      }

      // Se for página de Sumário / Índice, separa o sumário do conteúdo seguinte compartilhado na mesma página
      if (tocPageNumbers.has(page.pageNumber)) {
        const { tocText, bodyText } = this.splitTocPageContent(page.text);
        if (tocText) {
          tocPages.push({ pageNumber: page.pageNumber, text: tocText });
        }
        if (bodyText && bodyText.length > 20) {
          candidateBodyPages.push({ pageNumber: page.pageNumber, text: bodyText });
        }
        continue;
      }

      // Se encontrar um delimitador de capítulo/prefácio/introdução, o conteúdo principal já começou
      const firstLine = page.text.trim().split('\n')[0];
      const secondLine = page.text.trim().split('\n')[1];
      if (this.matchDelimiter(firstLine, secondLine)) {
        mainContentStarted = true;
      }

      // Dedicatória nas páginas preliminares antes do sumário e antes de iniciar o conteúdo
      if (!mainContentStarted && page.pageNumber < firstTocPage && page.pageNumber <= 10 && this.isDedicationPage(page.text, page.pageNumber)) {
        dedicationPages.push(page);
        continue;
      }

      // Páginas antes do sumário que contêm Prefácio ou Introdução iniciados
      if (mainContentStarted && page.pageNumber < firstTocPage) {
        candidateBodyPages.push(page);
        continue;
      }

      // O corpo do livro começa estritamente após o término do sumário
      if (page.pageNumber > lastTocPage) {
        candidateBodyPages.push(page);
      }
    }

    const tocEntries = this.parseTableOfContentsEntries(tocPages);
    const bodyPages = candidateBodyPages;

    // 3. Segmentação estrita baseada em delimitadores (Parte, Capítulo, Prefácio, etc.)
    interface SegmentedGroup {
      type: 'dedication' | 'preface' | 'intro' | 'chapter' | 'conclusion' | 'appendix';
      id: string;
      number: number;
      title: string;
      partTitle?: string;
      startPage: number;
      endPage: number;
      paragraphs: string[];
    }

    const units: SegmentedGroup[] = [];

    // Adiciona Dedicatória se identificada
    if (dedicationPages.length > 0) {
      const dedText = dedicationPages.map((p) => p.text).join('\n\n');
      units.push({
        type: 'dedication',
        id: 'dedication',
        number: 0,
        title: 'Dedicatória',
        startPage: dedicationPages[0].pageNumber,
        endPage: dedicationPages[dedicationPages.length - 1].pageNumber,
        paragraphs: this.splitIntoReadableParagraphs(dedText),
      });
    }

    // Varre bodyPages linha a linha usando delimitadores estruturais
    let currentPartTitle: string | null = null;
    let currentUnit: SegmentedGroup | null = null;
    let chapterCounter = 0;
    let inBackMatter = false;

    for (const page of bodyPages) {
      const pageNumber = page.pageNumber;
      const lines = page.text.split('\n').map((l) => l.trim());

      let lineIdx = 0;
      while (lineIdx < lines.length) {
        const line = lines[lineIdx];
        if (!line) {
          lineIdx++;
          continue;
        }

        const nextLine = lines.slice(lineIdx + 1).find((l) => l.trim().length > 0);
        const nextLineIdx = nextLine ? lines.indexOf(nextLine, lineIdx + 1) : -1;
        const afterNextLine = nextLineIdx !== -1 ? lines.slice(nextLineIdx + 1).find((l) => l.trim().length > 0) : undefined;

        // Se estivermos dentro da seção Notas, não saímos dela exceto para Conclusão / Agradecimentos / outro Apêndice
        if (currentUnit?.id === 'notes') {
          const endDelimiter = this.matchDelimiter(line, nextLine, {
            inBackMatter: true,
            currentUnitType: 'notes',
            tocEntries,
            pageNumber,
            bookTitle: inferredTitle,
            afterNextLine,
          });
          if (endDelimiter && (endDelimiter.type === 'conclusion' || endDelimiter.type === 'appendix')) {
            units.push(currentUnit);
            currentUnit = {
              type: endDelimiter.type,
              id: endDelimiter.title.toLowerCase().startsWith('notas')
                ? 'notes'
                : endDelimiter.type === 'appendix'
                ? 'appendix'
                : 'acknowledgments',
              number: 0,
              title: endDelimiter.title,
              startPage: pageNumber,
              endPage: pageNumber,
              paragraphs: [],
            };
            lineIdx += endDelimiter.consumedNextLine ? 2 : 1;
            continue;
          }
          // Se estiver em 'notes' e não for conclusão/apêndice, não deve criar novos capítulos a partir das notas
        } else {
          const delimiter = this.matchDelimiter(line, nextLine, {
            currentChapterNumber: chapterCounter,
            inBackMatter,
            currentUnitType: currentUnit?.id,
            tocEntries,
            pageNumber,
            bookTitle: inferredTitle,
            afterNextLine,
          });

          if (delimiter) {
            if (delimiter.type === 'part') {
              currentPartTitle = delimiter.title;
              lineIdx += delimiter.consumedNextLine ? 2 : 1;
              continue;
            }

            // Ignora repetição de delimitador para o mesmo capítulo na mesma página (ex: rodapé repetindo título da página)
            if (currentUnit && currentUnit.startPage === pageNumber) {
              const normCurrentTitle = this.normalizeTitleForComparison(
                currentUnit.title.replace(/^cap[íi]tulo\s+\d+\s*[-—–]\s*/i, '')
              );
              const normDelimTitle = this.normalizeTitleForComparison(
                delimiter.title.replace(/^cap[íi]tulo\s+\d+\s*[-—–]\s*/i, '')
              );
              if (
                normCurrentTitle === normDelimTitle ||
                (normCurrentTitle.length >= 6 && normDelimTitle.length >= 6 && (
                  normCurrentTitle.includes(normDelimTitle) ||
                  normDelimTitle.includes(normCurrentTitle)
                ))
              ) {
                lineIdx += delimiter.consumedNextLine ? 2 : 1;
                continue;
              }
            }

            if (delimiter.type === 'appendix' || delimiter.type === 'conclusion') {
              inBackMatter = true;
            }

            // Fecha a unidade anterior se existente
            if (currentUnit) {
              units.push(currentUnit);
              currentUnit = null;
            }

            if (delimiter.type === 'chapter') {
              const num = delimiter.number ?? (chapterCounter + 1);
              chapterCounter = num;
              currentUnit = {
                type: 'chapter',
                id: `chapter-${num}`,
                number: num,
                title: delimiter.title || `Capítulo ${num}`,
                partTitle: currentPartTitle || undefined,
                startPage: pageNumber,
                endPage: pageNumber,
                paragraphs: [],
              };
            } else if (delimiter.type === 'preface') {
              currentUnit = {
                type: 'preface',
                id: 'preface',
                number: 0,
                title: delimiter.title || 'Prefácio',
                startPage: pageNumber,
                endPage: pageNumber,
                paragraphs: [],
              };
            } else if (delimiter.type === 'intro') {
              currentUnit = {
                type: 'intro',
                id: 'intro',
                number: 0,
                title: delimiter.title || 'Introdução',
                partTitle: currentPartTitle || undefined,
                startPage: pageNumber,
                endPage: pageNumber,
                paragraphs: [],
              };
            } else {
              const isApp = delimiter.type === 'appendix';
              const unitId = isApp
                ? delimiter.title.toLowerCase().startsWith('notas')
                  ? 'notes'
                  : 'appendix'
                : delimiter.title.toLowerCase().includes('epílogo')
                ? 'epilogue'
                : 'conclusion';
              currentUnit = {
                type: delimiter.type,
                id: unitId,
                number: 0,
                title: delimiter.title,
                partTitle: currentPartTitle || undefined,
                startPage: pageNumber,
                endPage: pageNumber,
                paragraphs: [],
              };
            }

            if (delimiter.consumedNextLine) {
              while (lineIdx < lines.length && lines[lineIdx].trim() !== nextLine?.trim()) {
                lineIdx++;
              }
              if (lineIdx < lines.length) {
                lineIdx++;
              }
              if (delimiter.consumedNextLine === 2 && afterNextLine) {
                while (lineIdx < lines.length && lines[lineIdx].trim() !== afterNextLine?.trim()) {
                  lineIdx++;
                }
                if (lineIdx < lines.length) {
                  lineIdx++;
                }
              }
              if (delimiter.titleRemainder && lineIdx < lines.length) {
                const esc = delimiter.titleRemainder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
                lines[lineIdx] = lines[lineIdx].replace(new RegExp(`^${esc}\\s*`, 'i'), '').trim();
              }
              continue;
            } else {
              lineIdx++;
              continue;
            }
          }

          // Ignora números de páginas isolados (que não atuaram como delimitadores de capítulo)
          if (/^\s*(?:-\s*)?\d{1,4}(?:\s*-)?\s*$/.test(line)) {
            lineIdx++;
            continue;
          }
        }

        // Acumula parágrafos da unidade ativa
        const paraLines: string[] = [line];
        lineIdx++;

        while (lineIdx < lines.length) {
          const nextL = lines[lineIdx];
          if (!nextL) {
            lineIdx++;
            break;
          }
          const nextNextL = lines.slice(lineIdx + 1).find((l) => l.trim().length > 0);
          const nextNextLIdx = nextNextL ? lines.indexOf(nextNextL, lineIdx + 1) : -1;
          const afterNextNextL = nextNextLIdx !== -1 ? lines.slice(nextNextLIdx + 1).find((l) => l.trim().length > 0) : undefined;

          if (currentUnit?.id === 'notes') {
            const endDelim = this.matchDelimiter(nextL, nextNextL, {
              inBackMatter: true,
              currentUnitType: 'notes',
              tocEntries,
              pageNumber,
              bookTitle: inferredTitle,
              afterNextLine: afterNextNextL,
            });
            if (endDelim && (endDelim.type === 'conclusion' || endDelim.type === 'appendix')) {
              break;
            }
          } else if (
            this.matchDelimiter(nextL, nextNextL, {
              currentChapterNumber: chapterCounter,
              inBackMatter,
              currentUnitType: currentUnit?.id,
              tocEntries,
              pageNumber,
              bookTitle: inferredTitle,
              afterNextLine: afterNextNextL,
            })
          ) {
            break;
          }
          if (/^\s*(?:-\s*)?\d{1,4}(?:\s*-)?\s*$/.test(nextL)) {
            lineIdx++;
            continue;
          }
          paraLines.push(nextL);
          lineIdx++;
        }

        const paragraphText = paraLines.join(' ').replace(/\s+/g, ' ').trim();
        if (paragraphText.length > 0) {
          if (!currentUnit) {
            currentUnit = {
              type: 'intro',
              id: 'intro',
              number: 0,
              title: 'Introdução',
              partTitle: currentPartTitle || undefined,
              startPage: pageNumber,
              endPage: pageNumber,
              paragraphs: [],
            };
          }
          currentUnit.endPage = pageNumber;
          currentUnit.paragraphs.push(paragraphText);
        }
      }
    }

    if (currentUnit) {
      units.push(currentUnit);
    }

    // Se nenhum capítulo foi gerado a partir do corpo, adiciona o corpo todo em um capítulo 1
    if (units.length === 0 && bodyPages.length > 0) {
      const fullBodyText = bodyPages.map((p) => p.text).join('\n\n');
      units.push({
        type: 'chapter',
        id: 'chapter-1',
        number: 1,
        title: 'Capítulo 1 — Conteúdo Principal',
        startPage: bodyPages[0]?.pageNumber || 1,
        endPage: bodyPages[bodyPages.length - 1]?.pageNumber || 1,
        paragraphs: this.splitIntoReadableParagraphs(fullBodyText),
      });
    }

    const chapters: Chapter[] = units.map((group) => {
      const paragraphs = group.paragraphs.filter(Boolean);

      // Regra 1: Não inclua na conversão "seções", se o livro é separado em capítulo não use seção.
      // O texto completo é colocado diretamente nos parágrafos do capítulo, sem criar subtítulos de seção artificiais.
      const sections: BookSection[] = [
        {
          id: `${group.id}-sec-1`,
          titlePt: '',
          titleEn: '',
          paragraphsPt:
            paragraphs.length > 0 ? paragraphs : ['Conteúdo preservado do documento PDF original.'],
          paragraphsEn:
            paragraphs.length > 0 ? paragraphs : ['Original PDF preserved content.'],
        },
      ];

      const combinedText = paragraphs.join('\n\n');
      const wordCount = combinedText.split(/\s+/).length;
      const estimatedReadTimeMinutes = Math.max(2, Math.round(wordCount / 190));

      const summaryCandidate = paragraphs[0]
        ? paragraphs[0].slice(0, 260) + (paragraphs[0].length > 260 ? '...' : '')
        : `Síntese de ${group.title} (páginas ${group.startPage} a ${group.endPage}).`;

      const keyPoints = paragraphs
        .slice(0, 4)
        .map((p) => {
          const firstSent = p.split(/[.!?]/)[0]?.trim() || p.slice(0, 110);
          return firstSent.length > 120 ? firstSent.slice(0, 117) + '...' : firstSent + '.';
        })
        .filter((kp) => kp.length > 15);

      const titlePt =
        group.type !== 'chapter'
          ? group.title
          : group.title.toLowerCase().startsWith('cap')
          ? group.title
          : `Capítulo ${group.number}: ${group.title}`;

      const subtitlePt =
        group.partTitle ||
        hints.subtitlePt ||
        `Páginas ${group.startPage}–${group.endPage} do documento original`;

      return {
        id: group.id,
        number: group.number,
        titlePt,
        titleEn: group.title,
        subtitlePt,
        subtitleEn: group.partTitle || `Pages ${group.startPage}–${group.endPage}`,
        pages:
          group.startPage === group.endPage
            ? `${group.startPage}`
            : `${group.startPage}-${group.endPage}`,
        estimatedReadTimeMinutes,
        summaryPt: summaryCandidate,
        keyPointsPt:
          keyPoints.length > 0
            ? keyPoints
            : ['Texto integral preservado a partir do documento PDF original.'],
        studyQuestionsPt: [
          `Qual é o tema central abordado em "${group.title}" e quais são suas implicações práticas?`,
          'Como este ensinamento pode ser aplicado em sua vida pessoal e comunidade?',
          'Destaque um princípio fundamental deste capítulo para discussão em grupo.',
        ],
        sections,
      };
    });

    return {
      titlePt: inferredTitle,
      titleEn: inferredTitle,
      subtitlePt: 'Edição Digital Estruturada para Leitura e Estudo',
      subtitleEn: 'Digital Structured Edition for Reading and Study',
      author: inferredAuthor,
      originalYear: inferredYear,
      publisher: inferredPublisher,
      translatorNote:
        'Texto extraído e estruturado automaticamente a partir do PDF original, com delimitadores precisos de Prefácio e Capítulos e texto direto sem divisões artificiais.',
      chapters,
    };
  }

  /**
   * Divide o texto em parágrafos lógicos e limpos, respeitando a quebra original do texto do PDF.
   */
  public splitIntoReadableParagraphs(text: string): string[] {
    if (!text) return [];

    const rawBlocks = text
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    const result: string[] = [];

    for (const block of rawBlocks) {
      // Ignora números de páginas isolados residuais
      if (/^\s*(?:-\s*)?\d{1,4}(?:\s*-)?\s*$/.test(block)) continue;

      const cleanBlock = block.replace(/[ \t]+/g, ' ').trim();
      if (cleanBlock.length > 0) {
        result.push(cleanBlock);
      }
    }

    return result.length > 0 ? result : [text.trim()];
  }
}
