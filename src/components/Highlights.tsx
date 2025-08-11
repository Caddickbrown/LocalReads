import React, { useEffect, useState } from 'react'
import { Tags } from 'lucide-react'
import { getDb } from '@/db/client'
import { Card, CardHeader, CardContent, Button } from './ui'

export default function Highlights({ onBack }:{ onBack:()=>void }){
  const [rows, setRows] = useState<{ id:string, book:string, author:string, text:string }[]>([])
  useEffect(()=>{ (async()=>{
    const db = await getDb()
    const r = await db.select(`SELECT h.id, b.title AS book, b.author, h.text FROM highlights h JOIN books b ON b.id = h.book_id ORDER BY h.rowid DESC`)
    setRows(r)
  })() }, [])
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Tags className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/> Highlights ({rows.length})</h2>
          <Button onClick={onBack}>Back to Library</Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm opacity-70">No highlights yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs opacity-70 mb-1">{r.book} — {r.author}</div>
                <div className="text-sm whitespace-pre-wrap">{r.text}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}