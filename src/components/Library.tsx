import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { Edit3, Filter, ListChecks, Plus, Search, Trash2, BookOpenText, Tags, Star, Calendar, User, Columns, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import type { Book, Read } from '@/types'
import { BOOK_TYPES, STATUSES } from '@/types'
import { listBooks, upsertBook, deleteBook, readsForBook, upsertRead, deleteRead, setTagsForBook, countBooks, countNextUpBooks, countReReads, countFinishedThisYear, findNonCompliantData as findNonCompliantDataFromRepo } from '@/db/repo'
import { Card, CardHeader, CardContent, Button, Badge, Input, Select, EmptyState, Spinner, ProgressBar, Checkbox, useToast } from './ui'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import EditDialog from './EditDialog'
import { mergeTitleAuthorKey } from '@/utils/mergeByTitleAuthor'

interface BookRow extends Book {
  tags: string[]
  reads_count: number
  latest?: Read | null
}

type ColumnKey = 'title' | 'author' | 'series' | 'type' | 'status' | 'progress' | 'tags' | 'start_date' | 'end_date' | 'rating' | 'actions'

interface ColumnConfig {
  key: ColumnKey
  label: string
  sortable: boolean
  defaultVisible: boolean
  alwaysVisible?: boolean
}

// Column Picker Component
const ColumnPicker: React.FC<{
  columnConfigs: ColumnConfig[]
  columnVisibility: Record<ColumnKey, boolean>
  onToggleColumn: (columnKey: ColumnKey) => void
}> = ({ columnConfigs, columnVisibility, onToggleColumn }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const visibleCount = Object.values(columnVisibility).filter(Boolean).length

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Columns className="w-4 h-4" />
        <span>Columns ({visibleCount})</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-50">
          <div className="p-3">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">Show Columns</div>
            <div className="space-y-2">
              {columnConfigs.map((config) => (
                <Checkbox
                  key={config.key}
                  checked={columnVisibility[config.key]}
                  onChange={() => !config.alwaysVisible && onToggleColumn(config.key)}
                  label={config.label}
                  size="sm"
                  className={`w-full ${config.alwaysVisible ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    columnConfigs.forEach(config => {
                      if (!config.alwaysVisible && !columnVisibility[config.key]) {
                        onToggleColumn(config.key)
                      }
                    })
                  }}
                  className="text-xs flex-1"
                >
                  Show All
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    columnConfigs.forEach(config => {
                      if (!config.alwaysVisible && columnVisibility[config.key] !== config.defaultVisible) {
                        onToggleColumn(config.key)
                      }
                    })
                  }}
                  className="text-xs flex-1"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Library({ onOpenHighlights, onOpenDashboard, refreshSignal, globalSearch }: { onOpenHighlights: ()=>void; onOpenDashboard: ()=>void; refreshSignal: number; globalSearch?: string }){
  const q = globalSearch || ''
  const [status, setStatus] = useState('All')
  const [tag, setTag] = useState('All')
  const [year, setYear] = useState<number|null>(null)
  const [rows, setRows] = useState<BookRow[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'status' | 'type' | 'start_date' | 'end_date' | 'series_name' | 'tags'>('title')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [refreshKey, setRefreshKey] = useState(0)
  const [dashboardFilter, setDashboardFilter] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalBooks, setTotalBooks] = useState<number>(0)
  const [booksPerPage, setBooksPerPage] = useState(50)
  
  // Smart list counts from entire library
  const [nextUpCount, setNextUpCount] = useState<number>(0)
  const [reReadsCount, setReReadsCount] = useState<number>(0)
  const [finishedThisYearCount, setFinishedThisYearCount] = useState<number>(0)

  // Duplicate finding state
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [duplicateGroups, setDuplicateGroups] = useState<BookRow[][]>([])
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false)

  // Non-compliant data finding state
  const [showNonCompliant, setShowNonCompliant] = useState(false)
  const [nonCompliantData, setNonCompliantData] = useState<{
    nonCompliantObtained: Array<{ id: string; title: string; author: string; obtained: string }>;
    nonCompliantTypes: Array<{ id: string; title: string; author: string; type: string }>;
    nonCompliantStatuses: Array<{ id: string; title: string; author: string; status: string }>;
  } | null>(null)
  const [isLoadingNonCompliant, setIsLoadingNonCompliant] = useState(false)
  const [editingFromNonCompliant, setEditingFromNonCompliant] = useState(false)

  // Toast notifications
  const { addToast } = useToast()

  // Random shuffle state
  const [randomSeed, setRandomSeed] = useState<number>(0)
  



  // Column visibility configuration

  const columnConfigs: ColumnConfig[] = [
    { key: 'title', label: 'Title', sortable: true, defaultVisible: true, alwaysVisible: true },
    { key: 'author', label: 'Author', sortable: true, defaultVisible: true },
    { key: 'series', label: 'Series', sortable: true, defaultVisible: true },
    { key: 'type', label: 'Type', sortable: true, defaultVisible: true },
    { key: 'status', label: 'Status', sortable: true, defaultVisible: true },
    { key: 'progress', label: 'Progress', sortable: false, defaultVisible: true },
    { key: 'tags', label: 'Tags', sortable: true, defaultVisible: true },
    { key: 'start_date', label: 'Start Date', sortable: true, defaultVisible: false },
    { key: 'end_date', label: 'End Date', sortable: true, defaultVisible: false },
    { key: 'rating', label: 'Rating', sortable: false, defaultVisible: true },
    { key: 'actions', label: 'Actions', sortable: false, defaultVisible: true, alwaysVisible: true }
  ]

  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(() => {
    const stored = localStorage.getItem('library-columns')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        // Fall back to defaults if parsing fails
      }
    }
    // Initialize with defaults
    return columnConfigs.reduce((acc, config) => {
      acc[config.key] = config.defaultVisible
      return acc
    }, {} as Record<ColumnKey, boolean>)
  })

  // Save column visibility to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('library-columns', JSON.stringify(columnVisibility))
  }, [columnVisibility])

  const toggleColumnVisibility = (columnKey: ColumnKey) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }))
  }
  




  // Load smart list counts from entire library
  const loadSmartListCounts = useCallback(async () => {
    try {
      const [nextUp, reReads, finishedThisYear] = await Promise.all([
        countNextUpBooks(),
        countReReads(),
        countFinishedThisYear()
      ])
      setNextUpCount(nextUp)
      setReReadsCount(reReads)
      setFinishedThisYearCount(finishedThisYear)
    } catch (error) {
      console.error('Error loading smart list counts:', error)
    }
  }, [])

  // Load books with pagination
  const loadBooks = useCallback(async (page: number = 1, append: boolean = false) => {
    if (page === 1) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }
    
    try {
      const offset = (page - 1) * booksPerPage
      const data = await listBooks({ 
        q, 
        status, 
        tag, 
        year, 
        limit: booksPerPage, 
        offset 
      })
      
      if (append) {
        setRows(prev => [...prev, ...data])
      } else {
        setRows(data)
        setCurrentPage(1)
      }
      
      // Check if we have more books
      setHasMore(data.length === booksPerPage)
      
      // Get total count only on first page load
      if (page === 1) {
        try {
          const exactCount = await countBooks({ q, status, tag, year })
          setTotalBooks(exactCount)
        } catch (error) {
          console.error('Error counting books:', error)
          setTotalBooks(data.length)
        }
      }
    } catch (error) {
      console.error('Error loading books:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [q, status, tag, year, booksPerPage])

  // Debounced search to avoid excessive API calls
  const [debouncedQ, setDebouncedQ] = useState(q)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q)
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timer)
  }, [q])

  // Load initial books when filters change
  useEffect(() => {
    // Add a small delay to show the transition when filters change
    const timer = setTimeout(() => {
      loadBooks(1, false)
    }, 200)
    
    return () => clearTimeout(timer)
  }, [debouncedQ, status, tag, year, refreshSignal, refreshKey, loadBooks])
  
  // Load smart list counts when component loads or filters change
  useEffect(() => {
    loadSmartListCounts()
  }, [refreshSignal, refreshKey, loadSmartListCounts])

  // Load more books function
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadBooks(nextPage, true)
    }
  }, [isLoadingMore, hasMore, currentPage, loadBooks])

  // Handle changing books per page
  const handleBooksPerPageChange = useCallback((newBooksPerPage: number) => {
    setBooksPerPage(newBooksPerPage)
    setCurrentPage(1)
    // Add a small delay to show the transition
    setTimeout(() => {
      setRows([])
      setHasMore(true)
      // Reload with new page size
      loadBooks(1, false)
    }, 300)
  }, [loadBooks])

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
      console.log('handleFilterYear called with event:', event)
      const y = Number(event.detail)
      console.log('Year extracted:', y, 'isNaN:', Number.isNaN(y))
      if (!Number.isNaN(y)) {
        console.log('Setting year to:', y)
        setYear(y)
      }
    }

    const handleDashboardFilter = (event: CustomEvent) => {
      const { type, value } = event.detail
      
      // Clear other filters first for focused filtering
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

    const handleShowDuplicates = () => {
      setShowDuplicates(true)
      findDuplicates()
    }

    const handleShowNonCompliant = () => {
      setShowNonCompliant(true)
      findNonCompliantData()
    }

    window.addEventListener('new-book', handleNewBook)
    window.addEventListener('edit-book', handleEditBook as EventListener)
    window.addEventListener('refresh-library', handleRefresh)
    window.addEventListener('filter-year', handleFilterYear as EventListener)
    window.addEventListener('dashboard-filter', handleDashboardFilter as EventListener)
    window.addEventListener('add-book', handleAddBook)
    window.addEventListener('show-duplicates', handleShowDuplicates)
    window.addEventListener('show-non-compliant', handleShowNonCompliant)

    return () => {
      window.removeEventListener('new-book', handleNewBook)
      window.removeEventListener('edit-book', handleEditBook as EventListener)
      window.removeEventListener('refresh-library', handleRefresh)
      window.removeEventListener('filter-year', handleFilterYear as EventListener)
      window.removeEventListener('dashboard-filter', handleDashboardFilter as EventListener)
      window.removeEventListener('add-book', handleAddBook)
      window.removeEventListener('show-duplicates', handleShowDuplicates)
      window.removeEventListener('show-non-compliant', handleShowNonCompliant)
    }
  }, [])

  // Duplicate finding logic
  const findDuplicates = useCallback(async () => {
    setIsLoadingDuplicates(true)
    try {
      // Get all books from the database (not just the current page)
      const allBooks = await listBooks({})
      
      // Group books by title+author key
      const bookGroups = new Map<string, BookRow[]>()
      
      allBooks.forEach(book => {
        const key = mergeTitleAuthorKey(book)
        if (!bookGroups.has(key)) {
          bookGroups.set(key, [])
        }
        bookGroups.get(key)!.push(book)
      })
      
      // Filter to only groups with multiple books
      const duplicates = Array.from(bookGroups.values())
        .filter(group => group.length > 1)
        .sort((a, b) => {
          // Sort by title, then by author
          const aTitle = a[0].title.toLowerCase()
          const bTitle = b[0].title.toLowerCase()
          if (aTitle !== bTitle) return aTitle.localeCompare(bTitle)
          return a[0].author.toLowerCase().localeCompare(b[0].author.toLowerCase())
        })
      
      setDuplicateGroups(duplicates)
    } catch (error) {
      console.error('Error finding duplicates:', error)
      addToast({
        title: 'Error finding duplicates',
        message: 'Error finding duplicates. Please try again.',
        type: 'error',
      })
    } finally {
      setIsLoadingDuplicates(false)
    }
  }, [addToast])

  // Non-compliant data finding logic
  const findNonCompliantData = useCallback(async () => {
    setIsLoadingNonCompliant(true)
    try {
      const data = await findNonCompliantDataFromRepo()
      setNonCompliantData(data)
    } catch (error) {
      console.error('Error finding non-compliant data:', error)
      addToast({
        title: 'Error finding non-compliant data',
        message: 'Error finding non-compliant data. Please try again.',
        type: 'error',
      })
    } finally {
      setIsLoadingNonCompliant(false)
    }
  }, [addToast])

  // Helper function to edit a book from non-compliant data
  const handleEditNonCompliantBook = useCallback(async (bookId: string) => {
    setShowNonCompliant(false)
    setNonCompliantData(null)
    setIsLoadingNonCompliant(false)
    setEditingFromNonCompliant(true)
    
    // Get the full book data from the database
    try {
      const allBooks = await listBooks({})
      const bookRow = allBooks.find(b => b.id === bookId)
      if (bookRow) {
        setEditingBook(bookRow)
        setShowEditDialog(true)
      } else {
        setEditingFromNonCompliant(false)
        addToast({
          title: 'Book not found',
          message: 'Could not find the book in the database. It may have been deleted.',
          type: 'error',
        })
      }
    } catch (error) {
      setEditingFromNonCompliant(false)
      console.error('Error fetching book data:', error)
      addToast({
        title: 'Error',
        message: 'Failed to fetch book data. Please try again.',
        type: 'error',
      })
    }
  }, [addToast])

  // Handle escape key to close duplicates modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDuplicates) {
        setShowDuplicates(false)
        setDuplicateGroups([])
        setIsLoadingDuplicates(false)
      }
    }

    if (showDuplicates) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showDuplicates])

  // Handle escape key to close non-compliant modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showNonCompliant) {
        setShowNonCompliant(false)
        setNonCompliantData(null)
        setIsLoadingNonCompliant(false)
      }
    }

    if (showNonCompliant) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showNonCompliant])

  const handleMergeDuplicates = useCallback(async (books: BookRow[], keepIndex: number) => {
    if (!confirm(`Are you sure you want to merge these ${books.length} books? The first book will be kept and all reading history from the others will be transferred to it.`)) {
      return
    }
    
    try {
      const bookToKeep = books[keepIndex]
      const booksToMerge = books.filter((_, index) => index !== keepIndex)
      
      // Get all reading records for the books to be merged
      const allReadsPromises = booksToMerge.map(book => readsForBook(book.id))
      const allReadsArrays = await Promise.all(allReadsPromises)
      
      // Transfer reading records to the master book
      for (let i = 0; i < booksToMerge.length; i++) {
        const bookToMerge = booksToMerge[i]
        const readsToTransfer = allReadsArrays[i]
        
        for (const read of readsToTransfer) {
          // Create a new read record for the master book
          await upsertRead({
            ...read,
            id: undefined, // Let the system generate a new ID
            book_id: bookToKeep.id
          })
        }
      }
      
      // Delete the duplicate books (this will cascade delete their reading records)
      for (const book of booksToMerge) {
        await deleteBook(book.id)
      }
      
      // Refresh the library
      window.dispatchEvent(new CustomEvent('refresh-library'))
      
      // Re-find duplicates
      await findDuplicates()
      
      const totalReadsTransferred = allReadsArrays.reduce((sum, reads) => sum + reads.length, 0)
             addToast({
         title: 'Success',
         message: `Successfully merged ${booksToMerge.length} duplicate books. Transferred ${totalReadsTransferred} reading records to "${bookToKeep.title}".`,
         type: 'success',
       })
      
      // Don't close the modal - let user continue working with other duplicates
      
    } catch (error) {
      console.error('Error merging duplicates:', error)
             addToast({
         title: 'Error merging duplicates',
         message: `Error merging duplicates: ${error}. Please try again.`,
         type: 'error',
       })
      
      // Even if there's an error, close the modal to prevent it from getting stuck
      setShowDuplicates(false)
    }
  }, [findDuplicates, addToast])

  const handleMergeEverything = useCallback(async () => {
    if (!confirm(`Are you sure you want to merge ALL ${duplicateGroups.length} duplicate groups? This will process ${duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0)} duplicate books at once.`)) {
      return
    }
    
    setIsLoadingDuplicates(true)
    
    try {
      let totalBooksMerged = 0
      let totalReadsTransferred = 0
      let totalGroupsProcessed = 0
      
      // Process each duplicate group
      for (const group of duplicateGroups) {
        if (group.length <= 1) continue // Skip groups with no duplicates
        
        const bookToKeep = group[0] // Always keep the first book
        const booksToMerge = group.slice(1) // All others get merged
        
        // Get all reading records for the books to be merged
        const allReadsPromises = booksToMerge.map(book => readsForBook(book.id))
        const allReadsArrays = await Promise.all(allReadsPromises)
        
        // Transfer reading records to the master book
        for (let i = 0; i < booksToMerge.length; i++) {
          const bookToMerge = booksToMerge[i]
          const readsToTransfer = allReadsArrays[i]
          
          for (const read of readsToTransfer) {
            // Create a new read record for the master book
            await upsertRead({
              ...read,
              id: undefined, // Let the system generate a new ID
              book_id: bookToKeep.id
            })
          }
        }
        
        // Delete the duplicate books
        for (const book of booksToMerge) {
          await deleteBook(book.id)
        }
        
        totalBooksMerged += booksToMerge.length
        totalReadsTransferred += allReadsArrays.reduce((sum, reads) => sum + reads.length, 0)
        totalGroupsProcessed++
      }
      
      // Refresh the library
      window.dispatchEvent(new CustomEvent('refresh-library'))
      
      // Re-find duplicates to update the display
      await findDuplicates()
      
      addToast({
        title: 'Bulk Merge Complete!',
        message: `Successfully processed ${totalGroupsProcessed} duplicate groups, merged ${totalBooksMerged} books, and transferred ${totalReadsTransferred} reading records.`,
        type: 'success',
        duration: 8000, // Show longer for bulk operations
      })
      
    } catch (error) {
      console.error('Error in bulk merge:', error)
      addToast({
        title: 'Error in bulk merge',
        message: `Error during bulk merge: ${error}. Some books may have been processed. Please check your library.`,
        type: 'error',
        duration: 8000,
      })
    } finally {
      setIsLoadingDuplicates(false)
    }
  }, [duplicateGroups, findDuplicates, addToast])

  // Current year for date calculations
  const currentYear = new Date().getFullYear()

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
        setStatus('All')
        setTag('All')
        setYear(null)
        setDashboardFilter(null)
        setRandomSeed(0)
        window.dispatchEvent(new CustomEvent('clear-global-search'))
      },
      description: 'Clear All Filters'
    },
    {
      key: '1',
      action: () => { setStatus('To Read'); setTag('All'); setYear(null); setDashboardFilter(null) },
      description: 'Show To Read Books'
    },
    {
      key: '2',
      action: () => { setStatus('Reading'); setTag('All'); setYear(null); setDashboardFilter(null) },
      description: 'Show Currently Reading'
    },
    {
      key: '3',
      action: () => { setStatus('Finished'); setTag('All'); setYear(null); setDashboardFilter(null) },
      description: 'Show Finished Books'
    },
    {
      key: '4',
      action: () => { setStatus('All'); setTag('All'); setYear(currentYear); setDashboardFilter(null) },
      description: 'Show This Year'
    },
    {
      key: 'Escape',
      action: () => {
        setStatus('All')
        setTag('All')
        setYear(null)
        setDashboardFilter(null)
        setRandomSeed(0)
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
    let sorted = [...rows]
    
    // If we have a random seed, shuffle the rows
    if (randomSeed) {
      // Use a seeded random number generator for consistent shuffling
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000
        return x - Math.floor(x)
      }
      
      // Fisher-Yates shuffle with seeded random
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(randomSeed + i) * (i + 1))
        ;[sorted[i], sorted[j]] = [sorted[j], sorted[i]]
      }
      
      return sorted
    }
    
    // Otherwise, apply normal sorting
    return sorted.sort((a, b) => {
      let aVal, bVal
      
      // Handle date fields from latest read
      if (sortBy === 'start_date') {
        aVal = a.latest?.start_date || ''
        bVal = b.latest?.start_date || ''
      } else if (sortBy === 'end_date') {
        aVal = a.latest?.end_date || ''
        bVal = b.latest?.end_date || ''
      } else if (sortBy === 'tags') {
        // For tags, sort by the first tag alphabetically
        aVal = a.tags.length > 0 ? a.tags.sort()[0] : ''
        bVal = b.tags.length > 0 ? b.tags.sort()[0] : ''
      } else if (sortBy === 'series_name') {
        // For series, we'll handle this specially below to include series number
        aVal = a.series_name || ''
        bVal = b.series_name || ''
      } else {
        aVal = a[sortBy] || ''
        bVal = b[sortBy] || ''
      }
      
      // Handle null values
      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''
      
      // For date fields, use date comparison; for series, use special logic; for others, use string comparison
      if (sortBy === 'start_date' || sortBy === 'end_date') {
        // Convert dates for comparison (empty dates go to the end)
        const aDate = aVal ? new Date(aVal) : new Date('9999-12-31')
        const bDate = bVal ? new Date(bVal) : new Date('9999-12-31')
        
        if (sortOrder === 'asc') {
          return aDate.getTime() - bDate.getTime()
        } else {
          return bDate.getTime() - aDate.getTime()
        }
      } else if (sortBy === 'series_name') {
        // For series, first compare by series name, then by series number
        const aSeriesName = String(aVal).toLowerCase()
        const bSeriesName = String(bVal).toLowerCase()
        
        // If series names are different, sort by series name
        const seriesComparison = aSeriesName.localeCompare(bSeriesName)
        if (seriesComparison !== 0) {
          return sortOrder === 'asc' ? seriesComparison : -seriesComparison
        }
        
        // If series names are the same, sort by series number
        const aSeriesNum = a.series_number || 0
        const bSeriesNum = b.series_number || 0
        
        if (sortOrder === 'asc') {
          return aSeriesNum - bSeriesNum
        } else {
          return bSeriesNum - aSeriesNum
        }
      } else {
        // Convert to string for comparison
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
        
        if (sortOrder === 'asc') {
          return aVal.localeCompare(bVal)
        } else {
          return bVal.localeCompare(aVal)
        }
      }
    })
  }, [rows, sortBy, sortOrder, randomSeed])

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
                 addToast({
           title: 'Error deleting book',
           message: 'Error deleting book. Please try again.',
           type: 'error',
         })
      }
    }
  }

  const handleSaveBook = () => {
    setShowEditDialog(false)
    setEditingBook(null)
    
    // If we were editing from the non-compliant modal, return to it
    if (editingFromNonCompliant) {
      setEditingFromNonCompliant(false)
      // Small delay to ensure the edit dialog is closed before reopening the non-compliant modal
      setTimeout(() => {
        setShowNonCompliant(true)
        findNonCompliantData()
      }, 100)
    } else {
      // Trigger refresh for normal library editing
      window.dispatchEvent(new CustomEvent('refresh-library'))
    }
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
        <div className="col-span-12 md:col-span-2">
          <Card>
            <CardHeader>
              <div className="text-sm font-medium mb-2 flex items-center gap-2"><Filter className="w-4 h-4"/> Filters</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="space-y-2">
                    <Select value={status} onChange={(e)=>setStatus(e.target.value)}>
                      <option value="All">All (status)</option>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <Select value={tag} onChange={(e)=>setTag(e.target.value)}>
                      <option value="All">All (tags)</option>
                      {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                    </Select>
                    
                    {/* Shuffle Button */}
                    <Button
                      onClick={() => setRandomSeed(Date.now())}
                      variant="secondary"
                      size="sm"
                      className="w-full justify-center"
                    >
                      🎲 Shuffle Books
                    </Button>
                    
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
                    <button onClick={()=>{ setStatus('To Read'); setTag('All'); setYear(null); setDashboardFilter(null); setRandomSeed(0) }}>
                      <Badge className="cursor-pointer badge-primary hover:scale-105 hover:shadow-lg transition-all duration-200 hover:rotate-1 hover:-translate-y-1">
                        📚 Next Up ({nextUpCount})
                      </Badge>
                    </button>
                    <button onClick={()=>{ setStatus('All'); setTag('All'); setYear(new Date().getFullYear()); setDashboardFilter(null) }}>
                      <Badge className="cursor-pointer badge-primary hover:scale-105 hover:shadow-lg transition-all duration-200 hover:-rotate-1 hover:-translate-y-1">
                        🏆 Finished This Year ({finishedThisYearCount})
                      </Badge>
                    </button>
                    <button onClick={()=>{ setStatus('All'); setTag('All'); setYear(null); setDashboardFilter(null); setRandomSeed(0) }}>
                      <Badge className="cursor-pointer badge-primary hover:scale-105 hover:shadow-lg transition-all duration-200 hover:rotate-1 hover:-translate-y-1">
                        🔄 Re-reads ({reReadsCount})
                      </Badge>
                    </button>
                  </div>
                  {/* Show "Show All Books" button when any smart list filters are active */}
                  {(q !== '' || status !== 'All' || tag !== 'All' || year !== null) && (
                    <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      <Button 
                        onClick={() => {
                          setStatus('All')
                          setTag('All')
                          setYear(null)
                          setDashboardFilter(null)
                          setRandomSeed(0)
                          // Clear global search in parent App
                          window.dispatchEvent(new CustomEvent('clear-global-search'))
                        }} 
                        variant="secondary" 
                        size="sm"
                        className="w-full"
                      >
                        📖 Show All Books
                      </Button>
                    </div>
                  )}
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

        <div className="col-span-12 md:col-span-10">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-heading-2 flex items-center gap-2">
                    <BookOpenText className="w-5 h-5"/> 
                    Library ({rows.length} of {totalBooks ?? '...'} books)
                  </h2>
                  {hasMore && (
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Showing {rows.length} books • Load more to see all
                    </div>
                  )}
                  {isLoading && (
                    <div className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading books...
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span>Sort by:</span>
                    <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="w-40">
                      <option value="title">Title</option>
                      <option value="author">Author</option>
                      <option value="series_name">Series</option>
                      <option value="status">Status</option>
                      <option value="type">Type</option>
                      <option value="tags">Tags</option>
                      <option value="start_date">Start Date</option>
                      <option value="end_date">End Date</option>
                    </Select>
                  </div>
                  <ColumnPicker 
                    columnConfigs={columnConfigs}
                    columnVisibility={columnVisibility}
                    onToggleColumn={toggleColumnVisibility}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {/* Main content - always rendered with individual row transitions */}
              <div className="relative">
                {/* Loading indicator - inline instead of overlay */}
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-12 mb-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <Spinner size="lg" className="mb-4" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading your library...</p>
                  </div>
                )}
                
                {/* Empty state - inline instead of overlay */}
                {!isLoading && sortedRows.length === 0 && (
                  <div className="py-12">
                    <EmptyState
                      illustration={q || status !== 'All' || tag !== 'All' || year !== null ? "search" : "books"}
                      title={q || status !== 'All' || tag !== 'All' || year !== null ? "No books found" : "Welcome to LocalReads!"}
                      description={q || status !== 'All' || tag !== 'All' || year !== null 
                        ? "No books match your current search or filters. Try adjusting them to see what you're looking for." 
                        : "Your reading journey starts here. Add your first book to begin tracking your library."
                      }
                      tips={q || status !== 'All' || tag !== 'All' || year !== null ? [
                        "Clear your search query to see all books",
                        "Try different filter combinations",
                        "Use broader search terms",
                        "Check if you've spelled the title or author correctly"
                      ] : [
                        "Press Ctrl+N to quickly add a new book",
                        "Import your existing library using CSV files",
                        "Add tags to organize your books by genre or theme",
                        "Track multiple reads for books you revisit",
                        "Large libraries load 50 books at a time for better performance"
                      ]}
                      action={
                        <div className="space-y-3">
                          <Button onClick={() => setShowEditDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            {q || status !== 'All' || tag !== 'All' || year !== null ? "Add New Book" : "Add Your First Book"}
                          </Button>
                          {(q || status !== 'All' || tag !== 'All' || year !== null) && (
                            <div>
                              <Button 
                                variant="secondary" 
                                onClick={() => {
                                  setStatus('All')
                                  setTag('All')
                                  setYear(null)
                                  setDashboardFilter(null)
                                  setRandomSeed(0)
                                  // Clear global search in parent App
                                  window.dispatchEvent(new CustomEvent('clear-global-search'))
                                }}
                              >
                                Clear All Filters
                              </Button>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </div>
                )}
                
                {/* Book list content */}
                {sortedRows.length > 0 && (
                  <div 
                    key={`content-${q}-${status}-${tag}-${year}-${refreshKey}`}
                    className="transition-all duration-500"
                  >
                    {/* Simple loading indicator */}
                    {isLoading && (
                      <div className="mb-6 flex justify-center">
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading books...
                        </div>
                      </div>
                    )}
                    
                    {/* Mobile Card Layout */}
                    <div key={`mobile-${q}-${status}-${tag}-${year}-${refreshKey}`} className="block lg:hidden space-y-4">
                  {sortedRows.map((book, index) => (
                      <div 
                        key={book.id} 
                        className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-all duration-300"
                        style={{ 
                          animationDelay: `${index * 30}ms`,
                          animation: 'fadeInUp 0.3s ease-out forwards'
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0 mr-3">
                            <h3 
                              className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                              onClick={() => handleEditBook(book)}
                              title="Open book details"
                            >
                              {book.title}
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-400 truncate">
                              {book.author}
                            </p>
                            {(book.series_name || (book.series && book.series.length > 0)) && (
                              <p className="text-sm text-zinc-500 dark:text-zinc-500 truncate" title={[book.series_name && (book.series_number ? `${book.series_name} #${book.series_number}` : book.series_name), ...(book.series||[]).map(s => s.number ? `${s.name} #${s.number}` : s.name)].filter(Boolean).join(' • ')}>
                                {book.series_name || (book.series && book.series[0]?.name)}
                                {(book.series_number != null ? book.series_number : (book.series && book.series[0]?.number)) && ` #${(book.series_number != null ? book.series_number : (book.series && book.series[0]?.number))}`}
                                {book.series && book.series.length > 0 && (book.series_name ? book.series.length : Math.max(0, (book.series||[]).length - 1)) > 0 && (
                                  <span className="ml-1 opacity-70">+{book.series_name ? book.series.length : (book.series.length - 1)}</span>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <StatusBadge status={book.status} />
                            <Badge variant="secondary" size="sm">
                              {book.type}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Progress bar for reading books */}
                        {(book.status === 'Reading' || book.status === 'Paused') && book.latest?.progress_percentage ? (
                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">Progress</span>
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {book.latest.current_page || 0} / {book.latest.total_pages || 0}
                              </span>
                            </div>
                            <ProgressBar
                              value={book.latest.progress_percentage}
                              size="sm"
                              showLabel={false}
                              color={book.status === 'Reading' ? 'primary' : 'warning'}
                            />
                          </div>
                        ) : null}
                        
                        {/* Tags */}
                        {book.tags.length > 0 && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-1">
                              {book.tags.slice(0, 4).map((tag, tagIndex) => (
                                <button key={tag} onClick={() => setTag(tag)}>
                                  <Badge 
                                    variant="primary" 
                                    size="sm"
                                    className="hover:scale-105 transition-transform duration-200 cursor-pointer"
                                  >
                                    {tag}
                                  </Badge>
                                </button>
                              ))}
                              {book.tags.length > 4 && (
                                <Badge variant="primary" size="sm" className="opacity-60">
                                  +{book.tags.length - 4}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Reading dates */}
                        {(book.latest?.start_date || book.latest?.end_date) && (
                          <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 space-y-1">
                            {book.latest?.start_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                Started: {book.latest.start_date}
                              </div>
                            )}
                            {book.latest?.end_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                Finished: {book.latest.end_date}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Rating */}
                        {book.latest?.rating && (
                          <div className="flex items-center gap-1 mb-3">
                            {[...Array(book.latest.rating)].map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            ))}
                            <span className="text-sm text-zinc-500 dark:text-zinc-400 ml-1">
                              ({book.latest.rating}/5)
                            </span>
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                          <Button
                            onClick={() => handleDeleteBook(book.id)}
                            size="sm"
                            variant="danger"
                            className="min-h-[44px]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                                      {/* Load More Button for Mobile */}
                  {hasMore && (
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        variant="secondary"
                        className="w-full max-w-md transition-all duration-300"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading more books...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-2" />
                            Load More Books ({booksPerPage})
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Loading indicator for pagination */}
                  {isLoadingMore && (
                    <div className="flex justify-center pt-4 animate-in fade-in-0">
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading more books...
                      </div>
                    </div>
                  )}
                    
                    {/* Books Per Page Toggle for Mobile */}
                    <div className="flex justify-center pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <div className="flex flex-col items-center gap-3 text-sm w-full max-w-md">
                        <span className="text-zinc-600 dark:text-zinc-400">Books per page:</span>
                        <div className="flex gap-1 w-full">
                          {[50, 100, 200].map((size) => (
                            <button
                              key={size}
                              onClick={() => handleBooksPerPageChange(size)}
                              className={`flex-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                                booksPerPage === size
                                  ? 'bg-indigo-500 text-white shadow-md'
                                  : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs">
                          Total: {totalBooks} books
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Desktop Table Layout */}
                  <div className="hidden lg:block overflow-x-auto">

                    {isLoading && (
                      <div className="mb-6 animate-in fade-in-0">
                        <table className="w-full table-fixed">
                          <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800">
                              {columnVisibility.title && <th className="text-left py-3 px-2 w-80"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-20"></div></th>}
                              {columnVisibility.author && <th className="text-left py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-16"></div></th>}
                              {columnVisibility.series && <th className="text-left py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-16"></div></th>}
                              {columnVisibility.type && <th className="text-left py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-12"></div></th>}
                              {columnVisibility.status && <th className="text-left py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-16"></div></th>}
                              {columnVisibility.progress && <th className="text-left py-3 px-2 w-32"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-16"></div></th>}
                              {columnVisibility.tags && <th className="text-left py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-12"></div></th>}
                              {columnVisibility.start_date && <th className="text-left py-3 px-2 w-40"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-20"></div></th>}
                              {columnVisibility.end_date && <th className="text-left py-3 px-2 w-40"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-20"></div></th>}
                              {columnVisibility.rating && <th className="text-left py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-12"></div></th>}
                              {columnVisibility.actions && <th className="text-left py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-16"></div></th>}
                            </tr>
                          </thead>
                          <tbody>
                            {[...Array(3)].map((_, i) => (
                              <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                                {columnVisibility.title && <td className="py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-48"></div></td>}
                                {columnVisibility.author && <td className="py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-24"></div></td>}
                                {columnVisibility.series && <td className="py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-20"></div></td>}
                                {columnVisibility.type && <td className="py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-16"></div></td>}
                                {columnVisibility.status && <td className="py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-20"></div></td>}
                                {columnVisibility.progress && <td className="py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-24"></div></td>}
                                {columnVisibility.tags && <td className="py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-20"></div></td>}
                                {columnVisibility.start_date && <td className="py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-20"></div></td>}
                                {columnVisibility.end_date && <td className="py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-20"></div></td>}
                                {columnVisibility.rating && <td className="py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-12"></div></td>}
                                {columnVisibility.actions && <td className="py-3 px-2"><div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded skeleton w-16"></div></td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    <table className="w-full table-fixed">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        {columnVisibility.title && (
                          <th className="text-left py-3 px-2 w-80">
                            <SortHeader field="title">Title</SortHeader>
                          </th>
                        )}
                        {columnVisibility.author && (
                          <th className="text-left py-3 px-2">
                            <SortHeader field="author">Author</SortHeader>
                          </th>
                        )}
                        {columnVisibility.series && (
                          <th className="text-left py-3 px-2">
                            <SortHeader field="series_name">Series</SortHeader>
                          </th>
                        )}
                        {columnVisibility.type && (
                          <th className="text-left py-3 px-2">
                            <SortHeader field="type">Type</SortHeader>
                          </th>
                        )}
                        {columnVisibility.status && (
                          <th className="text-left py-3 px-2">
                            <SortHeader field="status">Status</SortHeader>
                          </th>
                        )}
                        {columnVisibility.progress && (
                          <th className="text-left py-3 px-2 w-32">Progress</th>
                        )}
                        {columnVisibility.tags && (
                          <th className="text-left py-3 px-2">
                            <SortHeader field="tags">Tags</SortHeader>
                          </th>
                        )}
                        {columnVisibility.start_date && (
                          <th className="text-left py-3 px-2 w-40">
                            <SortHeader field="start_date">Start Date</SortHeader>
                          </th>
                        )}
                        {columnVisibility.end_date && (
                          <th className="text-left py-3 px-2 w-40">
                            <SortHeader field="end_date">End Date</SortHeader>
                          </th>
                        )}
                        {columnVisibility.rating && (
                          <th className="text-left py-3 px-2">Rating</th>
                        )}
                        {columnVisibility.actions && (
                          <th className="text-left py-3 px-2">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody key={`${q}-${status}-${tag}-${year}-${refreshKey}`}>
                      {sortedRows.map((book, index) => (
                        <tr 
                          key={book.id} 
                          className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-300 hover:shadow-sm hover:scale-[1.01] hover:-translate-y-0.5 group"
                          style={{ 
                            animationDelay: `${index * 30}ms`,
                            animation: 'fadeInUp 0.3s ease-out forwards'
                          }}
                        >
                          {columnVisibility.title && (
                            <td className="py-3 px-2">
                              <div 
                                className="font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer"
                                onClick={() => handleEditBook(book)}
                                title="Open book details"
                              >
                                {book.title}
                              </div>
                              {book.obtained && (
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                                  {book.obtained}
                                </div>
                              )}
                            </td>
                          )}
                          {columnVisibility.author && (
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1 group/author hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                                <User className="w-3 h-3 text-zinc-400 group-hover/author:text-blue-500 group-hover/author:scale-110 transition-all" />
                                {book.author}
                              </div>
                            </td>
                          )}
                          {columnVisibility.series && (
                            <td className="py-3 px-2">
                              {(book.series_name || (book.series && book.series.length > 0)) && (
                                <div className="text-sm" title={[book.series_name && (book.series_number ? `${book.series_name} #${book.series_number}` : book.series_name), ...(book.series||[]).map(s => s.number ? `${s.name} #${s.number}` : s.name)].filter(Boolean).join(' • ')}>
                                  {book.series_name || (book.series && book.series[0]?.name)}
                                  {(book.series_number != null ? book.series_number : (book.series && book.series[0]?.number)) && (
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">#{(book.series_number != null ? book.series_number : (book.series && book.series[0]?.number))}</span>
                                  )}
                                  {book.series && book.series.length > 0 && (book.series_name ? book.series.length : Math.max(0, (book.series||[]).length - 1)) > 0 && (
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">+{book.series_name ? book.series.length : (book.series.length - 1)}</span>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                          {columnVisibility.type && (
                            <td className="py-3 px-2">
                              <Badge 
                                variant="secondary" 
                                size="sm" 
                                className="hover:scale-105 transition-transform duration-200 cursor-pointer"
                              >
                                {book.type}
                              </Badge>
                            </td>
                          )}
                          {columnVisibility.status && (
                            <td className="py-3 px-2">
                              <div className="hover:scale-105 transition-transform duration-200 cursor-pointer inline-block">
                                <StatusBadge status={book.status} />
                              </div>
                            </td>
                          )}
                          {columnVisibility.progress && (
                            <td className="py-3 px-2">
                              {(book.status === 'Reading' || book.status === 'Paused') && book.latest?.progress_percentage ? (
                                <div className="w-full">
                                  <ProgressBar
                                    value={book.latest.progress_percentage}
                                    size="sm"
                                    showLabel={false}
                                    color={book.status === 'Reading' ? 'primary' : 'warning'}
                                  />
                                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    {book.latest.current_page || 0} / {book.latest.total_pages || 0}
                                  </div>
                                </div>
                              ) : book.status === 'Finished' && book.latest?.progress_percentage === 100 ? (
                                <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  ✓ Complete
                                </div>
                              ) : (
                                <div className="text-xs text-zinc-400">—</div>
                              )}
                            </td>
                          )}
                          {columnVisibility.tags && (
                            <td className="py-3 px-2">
                              <div className="flex flex-wrap gap-1">
                                {book.tags.slice(0, 3).map((tag, tagIndex) => (
                                  <Badge 
                                    key={tag} 
                                    variant="primary" 
                                    size="sm"
                                    className="hover:scale-105 transition-all duration-200 cursor-pointer hover:shadow-sm"
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
                          )}
                          {columnVisibility.start_date && (
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
                          )}
                          {columnVisibility.end_date && (
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
                          )}
                          {columnVisibility.rating && (
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
                          )}
                          {columnVisibility.actions && (
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
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
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Load More Button for Desktop */}
                  {hasMore && (
                    <div className="flex justify-center pt-6 border-t border-zinc-200 dark:border-zinc-700">
                      <Button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        variant="secondary"
                        size="lg"
                        className="px-8 transition-all duration-300"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading more books...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-2" />
                            Load More Books ({booksPerPage})
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Loading indicator for pagination - Desktop */}
                  {isLoadingMore && (
                    <div className="flex justify-center pt-4 animate-in fade-in-0">
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading more books...
                      </div>
                    </div>
                  )}
                  
                  {/* Books Per Page Toggle */}
                  <div className="flex justify-center pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Books per page:</span>
                      <div className="flex gap-1">
                        {[50, 100, 200].map((size) => (
                          <button
                            key={size}
                            onClick={() => handleBooksPerPageChange(size)}
                            className={`px-3 py-1 rounded-lg transition-all duration-200 ${
                              booksPerPage === size
                                ? 'bg-indigo-500 text-white shadow-md'
                                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                                                                      <span className="text-zinc-500 dark:text-zinc-400 text-xs">
                          (Total: {totalBooks} books)
                        </span>
                    </div>
                  </div>
                </div>
                  </div>
                )}
              </div>
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
            // If we were editing from the non-compliant modal, return to it
            if (editingFromNonCompliant) {
              setEditingFromNonCompliant(false)
              // Small delay to ensure the edit dialog is closed before reopening the non-compliant modal
              setTimeout(() => {
                setShowNonCompliant(true)
                findNonCompliantData()
              }, 100)
            }
          }}
          onSave={handleSaveBook}
        />
      )}

      {/* Duplicate Books Modal */}
      {showDuplicates && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDuplicates(false)
              setDuplicateGroups([])
              setIsLoadingDuplicates(false)
            }
          }}
        >
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <ListChecks className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="text-heading-2 text-zinc-900 dark:text-zinc-100">
                    Duplicate Books Found
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Merge duplicates to clean up your library. The modal stays open so you can work through all groups.
                  </p>
                </div>
                {duplicateGroups.length > 0 && (
                  <Badge variant="primary" size="md">
                    {duplicateGroups.length} groups
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                {duplicateGroups.length > 0 && (
                  <Button
                    onClick={handleMergeEverything}
                    disabled={isLoadingDuplicates}
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isLoadingDuplicates ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Merging...
                      </>
                    ) : (
                      <>
                        <ListChecks className="w-4 h-4" />
                        Merge Everything
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setShowDuplicates(false)
                    setDuplicateGroups([])
                    setIsLoadingDuplicates(false)
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {isLoadingDuplicates ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                  <span className="ml-3 text-zinc-600 dark:text-zinc-400">Finding duplicates...</span>
                </div>
              ) : duplicateGroups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-heading-3 text-zinc-900 dark:text-zinc-100 mb-2">
                    No Duplicates Found!
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Your library is clean and organized.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {duplicateGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                          {group[0].title}
                        </h4>
                        <Badge variant="warning" size="sm">
                          {group.length} duplicates
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        {group.map((book, bookIndex) => (
                          <div
                            key={book.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              bookIndex === 0
                                ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {book.title}
                                  </div>
                                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                    by {book.author}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" size="sm">
                                      {book.type}
                                    </Badge>
                                    <Badge variant={book.status === 'Finished' ? 'success' : 'default'} size="sm">
                                      {book.status}
                                    </Badge>
                                    {book.series_name && (
                                      <Badge variant="primary" size="sm">
                                        {book.series_name}
                                        {book.series_number && ` #${book.series_number}`}
                                      </Badge>
                                    )}
                                    {book.tags.length > 0 && (
                                      <Badge variant="secondary" size="sm">
                                        {book.tags.slice(0, 2).join(', ')}
                                        {book.tags.length > 2 && ` +${book.tags.length - 2}`}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              {bookIndex === 0 ? (
                                <Badge variant="success" size="sm">
                                  Keep This One
                                </Badge>
                              ) : (
                                <Button
                                  onClick={() => handleMergeDuplicates(group, bookIndex)}
                                  variant="danger"
                                  size="sm"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Merge & Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                          <span>
                            The first book (green) will be kept. All reading history from duplicates will be transferred to it. The modal will stay open to continue working with other duplicates.
                          </span>
                          <Button
                            onClick={() => handleMergeDuplicates(group, 0)}
                            variant="primary"
                            size="sm"
                            disabled={group.length === 1}
                          >
                            Merge All ({group.length - 1} to merge)
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Non-Compliant Data Modal */}
      {showNonCompliant && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNonCompliant(false)
              setNonCompliantData(null)
              setIsLoadingNonCompliant(false)
            }
          }}
        >
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <ListChecks className="w-6 h-6 text-orange-600" />
                <div>
                  <h2 className="text-heading-2 text-zinc-900 dark:text-zinc-100">
                    Data Compliance Issues Found
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Review and fix data that doesn't match predefined options. Click on any book to edit it.
                  </p>
                </div>
                {nonCompliantData && (
                  <Badge variant="warning" size="md">
                    {nonCompliantData.nonCompliantObtained.length + 
                     nonCompliantData.nonCompliantTypes.length + 
                     nonCompliantData.nonCompliantStatuses.length} issues
                  </Badge>
                )}
              </div>
              <Button
                onClick={() => {
                  setShowNonCompliant(false)
                  setNonCompliantData(null)
                  setIsLoadingNonCompliant(false)
                }}
                variant="secondary"
                size="sm"
              >
                Close
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {isLoadingNonCompliant ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                  <span className="ml-3 text-zinc-600 dark:text-zinc-400">Finding non-compliant data...</span>
                </div>
              ) : !nonCompliantData ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">❓</div>
                  <h3 className="text-heading-3 text-zinc-900 dark:text-zinc-100 mb-2">
                    No Data Loaded
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Something went wrong loading the data.
                  </p>
                </div>
              ) : (nonCompliantData.nonCompliantObtained.length === 0 && 
                   nonCompliantData.nonCompliantTypes.length === 0 && 
                   nonCompliantData.nonCompliantStatuses.length === 0) ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-heading-3 text-zinc-900 dark:text-zinc-100 mb-2">
                    No Compliance Issues Found!
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    All your books have valid values for obtained status, book type, and reading status.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Obtained Status Issues */}
                  {nonCompliantData.nonCompliantObtained.length > 0 && (
                    <div className="border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                          📚 Obtained Status Issues
                        </h4>
                        <Badge variant="warning" size="sm">
                          {nonCompliantData.nonCompliantObtained.length} books
                        </Badge>
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                        Valid options: <strong>Owned, Borrowed, Library, Wishlist, On Order</strong>
                      </div>
                      <div className="space-y-3">
                        {nonCompliantData.nonCompliantObtained.map((book) => (
                          <div
                            key={book.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {book.title}
                              </div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                by {book.author}
                              </div>
                              <div className="mt-1">
                                <Badge variant="warning" size="sm">
                                  Current: "{book.obtained}"
                                </Badge>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleEditNonCompliantBook(book.id)}
                              variant="primary"
                              size="sm"
                            >
                              Edit Book
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Book Type Issues */}
                  {nonCompliantData.nonCompliantTypes.length > 0 && (
                    <div className="border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                          📖 Book Type Issues
                        </h4>
                        <Badge variant="warning" size="sm">
                          {nonCompliantData.nonCompliantTypes.length} books
                        </Badge>
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                        Valid options: <strong>Book, Audiobook, Ebook, Comic, Manga, Graphic Novel, Art/Photography Book</strong>
                      </div>
                      <div className="space-y-3">
                        {nonCompliantData.nonCompliantTypes.map((book) => (
                          <div
                            key={book.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {book.title}
                              </div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                by {book.author}
                              </div>
                              <div className="mt-1">
                                <Badge variant="warning" size="sm">
                                  Current: "{book.type}"
                                </Badge>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleEditNonCompliantBook(book.id)}
                              variant="primary"
                              size="sm"
                            >
                              Edit Book
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reading Status Issues */}
                  {nonCompliantData.nonCompliantStatuses.length > 0 && (
                    <div className="border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <h4 className="text-heading-4 text-zinc-900 dark:text-zinc-100">
                          📖 Reading Status Issues
                        </h4>
                        <Badge variant="warning" size="sm">
                          {nonCompliantData.nonCompliantStatuses.length} books
                        </Badge>
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                        Valid options: <strong>To Read, Reading, Paused, Finished, Abandoned</strong>
                      </div>
                      <div className="space-y-3">
                        {nonCompliantData.nonCompliantStatuses.map((book) => (
                          <div
                            key={book.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {book.title}
                              </div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                by {book.author}
                              </div>
                              <div className="mt-1">
                                <Badge variant="warning" size="sm">
                                  Current: "{book.status}"
                                </Badge>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleEditNonCompliantBook(book.id)}
                              variant="primary"
                              size="sm"
                            >
                              Edit Book
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
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