import Database from '@tauri-apps/plugin-sql'

let dbPromise: Promise<Database> | null = null

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    // Initialize the database with Tauri v2 SQL plugin
    dbPromise = Database.load('sqlite:localreads.db')
    
    // Initialize the database schema
    try {
      await initDatabase()
    } catch (error) {
      console.error('Failed to initialize database:', error)
    }
  }
  return dbPromise
}

async function initDatabase() {
  const db = await dbPromise
  if (!db) return
  
  // Initialize database schema
  await execSchema(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      series_name TEXT,
      series_number INTEGER,
      obtained TEXT,
      type TEXT NOT NULL DEFAULT 'Book',
      status TEXT NOT NULL DEFAULT 'To Read'
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS book_tags (
      book_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
      PRIMARY KEY (book_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS reads (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      rating INTEGER,
      review TEXT,
      FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_books_title ON books (title);
    CREATE INDEX IF NOT EXISTS idx_books_author ON books (author);
    CREATE INDEX IF NOT EXISTS idx_books_status ON books (status);
    CREATE INDEX IF NOT EXISTS idx_reads_book_id ON reads (book_id);
    CREATE INDEX IF NOT EXISTS idx_highlights_book_id ON highlights (book_id);
  `)
}

export async function execSchema(sql: string) {
  const db = await getDb()
  return db.execute(sql)
}