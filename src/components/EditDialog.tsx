import React, { useEffect, useMemo, useState } from 'react'
import { X, Save, BookOpen, User, Hash, Tag, Download, Upload } from 'lucide-react'
import type { Book, Read } from '@/types'
import { BOOK_TYPES, STATUSES } from '@/types'
import { upsertBook, upsertRead, setTagsForBook, readsForBook, searchAuthors, searchSeries, searchTags, deleteRead, tagsForBook } from '@/db/repo'
import { Input, Textarea, Button, Card, CardHeader, CardContent, Select, ModalBackdrop, Spinner, ProgressBar } from './ui'

interface EditDialogProps {
  book?: Book | null
  onClose: () => void
  onSave: () => void
}

export default function EditDialog({ book, onClose, onSave }: EditDialogProps) {
  const tauriReady = typeof window !== 'undefined' && !!((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__)
  const [formData, setFormData] = useState<Partial<Book>>({
    title: '',
    author: '',
    series_name: '',
    series_number: null,
    obtained: null,
    type: 'Book',
    status: 'To Read',
    next_up_priority: false
  })
  
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [readData, setReadData] = useState<Partial<Read>>({
    start_date: '',
    end_date: '',
    rating: undefined,
    review: '',
    format: undefined,
    current_page: undefined,
    total_pages: undefined,
    progress_percentage: undefined
  })
  const [reads, setReads] = useState<Read[]>([])
  const [editingReadId, setEditingReadId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string>('')
  const [authorSuggestions, setAuthorSuggestions] = useState<string[]>([])
  const [seriesSuggestions, setSeriesSuggestions] = useState<string[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showAuthorSuggestions, setShowAuthorSuggestions] = useState(false)
  const [showSeriesSuggestions, setShowSeriesSuggestions] = useState(false)
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  useEffect(() => {
    if (book) {
      setFormData(book)
      // Load existing reads
      loadReadData(book.id)
      // Load existing tags
      loadTags(book.id)
    }
  }, [book])

  const loadReadData = async (bookId: string) => {
    try {
      const list = await readsForBook(bookId)
      setReads(list)
      if (list.length > 0) {
        const latestRead = list[0]
        setReadData({
          start_date: latestRead.start_date || '',
          end_date: latestRead.end_date || '',
          rating: latestRead.rating || undefined,
          review: latestRead.review || '',
          format: latestRead.format || undefined,
          current_page: latestRead.current_page || undefined,
          total_pages: latestRead.total_pages || undefined,
          progress_percentage: latestRead.progress_percentage || undefined
        })
        setEditingReadId(latestRead.id)
      } else {
        setEditingReadId(null)
        setReadData({ start_date: '', end_date: '', rating: undefined, review: '', format: undefined, current_page: undefined, total_pages: undefined, progress_percentage: undefined })
      }
    } catch (error) {
      console.error('Error loading read data:', error)
    }
  }

  const loadTags = async (bookId: string) => {
    try {
      const current = await tagsForBook(bookId)
      setTags(current)
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const handleInputChange = (field: keyof Book, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  // typeahead search (debounced)
  const [authorFocused, setAuthorFocused] = useState(false)
  const [seriesFocused, setSeriesFocused] = useState(false)
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        if (!authorFocused) { setAuthorSuggestions([]); return }
        const q = (formData.author || '').trim()
        if (q) setAuthorSuggestions(await searchAuthors(q))
        else setAuthorSuggestions([])
      } catch {}
    }, 200)
    return () => clearTimeout(t)
  }, [formData.author, authorFocused])

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        if (!seriesFocused) { setSeriesSuggestions([]); return }
        const q = (formData.series_name || '').trim()
        if (q) setSeriesSuggestions(await searchSeries(q))
        else setSeriesSuggestions([])
      } catch {}
    }, 200)
    return () => clearTimeout(t)
  }, [formData.series_name, seriesFocused])

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const q = tagInput.trim()
        if (q) setTagSuggestions(await searchTags(q))
        else setTagSuggestions([])
      } catch {}
    }, 200)
    return () => clearTimeout(t)
  }, [tagInput])

  const handleReadChange = (field: keyof Read, value: any) => {
    setReadData(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMsg('Submitting…')
    console.log('Form submitted with data:', { formData, tags, readData })
    
    if (!formData.title?.trim() || !formData.author?.trim()) {
      alert('Title and Author are required')
      return
    }

    setIsLoading(true)
    try {
      console.log('Attempting to save book...')
      setStatusMsg('Saving book…')
      // Save book
      const bookId = await upsertBook(formData)
      console.log('Book saved with ID:', bookId)
      setStatusMsg('Book saved. Saving tags…')
      
      // Save tags
      console.log('Saving tags:', tags)
      await setTagsForBook(bookId, tags)
      console.log('Tags saved successfully')
      setStatusMsg('Tags saved.')
      
      console.log('All data saved successfully, closing dialog')
      setStatusMsg('Saved!')
      onSave()
      // also signal a library refresh in case the parent is not mounted
      window.dispatchEvent(new CustomEvent('refresh-library'))
      // and refresh gems list if open
      window.dispatchEvent(new CustomEvent('refresh-gems'))
      onClose()
    } catch (error: any) {
      console.error('Error saving book:', error)
      const msg = String(error?.message || error)
      setStatusMsg(`Error: ${msg}`)
      if (msg.includes('__TAURI_INTERNALS')) {
        alert('Saving requires the Tauri runtime. Make sure you are running the desktop app window (npm run tauri:dev) or the installed app, not just the browser preview.')
      } else {
        alert(`Error saving book: ${msg}. Please try again.`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <ModalBackdrop onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {book ? 'Edit Book' : 'Add New Book'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
          {/* Basic Book Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Title *
              </label>
              <Input
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); handleSubmit(e as any)} }}
                placeholder="Book title"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Author *
              </label>
              <Input
                value={formData.author || ''}
                onChange={(e) => handleInputChange('author', e.target.value)}
                onFocus={() => setAuthorFocused(true)}
                onBlur={() => setTimeout(() => setAuthorFocused(false), 150)}
                onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); handleSubmit(e as any)} }}
                placeholder="Author name"
                required
              />
              {authorSuggestions.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {authorSuggestions.slice(0,6).map(name => (
                    <button type="button" key={name} onClick={() => handleInputChange('author', name)} className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Series Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Series Name</label>
              <Input
                value={formData.series_name || ''}
                onChange={(e) => handleInputChange('series_name', e.target.value)}
                onFocus={() => setSeriesFocused(true)}
                onBlur={() => setTimeout(() => setSeriesFocused(false), 150)}
                placeholder="Series name (optional)"
              />
              {seriesSuggestions.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {seriesSuggestions.slice(0,6).map(name => (
                    <button type="button" key={name} onClick={() => handleInputChange('series_name', name)} className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Series Number</label>
              <Input
                type="number"
                min="1"
                value={formData.series_number || ''}
                onChange={(e) => handleInputChange('series_number', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Book number in series"
              />
            </div>
          </div>

          {/* Book Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select
                value={formData.status || 'To Read'}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
            </div>
            
            {/* Next Up Priority Checkbox */}
            <div>
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={formData.next_up_priority || false}
                  onChange={(e) => handleInputChange('next_up_priority', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-zinc-300 rounded focus:ring-indigo-500 focus:ring-2"
                />
                <span>⭐ Mark as Next Up Priority</span>
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 ml-7">
                Books marked as Next Up will always appear at the top of your reading queue
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Obtained</label>
              <div className="flex flex-wrap gap-3 text-sm">
                {['Owned','Borrowed','Library','Wishlist'].map(opt => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.obtained === opt}
                      onChange={(e)=> handleInputChange('obtained', e.target.checked ? (opt as any) : null)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a tag and press Enter"
                />
                <Button type="button" onClick={addTag} variant="secondary">
                  Add
                </Button>
              </div>
              {tagSuggestions.length > 0 && (
                <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Suggested tags:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tagSuggestions.slice(0,8).map((tag, index) => (
                      <button 
                        type="button" 
                        key={tag} 
                        onClick={() => {
                          if (!tags.includes(tag)) {
                            setTags(prev => [...prev, tag])
                            setTagInput('')
                          }
                        }}
                        disabled={tags.includes(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-sm ${
                          tags.includes(tag)
                            ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 cursor-pointer'
                        }`}
                        style={{ 
                          animationDelay: `${index * 50}ms`,
                          animation: 'fadeInUp 0.3s ease-out forwards'
                        }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reading Progress */}
          <div>
            <label className="block text-sm font-medium mb-2">Reading Progress</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Started Reading</label>
                <Input
                  type="date"
                  value={readData.start_date || ''}
                  onChange={(e) => handleReadChange('start_date', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Finished Reading</label>
                <Input
                  type="date"
                  value={readData.end_date || ''}
                  onChange={(e) => handleReadChange('end_date', e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Rating (1-5)</label>
                <Select
                  value={readData.rating || ''}
                  onChange={(e) => handleReadChange('rating', e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">No rating</option>
                  {[1, 2, 3, 4, 5].map(rating => (
                    <option key={rating} value={rating}>{rating} {rating === 1 ? 'star' : 'stars'}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Format (optional)</label>
                <Select
                  value={readData.format || ''}
                  onChange={(e) => handleReadChange('format', e.target.value || undefined)}
                >
                  <option value="">Same as book</option>
                  {BOOK_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Progress Tracking Section */}
            {(formData.status === 'Reading' || formData.status === 'Paused' || readData.current_page || readData.total_pages) && (
              <div className="mt-4 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950">
                <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-3">Reading Progress</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Current Page</label>
                    <Input
                      type="number"
                      min="0"
                      value={readData.current_page || ''}
                      onChange={(e) => {
                        const current = parseInt(e.target.value) || 0
                        const total = readData.total_pages || 0
                        const percentage = total > 0 ? Math.round((current / total) * 100) : 0
                        handleReadChange('current_page', current)
                        handleReadChange('progress_percentage', percentage)
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Total Pages</label>
                    <Input
                      type="number"
                      min="1"
                      value={readData.total_pages || ''}
                      onChange={(e) => {
                        const total = parseInt(e.target.value) || 0
                        const current = readData.current_page || 0
                        const percentage = total > 0 ? Math.round((current / total) * 100) : 0
                        handleReadChange('total_pages', total)
                        handleReadChange('progress_percentage', percentage)
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Progress %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={readData.progress_percentage || ''}
                      onChange={(e) => {
                        const percentage = parseInt(e.target.value) || 0
                        const total = readData.total_pages || 0
                        const current = total > 0 ? Math.round((percentage / 100) * total) : 0
                        handleReadChange('progress_percentage', percentage)
                        handleReadChange('current_page', current)
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
                {(readData.progress_percentage || 0) > 0 && (
                  <div className="mt-3">
                    <ProgressBar 
                      value={readData.progress_percentage || 0} 
                      showLabel={false}
                      size="sm"
                      color="primary"
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-4">
              <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Review</label>
              <Textarea
                value={readData.review || ''}
                placeholder="Your thoughts on this book..."
                rows={3}
                onChange={(e) => handleReadChange('review', e.target.value)}
              />
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (!formData.id && !book?.id) {
                    alert('Save the book first before adding a read.')
                    return
                  }
                  const bookId = (formData.id || book?.id) as string
                  const id = await upsertRead({
                    ...(editingReadId ? { id: editingReadId } : {}),
                    ...readData,
                    book_id: bookId
                  })
                  setEditingReadId(id)
                  await loadReadData(bookId)
                }}
              >
                Save Read Entry
              </Button>
              {editingReadId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    if (!editingReadId) return
                    if (!confirm('Delete this read entry?')) return
                    await deleteRead(editingReadId)
                    const bookId = (formData.id || book?.id) as string
                    await loadReadData(bookId)
                  }}
                >
                  Delete Read Entry
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingReadId(null)
                  setReadData({ start_date: '', end_date: '', rating: undefined, review: '', format: undefined })
                }}
              >
                New Read Entry
              </Button>
            </div>

            {reads.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">Existing Reads</div>
                <div className="space-y-2">
                  {reads.map(r => (
                    <div key={r.id} className={`p-2 rounded-xl border ${editingReadId===r.id ? 'border-indigo-400' : 'border-zinc-200 dark:border-zinc-800'}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          {r.start_date || '-'} → {r.end_date || '-'}
                          {r.rating ? ` · ${r.rating}★` : ''}
                          {r.format ? ` · ${r.format}` : ''}
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="secondary" onClick={() => { setEditingReadId(r.id); setReadData({ start_date: r.start_date || '', end_date: r.end_date || '', rating: r.rating || undefined, review: r.review || '', format: r.format || undefined }) }}>Edit</Button>
                          <Button type="button" variant="secondary" onClick={async () => { if (!confirm('Delete this read entry?')) return; await deleteRead(r.id); const bookId = (formData.id || book?.id) as string; await loadReadData(bookId) }}>Delete</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            {!tauriReady && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Saving is only available in the desktop app window. Close the browser tab and use the LocalReads window opened by "npm run tauri:dev" or the installed app.
              </div>
            )}
            <div className="flex gap-3 items-center">
              <Button
                type="submit"
                onClick={(e)=>handleSubmit(e as any)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2"
              >
              {isLoading ? (
                <>
                  <Spinner size="sm" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {book ? 'Update Book' : 'Add Book'}
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="px-6"
            >
              Cancel
            </Button>
              {statusMsg && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2 whitespace-pre">{statusMsg}</span>
              )}
            </div>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  )
}
