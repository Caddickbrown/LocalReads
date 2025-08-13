import Database from '@tauri-apps/plugin-sql'
import { appConfigDir } from '@tauri-apps/api/path'

let dbPromise: Promise<Database> | null = null
let overrideDbPath: string | null = null

function isTauriEnvironment(): boolean {
  // Tauri v2 injects __TAURI_INTERNALS__ into the window inside the WebView
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ != null
}

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    console.log('Initializing database connection...')
    // Initialize the database with Tauri v2 SQL plugin
    // Use app-config base dir; ensure consistent path across dev/prod
    if (!isTauriEnvironment()) {
      const message = 'Database is unavailable: not running inside the Tauri app. Please use the native window (npm run tauri:dev) or the installed app.'
      console.error(message)
      throw new Error(message)
    }
    // Resolve app config dir and load an explicit file path
    try {
      const target = await resolveDatabasePath()
      console.log('SQLite file location:', target)
      dbPromise = Database.load(`sqlite:${target}`)
    } catch {
      // Fallback to default configured name if path resolution fails
      dbPromise = Database.load('sqlite:localreads.sqlite')
    }
    
    // Initialize the database schema
    try {
      console.log('Initializing database schema...')
      await initDatabase()
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }
  return dbPromise
}

async function resolveDatabasePath(): Promise<string> {
  if (overrideDbPath) return overrideDbPath
  const dir = await appConfigDir()
  return `${dir}localreads.sqlite`
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
      format TEXT,
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

  // Attempt to add new columns for migrations if they don't exist
  try { await db.execute(`ALTER TABLE reads ADD COLUMN format TEXT`) } catch {}
  try { await db.execute(`ALTER TABLE highlights ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP`) } catch {}
  try { await db.execute(`ALTER TABLE reads ADD COLUMN current_page INTEGER DEFAULT 0`) } catch {}
  try { await db.execute(`ALTER TABLE reads ADD COLUMN total_pages INTEGER DEFAULT 0`) } catch {}
  try { await db.execute(`ALTER TABLE reads ADD COLUMN progress_percentage INTEGER DEFAULT 0`) } catch {}
  try { await db.execute(`ALTER TABLE books ADD COLUMN next_up_priority BOOLEAN DEFAULT FALSE`) } catch {}
  try { 
    await db.execute(`CREATE TABLE IF NOT EXISTS reading_goals (
      id TEXT PRIMARY KEY,
      goal_type TEXT NOT NULL,
      target_period TEXT NOT NULL,
      target_count INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`)
  } catch {}
}

export async function execSchema(sql: string) {
  const db = await getDb()
  return db.execute(sql)
}

export async function getDatabasePath(): Promise<string> {
  try {
    if (overrideDbPath) return overrideDbPath
    const dir = await appConfigDir()
    return `${dir}localreads.sqlite`
  } catch {
    return 'localreads.sqlite'
  }
}

export async function setDatabasePath(newPath: string) {
  overrideDbPath = newPath
  // Force re-init on next access
  dbPromise = null
}