import { BOOK_TYPES, STATUSES, Book, Read } from '@/types'
import { getDb, getDatabasePath, setDatabasePath as _setDatabasePath } from './client'

const uid = () => Math.random().toString(36).slice(2, 10)

// Tauri plugin-sql v2 with sqlite expects $1, $2... placeholders instead of '?'
function qp(sql: string): string {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

export async function initDb(schemaSql: string) {
  const db = await getDb()
  await db.execute(schemaSql)
}

// -------- Books --------
export async function listBooks(opts?: {
  q?: string; status?: string; tag?: string | null; year?: number | null;
}): Promise<(Book & { tags: string[]; reads_count: number; latest?: Read | null; })[]> {
  const db = await getDb()
  const where: string[] = []
  const params: any[] = []

  if (opts?.q) {
    where.push(`(lower(b.title) LIKE ? OR lower(b.author) LIKE ? OR lower(b.series_name) LIKE ?)`)
    const q = `%${opts.q.toLowerCase()}%`
    params.push(q, q, q)
  }
  if (opts?.status && opts.status !== 'All') { where.push(`b.status = ?`); params.push(opts.status) }
  if (opts?.tag && opts.tag !== 'All') { where.push(`t.name = ?`); params.push(opts.tag) }
  if (opts?.year != null) { where.push(`strftime('%Y', r2.end_date) = ?`); params.push(String(opts.year)) }

  const sql = `
  SELECT b.*,
         COALESCE(GROUP_CONCAT(DISTINCT t.name), '') AS tag_names,
         COUNT(DISTINCT r.id) AS reads_count,
         (
           SELECT COUNT(*) 
           FROM highlights h 
           WHERE h.book_id = b.id
         ) AS highlights_count,
         (
           SELECT json_object(
             'id', r2.id,
             'book_id', r2.book_id,
             'start_date', r2.start_date,
             'end_date', r2.end_date,
             'rating', r2.rating,
              'review', r2.review,
              'format', r2.format
           )
           FROM reads r2
           WHERE r2.book_id = b.id AND (r2.end_date IS NOT NULL)
           ORDER BY r2.end_date DESC
           LIMIT 1
         ) AS latest
  FROM books b
  LEFT JOIN book_tags bt ON bt.book_id = b.id
  LEFT JOIN tags t ON t.id = bt.tag_id
  LEFT JOIN reads r ON r.book_id = b.id
  LEFT JOIN reads r2 ON r2.book_id = b.id
  ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  GROUP BY b.id
  ORDER BY b.title COLLATE NOCASE ASC;
  `
  const rows: any[] = await db.select(qp(sql), params)
  return rows.map((r: any) => {
    const series: Array<{ name: string; number?: number | null }> = []
    const formats: Array<{ format: string; obtained?: string | null }> = []
    // Parse additional series from series_json if present
    try {
      const parsed = r.series_json ? JSON.parse(String(r.series_json)) : []
      if (Array.isArray(parsed)) {
        for (const it of parsed) {
          if (it && typeof it === 'object' && it.name) {
            series.push({ name: String(it.name), number: it.number != null ? Number(it.number) : null })
          }
        }
      }
    } catch {}
    // Parse formats
    try {
      const parsedF = r.formats_json ? JSON.parse(String(r.formats_json)) : []
      if (Array.isArray(parsedF)) {
        for (const it of parsedF) {
          if (it && typeof it === 'object' && it.format) {
            formats.push({ format: String(it.format), obtained: it.obtained != null ? String(it.obtained) : null })
          }
        }
      }
    } catch {}

    return {
      id: r.id,
      title: r.title,
      author: r.author,
      series_name: r.series_name,
      series_number: r.series_number,
      series,
      obtained: r.obtained,
      type: r.type,
      status: r.status,
      comments: r.comments ?? null,
      formats,
      next_up_priority: Boolean(r.next_up_priority),
      tags: r.tag_names ? String(r.tag_names).split(',') : [],
      reads_count: Number(r.reads_count || 0),
      highlightsCount: Number(r.highlights_count || 0),
      latest: r.latest ? JSON.parse(r.latest) : null,
    } as Book & { tags: string[]; reads_count: number; latest?: Read | null }
  })
}

// -------- Search helpers --------
export async function searchAuthors(q: string): Promise<string[]> {
  const db = await getDb()
  const like = `%${q.toLowerCase()}%`
  const rows: any[] = await db.select(qp(`SELECT DISTINCT author FROM books WHERE lower(author) LIKE ? ORDER BY author COLLATE NOCASE LIMIT 200`), [like])
  const split = (s: string) => s.split(/[;,]/).map((x: string) => x.trim()).filter(Boolean)
  const all = rows.flatMap((r: any) => split(String(r.author || '')))
  const uniq = Array.from(new Set(all))
  return uniq
}

export async function searchSeries(q: string): Promise<string[]> {
  const db = await getDb()
  const like = `%${q.toLowerCase()}%`
  const rows: any[] = await db.select(qp(`SELECT DISTINCT series_name AS name FROM books WHERE series_name IS NOT NULL AND series_name <> '' AND lower(series_name) LIKE ? ORDER BY series_name COLLATE NOCASE LIMIT 20`), [like])
  return rows.map((r: any) => r.name).filter(Boolean)
}

export async function searchTags(q: string): Promise<string[]> {
  const db = await getDb()
  const like = `%${q.toLowerCase()}%`
  const rows: any[] = await db.select(qp(`SELECT DISTINCT t.name FROM tags t WHERE lower(t.name) LIKE ? ORDER BY t.name COLLATE NOCASE LIMIT 20`), [like])
  return rows.map((r: any) => r.name).filter(Boolean)
}

export async function upsertBook(b: Partial<Book> & { id?: string }) {
  console.log('upsertBook called with:', b)
  const db = await getDb()
  console.log('Database connection obtained')
  const id = b.id || uid()
  console.log('Generated/using ID:', id)
  
  const sql = qp(`INSERT INTO books (id, title, author, series_name, series_number, series_json, obtained, type, status, comments, formats_json, next_up_priority)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title=?, author=?, series_name=?, series_number=?, series_json=?, obtained=?, type=?, status=?, comments=?, formats_json=?, next_up_priority=?`)
  const seriesJson = (b.series && Array.isArray(b.series) && b.series.length)
    ? JSON.stringify(b.series.filter(s => s && s.name).map(s => ({ name: s.name, number: s.number ?? null })))
    : null
  const formatsJson = (b.formats && Array.isArray(b.formats) && b.formats.length)
    ? JSON.stringify(b.formats.filter(f => f && f.format).map(f => ({ format: f.format, obtained: f.obtained ?? null })))
    : null
  const params = [id, b.title, b.author, b.series_name ?? null, b.series_number ?? null, seriesJson, b.obtained ?? null, b.type, b.status, b.comments ?? null, formatsJson, b.next_up_priority ? 1 : 0,
     b.title, b.author, b.series_name ?? null, b.series_number ?? null, seriesJson, b.obtained ?? null, b.type, b.status, b.comments ?? null, formatsJson, b.next_up_priority ? 1 : 0]
  
  console.log('Executing SQL:', sql)
  console.log('With parameters:', params)
  
  await db.execute(sql, params)
  console.log('Book upserted successfully with ID:', id)
  return id
}

export async function deleteBook(id: string) {
  const db = await getDb()
  await db.execute(qp(`DELETE FROM books WHERE id = ?`), [id])
}

export async function toggleNextUpPriority(id: string, priority: boolean) {
  const db = await getDb()
  await db.execute(qp(`UPDATE books SET next_up_priority = ? WHERE id = ?`), [priority ? 1 : 0, id])
}

// -------- Tags --------
export async function setTagsForBook(bookId: string, tagNames: string[]) {
  const db = await getDb()
  // ensure tags
  for (const name of tagNames) {
    await db.execute(qp(`INSERT OR IGNORE INTO tags (name) VALUES (?)`), [name])
  }
  // clear existing relations
  await db.execute(qp(`DELETE FROM book_tags WHERE book_id = ?`), [bookId])
  // nothing else to do if there are no tags
  if (tagNames.length === 0) {
    return
  }
  // add new relations
  const placeholders = tagNames.map(() => '?').join(',')
  await db.execute(
    qp(`INSERT INTO book_tags (book_id, tag_id)
     SELECT ?, t.id FROM tags t WHERE t.name IN (${placeholders})`),
    [bookId, ...tagNames]
  )
}

export async function allTags(): Promise<string[]> {
  const db = await getDb()
  const rows: any[] = await db.select(`SELECT name FROM tags ORDER BY name COLLATE NOCASE`)
  return rows.map((r: any) => r.name)
}

export async function tagsForBook(bookId: string): Promise<string[]> {
  const db = await getDb()
  const rows: any[] = await db.select(qp(`
    SELECT t.name FROM tags t
    JOIN book_tags bt ON bt.tag_id = t.id
    WHERE bt.book_id = ?
    ORDER BY t.name COLLATE NOCASE
  `), [bookId])
  return rows.map((r: any) => r.name)
}

// -------- Reads --------
export async function upsertRead(r: Partial<Read> & { id?: string, book_id: string }) {
  const db = await getDb()
  const id = r.id || uid()
  await db.execute(
    qp(`INSERT INTO reads (id, book_id, start_date, end_date, rating, review, format)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET start_date=?, end_date=?, rating=?, review=?, format=?`),
    [id, r.book_id, r.start_date ?? null, r.end_date ?? null, r.rating ?? null, r.review ?? null, r.format ?? null,
     r.start_date ?? null, r.end_date ?? null, r.rating ?? null, r.review ?? null, r.format ?? null]
  )
  return id
}

export async function deleteRead(id: string) {
  const db = await getDb()
  await db.execute(qp(`DELETE FROM reads WHERE id = ?`), [id])
}

export async function readsForBook(bookId: string): Promise<Read[]> {
  const db = await getDb()
  return db.select(qp(`SELECT * FROM reads WHERE book_id = ? ORDER BY COALESCE(end_date, start_date) DESC`), [bookId])
}

// -------- Highlights --------
async function ensureHighlightsSchemaUpToDate() {
  const db = await getDb()
  try {
    const columns: any[] = await db.select(`PRAGMA table_info(highlights)`)
    const colNames = Array.isArray(columns) ? columns.map((c: any) => String(c.name)) : []
    const hasCommentary = colNames.includes('commentary')
    const hasSourceTitle = colNames.includes('source_title')
    const hasSourceAuthor = colNames.includes('source_author')
    // Determine if book_id is NOT NULL by inspecting 'notnull' pragma flag
    const bookIdCol: any = Array.isArray(columns) ? columns.find((c: any) => String(c.name) === 'book_id') : null
    const bookIdNotNull = Boolean(bookIdCol?.notnull)

    // If all columns present and book_id already nullable, nothing to do
    if (hasCommentary && hasSourceTitle && hasSourceAuthor && !bookIdNotNull) return

    // If only commentary missing, add it quickly
    if (!hasCommentary && hasSourceTitle && hasSourceAuthor && !bookIdNotNull) {
      await db.execute(`ALTER TABLE highlights ADD COLUMN commentary TEXT`)
      return
    }

    // Otherwise perform table rebuild to ensure schema matches desired (nullable book_id, new columns)
    await db.execute('BEGIN')
    await db.execute(`
      CREATE TABLE IF NOT EXISTS highlights_new (
        id TEXT PRIMARY KEY,
        book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
        text TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        commentary TEXT,
        source_title TEXT,
        source_author TEXT
      );
    `)
    // Copy over existing data with best-effort mapping
    const copySql = `
      INSERT INTO highlights_new (id, book_id, text, created_at, commentary)
      SELECT id, book_id, text, created_at, ${hasCommentary ? 'commentary' : 'NULL'} FROM highlights
    `
    await db.execute(copySql)
    await db.execute('DROP TABLE highlights')
    await db.execute('ALTER TABLE highlights_new RENAME TO highlights')
    await db.execute('COMMIT')
  } catch (_) {
    try { await (await getDb()).execute('ROLLBACK') } catch {}
  }
}
export async function highlightsForBook(bookId: string) {
  const db = await getDb()
  return db.select(qp(`SELECT * FROM highlights WHERE book_id = ? ORDER BY rowid DESC`), [bookId])
}

export async function addHighlight(bookId: string | null, text: string, createdAt?: string, commentary?: string, sourceTitle?: string | null, sourceAuthor?: string | null) {
  await ensureHighlightsSchemaUpToDate()
  const db = await getDb()
  const id = uid()
  await db.execute(
    qp(`INSERT INTO highlights (id, book_id, text, created_at, commentary, source_title, source_author) VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?)`),
    [id, bookId ?? null, text, createdAt ?? null, commentary ?? null, sourceTitle ?? null, sourceAuthor ?? null]
  )
  return id
}

export async function deleteHighlight(id: string) {
  const db = await getDb()
  await db.execute(qp(`DELETE FROM highlights WHERE id = ?`), [id])
}

export async function updateHighlight(id: string, text: string, createdAt?: string, commentary?: string, sourceTitle?: string | null, sourceAuthor?: string | null) {
  await ensureHighlightsSchemaUpToDate()
  const db = await getDb()
  const sets: string[] = ['text = ?']
  const params: any[] = [text]
  if (createdAt) { sets.push('created_at = ?'); params.push(createdAt) }
  if (typeof commentary !== 'undefined') { sets.push('commentary = ?'); params.push(commentary) }
  if (typeof sourceTitle !== 'undefined') { sets.push('source_title = ?'); params.push(sourceTitle) }
  if (typeof sourceAuthor !== 'undefined') { sets.push('source_author = ?'); params.push(sourceAuthor) }
  params.push(id)
  await db.execute(qp(`UPDATE highlights SET ${sets.join(', ')} WHERE id = ?`), params)
}

// -------- Stats --------
export async function countsByYear(): Promise<{ year: string, finished: number }[]> {
  const db = await getDb()
  const rows = await db.select(`
    SELECT strftime('%Y', end_date) AS year, COUNT(*) AS finished
    FROM reads WHERE end_date IS NOT NULL AND end_date <> ''
    GROUP BY 1 ORDER BY 1
  `) as Array<{ year: string; finished: number }>
  return rows.map((r) => ({ year: r.year, finished: Number(r.finished) }))
}

export async function statsTiles(currentYear: number) {
  const db = await getDb()
  const finishedThisYear: any[] = await db.select(
    qp(`SELECT COUNT(*) as c FROM reads WHERE end_date LIKE ?`), [`${currentYear}-%`] )
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const finishedThisMonth: any[] = await db.select(
    qp(`SELECT COUNT(*) as c FROM reads WHERE end_date LIKE ?`), [`${yyyy}-${mm}-%`])
  const finishedToday: any[] = await db.select(
    qp(`SELECT COUNT(*) as c FROM reads WHERE end_date = ?`), [`${yyyy}-${mm}-${dd}`])
  const finishedThisWeek: any[] = await db.select(`
    SELECT COUNT(*) as c FROM reads
    WHERE end_date IS NOT NULL AND end_date <> ''
      AND strftime('%Y', end_date) = strftime('%Y','now')
      AND strftime('%W', end_date) = strftime('%W','now')
  `)
  const toRead: any[] = await db.select(`SELECT COUNT(*) as c FROM books WHERE status = 'To Read'`)
  const reading: any[] = await db.select(`SELECT COUNT(*) as c FROM books WHERE status = 'Reading'`)
  const totalFinished: any[] = await db.select(`
    SELECT COUNT(*) as c FROM reads 
    WHERE end_date IS NOT NULL AND end_date <> ''
  `)
  const gemsTotal: any[] = await db.select(`SELECT COUNT(*) as c FROM highlights`)
  
  return {
    finishedThisYear: Number(finishedThisYear?.[0]?.c || 0),
    finishedThisMonth: Number(finishedThisMonth?.[0]?.c || 0),
    finishedThisWeek: Number(finishedThisWeek?.[0]?.c || 0),
    finishedToday: Number(finishedToday?.[0]?.c || 0),
    toRead: Number(toRead?.[0]?.c || 0),
    reading: Number(reading?.[0]?.c || 0),
    totalFinished: Number(totalFinished?.[0]?.c || 0),
    gemsTotal: Number(gemsTotal?.[0]?.c || 0)
  }
}

// Reading streaks removed

export async function getRecentActivity(limit: number = 10) {
  const db = await getDb()
  
  // Get recent finished books
  const recentFinishes = await db.select(qp(`
    SELECT 
      'finished' as activity_type,
      b.title,
      b.author,
      b.series_name,
      b.series_number,
      r.end_date as activity_date,
      r.rating,
      r.review,
      b.type
    FROM reads r
    JOIN books b ON b.id = r.book_id
    WHERE r.end_date IS NOT NULL AND r.end_date <> ''
    ORDER BY r.end_date DESC
    LIMIT ?
  `), [limit]) as Array<{
    activity_type: 'finished'
    title: string
    author: string
    series_name: string | null
    series_number: number | null
    activity_date: string
    rating: number | null
    review: string | null
    type: string
  }>
  
  // Get recent started books
  const recentStarts = await db.select(qp(`
    SELECT 
      'started' as activity_type,
      b.title,
      b.author,
      b.series_name,
      b.series_number,
      r.start_date as activity_date,
      NULL as rating,
      NULL as review,
      b.type
    FROM reads r
    JOIN books b ON b.id = r.book_id
    WHERE r.start_date IS NOT NULL AND r.start_date <> ''
      AND (r.end_date IS NULL OR r.end_date = '')
    ORDER BY r.start_date DESC
    LIMIT ?
  `), [limit]) as Array<{
    activity_type: 'started'
    title: string
    author: string
    series_name: string | null
    series_number: number | null
    activity_date: string
    rating: null
    review: null
    type: string
  }>
  
  // Get recent highlights
  const recentHighlights = await db.select(qp(`
    SELECT 
      'highlight' as activity_type,
      COALESCE(b.title, h.source_title) as title,
      COALESCE(b.author, h.source_author) as author,
      b.series_name,
      b.series_number,
      substr(h.created_at, 1, 10) as activity_date,
      NULL as rating,
      COALESCE(h.commentary, h.text) as review,
      COALESCE(b.type, 'Gem') as type
    FROM highlights h
    LEFT JOIN books b ON b.id = h.book_id
    WHERE h.created_at IS NOT NULL
    ORDER BY h.created_at DESC
    LIMIT ?
  `), [limit]) as Array<{
    activity_type: 'highlight'
    title: string
    author: string
    series_name: string | null
    series_number: number | null
    activity_date: string
    rating: null
    review: string | null
    type: string
  }>
  
  // Combine and sort all activities
  const allActivities = [
    ...recentFinishes.map((a) => ({ ...a, activity_date: a.activity_date })),
    ...recentStarts.map((a) => ({ ...a, activity_date: a.activity_date })),
    ...recentHighlights.map((a) => ({ ...a, activity_date: a.activity_date }))
  ].sort((a, b) => {
    const dateA = new Date(a.activity_date).getTime()
    const dateB = new Date(b.activity_date).getTime()
    return dateB - dateA // Most recent first
  }).slice(0, limit)
  
  return allActivities
}

// -------- Reading Goals --------
export type ReadingGoal = {
  id: string
  goal_type: 'monthly' | 'yearly'
  target_period: string
  target_count: number
  created_at?: string
}

export async function getReadingGoals(goalType?: 'monthly' | 'yearly'): Promise<ReadingGoal[]> {
  const db = await getDb()
  let sql = `SELECT * FROM reading_goals`
  const params: any[] = []
  
  if (goalType) {
    sql += ` WHERE goal_type = ?`
    params.push(goalType)
  }
  
  sql += ` ORDER BY target_period DESC`
  
  return await db.select(qp(sql), params) as ReadingGoal[]
}

export async function setReadingGoal(goalType: 'monthly' | 'yearly', targetPeriod: string, targetCount: number) {
  const db = await getDb()
  const id = uid()
  
  // First, remove any existing goal for the same period
  await db.execute(qp(`DELETE FROM reading_goals WHERE goal_type = ? AND target_period = ?`), [goalType, targetPeriod])
  
  // Insert the new goal
  await db.execute(qp(`
    INSERT INTO reading_goals (id, goal_type, target_period, target_count)
    VALUES (?, ?, ?, ?)
  `), [id, goalType, targetPeriod, targetCount])
  
  return { id, goalType, targetPeriod, targetCount }
}

export async function getGoalProgress(goalType: 'monthly' | 'yearly', targetPeriod: string): Promise<number> {
  const db = await getDb()
  
  let sql: string
  if (goalType === 'monthly') {
    sql = `
      SELECT COUNT(*) as completed_count
      FROM reads 
      WHERE end_date IS NOT NULL 
        AND end_date <> ''
        AND strftime('%Y-%m', end_date) = ?
    `
  } else {
    sql = `
      SELECT COUNT(*) as completed_count
      FROM reads 
      WHERE end_date IS NOT NULL 
        AND end_date <> ''
        AND strftime('%Y', end_date) = ?
    `
  }
  
  const result = await db.select(qp(sql), [targetPeriod]) as Array<{ completed_count: number }>
  return Number(result?.[0]?.completed_count ?? 0)
}

export async function getCurrentGoalStatus() {
  const now = new Date()
  const currentYear = now.getFullYear().toString()
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  // Get current goals
  const [monthlyGoals, yearlyGoals] = await Promise.all([
    getReadingGoals('monthly'),
    getReadingGoals('yearly')
  ])
  
  const currentMonthlyGoal = monthlyGoals.find((g: ReadingGoal) => g.target_period === currentMonth)
  const currentYearlyGoal = yearlyGoals.find((g: ReadingGoal) => g.target_period === currentYear)
  
  // Get progress
  const [monthlyProgress, yearlyProgress] = await Promise.all([
    getGoalProgress('monthly', currentMonth),
    getGoalProgress('yearly', currentYear)
  ])
  
  return {
    monthly: currentMonthlyGoal ? {
      goal: currentMonthlyGoal,
      progress: monthlyProgress,
      percentage: Math.round((monthlyProgress / currentMonthlyGoal.target_count) * 100)
    } : null,
    yearly: currentYearlyGoal ? {
      goal: currentYearlyGoal,
      progress: yearlyProgress,
      percentage: Math.round((yearlyProgress / currentYearlyGoal.target_count) * 100)
    } : null
  }
}

// -------- CSV (import/export minimal) --------
const csvEsc = (s: string) => '"' + String(s).split('"').join('""') + '"'
export async function exportCsvFor(rows: any[]) {
  const headers = [
    'title','author','seriesName','seriesNumber','obtained','type','status','comments','tags','latestStart','latestEnd','latestRating','latestReview','highlightsCount'
  ]
  const body = rows.map((b: any) => [
    b.title, b.author, b.series_name||'', b.series_number??'', b.obtained??'', b.type, b.status, b.comments||'',
    (b.tags||[]).join(';'),
    b.latest?.start_date||'', b.latest?.end_date||'', b.latest?.rating??'', b.latest?.review||'',
    b.highlightsCount ?? 0
  ].map((v: any) => csvEsc(String(v))))
  return [headers.join(','), ...body.map(r => r.join(','))].join('\n')
}

export async function importCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  const headers = lines.shift()!.split(',')
  const idx = (n: string) => headers.indexOf(n)
  for (const line of lines) {
    let cells: string[] = []; let cur = ''; let inQ = false
    for (let i=0;i<line.length;i++){
      const ch = line[i]
      if (ch==='"') { if (inQ && line[i+1]==='"'){ cur+='"'; i++; } else inQ = !inQ }
      else if (ch===',' && !inQ) { cells.push(cur); cur=''; }
      else cur+=ch
    }
    cells.push(cur)
    const title = cells[idx('title')]||''; if (!title) continue
    const author = cells[idx('author')]||''
    const seriesName = cells[idx('seriesName')]||null
    const seriesNumber = cells[idx('seriesNumber')]? Number(cells[idx('seriesNumber')]) : null
    const obtained = cells[idx('obtained')]||null
    const type = (cells[idx('type')]||'Book')
    const status = (cells[idx('status')]||'To Read')
    const comments = (idx('comments')>=0 ? (cells[idx('comments')]||null) : null)
    const tags = (cells[idx('tags')]||'').split(';').filter(Boolean)
    const latestStart = cells[idx('latestStart')]||null
    const latestEnd = cells[idx('latestEnd')]||null
    const latestRating = cells[idx('latestRating')]? Number(cells[idx('latestRating')]) : null
    const latestReview = cells[idx('latestReview')]||null

    const id = Math.random().toString(36).slice(2,10)
    await upsertBook({ id, title, author, series_name: seriesName||undefined, series_number: seriesNumber||undefined, obtained: obtained as any, type: type as any, status: status as any, comments: comments || undefined })
    // tags
    await setTagsForBook(id, tags)
    // read
    if (latestStart || latestEnd || latestRating || latestReview) {
      await upsertRead({ id: Math.random().toString(36).slice(2,10), book_id: id, start_date: latestStart||undefined, end_date: latestEnd||undefined, rating: latestRating||undefined, review: latestReview||undefined })
    }
  }
}

// -------- JSON (full export/import) --------
export async function exportJson(): Promise<string> {
  const db = await getDb()
  const books = await db.select(`SELECT * FROM books`)
  const tags = await db.select(`SELECT * FROM tags`)
  const book_tags = await db.select(`SELECT * FROM book_tags`)
  const reads = await db.select(`SELECT * FROM reads`)
  const highlights = await db.select(`SELECT * FROM highlights`)
  return JSON.stringify({ books, tags, book_tags, reads, highlights }, null, 2)
}

export async function importJson(text: string) {
  const db = await getDb()
  const data = JSON.parse(text || '{}')
  // naive import: clear and insert
  await db.execute('DELETE FROM book_tags')
  await db.execute('DELETE FROM tags')
  await db.execute('DELETE FROM reads')
  await db.execute('DELETE FROM highlights')
  await db.execute('DELETE FROM books')
  for (const b of (data.books||[])) {
    await db.execute(
      qp(`INSERT INTO books (id, title, author, series_name, series_number, series_json, obtained, type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
      [b.id, b.title, b.author, b.series_name ?? null, b.series_number ?? null, b.series_json ?? null, b.obtained ?? null, b.type, b.status]
    )
  }
  for (const t of (data.tags||[])) {
    await db.execute(qp(`INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)`), [t.id ?? null, t.name])
  }
  for (const bt of (data.book_tags||[])) {
    await db.execute(qp(`INSERT INTO book_tags (book_id, tag_id) VALUES (?, ?)`), [bt.book_id, bt.tag_id])
  }
  for (const r of (data.reads||[])) {
    await db.execute(
      qp(`INSERT INTO reads (id, book_id, start_date, end_date, rating, review, format) VALUES (?, ?, ?, ?, ?, ?, ?)`),
      [r.id, r.book_id, r.start_date ?? null, r.end_date ?? null, r.rating ?? null, r.review ?? null, r.format ?? null]
    )
  }
  for (const h of (data.highlights||[])) {
    await db.execute(
      qp(`INSERT INTO highlights (id, book_id, text, created_at) VALUES (?, ?, ?, ?)`),
      [h.id, h.book_id, h.text, h.created_at ?? null]
    )
  }
}

export async function exportHighlightsCsv(): Promise<string> {
  const db = await getDb()
  const rows: any[] = await db.select(`
    SELECT h.id, COALESCE(b.title, h.source_title) AS book, COALESCE(b.author, h.source_author) AS author, h.text, h.created_at, h.commentary
    FROM highlights h LEFT JOIN books b ON b.id = h.book_id
    ORDER BY h.rowid DESC
  `)
  const headers = ['id','book','author','text','created_at','commentary']
  const esc = (s: string) => '"' + String(s).split('"').join('""') + '"'
  const body = rows.map((r: any) => [r.id, r.book, r.author, r.text, r.created_at, r.commentary ?? ''].map(esc).join(','))
  return [headers.join(','), ...body].join('\n')
}

export async function databasePath(): Promise<string> {
  return getDatabasePath()
}

export async function setDatabasePath(path: string): Promise<void> {
  return _setDatabasePath(path)
}

export async function importHighlightsCsv(text: string) {
  const db = await getDb()
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return
  const headers = lines.shift()!.split(',')
  const idx = (n: string) => headers.indexOf(n)
  const has = (n: string) => idx(n) >= 0
  for (const line of lines) {
    let cells: string[] = []; let cur = ''; let inQ = false
    for (let i=0;i<line.length;i++){
      const ch = line[i]
      if (ch==='"') { if (inQ && line[i+1]==='"'){ cur+='"'; i++; } else inQ = !inQ }
      else if (ch===',' && !inQ) { cells.push(cur); cur=''; }
      else cur+=ch
    }
    cells.push(cur)
    const title = has('book') ? cells[idx('book')] : (has('title') ? cells[idx('title')] : '')
    const author = has('author') ? cells[idx('author')] : ''
    const htext = has('text') ? cells[idx('text')] : ''
    const createdAt = has('created_at') ? (cells[idx('created_at')] || null) : null
    const commentary = has('commentary') ? (cells[idx('commentary')] || null) : null
    if (!title || !htext) continue
    // find or create book
    const existing: any[] = await db.select(qp(`SELECT id FROM books WHERE lower(title) = ? AND lower(author) = ? LIMIT 1`), [String(title).toLowerCase(), String(author).toLowerCase()])
    let bookId: string
    if (existing.length > 0) {
      bookId = existing[0].id
    } else {
      bookId = uid()
      await upsertBook({ id: bookId, title, author, type: 'Book' as any, status: 'To Read' as any })
    }
    const hid = has('id') && cells[idx('id')] ? cells[idx('id')] : uid()
    await db.execute(
      qp(`INSERT INTO highlights (id, book_id, text, created_at, commentary) VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?)`),
      [hid, bookId, htext, createdAt, commentary]
    )
  }
}