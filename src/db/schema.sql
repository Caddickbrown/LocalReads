PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  series_name TEXT,
  series_number INTEGER,
  series_json TEXT,
  obtained TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  comments TEXT,
  formats_json TEXT,
  next_up_priority BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS reads (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  start_date TEXT,
  end_date TEXT,
  rating INTEGER,
  review TEXT,
  format TEXT,
  current_page INTEGER DEFAULT 0,
  total_pages INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS book_tags (
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, tag_id)
);

CREATE TABLE IF NOT EXISTS highlights (
  id TEXT PRIMARY KEY,
  book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  commentary TEXT,
  source_title TEXT,
  source_author TEXT
);

CREATE TABLE IF NOT EXISTS reading_goals (
  id TEXT PRIMARY KEY,
  goal_type TEXT NOT NULL, -- 'monthly', 'yearly'
  target_period TEXT NOT NULL, -- 'YYYY-MM' for monthly, 'YYYY' for yearly
  target_count INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes for large datasets
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_type ON books(type);
CREATE INDEX IF NOT EXISTS idx_books_series_name ON books(series_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_reads_book_id ON reads(book_id);
CREATE INDEX IF NOT EXISTS idx_reads_end_date ON reads(end_date);
CREATE INDEX IF NOT EXISTS idx_reads_start_date ON reads(start_date);
CREATE INDEX IF NOT EXISTS idx_book_tags_book_id ON book_tags(book_id);
CREATE INDEX IF NOT EXISTS idx_book_tags_tag_id ON book_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name COLLATE NOCASE);

-- Helpful views
CREATE VIEW IF NOT EXISTS v_finished_year AS
SELECT r.book_id, strftime('%Y', r.end_date) AS year
FROM reads r
WHERE r.end_date IS NOT NULL AND r.end_date <> '';