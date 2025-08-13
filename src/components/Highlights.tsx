import React, { useEffect, useState } from 'react'
import { Tags, Plus, FileDown } from 'lucide-react'
import { getDb } from '@/db/client'
import { Card, CardHeader, CardContent, Button, Input, Textarea, Spinner } from './ui'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { exportHighlightsCsv, deleteHighlight as repoDeleteHighlight, updateHighlight as repoUpdateHighlight } from '@/db/repo'

export default function Highlights({ onBack }:{ onBack:()=>void }){
  const [rows, setRows] = useState<{ id:string, book:string, author:string, text:string }[]>([])
  const [editingId, setEditingId] = useState<string>('')
  const [editingText, setEditingText] = useState<string>('')
  const [newText, setNewText] = useState('')
  const [bookQ, setBookQ] = useState('')
  const [books, setBooks] = useState<{id:string,title:string,author:string}[]>([])
  const [selectedBook, setSelectedBook] = useState<string>('')
  const [altTitle, setAltTitle] = useState('')
  const [altAuthor, setAltAuthor] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(()=>{ (async()=>{
    setIsLoading(true)
    try {
      const db = await getDb()
      const r = await db.select(`SELECT h.id, b.title AS book, b.author, h.text FROM highlights h JOIN books b ON b.id = h.book_id ORDER BY h.rowid DESC`) as Array<{id:string, book:string, author:string, text:string}>
      setRows(r)
      const b = await db.select(`SELECT id, title, author FROM books ORDER BY title COLLATE NOCASE`) as Array<{id:string,title:string,author:string}>
      setBooks(b)
    } finally {
      setIsLoading(false)
    }
  })() }, [])
  const addHighlight = async () => {
    const db = await getDb()
    if (!newText.trim()) return
    let bookId = selectedBook
    if (!bookId) {
      if (!altTitle.trim()) return
      const id = Math.random().toString(36).slice(2,10)
      await db.execute(`INSERT INTO books (id, title, author, type, status) VALUES ($1, $2, $3, 'Book', 'To Read')`, [id, altTitle.trim(), altAuthor.trim()])
      bookId = id
    }
    await db.execute(`INSERT INTO highlights (id, book_id, text) VALUES ($1, $2, $3)`, [Math.random().toString(36).slice(2,10), bookId, newText.trim()])
    setNewText('')
    setSelectedBook('')
    setAltTitle('')
    setAltAuthor('')
    const r = await db.select(`SELECT h.id, b.title AS book, b.author, h.text FROM highlights h JOIN books b ON b.id = h.book_id ORDER BY h.rowid DESC`) as Array<{id:string, book:string, author:string, text:string}>
    setRows(r)
  }

  const removeHighlight = async (id: string) => {
    await repoDeleteHighlight(id)
    const db = await getDb()
    const r = await db.select(`SELECT h.id, b.title AS book, b.author, h.text FROM highlights h JOIN books b ON b.id = h.book_id ORDER BY h.rowid DESC`) as Array<{id:string, book:string, author:string, text:string}>
    setRows(r)
  }

  const startEdit = (id: string, text: string) => {
    setEditingId(id)
    setEditingText(text)
  }

  const saveEdit = async () => {
    if (!editingId) return
    await repoUpdateHighlight(editingId, editingText)
    setEditingId('')
    setEditingText('')
    const db = await getDb()
    const r = await db.select(`SELECT h.id, b.title AS book, b.author, h.text FROM highlights h JOIN books b ON b.id = h.book_id ORDER BY h.rowid DESC`) as Array<{id:string, book:string, author:string, text:string}>
    setRows(r)
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Tags className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/> Highlights ({rows.length})</h2>
          <div className="flex items-center gap-2">
            <Button onClick={async ()=>{
              try {
                console.log('Starting highlights export from Highlights view...')
                const csv = await exportHighlightsCsv()
                console.log('Generated highlights CSV length:', csv.length)
                const filePath = await save({ title: 'Export Highlights CSV', defaultPath: 'highlights.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] })
                console.log('Selected highlights file path:', filePath)
                if (filePath) {
                  await writeTextFile(filePath as string, csv)
                  console.log('Highlights file written successfully')
                  alert('Highlights CSV exported successfully!')
                } else {
                  console.log('No file path selected')
                }
              } catch (error) {
                console.error('Highlights export failed:', error)
                alert(`Highlights export failed: ${error}`)
              }
            }} className="flex items-center gap-2"><FileDown className="w-4 h-4"/> Export</Button>
            <Button onClick={onBack}>Back to Library</Button>
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
              <div className="text-xs opacity-70 mt-2">Or specify an alternate source:</div>
              <Input className="mt-2" placeholder="Alternate title" value={altTitle} onChange={(e)=>setAltTitle(e.target.value)} />
              <Input className="mt-2" placeholder="Alternate author (optional)" value={altAuthor} onChange={(e)=>setAltAuthor(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Textarea rows={3} placeholder="Highlight text…" value={newText} onChange={(e)=>setNewText(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={addHighlight} className="flex items-center gap-2"><Plus className="w-4 h-4"/> Add Highlight</Button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" className="mb-4" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading your highlights...</p>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm opacity-70">No highlights yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs opacity-70 mb-1">{r.book} — {r.author}</div>
                {editingId === r.id ? (
                  <div className="space-y-2">
                    <Textarea rows={3} value={editingText} onChange={(e)=>setEditingText(e.target.value)} />
                    <div className="flex gap-2">
                      <Button onClick={saveEdit}>Save</Button>
                      <Button variant="secondary" onClick={()=>{ setEditingId(''); setEditingText('') }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{r.text}</div>
                )}
                <div className="mt-2 flex gap-2 justify-end">
                  {editingId !== r.id && (
                    <Button variant="secondary" onClick={()=>startEdit(r.id, r.text)}>Edit</Button>
                  )}
                  <Button variant="secondary" onClick={()=>removeHighlight(r.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}