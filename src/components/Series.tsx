import React, { useEffect, useMemo, useState } from 'react'
import { Search, Hash, Shuffle } from 'lucide-react'
import { listBooks } from '@/db/repo'
import type { Book } from '@/types'
import { Card, CardHeader, CardContent, Input, EmptyState, Badge, Button } from './ui'

export default function Series({ onBack, onSelectSeries }: { onBack: () => void; onSelectSeries: (seriesName: string) => void }){
  const [books, setBooks] = useState<(Book & { tags: string })[]>([])
  const [q, setQ] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [randomSeed, setRandomSeed] = useState(0)

  useEffect(() => { (async () => {
    setIsLoading(true)
    try {
      const rows = await listBooks({})
      setBooks(rows)
    } finally {
      setIsLoading(false)
    }
  })() }, [])

  // Listen for shuffle keyboard shortcut
  useEffect(() => {
    const handleShuffle = () => {
      setRandomSeed(Date.now())
    }
    
    window.addEventListener('shuffle-items', handleShuffle)
    return () => window.removeEventListener('shuffle-items', handleShuffle)
  }, [])

  const series = useMemo(() => {
    const counts = new Map<string, number>()
    
    for (const b of books) {
      // Handle primary series (series_name)
      if (b.series_name && b.series_name.trim()) {
        const primarySeries = b.series_name.trim()
        counts.set(primarySeries, (counts.get(primarySeries) || 0) + 1)
      }
      
      // Handle additional series from series array
      if (b.series && Array.isArray(b.series)) {
        for (const seriesItem of b.series) {
          if (seriesItem.name && seriesItem.name.trim()) {
            const seriesName = seriesItem.name.trim()
            counts.set(seriesName, (counts.get(seriesName) || 0) + 1)
          }
        }
      }
    }
    
    let entries = Array.from(counts.entries())
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      entries = entries.filter(([name]) => name.toLowerCase().includes(needle))
    }
    // If we have a random seed, shuffle the entries
    if (randomSeed) {
      // Use a seeded random number generator for consistent shuffling
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000
        return x - Math.floor(x)
      }
      
      // Fisher-Yates shuffle with seeded random
      for (let i = entries.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(randomSeed + i) * (i + 1))
        ;[entries[i], entries[j]] = [entries[j], entries[i]]
      }
      
      return entries
    }
    
    // Otherwise, apply normal sorting: by count desc then name asc
    return entries.sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
  }, [books, q, randomSeed])

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                <h2 className="text-heading-2">Series</h2>
                {series.length > 0 && (
                  <Badge variant="secondary" size="sm">{series.length}</Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRandomSeed(Date.now())}
                  className="flex items-center gap-2"
                  title="Shuffle series order"
                >
                  <Shuffle className="w-4 h-4" />
                  Shuffle
                </Button>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-70" />
                  <Input
                    className="pl-9 w-64"
                    placeholder="Search series..."
                    value={q}
                    onChange={(e:any)=>setQ(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400 py-8">Loading series…</div>
            ) : series.length === 0 ? (
              <EmptyState
                illustration="search"
                title="No series found"
                description={q ? 'Try a different search term.' : 'Add some books with series to see them here.'}
                action={<Button onClick={onBack}>Back to Library</Button>}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {series.map(([name, count]) => (
                  <button
                    key={name}
                    onClick={() => onSelectSeries(name)}
                    className="text-left p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
                    title={`Show books in series: ${name}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-zinc-400" />
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

