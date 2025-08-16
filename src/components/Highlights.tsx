import React, { useEffect, useState, useMemo } from 'react'
import { Tags, Plus, FileDown, Search, X, Edit3, Trash2 } from 'lucide-react'
import { getDb } from '@/db/client'
import { Card, CardHeader, CardContent, Button, Input, Textarea, Spinner, EmptyState } from './ui'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { exportHighlightsCsv, deleteHighlight as repoDeleteHighlight, updateHighlight as repoUpdateHighlight, addHighlight as repoAddHighlight } from '@/db/repo'

export default function Highlights({ onBack }:{ onBack:()=>void }){
  const [rows, setRows] = useState<{ id:string, book:string, author:string, text:string, created_at?: string, commentary?: string }[]>([])
  const [editingId, setEditingId] = useState<string>('')
  const [editingText, setEditingText] = useState<string>('')
  const [editingDate, setEditingDate] = useState<string>('')
  const [editingComment, setEditingComment] = useState<string>('')
  const [newText, setNewText] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newCommentary, setNewCommentary] = useState('')
  const [bookQ, setBookQ] = useState('')
  const [books, setBooks] = useState<{id:string,title:string,author:string}[]>([])
  const [selectedBook, setSelectedBook] = useState<string>('')
  const [altTitle, setAltTitle] = useState('')
  const [altAuthor, setAltAuthor] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'book' | 'author' | 'text'>('all')
  
  useEffect(()=>{ (async()=>{
    setIsLoading(true)
    try {
      const db = await getDb()
      const r = await db.select(`
        SELECT h.id, COALESCE(b.title, h.source_title) AS book, COALESCE(b.author, h.source_author) AS author, h.text, h.created_at, h.commentary
        FROM highlights h LEFT JOIN books b ON b.id = h.book_id
        ORDER BY h.rowid DESC
      `) as Array<{id:string, book:string, author:string, text:string, created_at?: string, commentary?: string}>
      setRows(r)
      const b = await db.select(`SELECT id, title, author FROM books ORDER BY title COLLATE NOCASE`) as Array<{id:string,title:string,author:string}>
      setBooks(b)
    } finally {
      setIsLoading(false)
    }
  })() }, [])
  const addHighlight = async () => {
    if (!newText.trim()) return
    // Linked to a real book if selected; otherwise store as standalone gem with source fields
    const bookId = selectedBook || null
    await repoAddHighlight(bookId, newText.trim(), newDate || undefined, newCommentary || undefined, altTitle || null, altAuthor || null)
    setNewText('')
    setNewDate('')
    setNewCommentary('')
    setSelectedBook('')
    setAltTitle('')
    setAltAuthor('')
    const db2 = await getDb()
    const r = await db2.select(`
      SELECT h.id, COALESCE(b.title, h.source_title) AS book, COALESCE(b.author, h.source_author) AS author, h.text, h.created_at, h.commentary
      FROM highlights h 
      LEFT JOIN books b ON b.id = h.book_id
      ORDER BY h.rowid DESC
    `) as Array<{id:string, book:string, author:string, text:string, created_at?: string, commentary?: string}>
    setRows(r)
  }

  const removeHighlight = async (id: string) => {
    await repoDeleteHighlight(id)
    const db = await getDb()
    const r = await db.select(`
      SELECT h.id, COALESCE(b.title, h.source_title) AS book, COALESCE(b.author, h.source_author) AS author, h.text, h.created_at, h.commentary
      FROM highlights h LEFT JOIN books b ON b.id = h.book_id
      ORDER BY h.rowid DESC
    `) as Array<{id:string, book:string, author:string, text:string, created_at?: string, commentary?: string}>
    setRows(r)
  }

  const startEdit = (id: string, text: string, createdAt?: string, commentary?: string) => {
    setEditingId(id)
    setEditingText(text)
    setEditingDate(createdAt ? createdAt.substring(0,10) : '')
    setEditingComment(commentary || '')
  }

  const saveEdit = async () => {
    if (!editingId) return
    await repoUpdateHighlight(editingId, editingText, editingDate || undefined, editingComment)
    setEditingId('')
    setEditingText('')
    setEditingDate('')
    setEditingComment('')
    const db = await getDb()
    const r = await db.select(`
      SELECT h.id, COALESCE(b.title, h.source_title) AS book, COALESCE(b.author, h.source_author) AS author, h.text, h.created_at, h.commentary
      FROM highlights h LEFT JOIN books b ON b.id = h.book_id
      ORDER BY h.rowid DESC
    `) as Array<{id:string, book:string, author:string, text:string, created_at?: string, commentary?: string}>
    setRows(r)
  }

  // Filter highlights based on search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    
    const query = searchQuery.toLowerCase()
    return rows.filter(row => {
      switch (filterBy) {
        case 'book':
          return row.book.toLowerCase().includes(query)
        case 'author':
          return row.author.toLowerCase().includes(query)
        case 'text':
          return row.text.toLowerCase().includes(query)
        case 'all':
        default:
          return (
            row.book.toLowerCase().includes(query) ||
            row.author.toLowerCase().includes(query) ||
            row.text.toLowerCase().includes(query)
          )
      }
    })
  }, [rows, searchQuery, filterBy])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-heading-2 flex items-center gap-2"><Tags className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/> Gems ({filteredRows.length}{filteredRows.length !== rows.length ? ` of ${rows.length}` : ''})</h2>
          <div className="flex items-center gap-2">
            <Button onClick={async ()=>{
              try {
                console.log('Starting gems export from Highlights view...')
                const csv = await exportHighlightsCsv()
                console.log('Generated gems CSV length:', csv.length)
                const filePath = await save({ title: 'Export Gems CSV', defaultPath: 'gems.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] })
                console.log('Selected gems file path:', filePath)
                if (filePath) {
                  await writeTextFile(filePath as string, csv)
                  console.log('Gems file written successfully')
                  alert('Gems CSV exported successfully!')
                } else {
                  console.log('No file path selected')
                }
              } catch (error) {
                console.error('Gems export failed:', error)
                alert(`Gems export failed: ${error}`)
              }
            }} className="flex items-center gap-2"><FileDown className="w-4 h-4"/> Export</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Input placeholder="Search book..." value={bookQ} onChange={(e)=>setBookQ(e.target.value)} />
              <select className="mt-2 w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950" value={selectedBook} onChange={(e)=>setSelectedBook(e.target.value)}>
                <option value="">Select a book…</option>
                {books.filter(b=> (b.title+" "+b.author).toLowerCase().includes(bookQ.toLowerCase())).map(b => (
                  <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
                ))}
              </select>
              <div className="text-xs opacity-70 mt-2">Or specify an alternate source (won't create a book):</div>
              <Input className="mt-2" placeholder="Source title (article, talk, etc.)" value={altTitle} onChange={(e)=>setAltTitle(e.target.value)} />
              <Input className="mt-2" placeholder="Source author (optional)" value={altAuthor} onChange={(e)=>setAltAuthor(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Textarea rows={3} placeholder="Gem text…" value={newText} onChange={(e)=>setNewText(e.target.value)} />
              <div className="mt-2">
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Date (optional)</label>
                <Input type="date" value={newDate} onChange={(e)=>setNewDate(e.target.value)} />
              </div>
              <div className="mt-2">
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Commentary (optional)</label>
                <Textarea rows={2} placeholder="Why this gem matters…" value={newCommentary} onChange={(e)=>setNewCommentary(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={addHighlight} className="flex items-center gap-2"><Plus className="w-4 h-4"/> Add Gem</Button>
          </div>
        </div>

        {/* Search section */}
        <div className="mb-4 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-3 mb-3">
            <Search className="w-4 h-4 text-zinc-500" />
            <h3 className="font-medium text-sm">Search Gems</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Input
                placeholder="Search in gems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as 'all' | 'book' | 'author' | 'text')}
              className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
            >
              <option value="all">Search All</option>
              <option value="book">Book Title</option>
              <option value="author">Author</option>
              <option value="text">Gem Text</option>
            </select>
            <div className="text-xs text-zinc-500 flex items-center">
              {searchQuery && `${filteredRows.length} result${filteredRows.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" className="mb-4" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading your gems...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          rows.length === 0 ? (
            <EmptyState
              illustration="highlights"
              title="No gems yet"
              description="Start capturing memorable quotes, notes, and ideas from your books. Gems help you remember and revisit your favorite moments."
              tips={[
                "Add gems from the form above",
                "Copy and paste interesting passages or notes from your books",
                "Include context or personal notes",
                "Export your gems as CSV for backup"
              ]}
              action={
                <Button onClick={() => {
                  const textArea = document.querySelector('textarea[placeholder*="Gem text"]') as HTMLTextAreaElement
                  if (textArea) {
                    textArea.focus()
                  }
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Gem
                </Button>
              }
            />
          ) : (
            <EmptyState
              illustration="search"
              title="No matching gems"
              description={`No gems match "${searchQuery}" in ${filterBy === 'all' ? 'any field' : filterBy}.`}
              tips={[
                "Try adjusting your search query",
                "Use different filter options",
                "Check spelling and try broader terms",
                "Clear search to see all gems"
              ]}
              action={
                <div className="space-y-2">
                  <Button onClick={() => setSearchQuery('')} variant="secondary">
                    Clear Search
                  </Button>
                  <Button onClick={() => {
                    const textArea = document.querySelector('textarea[placeholder*="Gem text"]') as HTMLTextAreaElement
                    if (textArea) {
                      textArea.focus()
                    }
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Gem
                  </Button>
                </div>
              }
            />
          )
        ) : (
          <div className="space-y-2">
            {filteredRows.map(r => (
              <div key={r.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs opacity-70 mb-1">{r.book} — {r.author}</div>
                {r.created_at && (
                  <div className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</div>
                )}
                {editingId === r.id ? (
                  <div className="space-y-2">
                    <Textarea rows={3} value={editingText} onChange={(e)=>setEditingText(e.target.value)} />
                    <div>
                      <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Date</label>
                      <Input type="date" value={editingDate} onChange={(e)=>setEditingDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Commentary</label>
                      <Textarea rows={2} placeholder="Why this gem matters…" value={editingComment} onChange={(e)=>setEditingComment(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveEdit}>Save</Button>
                      <Button variant="secondary" onClick={()=>{ setEditingId(''); setEditingText('') }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">
                    {searchQuery && searchQuery.trim() ? (
                      r.text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, index) =>
                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                          <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
                            {part}
                          </mark>
                        ) : (
                          part
                        )
                      )
                    ) : (
                      r.text
                    )}
                    {r.commentary && (
                      <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 italic">
                        {r.commentary}
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-2 flex gap-1 justify-end">
                  {editingId !== r.id && (
                    <Button 
                      size="sm"
                      variant="ghost" 
                      onClick={()=>startEdit(r.id, r.text, r.created_at, r.commentary)}
                      className="p-1 hover:scale-110 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 hover:shadow-md"
                      title="Edit highlight"
                    >
                      <Edit3 className="w-3 h-3 text-blue-600 hover:text-blue-700 transition-colors" />
                    </Button>
                  )}
                  <Button 
                    size="sm"
                    variant="ghost" 
                    onClick={()=>removeHighlight(r.id)}
                    className="p-1 hover:scale-110 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 hover:shadow-md"
                    title="Delete highlight"
                  >
                    <Trash2 className="w-3 h-3 text-red-600 hover:text-red-700 transition-colors" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}