import type { Book } from '@/types'
export const samples: Array<Partial<Book> & { tags?: string }> = [
  { title: 'The Name of the Wind', author: 'Patrick Rothfuss', series_name: 'The Kingkiller Chronicle', series_number: 1, obtained: 'Owned', type: 'Book', status: 'Finished', tags: 'fantasy;favourites' },
  { title: 'Project Hail Mary', author: 'Andy Weir', obtained: 'Library', type: 'Audiobook', status: 'Finished', tags: 'sci-fi' },
  { title: 'The Pragmatic Programmer', author: 'Andrew Hunt, David Thomas', obtained: 'Owned', type: 'Ebook', status: 'To Read', tags: 'non-fiction;dev' },
  { title: 'Atomic Habits', author: 'James Clear', obtained: 'Wishlist', type: 'Book', status: 'To Read', tags: 'self-help' },
  { title: 'Dune', author: 'Frank Herbert', obtained: 'Borrowed', type: 'Book', status: 'Finished', tags: 'sci-fi;classic' },
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', obtained: 'Owned', type: 'Book', status: 'Finished', tags: 'fantasy;classic' },
  { title: 'Clean Code', author: 'Robert C. Martin', obtained: 'Owned', type: 'Ebook', status: 'Paused', tags: 'dev' },
  { title: 'Neuromancer', author: 'William Gibson', obtained: 'Wishlist', type: 'Ebook', status: 'To Read', tags: 'sci-fi;cyberpunk' },
  { title: 'The Way of Kings', author: 'Brandon Sanderson', series_name: 'Stormlight Archive', series_number: 1, obtained: 'Owned', type: 'Book', status: 'Reading', tags: 'fantasy;epic' },
  { title: 'Sapiens', author: 'Yuval Noah Harari', obtained: 'Library', type: 'Ebook', status: 'Finished', tags: 'non-fiction;history' }
]