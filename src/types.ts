export const BOOK_TYPES = [
  "Book",
  "Audiobook",
  "Ebook",
  "Comic",
  "Manga",
  "Graphic Novel",
  "Art/Photography Book"
] as const;
export const STATUSES = ["To Read", "Reading", "Paused", "Finished", "Abandoned"] as const;
export type BookType = typeof BOOK_TYPES[number];
export type Status = typeof STATUSES[number];

export type Read = {
  id: string;
  book_id: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD
  rating?: number;     // 1..5
  review?: string;
  format?: BookType;   // Optional per-read format (Book/Ebook/Audiobook)
  current_page?: number; // Current page number
  total_pages?: number;  // Total pages in book
  progress_percentage?: number; // 0-100 percentage complete
}

export type Book = {
  id: string;
  title: string;
  author: string;
  series_name?: string;
  series_number?: number | null;
  // Full multi-series support; first item is treated as primary for sorting/display
  series?: Array<{ name: string; number?: number | null }>;
  obtained?: 'Owned' | 'Borrowed' | 'Library' | 'Wishlist' | 'On Order' | null;
  type: BookType;
  status: Status;
  next_up_priority?: boolean;
  comments?: string;
  tags?: string; // Semicolon-delimited string
  // Multiple formats owned/available for this book (first item acts as primary)
  formats?: Array<{ format: BookType; obtained?: 'Owned' | 'Borrowed' | 'Library' | 'Wishlist' | 'On Order' | null }>
}

export type Highlight = { id: string; book_id: string; text: string };