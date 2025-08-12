import { BOOK_TYPES, STATUSES, Book, Read } from '@/types'
import { getDb } from './client'

const uid = () => Math.random().toString(36).slice(2, 10)

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
           SELECT json_object(
             'id', r2.id,
             'book_id', r2.book_id,
             'start_date', r2.start_date,
             'end_date', r2.end_date,
             'rating', r2.rating,
             'review', r2.review
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
  const rows = await db.select(sql, params)
  return rows.map((r: any) => ({
    id: r.id, title: r.title, author: r.author, series_name: r.series_name,
    series_number: r.series_number, obtained: r.obtained, type: r.type, status: r.status,
    tags: r.tag_names ? String(r.tag_names).split(',') : [],
    reads_count: Number(r.reads_count || 0),
    latest: r.latest ? JSON.parse(r.latest) : null,
  }))
}

export async function upsertBook(b: Partial<Book> & { id?: string }) {
  const db = await getDb()
  const id = b.id || uid()
  await db.execute(
    `INSERT INTO books (id, title, author, series_name, series_number, obtained, type, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title=?, author=?, series_name=?, series_number=?, obtained=?, type=?, status=?`,
    [id, b.title, b.author, b.series_name ?? null, b.series_number ?? null, b.obtained ?? null, b.type, b.status,
     b.title, b.author, b.series_name ?? null, b.series_number ?? null, b.obtained ?? null, b.type, b.status]
  )
  return id
}

export async function deleteBook(id: string) {
  const db = await getDb()
  await db.execute(`DELETE FROM books WHERE id = ?`, [id])
}

// -------- Tags --------
export async function setTagsForBook(bookId: string, tagNames: string[]) {
  const db = await getDb()
  // ensure tags
  for (const name of tagNames) {
    await db.execute(`INSERT OR IGNORE INTO tags (name) VALUES (?)`, [name])
  }
  await db.execute(`DELETE FROM book_tags WHERE book_id = ?`, [bookId])
  await db.execute(`INSERT INTO book_tags (book_id, tag_id)
                    SELECT ?, t.id FROM tags t WHERE t.name IN (${tagNames.map(()=>'?').join(',')})`,
                    [bookId, ...tagNames])
}

export async function allTags(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select(`SELECT name FROM tags ORDER BY name COLLATE NOCASE`)
  return rows.map((r: any) => r.name)
}

// -------- Reads --------
export async function upsertRead(r: Partial<Read> & { id?: string, book_id: string }) {
  const db = await getDb()
  const id = r.id || uid()
  await db.execute(
    `INSERT INTO reads (id, book_id, start_date, end_date, rating, review)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET start_date=?, end_date=?, rating=?, review=?`,
    [id, r.book_id, r.start_date ?? null, r.end_date ?? null, r.rating ?? null, r.review ?? null,
     r.start_date ?? null, r.end_date ?? null, r.rating ?? null, r.review ?? null]
  )
  return id
}

export async function deleteRead(id: string) {
  const db = await getDb()
  await db.execute(`DELETE FROM reads WHERE id = ?`, [id])
}

export async function readsForBook(bookId: string): Promise<Read[]> {
  const db = await getDb()
  return db.select(`SELECT * FROM reads WHERE book_id = ? ORDER BY COALESCE(end_date, start_date) DESC`, [bookId])
}

// -------- Highlights --------
export async function highlightsForBook(bookId: string) {
  const db = await getDb()
  return db.select(`SELECT * FROM highlights WHERE book_id = ? ORDER BY rowid DESC`, [bookId])
}

export async function addHighlight(bookId: string, text: string) {
  const db = await getDb()
  const id = uid()
  await db.execute(`INSERT INTO highlights (id, book_id, text) VALUES (?, ?, ?)`, [id, bookId, text])
  return id
}

export async function deleteHighlight(id: string) {
  const db = await getDb()
  await db.execute(`DELETE FROM highlights WHERE id = ?`, [id])
}

// -------- Stats --------
export async function countsByYear(): Promise<{ year: string, finished: number }[]> {
  const db = await getDb()
  const rows = await db.select(`
    SELECT strftime('%Y', end_date) AS year, COUNT(*) AS finished
    FROM reads WHERE end_date IS NOT NULL AND end_date <> ''
    GROUP BY 1 ORDER BY 1
  `)
  return rows.map((r: any) => ({ year: r.year, finished: Number(r.finished) }))
}

export async function statsTiles(currentYear: number) {
  const db = await getDb()
  const finishedThisYear = await db.select(
    `SELECT COUNT(*) as c FROM reads WHERE end_date LIKE ?`, [`${currentYear}-%`] )
  const toRead = await db.select(`SELECT COUNT(*) as c FROM books WHERE status = 'To Read'`)
  const reading = await db.select(`SELECT COUNT(*) as c FROM books WHERE status = 'Reading'`)
  return {
    finishedThisYear: Number(finishedThisYear?.[0]?.c || 0),
    toRead: Number(toRead?.[0]?.c || 0),
    reading: Number(reading?.[0]?.c || 0)
  }
}

// -------- CSV (import/export minimal) --------
const csvEsc = (s: string) => '"' + s.replaceAll('"', '""') + '"'
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