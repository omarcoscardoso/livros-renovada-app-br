import { Chapter, BookSection, BookStatus } from '../data/bookTypes';

export interface Author {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  followersCount?: number;
  booksCount?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconName?: string;
}

export interface ReadingProgress {
  bookId: string;
  lastChapterId: string;
  readChapters: string[];
  scrollPercent?: number;
  lastReadAt?: string;
}

export interface Book {
  id: string;
  slug: string;
  titlePt: string;
  titleEn?: string;
  subtitlePt?: string;
  subtitleEn?: string;
  author: string;
  authorDetails?: Author;
  originalYear: number;
  publisher?: string;
  translatorNote?: string;
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
  createdAt: string;
  updatedAt: string;
  // Librarial Extended Fields
  rating?: number;
  reviewsCount?: number;
  category?: string;
  synopsis?: string;
  pageCount?: number;
  rankingText?: string;
  audioDurationMinutes?: number;
  isAudiobookReady?: boolean;
}

export type LibrarialNavTab = 'browse' | 'books' | 'audiobooks' | 'library' | 'account';

export type SortOption = 'popular' | 'recent' | 'title' | 'author' | 'rating';

export type LibrarialTheme = 'light' | 'sepia' | 'dark' | 'contrast';
