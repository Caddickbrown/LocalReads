export const BOOK_TYPES = ["Book", "Audiobook", "Ebook"] as const;
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
}

export type Book = {
  id: string;
  title: string;
  author: string;
  series_name?: string;
  series_number?: number | null;
  obtained?: 'Owned' | 'Borrowed' | 'Library' | 'Wishlist' | null;
  type: BookType;
  status: Status;
}

export type Highlight = { id: string; book_id: string; text: string };