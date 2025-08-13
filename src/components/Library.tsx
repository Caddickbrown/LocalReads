import React, { useEffect, useMemo, useState } from 'react'
import { Edit3, Filter, ListChecks, Plus, Search, Trash2, BookOpenText, Tags, Star, Calendar, User } from 'lucide-react'
import type { Book, Read } from '@/types'
import { BOOK_TYPES, STATUSES } from '@/types'
import { listBooks, upsertBook, deleteBook, readsForBook, upsertRead, deleteRead, setTagsForBook } from '@/db/repo'
import { Card, CardHeader, CardContent, Button, Badge, Input, Select, EmptyState, Spinner } from './ui'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import EditDialog from './EditDialog'

interface BookRow extends Book {
  tags: string[]
  reads_count: number
  latest?: Read | null
}

export default function Library({ onOpenHighlights, onOpenDashboard, refreshSignal }: { onOpenHighlights: ()=>void; onOpenDashboard: ()=>void; refreshSignal: number }){
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('All')
  const [tag, setTag] = useState('All')
  const [year, setYear] = useState<number|null>(null)
  const [rows, setRows] = useState<BookRow[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'status' | 'type'>('title')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [refreshKey, setRefreshKey] = useState(0)
  const [dashboardFilter, setDashboardFilter] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(()=>{ (async()=>{
    setIsLoading(true)
    try {
      const data = await listBooks({ q, status, tag, year })
      setRows(data)
    } finally {
      setIsLoading(false)
    }
  })() }, [q, status, tag, year, refreshSignal, refreshKey])

  useEffect(()=>{ (async()=>{
    // quick tag list derived from books (cheap)
    const tags = Array.from(new Set(rows.flatMap((r: BookRow) => r.tags))).sort()
    setAllTags(tags)
  })() }, [rows])

  // Listen for new book event
  useEffect(() => {
    const handleNewBook = () => {
      setEditingBook(null)
      setShowEditDialog(true)
    }

    const handleEditBook = (event: CustomEvent) => {
      setEditingBook(event.detail)
      setShowEditDialog(true)
    }

    const handleRefresh = () => {
      setRefreshKey(k => k + 1)
    }

    const handleFilterYear = (event: CustomEvent) => {
      const y = Number(event.detail)
      if (!Number.isNaN(y)) setYear(y)
    }

    const handleDashboardFilter = (event: CustomEvent) => {
      const { type, value } = event.detail
      
      // Clear other filters first for focused filtering
      setQ('')
      setTag('All')
      
      // Set dashboard filter label for notification
      const filterLabels = {
        year: `📅 Finished in ${value}`,
        month: '📆 Finished this month',
        week: '🗓️ Finished this week', 
        day: '⭐ Finished today',
        status: `${value === 'To Read' ? '📚' : '👀'} ${value}`
      }
      
      setDashboardFilter(filterLabels[type as keyof typeof filterLabels] || `Filter: ${type}`)
      
      switch (type) {
        case 'year':
          setYear(value)
          setStatus('All')
          break
        case 'month':
        case 'week':
        case 'day':
          // For time-based filters, we'll set status to 'Finished' and clear year to show all finished books
          setStatus('Finished')
          setYear(null)
          // Note: More sophisticated date filtering could be added here
          break
        case 'status':
          setStatus(value)
          setYear(null)
          break
        default:
          break
      }
    }

    const handleAddBook = () => {
      setShowEditDialog(true)
    }

    window.addEventListener('new-book', handleNewBook)
    window.addEventListener('edit-book', handleEditBook as EventListener)
    window.addEventListener('refresh-library', handleRefresh)
    window.addEventListener('filter-year', handleFilterYear as EventListener)
    window.addEventListener('dashboard-filter', handleDashboardFilter as EventListener)
    window.addEventListener('add-book', handleAddBook)

    return () => {
      window.removeEventListener('new-book', handleNewBook)
      window.removeEventListener('edit-book', handleEditBook as EventListener)
      window.removeEventListener('refresh-library', handleRefresh)
      window.removeEventListener('filter-year', handleFilterYear as EventListener)
      window.removeEventListener('dashboard-filter', handleDashboardFilter as EventListener)
      window.removeEventListener('add-book', handleAddBook)
    }
  }, [])

  const nextUp = rows.filter((r: BookRow) => r.status === 'To Read')
  const reReads = rows.filter((r: BookRow) => (r.reads_count||0) > 1)
  const currentYear = new Date().getFullYear()
  const finishedThisYear = rows.filter((r: BookRow) => r.latest?.end_date?.startsWith(String(currentYear)))

  // Library-specific keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'f',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      },
      description: 'Focus Search (Library)'
    },
    {
      key: 'c',
      action: () => {
        setQ('')
        setStatus('All')
        setTag('All')
        setYear(null)
        setDashboardFilter(null)
      },
      description: 'Clear All Filters'
    },
    {
      key: '1',
      action: () => { setQ(''); setStatus('To Read'); setTag('All'); setYear(null); setDashboardFilter(null) },
      description: 'Show To Read Books'
    },
    {
      key: '2',
      action: () => { setQ(''); setStatus('Reading'); setTag('All'); setYear(null); setDashboardFilter(null) },
      description: 'Show Currently Reading'
    },
    {
      key: '3',
      action: () => { setQ(''); setStatus('Finished'); setTag('All'); setYear(null); setDashboardFilter(null) },
      description: 'Show Finished Books'
    },
    {
      key: '4',
      action: () => { setQ(''); setStatus('All'); setTag('All'); setYear(currentYear); setDashboardFilter(null) },
      description: 'Show This Year'
    },
    {
      key: 'Escape',
      action: () => {
        setQ('')
        setStatus('All')
        setTag('All')
        setYear(null)
        setDashboardFilter(null)
        // Also blur any focused input
        const activeElement = document.activeElement as HTMLElement
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT')) {
          activeElement.blur()
        }
      },
      description: 'Clear Filters & Escape'
    }
  ], [q, status, tag, year, currentYear])

  // Sort rows based on current sort settings
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let aVal = a[sortBy] || ''
      let bVal = b[sortBy] || ''
      
      // Handle null values
      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''
      
      // Convert to string for comparison
      aVal = String(aVal).toLowerCase()
      bVal = String(bVal).toLowerCase()
      
      if (sortOrder === 'asc') {
        return aVal.localeCompare(bVal)
      } else {
        return bVal.localeCompare(aVal)
      }
    })
  }, [rows, sortBy, sortOrder])

  const handleEditBook = (book: Book) => {
    setEditingBook(book)
    setShowEditDialog(true)
  }

  const handleDeleteBook = async (bookId: string) => {
    if (confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
      try {
        await deleteBook(bookId)
        // Trigger refresh
        window.dispatchEvent(new CustomEvent('refresh-library'))
      } catch (error) {
        console.error('Error deleting book:', error)
        alert('Error deleting book. Please try again.')
      }
    }
  }

  const handleSaveBook = () => {
    setShowEditDialog(false)
    setEditingBook(null)
    // Trigger refresh
    window.dispatchEvent(new CustomEvent('refresh-library'))
  }

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const SortHeader: React.FC<{ field: typeof sortBy; children: React.ReactNode }> = ({ field, children }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded transition-colors"
    >
      {children}
      {sortBy === field && (
        <span className="text-xs">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  )

  return (
    <>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-70"/>
                <Input className="pl-9" placeholder="Omni search…" value={q} onChange={(e:any)=>setQ(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-2"><Filter className="w-4 h-4"/> Filters</div>
                  <div className="space-y-2">
                    <Select value={status} onChange={(e)=>setStatus(e.target.value)}>
                      <option>All</option>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </Select>
                    <Select value={tag} onChange={(e)=>setTag(e.target.value)}>
                      <option>All</option>
                      {allTags.map(t => <option key={t}>{t}</option>)}
                    </Select>
                    {year !== null && (
                      <div className="flex items-center justify-between text-xs bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-xl">
                        <span>Year filter: <strong>{year}</strong></span>
                        <Button onClick={()=>setYear(null)} variant="secondary" size="sm">Clear</Button>
                      </div>
                    )}
                    {dashboardFilter && (
                      <div className="flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <span>Dashboard filter: <strong>{dashboardFilter}</strong></span>
                        <Button 
                          onClick={() => {
                            setDashboardFilter(null)
                            setQ('')
                            setStatus('All')
                            setTag('All')
                            setYear(null)
                          }} 
                          variant="secondary" 
                          size="sm"
                        >
                          Clear All
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-2"><ListChecks className="w-4 h-4"/> Smart Lists</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      className="cursor-pointer badge-primary hover:scale-105 hover:shadow-lg transition-all duration-200 hover:rotate-1 hover:-translate-y-1" 
                      onClick={()=>{ setQ(''); setStatus('To Read'); setTag('All'); setYear(null); setDashboardFilter(null) }}
                    >
                      📚 Next Up ({nextUp.length})
                    </Badge>
                    <Badge 
                      className="cursor-pointer badge-primary hover:scale-105 hover:shadow-lg transition-all duration-200 hover:-rotate-1 hover:-translate-y-1" 
                      onClick={()=>{ setQ(''); setStatus('All'); setTag('All'); setYear(new Date().getFullYear()); setDashboardFilter(null) }}
                    >
                      🏆 Finished This Year ({finishedThisYear.length})
                    </Badge>
                    <Badge 
                      className="cursor-pointer badge-primary hover:scale-105 hover:shadow-lg transition-all duration-200 hover:rotate-1 hover:-translate-y-1" 
                      onClick={()=>{ setQ(''); setStatus('All'); setTag('All'); setYear(null); setDashboardFilter(null) }}
                    >
                      🔄 Re-reads ({reReads.length})
                    </Badge>
                    <Badge 
                      className="cursor-pointer badge-primary hover:scale-105 hover:shadow-lg transition-all duration-200 hover:-rotate-1 hover:-translate-y-1" 
                      onClick={()=> onOpenHighlights() }
                    >
                      ✨ Highlights
                    </Badge>
                  </div>
                </div>

                <div>
                  <Button 
                    className="w-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white hover:scale-105 hover:shadow-lg hover:from-indigo-600 hover:to-violet-600 transition-all duration-200" 
                    onClick={()=> setShowEditDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2 hover:rotate-90 transition-transform" /> 
                    Add Book
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-9">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2"><BookOpenText className="w-5 h-5"/> Library ({rows.length} books)</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span>Sort by:</span>
                  <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="w-32">
                    <option value="title">Title</option>
                    <option value="author">Author</option>
                    <option value="status">Status</option>
                    <option value="type">Type</option>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Spinner size="lg" className="mb-4" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading your library...</p>
                </div>
              ) : sortedRows.length === 0 ? (
                <EmptyState
                  icon={<BookOpenText className="w-12 h-12" />}
                  title="No books found"
                  description={q || status !== 'All' || tag !== 'All' || year !== null 
                    ? "Try adjusting your search or filters" 
                    : "Start by adding your first book to the library"
                  }
                  action={
                    <Button onClick={() => setShowEditDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Book
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="text-left py-3 px-2">
                          <SortHeader field="title">Title</SortHeader>
                        </th>
                        <th className="text-left py-3 px-2">
                          <SortHeader field="author">Author</SortHeader>
                        </th>
                        <th className="text-left py-3 px-2">Series</th>
                        <th className="text-left py-3 px-2">
                          <SortHeader field="type">Type</SortHeader>
                        </th>
                        <th className="text-left py-3 px-2">
                          <SortHeader field="status">Status</SortHeader>
                        </th>
                        <th className="text-left py-3 px-2">Tags</th>
                        <th className="text-left py-3 px-2">Start Date</th>
                        <th className="text-left py-3 px-2">End Date</th>
                        <th className="text-left py-3 px-2">Rating</th>
                        <th className="text-left py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((book, index) => (
                        <tr 
                          key={book.id} 
                          className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-300 hover:shadow-sm hover:scale-[1.01] hover:-translate-y-0.5 group"
                          style={{ 
                            animationDelay: `${index * 50}ms`,
                            animation: 'fadeInUp 0.4s ease-out forwards'
                          }}
                        >
                          <td className="py-3 px-2">
                            <div className="font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer">
                              {book.title}
                            </div>
                            {book.obtained && (
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                                {book.obtained}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1 group/author hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                              <User className="w-3 h-3 text-zinc-400 group-hover/author:text-blue-500 group-hover/author:scale-110 transition-all" />
                              {book.author}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {book.series_name && (
                              <div className="text-sm">
                                {book.series_name}
                                {book.series_number && (
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
                                    #{book.series_number}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <Badge 
                              variant="secondary" 
                              size="sm" 
                              className="hover:scale-105 transition-transform duration-200 cursor-pointer"
                            >
                              {book.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <div className="hover:scale-105 transition-transform duration-200 cursor-pointer inline-block">
                              <StatusBadge status={book.status} />
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-wrap gap-1">
                              {book.tags.slice(0, 3).map((tag, tagIndex) => (
                                <Badge 
                                  key={tag} 
                                  variant="primary" 
                                  size="sm"
                                  className="hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-sm"
                                  style={{ 
                                    animationDelay: `${(index * 50) + (tagIndex * 100)}ms` 
                                  }}
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {book.tags.length > 3 && (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer">
                                  +{book.tags.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                           <td className="py-3 px-2">
                             {book.latest?.start_date ? (
                               <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1 hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer group/date">
                                 <Calendar className="w-3 h-3 text-green-500 group-hover/date:scale-110 transition-transform" />
                                 {book.latest.start_date}
                               </div>
                             ) : (
                               <span className="text-zinc-400 text-sm">-</span>
                             )}
                           </td>
                           <td className="py-3 px-2">
                             {book.latest?.end_date ? (
                               <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer group/date">
                                 <Calendar className="w-3 h-3 text-blue-500 group-hover/date:scale-110 transition-transform" />
                                 {book.latest.end_date}
                               </div>
                             ) : (
                               <span className="text-zinc-400 text-sm">-</span>
                             )}
                           </td>
                           <td className="py-3 px-2">
                            {book.latest?.rating ? (
                              <div className="flex items-center gap-1 hover:scale-105 transition-transform cursor-pointer group/rating">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 group-hover/rating:scale-125 transition-transform" />
                                <span className="group-hover/rating:text-yellow-600 dark:group-hover/rating:text-yellow-300 transition-colors">
                                  {book.latest.rating}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditBook(book)}
                                className="p-1 hover:scale-110 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 hover:shadow-md"
                                title="Edit book"
                              >
                                <Edit3 className="w-3 h-3 text-blue-600 hover:text-blue-700 transition-colors" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteBook(book.id)}
                                className="p-1 hover:scale-110 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 hover:shadow-md"
                                title="Delete book"
                              >
                                <Trash2 className="w-3 h-3 text-red-600 hover:text-red-700 transition-colors" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
    </>
  )
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'To Read': return 'default'
      case 'Reading': return 'primary'
      case 'Paused': return 'warning'
      case 'Finished': return 'success'
      case 'Abandoned': return 'danger'
      default: return 'default'
    }
  }

  return (
    <Badge variant={getStatusVariant(status) as any} size="sm">
      {status}
    </Badge>
  )
}