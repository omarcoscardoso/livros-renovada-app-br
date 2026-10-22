import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getDatabase } from '../src/server/db/database';
import {
  DEFAULT_BOOK_ID,
  SqliteBookRepository,
} from '../src/server/repositories/bookRepository';
import { PdfExtractorService } from '../src/server/services/pdfExtractorService';
import { searchBook, generateStandaloneBookHtml } from '../src/data/bookData';

describe('Biblioteca Digital & Conversor PDF', () => {
  let tempDbPath: string;
  let repo: SqliteBookRepository;

  beforeEach(() => {
    tempDbPath = path.join(
      os.tmpdir(),
      `test_library_${Date.now()}_${Math.random().toString(36).slice(2)}.sqlite`
    );
    const db = getDatabase(tempDbPath);
    repo = new SqliteBookRepository(db);
    repo.seedDefaultBookIfNeeded();
  });

  afterEach(() => {
    if (tempDbPath && fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        // ignore
      }
    }
  });

  it('deve semear o livro padrão "A Igreja em Células" com todos os 13 capítulos', () => {
    const books = repo.listBooks();
    expect(books.length).toBe(1);
    expect(books[0].id).toBe(DEFAULT_BOOK_ID);
    expect(books[0].titlePt).toBe('A Igreja em Células');
    expect(books[0].chapterCount).toBe(13);

    const fullBook = repo.getBookByIdOrSlug(DEFAULT_BOOK_ID);
    expect(fullBook).not.toBeNull();
    expect(fullBook?.chapters.length).toBe(13);
    expect(fullBook?.chapters[0].id).toBe('intro');
  });

  it('deve criar, atualizar e remover um novo livro convertido de PDF', () => {
    const created = repo.createBook({
      id: 'book-test-1',
      slug: 'livro-teste-1',
      titlePt: 'Manual de Discipulado',
      titleEn: 'Discipleship Manual',
      subtitlePt: 'Guia Prático',
      subtitleEn: 'Practical Guide',
      author: 'Pr. João Silva',
      originalYear: 2025,
      publisher: 'IPR Viamão',
      translatorNote: 'Edição de teste',
      coverColor: 'emerald',
      status: 'processing',
      conversionProgress: 'Extraindo páginas...',
      conversionPercent: 20,
      chapters: [],
    });

    expect(created.id).toBe('book-test-1');
    expect(created.status).toBe('processing');

    repo.updateBookContent('book-test-1', {
      status: 'ready',
      conversionPercent: 100,
      conversionProgress: 'Concluído',
      chapters: [
        {
          id: 'cap-1',
          number: 1,
          titlePt: 'Capítulo 1: O Chamado',
          titleEn: 'Chapter 1: The Call',
          pages: '1-10',
          estimatedReadTimeMinutes: 8,
          summaryPt: 'O chamado ao discipulado cristão.',
          keyPointsPt: ['Obediência', 'Comunhão'],
          studyQuestionsPt: ['Como aplicar hoje?'],
          sections: [
            {
              id: 'sec-1',
              titlePt: 'Introdução ao Chamado',
              titleEn: 'Introduction',
              paragraphsPt: ['Jesus chamou os doze para estarem com Ele.'],
              paragraphsEn: [],
            },
          ],
        },
      ],
    });

    const updated = repo.getBookByIdOrSlug('book-test-1');
    expect(updated?.status).toBe('ready');
    expect(updated?.chapters.length).toBe(1);
    expect(updated?.chapters[0].titlePt).toBe('Capítulo 1: O Chamado');

    // Não deve permitir remover o livro padrão
    expect(() => repo.deleteBook(DEFAULT_BOOK_ID)).toThrow();

    // Deve remover o livro customizado
    const deleted = repo.deleteBook('book-test-1');
    expect(deleted).toBe(true);
    expect(repo.getBookByIdOrSlug('book-test-1')).toBeNull();
  });

  it('deve estruturar capítulos, seções, resumo e perguntas a partir de páginas extraídas de PDF', () => {
    const extractor = new PdfExtractorService();
    const structured = extractor.buildStructuredBookFromPages(
      {
        totalPages: 4,
        pages: [
          'Capítulo 1: A Visão da Igreja\n\nA igreja primitiva reunia-se no templo e de casa em casa. O relacionamento fraterno fortalecia a fé dos novos convertidos.\n\nCada lar tornava-se um farol de esperança e oração na vizinhança.',
          'Quando olhamos para o livro de Atos dos Apóstolos, percebemos que o crescimento acontecia de forma orgânica através da multiplicação de líderes.',
          'Capítulo 2: Multiplicando Discípulos\n\nO discipulado eficaz requer acompanhamento próximo, exemplo de vida e ensino constante da Palavra de Deus.\n\nLíderes que formam novos líderes garantem a continuidade da missão.',
          'Portanto, cada célula deve manter o foco na colheita e no cuidado mútuo.',
        ],
        fullText: 'Texto completo',
      },
      'Visao_Celular_2026.pdf',
      {
        titlePt: 'A Visão Celular Contemporânea',
        author: 'IPR Viamão',
        originalYear: 2026,
      }
    );

    expect(structured.titlePt).toBe('A Visão Celular Contemporânea');
    expect(structured.author).toBe('IPR Viamão');
    expect(structured.chapters.length).toBeGreaterThanOrEqual(2);
    expect(structured.chapters[0].sections.length).toBeGreaterThan(0);
    expect(structured.chapters[0].studyQuestionsPt.length).toBeGreaterThan(0);

    // Verifica se a busca e a geração de HTML standalone funcionam com o novo livro
    const searchRes = searchBook('Atos dos Apóstolos', structured.chapters);
    expect(searchRes.length).toBe(1);

    const html = generateStandaloneBookHtml(structured, structured.chapters);
    expect(html).toContain('A Visão Celular Contemporânea');
  });

  it('deve extrair texto real de um arquivo PDF válido usando PdfExtractorService', async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.text('Capítulo 1: Fundamentos da Igreja', 20, 30);
    doc.text('A igreja em células cresce por meio da comunhão e do discipulado.', 20, 45);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    const tmpPdf = path.join(os.tmpdir(), `sample_${Date.now()}.pdf`);
    fs.writeFileSync(tmpPdf, pdfBuffer);

    try {
      const extractor = new PdfExtractorService();
      const extracted = await extractor.extractPdfPages(tmpPdf);
      expect(extracted.totalPages).toBe(1);
      expect(extracted.fullText).toContain('Fundamentos');
    } finally {
      if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf);
    }
  });
});
