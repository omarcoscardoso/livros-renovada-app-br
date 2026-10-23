import React from 'react';
import { BookSummary } from '../data/bookTypes';
import { ReaderTheme } from './Navbar';
import { ReadChaptersMap } from '../utils/readingProgressStorage';
import { LibraryScreen } from './librarial/LibraryScreen';
import { Book, LibrarialTheme } from '../types/librarial';

export type BookshelfViewMode = 'grid' | 'list';

export interface BookshelfViewProps {
  books: BookSummary[];
  readChaptersMap: ReadChaptersMap;
  theme: ReaderTheme;
  onChangeTheme: (theme: ReaderTheme) => void;
  onSelectBook: (bookId: string) => void;
  onOpenUpload: () => void;
  onOpenPdfForBook: (bookId: string) => void;
  onEditBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onReprocessBook: (bookId: string) => void;
  onOpenAdmin: () => void;
  onStartAudiobook?: (bookId: string) => void;
}

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  books,
  readChaptersMap,
  theme,
  onChangeTheme,
  onSelectBook,
  onOpenUpload,
  onOpenPdfForBook,
  onEditBook,
  onDeleteBook,
  onReprocessBook,
  onOpenAdmin,
  onStartAudiobook,
}) => {
  return (
    <LibraryScreen
      books={books as unknown as Book[]}
      readChaptersMap={readChaptersMap}
      theme={theme as LibrarialTheme}
      onChangeTheme={(t) => onChangeTheme(t as ReaderTheme)}
      onSelectBook={onSelectBook}
      onOpenUpload={onOpenUpload}
      onOpenPdfForBook={onOpenPdfForBook}
      onEditBook={onEditBook}
      onDeleteBook={onDeleteBook}
      onReprocessBook={onReprocessBook}
      onOpenAdmin={onOpenAdmin}
      onStartAudiobook={onStartAudiobook}
    />
  );
};
