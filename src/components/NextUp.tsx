import React, { useEffect, useState, useMemo } from 'react'
import { BookOpen, Clock, Star, ArrowUp, ArrowDown, Calendar, User, Hash, Edit3, X, Trash2 } from 'lucide-react'
import type { Book, Read } from '@/types'
import { listBooks, toggleNextUpPriority } from '@/db/repo'
import { Card, CardHeader, CardContent, Button, Badge, EmptyState, Spinner, ProgressBar } from './ui'
import EditDialog from './EditDialog'

interface NextUpBook extends Book {
  tags: string[]
  reads_count: number
  latest?: Read | null
  priority_score: number
}

export default function NextUp({ onBack }: { onBack: () => void }) {
  const [books, setBooks] = useState<NextUpBook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'priority' | 'title' | 'author' | 'series' | 'added'>('priority')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    loadNextUpBooks()
  }, [])

  const handleToggleNextUp = async (bookId: string, currentPriority: boolean) => {
    try {
      await toggleNextUpPriority(bookId, !currentPriority)
      // Reload the books to update the UI
      await loadNextUpBooks()
    } catch (error) {
      console.error('Error toggling Next Up priority:', error)
    }
  }

  const loadNextUpBooks = async () => {
    setIsLoading(true)
    try {
      // Get books with status "To Read" and "Paused"
      const [toReadBooks, pausedBooks] = await Promise.all([
        listBooks({ status: 'To Read' }),
        listBooks({ status: 'Paused' })
      ])
      
      // Combine and calculate priority scores
      const allBooks = [...toReadBooks, ...pausedBooks].map(book => {
        let score = 0
        
        // OVERRIDE: Books manually marked as "Next Up" get highest priority
        if (book.next_up_priority) {
          score += 1000
        } else {
          // Standard priority calculation for non-override books
          
          // Higher priority for paused books (user started reading)
          if (book.status === 'Paused') score += 50
          
          // Books in a series get higher priority
          if (book.series_name) score += 20
          
          // Books with multiple reads (re-reads) get priority
          if (book.reads_count > 0) score += 30
          
          // Books with highlights get priority (user showed interest)
          if ((book as any).highlightsCount > 0) score += 15
          
          // Books with tags get slight priority (user categorized them)
          if (book.tags.length > 0) score += 5
          
          // Add some randomization to break ties
          score += Math.random() * 10
        }
        
        return { ...book, priority_score: score }
      })
      
      setBooks(allBooks)
    } catch (error) {
      console.error('Error loading next up books:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortBy) {
        case 'priority':
          aVal = a.priority_score
          bVal = b.priority_score
          break
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'author':
          aVal = a.author.toLowerCase()
          bVal = b.author.toLowerCase()
          break
        case 'series':
          aVal = a.series_name?.toLowerCase() || ''
          bVal = b.series_name?.toLowerCase() || ''
          break
        case 'added':
          // Use a simple heuristic based on when they might have been added
          aVal = a.id
          bVal = b.id
          break
        default:
          aVal = a.priority_score
          bVal = b.priority_score
      }
      
      if (sortBy === 'priority' || sortBy === 'added') {
        // Numeric comparison
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      } else {
        // String comparison
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

  const handleEditBook = (book: NextUpBook) => {
    setEditingBook(book)
    setShowEditDialog(true)
  }

  const handleSaveBook = () => {
    setShowEditDialog(false)
    setEditingBook(null)
    // Refresh the books list
    loadNextUpBooks()
  }

  const handleRemoveFromNextUp = async (book: NextUpBook) => {
    if (confirm(`Remove "${book.title}" from your Next Up list? This will change its status to "Finished" or "Abandoned".`)) {
      try {
        // For now, we'll just trigger a refresh and let the user manually change the status
        // In the future, you could add logic to automatically change status
        setEditingBook(book)
        setShowEditDialog(true)
      } catch (error) {
        console.error('Error removing from Next Up:', error)
        alert('Error removing book from Next Up. Please try again.')
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/> 
              Next Up ({sortedBooks.length})
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Your reading queue, prioritized by engagement and context
            </p>
          </div>
          <Button
            onClick={() => setEditMode(!editMode)}
            variant={editMode ? 'primary' : 'secondary'}
            size="sm"
            className="flex items-center gap-2"
          >
            {editMode ? (
              <>
                <X className="w-4 h-4" />
                Done
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                Manage
              </>
            )}
          </Button>
        </div>
        
        {/* Sorting Controls */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400 self-center">Sort by:</span>
          {[
            { key: 'priority', label: 'Priority', icon: Star },
            { key: 'title', label: 'Title', icon: BookOpen },
            { key: 'author', label: 'Author', icon: User },
            { key: 'series', label: 'Series', icon: Hash },
            { key: 'added', label: 'Recently Added', icon: Clock }
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
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading your reading queue...</p>
          </div>
        ) : sortedBooks.length === 0 ? (
          <EmptyState
            illustration="books"
            title="Your reading queue is empty"
            description="Add some books to your 'To Read' list to see personalized recommendations here."
            tips={[
              "Books you've paused get highest priority",
              "Series books are prioritized to maintain reading flow",
              "Books with highlights show you've shown interest",
              "Use tags to help organize your reading priorities"
            ]}
            action={
              <Button onClick={onBack}>
                Browse Library
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {sortedBooks.map((book, index) => (
              <div 
                key={book.id} 
                className={`bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-600 group ${
                  !editMode ? 'cursor-pointer' : ''
                }`}
                onClick={!editMode ? () => handleEditBook(book) : undefined}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 truncate">
                        {book.title}
                      </h3>
                      {book.next_up_priority && (
                        <Badge 
                          variant="primary" 
                          size="sm"
                          className="shrink-0 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        >
                          ⭐ Next Up
                        </Badge>
                      )}
                      {sortBy === 'priority' && !book.next_up_priority && (
                        <Badge 
                          variant={index < 3 ? 'primary' : 'secondary'} 
                          size="sm"
                          className="shrink-0"
                        >
                          #{index + 1}
                        </Badge>
                      )}
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 truncate mb-1">
                      {book.author}
                    </p>
                    {book.series_name && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-500 truncate">
                        {book.series_name}
                        {book.series_number && ` #${book.series_number}`}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {/* Next Up Priority Checkbox */}
                    <div 
                      className="flex items-center gap-2 mb-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        id={`next-up-${book.id}`}
                        checked={book.next_up_priority || false}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleToggleNextUp(book.id, book.next_up_priority || false)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-indigo-600 border-zinc-300 dark:border-zinc-600 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                      />
                      <label 
                        htmlFor={`next-up-${book.id}`}
                        className="text-xs text-zinc-600 dark:text-zinc-400 select-none cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleNextUp(book.id, book.next_up_priority || false)
                        }}
                      >
                        Next Up
                      </label>
                    </div>
                    
                    {editMode && (
                      <div className="flex gap-1 mb-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditBook(book)
                          }}
                          className="p-1 hover:scale-110 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                          title="Edit book"
                        >
                          <Edit3 className="w-3 h-3 text-blue-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFromNextUp(book)
                          }}
                          className="p-1 hover:scale-110 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                          title="Remove from Next Up"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    )}
                    <Badge 
                      variant={book.status === 'Paused' ? 'warning' : 'default'} 
                      size="sm"
                      className="shrink-0"
                    >
                      {book.status}
                    </Badge>
                    <Badge variant="secondary" size="sm" className="shrink-0">
                      {book.type}
                    </Badge>
                  </div>
                </div>
                
                {/* Progress for paused books */}
                {book.status === 'Paused' && book.latest?.progress_percentage && (
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">Reading Progress</span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {book.latest.current_page || 0} / {book.latest.total_pages || 0}
                      </span>
                    </div>
                    <ProgressBar
                      value={book.latest.progress_percentage}
                      size="sm"
                      showLabel={false}
                      color="warning"
                    />
                  </div>
                )}
                
                {/* Context indicators */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {book.status === 'Paused' && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Clock className="w-3 h-3" />
                      <span>In Progress</span>
                    </div>
                  )}
                  {book.reads_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Star className="w-3 h-3" />
                      <span>Previously Read</span>
                    </div>
                  )}
                  {book.series_name && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <Hash className="w-3 h-3" />
                      <span>Part of Series</span>
                    </div>
                  )}
                  {book.latest?.start_date && (
                    <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                      <Calendar className="w-3 h-3" />
                      <span>Started {new Date(book.latest.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                
                {/* Tags */}
                {book.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {book.tags.slice(0, 4).map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="primary" 
                        size="sm"
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {book.tags.length > 4 && (
                      <Badge variant="primary" size="sm" className="text-xs opacity-60">
                        +{book.tags.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {showEditDialog && (
        <EditDialog
          book={editingBook}
          onClose={() => {
            setShowEditDialog(false)
            setEditingBook(null)
          }}
          onSave={handleSaveBook}
        />
      )}
    </Card>
  )
}
