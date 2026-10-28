import { BookInfo, Chapter } from './bookTypes';
import { chapter0 } from './chapters/chapter0_intro';
import { chapter1 } from './chapters/chapter1_wind';
import { chapter2 } from './chapters/chapter2_windows';
import { chapter3 } from './chapters/chapter3_partnership';
import { chapter4 } from './chapters/chapter4_evangelism';
import { chapter5 } from './chapters/chapter5_multiply';
import { chapter6 } from './chapters/chapter6_leadership';
import { chapter7 } from './chapters/chapter7_diamond';
import { chapter8 } from './chapters/chapter8_twelve';
import { chapter9 } from './chapters/chapter9_transition';
import { chapter10 } from './chapters/chapter10_dangers';
import { chapter11 } from './chapters/chapter11_infinity';
import { chapter12 } from './chapters/chapter12_appendix';

export const allChapters: Chapter[] = [
  chapter0,
  chapter1,
  chapter2,
  chapter3,
  chapter4,
  chapter5,
  chapter6,
  chapter7,
  chapter8,
  chapter9,
  chapter10,
  chapter11,
  chapter12,
];

export const bookInfo: BookInfo = {
  titlePt: 'A Igreja em Células',
  titleEn: 'The Cell Church',
  subtitlePt: 'Preparando Sua Igreja para a Colheita que se Aproxima',
  subtitleEn: 'Preparing Your Church for the Coming Harvest',
  author: 'Larry Stockstill',
  originalYear: 1998,
  publisher: 'Regal Books / Gospel Light (Tradução Completa para o Português do Brasil)',
  translatorNote:
    'Esta tradução completa para o Português do Brasil foi elaborada com rigor teológico, fidelidade ao texto original em inglês de Larry Stockstill e terminologia eclesiástica contemporânea utilizada nas igrejas celulares do Brasil.',
  chapters: allChapters,
};

// Search across chapters and sections of a given book (defaults to allChapters)
export interface SearchResult {
  chapterId: string;
  chapterNumber: number;
  chapterTitlePt: string;
  sectionTitlePt: string;
  snippetPt: string;
  snippetEn: string;
  matchScore: number;
}

export function searchBook(query: string, chaptersToSearch: Chapter[] = allChapters): SearchResult[] {
  if (!query || query.trim().length < 2) return [];

  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  for (const ch of chaptersToSearch) {
    for (const sec of ch.sections) {
      for (let i = 0; i < sec.paragraphsPt.length; i++) {
        const pt = sec.paragraphsPt[i];
        const en = sec.paragraphsEn[i] || '';
        const ptLower = pt.toLowerCase();
        const enLower = en.toLowerCase();

        if (ptLower.includes(q) || enLower.includes(q)) {
          const matchIdx = ptLower.indexOf(q) >= 0 ? ptLower.indexOf(q) : 0;
          const start = Math.max(0, matchIdx - 60);
          const end = Math.min(pt.length, matchIdx + q.length + 90);
          const snippetPt = (start > 0 ? '...' : '') + pt.slice(start, end) + (end < pt.length ? '...' : '');

          results.push({
            chapterId: ch.id,
            chapterNumber: ch.number,
            chapterTitlePt: ch.titlePt,
            sectionTitlePt: sec.titlePt,
            snippetPt,
            snippetEn: en ? en.slice(0, 160) + '...' : '',
            matchScore: ptLower.includes(q) ? 2 : 1,
          });
        }
      }
    }
  }

  return results.slice(0, 30);
}

// Generate complete Markdown text of the book for export / download
export function generateBookMarkdown(
  book: BookInfo = bookInfo,
  chapters: Chapter[] = book.chapters || allChapters
): string {
  let md = `# ${book.titlePt}\n## ${book.subtitlePt}\n**Autor:** ${book.author}\n\n---\n\n`;
  md += `> ${book.translatorNote}\n\n`;

  for (const ch of chapters) {
    md += `\n# ${ch.titlePt}\n`;
    if (ch.subtitlePt) md += `*${ch.subtitlePt}*\n\n`;
    md += `**Resumo Executivo:** ${ch.summaryPt}\n\n`;
    md += `### Pontos Principais:\n`;
    ch.keyPointsPt.forEach((kp) => {
      md += `- ${kp}\n`;
    });
    md += `\n`;

    for (const sec of ch.sections) {
      md += `\n## ${sec.titlePt}\n\n`;
      sec.paragraphsPt.forEach((p) => {
        md += `${p}\n\n`;
      });
    }

    md += `\n### Perguntas de Aplicação e Estudo:\n`;
    ch.studyQuestionsPt.forEach((sq, i) => {
      md += `${i + 1}. ${sq}\n`;
    });
    md += `\n---\n`;
  }

  return md;
}

// Generate formatted HTML document for Word (.doc) export
export function generateBookHtmlDocument(
  book: BookInfo = bookInfo,
  chapters: Chapter[] = book.chapters || allChapters
): string {
  let body = `
  <div style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; color: #111; line-height: 1.7;">
    <div style="text-align: center; padding: 40px 0; border-bottom: 2px solid #ccc;">
      <h1 style="font-size: 32px; margin-bottom: 8px;">${book.titlePt}</h1>
      <h3 style="font-size: 18px; color: #555; font-weight: normal; margin-top: 0;">${book.subtitlePt}</h3>
      <p style="font-size: 16px; margin-top: 20px;"><strong>Autor:</strong> ${book.author} | Publicado originalmente em ${book.originalYear}</p>
      <p style="font-size: 13px; color: #777; font-style: italic;">${book.translatorNote}</p>
    </div>
  `;

  for (const ch of chapters) {
    body += `
      <div style="page-break-before: always; margin-top: 50px;">
        <h2 style="font-size: 24px; color: #8b2500; border-bottom: 1px solid #ddd; padding-bottom: 6px;">${ch.titlePt}</h2>
        ${ch.subtitlePt ? `<p style="font-style: italic; color: #666; font-size: 15px;">${ch.subtitlePt}</p>` : ''}
        
        <div style="background-color: #f7f7f7; padding: 16px; border-left: 4px solid #8b2500; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0;">Resumo do Capítulo:</h4>
          <p style="margin: 0; font-size: 14px;">${ch.summaryPt}</p>
        </div>
    `;

    for (const sec of ch.sections) {
      body += `
        <h3 style="font-size: 18px; margin-top: 30px; color: #222;">${sec.titlePt}</h3>
      `;
      sec.paragraphsPt.forEach((p) => {
        body += `<p style="margin-bottom: 14px; text-align: justify;">${p}</p>`;
      });
    }

    body += `
        <div style="margin-top: 30px; padding: 16px; background-color: #fcf9f2; border: 1px solid #e8e2d5; border-radius: 6px;">
          <h4 style="margin: 0 0 10px 0; color: #7a4100;">Perguntas para Reflexão da Liderança:</h4>
          <ol style="margin: 0; padding-left: 20px; font-size: 14px;">
            ${ch.studyQuestionsPt.map((q) => `<li style="margin-bottom: 6px;">${q}</li>`).join('')}
          </ol>
        </div>
      </div>
    `;
  }

  body += `</div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${book.titlePt}</title></head><body>${body}</body></html>`;
}
