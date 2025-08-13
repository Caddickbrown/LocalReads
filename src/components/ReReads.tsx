import React, { useEffect, useState, useMemo } from 'react'
import { RefreshCw, Calendar, Star, ArrowUp, ArrowDown, BookOpen, Clock } from 'lucide-react'
import type { Book, Read } from '@/types'
import { listBooks, readsForBook } from '@/db/repo'
import { Card, CardHeader, CardContent, Button, Badge, EmptyState, Spinner } from './ui'

interface ReReadBook extends Book {
  tags: string[]
  reads_count: number
  latest?: Read | null
  all_reads: Read[]
}

export default function ReReads({ onBack }: { onBack: () => void }) {
  const [books, setBooks] = useState<ReReadBook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'read_count' | 'latest_read' | 'title' | 'author' | 'rating'>('read_count')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadReReadBooks()
  }, [])

  const loadReReadBooks = async () => {
    setIsLoading(true)
    try {
      // Get all books first
      const allBooks = await listBooks({})
      
      // Filter books with multiple reads and get their full read history
      const reReadBooksPromises = allBooks
        .filter(book => book.reads_count > 1)
        .map(async (book) => {
          const reads = await readsForBook(book.id)
          return {
            ...book,
            all_reads: reads.sort((a, b) => {
              // Sort by end_date, then start_date, with nulls last
              const aDate = a.end_date || a.start_date || '9999-12-31'
              const bDate = b.end_date || b.start_date || '9999-12-31'
              return new Date(bDate).getTime() - new Date(aDate).getTime()
            })
          }
        })
      
      const reReadBooks = await Promise.all(reReadBooksPromises)
      setBooks(reReadBooks)
    } catch (error) {
      console.error('Error loading re-read books:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortBy) {
        case 'read_count':
          aVal = a.reads_count
          bVal = b.reads_count
          break
        case 'latest_read':
          aVal = a.latest?.end_date || a.latest?.start_date || ''
          bVal = b.latest?.end_date || b.latest?.start_date || ''
          break
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'author':
          aVal = a.author.toLowerCase()
          bVal = b.author.toLowerCase()
          break
        case 'rating':
          // Use average rating across all reads
          const aRatings = a.all_reads.filter(r => r.rating).map(r => r.rating!)
          const bRatings = b.all_reads.filter(r => r.rating).map(r => r.rating!)
          aVal = aRatings.length ? aRatings.reduce((sum, r) => sum + r, 0) / aRatings.length : 0
          bVal = bRatings.length ? bRatings.reduce((sum, r) => sum + r, 0) / bRatings.length : 0
          break
        default:
          aVal = a.reads_count
          bVal = b.reads_count
      }
      
      if (typeof aVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      } else {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
    })
  }, [books, sortBy, sortOrder])

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
  }

  const getAverageRating = (reads: Read[]) => {
    const ratings = reads.filter(r => r.rating).map(r => r.rating!)
    return ratings.length ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0
  }

  const getReadingSpan = (reads: Read[]) => {
    const dates = reads
      .map(r => r.end_date || r.start_date)
      .filter((d): d is string => Boolean(d))
      .sort()
    
    if (dates.length < 2) return null
    
    const firstDate = new Date(dates[0])
    const lastDate = new Date(dates[dates.length - 1])
    const yearDiff = lastDate.getFullYear() - firstDate.getFullYear()
    
    if (yearDiff === 0) return 'Same year'
    if (yearDiff === 1) return '1 year span'
    return `${yearDiff} year span`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-600 dark:text-green-400"/> 
              Re-reads ({sortedBooks.length})
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Books you've read multiple times, with complete reading history
            </p>
          </div>
        </div>
        
        {/* Sorting Controls */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400 self-center">Sort by:</span>
          {[
            { key: 'read_count', label: 'Read Count', icon: RefreshCw },
            { key: 'latest_read', label: 'Latest Read', icon: Clock },
            { key: 'rating', label: 'Avg Rating', icon: Star },
            { key: 'title', label: 'Title', icon: BookOpen },
            { key: 'author', label: 'Author', icon: BookOpen }
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={sortBy === key ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleSortChange(key as typeof sortBy)}
              className="flex items-center gap-1"
            >
              <Icon className="w-3 h-3" />
              {label}
              {sortBy === key && (
                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
              )}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" className="mb-4" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading your re-read history...</p>
          </div>
        ) : sortedBooks.length === 0 ? (
          <EmptyState
            illustration="books"
            title="No re-reads yet"
            description="Books that you've read multiple times will appear here, along with your complete reading timeline for each book."
            tips={[
              "Mark a book as 'Finished' multiple times to create re-read entries",
              "Each read can have its own dates, rating, and review",
              "Track how your opinion of a book changes over time",
              "Perfect for favorite books you return to regularly"
            ]}
            action={
              <Button onClick={onBack}>
                Browse Library
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            {sortedBooks.map((book) => {
              const avgRating = getAverageRating(book.all_reads)
              const readingSpan = getReadingSpan(book.all_reads)
              
              return (
                <div 
                  key={book.id} 
                  className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-all duration-300"
                >
                  {/* Book Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 mr-4">
                      <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 mb-1">
                        {book.title}
                      </h3>
                      <p className="text-zinc-600 dark:text-zinc-400 mb-1">
                        by {book.author}
                      </p>
                      {book.series_name && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-500">
                          {book.series_name}
                          {book.series_number && ` #${book.series_number}`}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="success" size="sm" className="shrink-0">
                        {book.reads_count} reads
                      </Badge>
                      {avgRating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">
                            {avgRating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Reading Summary */}
                  <div className="mb-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        <span>{book.reads_count} times read</span>
                      </div>
                      {readingSpan && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{readingSpan}</span>
                        </div>
                      )}
                      {avgRating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          <span>Avg: {avgRating.toFixed(1)}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Reading Timeline */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                      Reading Timeline
                    </h4>
                    <div className="space-y-3">
                      {book.all_reads.map((read, index) => (
                        <div 
                          key={read.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-1">
                            <span className="text-green-600 dark:text-green-400 text-xs font-bold">
                              {book.all_reads.length - index}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {read.start_date && (
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                      Started: {new Date(read.start_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {read.end_date && (
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                      Finished: {new Date(read.end_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {read.format && (
                                    <Badge variant="secondary" size="sm" className="text-xs">
                                      {read.format}
                                    </Badge>
                                  )}
                                </div>
                                
                                {read.rating && (
                                  <div className="flex items-center gap-1 mb-1">
                                    {[...Array(read.rating)].map((_, i) => (
                                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    ))}
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
                                      {read.rating}/5
                                    </span>
                                  </div>
                                )}
                                
                                {read.review && (
                                  <div className="text-xs text-zinc-600 dark:text-zinc-400 italic mt-1">
                                    "{read.review}"
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Tags */}
                  {book.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      {book.tags.map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="primary" 
                          size="sm"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
