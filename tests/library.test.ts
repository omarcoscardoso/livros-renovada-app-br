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
import {
  InMemoryStorageService,
  DEFAULT_GCS_BUCKET,
} from '../src/server/services/storageService';
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

    // Deve permitir remover qualquer livro, inclusive o inicial quando solicitado pelo usuário
    const deletedDefault = repo.deleteBook(DEFAULT_BOOK_ID);
    expect(deletedDefault).toBe(true);
    expect(repo.getSetting('default_book_deleted')).toBe('true');

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

  it('deve extrair texto real de um buffer PDF válido usando PdfExtractorService em memória', async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.text('Capítulo 1: Fundamentos da Igreja', 20, 30);
    doc.text('A igreja em células cresce por meio da comunhão e do discipulado.', 20, 45);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    const extractor = new PdfExtractorService(new InMemoryStorageService());
    const extracted = await extractor.extractPdfPages(pdfBuffer);
    expect(extracted.totalPages).toBe(1);
    expect(extracted.fullText).toContain('Fundamentos');
  });

  it('deve salvar e recuperar capítulos marcados como lidos no localStorage do navegador por livro', async () => {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, val: string) => {
        store[key] = String(val);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    };

    const {
      toggleBookChapterRead,
      getBookReadChapters,
      loadAllReadChaptersMap,
      saveBookLastVisitedChapter,
      getBookLastVisitedChapter,
    } = await import('../src/utils/readingProgressStorage');

    // Marca capítulos em dois livros distintos
    const listA1 = toggleBookChapterRead('cell-church-larry-stockstill', 'intro');
    expect(listA1).toEqual(['intro']);

    const listA2 = toggleBookChapterRead('cell-church-larry-stockstill', 'ch1');
    expect(listA2).toEqual(['intro', 'ch1']);

    const listB1 = toggleBookChapterRead('book-custom-2', 'cap-1');
    expect(listB1).toEqual(['cap-1']);

    // Verifica que trocar de livro preserva os capítulos lidos de ambos no navegador
    expect(getBookReadChapters('cell-church-larry-stockstill')).toEqual(['intro', 'ch1']);
    expect(getBookReadChapters('book-custom-2')).toEqual(['cap-1']);

    // Desmarcar capítulo funciona e persiste
    const listA3 = toggleBookChapterRead('cell-church-larry-stockstill', 'intro');
    expect(listA3).toEqual(['ch1']);
    expect(loadAllReadChaptersMap()['cell-church-larry-stockstill']).toEqual(['ch1']);

    // Verifica último capítulo visitado
    saveBookLastVisitedChapter('book-custom-2', 'cap-3');
    expect(getBookLastVisitedChapter('book-custom-2')).toBe('cap-3');
  });

  it('deve descobrir e extrair a imagem da capa a partir de um Buffer PDF em memória sem tocar o disco', async () => {
    const books = repo.listBooks();
    expect(books[0].coverImageUrl).toBe(`/api/books/${DEFAULT_BOOK_ID}/cover`);

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFillColor(180, 83, 9);
    doc.rect(20, 20, 170, 250, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('CAPA DO LIVRO DE TESTE', 45, 120);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    const memoryStorage = new InMemoryStorageService();
    const extractor = new PdfExtractorService(memoryStorage);
    const coverRes = await extractor.extractBookCoverImage(pdfBuffer, 'test_cover_book', 1);
    expect(coverRes).not.toBeNull();
    expect(coverRes?.pageNumber).toBe(1);
    expect(coverRes?.filename).toBe('test_cover_book_cover.png');

    const savedBuffer = await memoryStorage.getCoverBuffer('test_cover_book_cover.png');
    expect(savedBuffer).not.toBeNull();
    expect(savedBuffer!.length).toBeGreaterThan(100);
  });

  it('deve configurar o InMemoryStorageService com o bucket padrão e expor metadados de capa e PDF', async () => {
    const storage = new InMemoryStorageService();
    expect(storage.getBucketName()).toBe(DEFAULT_GCS_BUCKET);
    expect(repo.getCoverFilename(DEFAULT_BOOK_ID)).toBe(`${DEFAULT_BOOK_ID}_cover.png`);
    expect(repo.getPdfMetadata(DEFAULT_BOOK_ID)?.filename).toBe(
      'The_Cell_Church_-_Larry_Stockstill_020021f2.pdf'
    );
  });
});
