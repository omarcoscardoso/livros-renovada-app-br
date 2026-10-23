export interface BookSection {
  id: string;
  titlePt: string;
  titleEn: string;
  paragraphsPt: string[];
  paragraphsEn: string[];
}

export interface Chapter {
  id: string;
  number: number; // 0 for intro, 12 for appendix, etc.
  titlePt: string;
  titleEn: string;
  subtitlePt?: string;
  subtitleEn?: string;
  pages: string;
  estimatedReadTimeMinutes: number;
  summaryPt: string;
  keyPointsPt: string[];
  studyQuestionsPt: string[];
  sections: BookSection[];
}

export interface BookInfo {
  titlePt: string;
  titleEn: string;
  subtitlePt: string;
  subtitleEn: string;
  author: string;
  originalYear: number;
  publisher: string;
  translatorNote: string;
  coverImageUrl?: string;
  chapters: Chapter[];
}

export type BookStatus = 'processing' | 'ready' | 'error';

export interface StoredBook extends BookInfo {
  id: string;
  slug: string;
  coverColor: string;
  coverImageUrl?: string;
  coverPageNumber?: number;
  hasOriginalPdf: boolean;
  originalPdfName?: string;
  status: BookStatus;
  conversionProgress?: string;
  conversionPercent?: number;
  errorMessage?: string;
  isFeatured?: boolean;
  rating?: number;
  reviewsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookSummary {
  id: string;
  slug: string;
  titlePt: string;
  titleEn: string;
  subtitlePt: string;
  subtitleEn: string;
  author: string;
  originalYear: number;
  publisher: string;
  translatorNote: string;
  coverColor: string;
  coverImageUrl?: string;
  coverPageNumber?: number;
  chapterCount: number;
  totalEstimatedMinutes: number;
  hasOriginalPdf: boolean;
  originalPdfName?: string;
  status: BookStatus;
  conversionProgress?: string;
  conversionPercent?: number;
  errorMessage?: string;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
  // Librarial Extended Metadata (Optional)
  rating?: number;
  reviewsCount?: number;
  category?: string;
  synopsis?: string;
  pageCount?: number;
  rankingText?: string;
  authorBio?: string;
  authorAvatarUrl?: string;
  authorFollowers?: number;
}
