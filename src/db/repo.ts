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
  return rows.map((r: any) => ({
    id: r.id, title: r.title, author: r.author, series_name: r.series_name,
    series_number: r.series_number, obtained: r.obtained, type: r.type, status: r.status,
    tags: r.tag_names ? String(r.tag_names).split(',') : [],
    reads_count: Number(r.reads_count || 0),
    highlightsCount: Number(r.highlights_count || 0),
    latest: r.latest ? JSON.parse(r.latest) : null,
  }))
}

// -------- Search helpers --------
export async function searchAuthors(q: string): Promise<string[]> {
  const db = await getDb()
  const like = `%${q.toLowerCase()}%`
  const rows: any[] = await db.select(qp(`SELECT DISTINCT author FROM books WHERE lower(author) LIKE ? ORDER BY author COLLATE NOCASE LIMIT 20`), [like])
  return rows.map((r: any) => r.author).filter(Boolean)
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
  
  const sql = qp(`INSERT INTO books (id, title, author, series_name, series_number, obtained, type, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title=?, author=?, series_name=?, series_number=?, obtained=?, type=?, status=?`)
  const params = [id, b.title, b.author, b.series_name ?? null, b.series_number ?? null, b.obtained ?? null, b.type, b.status,
     b.title, b.author, b.series_name ?? null, b.series_number ?? null, b.obtained ?? null, b.type, b.status]
  
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
export async function highlightsForBook(bookId: string) {
  const db = await getDb()
  return db.select(qp(`SELECT * FROM highlights WHERE book_id = ? ORDER BY rowid DESC`), [bookId])
}

export async function addHighlight(bookId: string, text: string) {
  const db = await getDb()
  const id = uid()
  await db.execute(qp(`INSERT INTO highlights (id, book_id, text) VALUES (?, ?, ?)`), [id, bookId, text])
  return id
}

export async function deleteHighlight(id: string) {
  const db = await getDb()
  await db.execute(qp(`DELETE FROM highlights WHERE id = ?`), [id])
}

export async function updateHighlight(id: string, text: string) {
  const db = await getDb()
  await db.execute(qp(`UPDATE highlights SET text = ? WHERE id = ?`), [text, id])
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
  
  return {
    finishedThisYear: Number(finishedThisYear?.[0]?.c || 0),
    finishedThisMonth: Number(finishedThisMonth?.[0]?.c || 0),
    finishedThisWeek: Number(finishedThisWeek?.[0]?.c || 0),
    finishedToday: Number(finishedToday?.[0]?.c || 0),
    toRead: Number(toRead?.[0]?.c || 0),
    reading: Number(reading?.[0]?.c || 0),
    totalFinished: Number(totalFinished?.[0]?.c || 0)
  }
}

// -------- CSV (import/export minimal) --------
const csvEsc = (s: string) => '"' + String(s).split('"').join('""') + '"'
export async function exportCsvFor(rows: any[]) {
  const headers = [
    'title','author','seriesName','seriesNumber','obtained','type','status','tags','latestStart','latestEnd','latestRating','latestReview','highlightsCount'
  ]
  const body = rows.map((b: any) => [
    b.title, b.author, b.series_name||'', b.series_number??'', b.obtained??'', b.type, b.status,
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
    const tags = (cells[idx('tags')]||'').split(';').filter(Boolean)
    const latestStart = cells[idx('latestStart')]||null
    const latestEnd = cells[idx('latestEnd')]||null
    const latestRating = cells[idx('latestRating')]? Number(cells[idx('latestRating')]) : null
    const latestReview = cells[idx('latestReview')]||null

    const id = Math.random().toString(36).slice(2,10)
    await upsertBook({ id, title, author, series_name: seriesName||undefined, series_number: seriesNumber||undefined, obtained: obtained as any, type: type as any, status: status as any })
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
      qp(`INSERT INTO books (id, title, author, series_name, series_number, obtained, type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
      [b.id, b.title, b.author, b.series_name ?? null, b.series_number ?? null, b.obtained ?? null, b.type, b.status]
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
    SELECT h.id, b.title AS book, b.author, h.text, h.created_at
    FROM highlights h JOIN books b ON b.id = h.book_id
    ORDER BY h.rowid DESC
  `)
  const headers = ['id','book','author','text','created_at']
  const esc = (s: string) => '"' + String(s).split('"').join('""') + '"'
  const body = rows.map((r: any) => [r.id, r.book, r.author, r.text, r.created_at].map(esc).join(','))
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
      qp(`INSERT INTO highlights (id, book_id, text, created_at) VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`),
      [hid, bookId, htext, createdAt]
    )
  }
}