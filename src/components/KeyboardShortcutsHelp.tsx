import React from 'react'
import { X, Keyboard } from 'lucide-react'
import { Button, ModalBackdrop } from './ui'

interface KeyboardShortcut {
  key: string
  description: string
  category: string
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation
  { key: 'Ctrl+L', description: 'Go to Library', category: 'Navigation' },
  { key: 'Ctrl+D', description: 'Go to Dashboard', category: 'Navigation' },
  { key: 'Ctrl+H', description: 'Go to Highlights', category: 'Navigation' },
  { key: 'Ctrl+S', description: 'Go to Settings', category: 'Navigation' },
  
  // Actions
  { key: 'Ctrl+N', description: 'Add New Book', category: 'Actions' },
  { key: 'Ctrl+R', description: 'Refresh Library', category: 'Actions' },
  { key: 'Ctrl+E', description: 'Export Library CSV (in Settings)', category: 'Actions' },
  
  // Search & Filters
  { key: '/', description: 'Focus Search', category: 'Search & Filters' },
  { key: 'F', description: 'Focus Search (in Library)', category: 'Search & Filters' },
  { key: 'C', description: 'Clear All Filters', category: 'Search & Filters' },
  { key: 'Esc', description: 'Clear Filters & Escape', category: 'Search & Filters' },
  
  // Quick Filters
  { key: '1', description: 'Show To Read Books', category: 'Quick Filters' },
  { key: '2', description: 'Show Currently Reading', category: 'Quick Filters' },
  { key: '3', description: 'Show Finished Books', category: 'Quick Filters' },
  { key: '4', description: 'Show Books from This Year', category: 'Quick Filters' },
  
  // General
  { key: '?', description: 'Show/Hide Keyboard Shortcuts', category: 'General' },
]

export default function KeyboardShortcutsHelp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  const categories = Array.from(new Set(shortcuts.map(s => s.category)))

  return (
    <ModalBackdrop onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          </div>
          <Button variant="ghost" onClick={onClose} className="p-2">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map(category => (
              <div key={category}>
                <h3 className="font-semibold text-sm mb-3 text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts
                    .filter(shortcut => shortcut.category === category)
                    .map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between group">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                          {shortcut.description}
                        </span>
                        <kbd className="px-2 py-1 text-xs font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded shadow-sm">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <strong>💡 Tip:</strong> Keyboard shortcuts work when you're not actively typing in input fields. 
              Use <kbd className="px-1 bg-zinc-200 dark:bg-zinc-700 rounded text-xs">Esc</kbd> to blur inputs and then use shortcuts.
            </p>
          </div>
        </div>
      </div>
    </ModalBackdrop>
  )
}
