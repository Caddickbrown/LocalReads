import React, { useEffect, useMemo, useState } from 'react'
import { Search, User } from 'lucide-react'
import { listBooks } from '@/db/repo'
import type { Book } from '@/types'
import { Card, CardHeader, CardContent, Input, EmptyState, Badge, Button } from './ui'

export default function Authors({ onBack, onSelectAuthor }: { onBack: () => void; onSelectAuthor: (author: string) => void }){
  const [books, setBooks] = useState<(Book & { tags: string[] })[]>([])
  const [q, setQ] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { (async () => {
    setIsLoading(true)
    try {
      const rows = await listBooks({})
      setBooks(rows)
    } finally {
      setIsLoading(false)
    }
  })() }, [])

  const authors = useMemo(() => {
    const counts = new Map<string, number>()
    for (const b of books) {
      const parts = String(b.author || '')
        .split(/[;,]/)
        .map(s => s.trim())
        .filter(Boolean)
      for (const name of parts) {
        counts.set(name, (counts.get(name) || 0) + 1)
      }
    }
    let entries = Array.from(counts.entries())
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      entries = entries.filter(([name]) => name.toLowerCase().includes(needle))
    }
    return entries.sort((a, b) => {
      // sort by count desc then name asc
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
  }, [books, q])

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <h2 className="font-semibold">Authors</h2>
                {authors.length > 0 && (
                  <Badge variant="secondary" size="sm">{authors.length}</Badge>
                )}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-70" />
                <Input
                  className="pl-9 w-64"
                  placeholder="Search authors..."
                  value={q}
                  onChange={(e:any)=>setQ(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400 py-8">Loading authors…</div>
            ) : authors.length === 0 ? (
              <EmptyState
                illustration="search"
                title="No authors found"
                description={q ? 'Try a different search term.' : 'Add some books to see authors here.'}
                action={<Button onClick={onBack}>Back to Library</Button>}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {authors.map(([name, count]) => (
                  <button
                    key={name}
                    onClick={() => onSelectAuthor(name)}
                    className="text-left p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
                    title={`Show books by ${name}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-400" />
                        <span className="font-medium">{name}</span>
                      </div>
                      <Badge variant="primary" size="sm">{count}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


