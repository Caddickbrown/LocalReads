import React, { useEffect, useState } from 'react'
import { X, Save, BookOpen, User, Hash, Tag, Download, Upload } from 'lucide-react'
import type { Book, Read } from '@/types'
import { BOOK_TYPES, STATUSES } from '@/types'
import { upsertBook, upsertRead, setTagsForBook, readsForBook } from '@/db/repo'
import { Input, Textarea, Button, Card, CardHeader, CardContent, Select, ModalBackdrop, Spinner } from './ui'

interface EditDialogProps {
  book?: Book | null
  onClose: () => void
  onSave: () => void
}

export default function EditDialog({ book, onClose, onSave }: EditDialogProps) {
  const [formData, setFormData] = useState<Partial<Book>>({
    title: '',
    author: '',
    series_name: '',
    series_number: null,
    obtained: null,
    type: 'Book',
    status: 'To Read'
  })
  
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [readData, setReadData] = useState<Partial<Read>>({
    start_date: '',
    end_date: '',
    rating: undefined,
    review: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (book) {
      setFormData(book)
      // Load existing read data if book exists
      loadReadData(book.id)
      // Load existing tags
      loadTags(book.id)
    }
  }, [book])

  const loadReadData = async (bookId: string) => {
    try {
      const reads = await readsForBook(bookId)
      if (reads.length > 0) {
        const latestRead = reads[0] // Assuming most recent first
        setReadData({
          start_date: latestRead.start_date || '',
          end_date: latestRead.end_date || '',
          rating: latestRead.rating || undefined,
          review: latestRead.review || ''
        })
      }
    } catch (error) {
      console.error('Error loading read data:', error)
    }
  }

  const loadTags = async (bookId: string) => {
    try {
      // This would need to be implemented in repo.ts
      // For now, we'll handle tags through the form
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const handleInputChange = (field: keyof Book, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

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
    if (!formData.title?.trim() || !formData.author?.trim()) {
      alert('Title and Author are required')
      return
    }

    setIsLoading(true)
    try {
      // Save book
      const bookId = await upsertBook(formData)
      
      // Save tags
      await setTagsForBook(bookId, tags)
      
      // Save read data if we have any
      if (readData.start_date || readData.end_date || readData.rating || readData.review) {
        await upsertRead({
          ...readData,
          book_id: bookId
        })
      }
      
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving book:', error)
      alert('Error saving book. Please try again.')
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                placeholder="Author name"
                required
              />
            </div>
          </div>

          {/* Series Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Series Name</label>
              <Input
                value={formData.series_name || ''}
                onChange={(e) => handleInputChange('series_name', e.target.value)}
                placeholder="Series name (optional)"
              />
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
              <label className="block text-sm font-medium mb-2">Type</label>
              <Select
                value={formData.type || 'Book'}
                onChange={(e) => handleInputChange('type', e.target.value)}
              >
                {BOOK_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </div>
            
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
            
            <div>
              <label className="block text-sm font-medium mb-2">Obtained</label>
              <Select
                value={formData.obtained || ''}
                onChange={(e) => handleInputChange('obtained', e.target.value || null)}
              >
                <option value="">Not specified</option>
                <option value="Owned">Owned</option>
                <option value="Borrowed">Borrowed</option>
                <option value="Library">Library</option>
                <option value="Wishlist">Wishlist</option>
              </Select>
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
            </div>
            
            <div className="mt-4">
              <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Review</label>
              <Textarea
                value={readData.review || ''}
                placeholder="Your thoughts on this book..."
                rows={3}
                onChange={(e) => handleReadChange('review', e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="submit"
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
          </div>
        </form>
      </div>
    </ModalBackdrop>
  )
}
