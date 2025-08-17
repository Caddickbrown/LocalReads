import React, { useState } from 'react'
import { Settings as SettingsIcon, RefreshCw, Download, Upload, FileDown, X, ListChecks } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Input, Textarea, ModalBackdrop, useToast } from './ui'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'

// App information constants
const APP_INFO = {
  name: 'LocalReads',
  version: '0.6.14', // This will be updated by the release script
  identifier: 'app.localreads',
  buildType: 'Tauri Desktop App',
  database: 'SQLite',
  framework: 'React + TypeScript',
  uiLibrary: 'Tailwind CSS',
  description: 'A personal library management application for tracking your reading journey',
  repository: 'https://github.com/Caddickbrown/LocalReads',
  buildTime: new Date().toISOString().split('T')[0] // Current date as build date
}

// Dynamic import helper for clipboard functionality
const copyToClipboard = async (text: string): Promise<void> => {
  try {
    // @ts-ignore - type definitions may not be available yet
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
    await writeText(text)
  } catch (error) {
    throw new Error(`Failed to copy to clipboard: ${error}`)
  }
}
import { exportCsvFor, listBooks, exportJson, importJson, exportHighlightsCsv, importHighlightsCsv, exportReadsCsv, importReadsCsv, databasePath, setDatabasePath } from '@/db/repo'

  // Template generation functions
const generateBooksCsvTemplate = () => {
  const headers = [
    'title','author','seriesNames','seriesNumbers','obtained','type','status','tags','latestStart','latestEnd','latestRating','latestReview','highlightsCount'
  ]
  return headers.join(',') + '\n'
}

const generateHighlightsCsvTemplate = () => {
  const headers = ['id','book','author','text','created_at','commentary']
  return headers.join(',') + '\n'
}
const generateReadsCsvTemplate = () => {
  const headers = ['id','book_id','title','author','start_date','end_date','rating','review','format','current_page','total_pages','progress_percentage']
  return headers.join(',') + '\n'
}
import { autoUpdater } from '@/utils/updater'

import { ThemeMode, ExtraTheme } from '@/hooks/useTheme'
import { getStoredDatePreference, setStoredDatePreference, StoredDatePreference } from '@/state/storage'

export default function Settings({ 
  mode, 
  setMode, 
  extraTheme, 
  setExtraTheme, 
  onBack 
}: { 
  mode: ThemeMode, 
  setMode: (m: ThemeMode) => void, 
  extraTheme: ExtraTheme | null, 
  setExtraTheme: (t: ExtraTheme | null) => void, 
  onBack: () => void 
}){
  const [isChecking, setIsChecking] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [dbPath, setDbPath] = useState<string>('localreads.sqlite')
  const [datePref, setDatePref] = useState<StoredDatePreference>(getStoredDatePreference())
  const { addToast } = useToast()

  const handleCheckUpdate = async () => {
    setIsChecking(true)
    try {
      const update = await autoUpdater.checkForUpdates()
      if (update) {
        setUpdateInfo(update)
        addToast({
          title: 'Update Available',
          message: `Version ${update.version} is available for download`,
          type: 'info',
          duration: 5000
        })
      } else {
        addToast({
          title: 'Up to Date',
          message: 'You have the latest version installed',
          type: 'success',
          duration: 3000
        })
      }
    } catch (error) {
      console.error('Update check failed:', error)
      addToast({
        title: 'Update Check Failed',
        message: 'Failed to check for updates. Please try again.',
        type: 'error',
        duration: 5000
      })
    } finally {
      setIsChecking(false)
    }
  }

  const handleInstallUpdate = async () => {
    try {
      addToast({
        title: 'Installing Update',
        message: 'Downloading and installing the update...',
        type: 'info',
        duration: Infinity
      })
      
      await autoUpdater.installUpdate()
      
      // Note: The app will restart after installation, so this toast won't be visible
      // But we'll show it briefly in case there's a delay
      addToast({
        title: 'Update Installed',
        message: 'The app will restart with the new version',
        type: 'success',
        duration: 2000
      })
    } catch (error) {
      console.error('Update installation failed:', error)
      addToast({
        title: 'Installation Failed',
        message: 'Failed to install the update. Please try again.',
        type: 'error',
        duration: 5000
      })
    }
  }

  // Settings-specific keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'e',
      ctrlKey: true,
      action: async () => {
        // Quick export library CSV
        setExporting(true)
        try {
          const rows = await listBooks()
          const csv = await exportCsvFor(rows as any)
          const filePath = await save({
            title: 'Export Library CSV',
            defaultPath: 'localreads.csv',
            filters: [{ name: 'CSV', extensions: ['csv'] }]
          })
          if (filePath) {
            await writeTextFile(filePath as string, csv)
            alert('Library CSV exported successfully!')
          }
        } catch (error) {
          alert(`Export failed: ${error}`)
        } finally {
          setExporting(false)
        }
      },
      description: 'Quick Export Library CSV'
    }
  ], [])

  return (
    <ModalBackdrop onClick={onBack}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-indigo-600" />
            <h2 className="text-heading-2">Settings</h2>
          </div>
          <Button variant="ghost" onClick={onBack} className="p-2">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="overflow-y-auto max-h-[75vh]">
          <Card className="border-0 rounded-none shadow-none">
      <CardContent>
        <div className="space-y-8">
          {/* Theme Settings */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🌗</span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Appearance</h3>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Choose your preferred appearance and color scheme</div>
            
            {/* Dark Mode */}
            <div className="mb-6">
              <div className="text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">Theme Mode</div>
              <div className="flex gap-1 p-0.5 bg-zinc-100 dark:bg-gray-800 rounded-lg overflow-hidden w-fit">
                <ModeButton
                  selected={mode === 'light'}
                  onClick={() => setMode('light')}
                  icon="☀️"
                  label="Light"
                />
                <ModeButton
                  selected={mode === 'dark'}
                  onClick={() => setMode('dark')}
                  icon="🌙"
                  label="Dark"
                />
                <ModeButton
                  selected={mode === 'system'}
                  onClick={() => setMode('system')}
                  icon="💻"
                  label="System"
                />
              </div>
            </div>

            {/* Color Themes */}
            <div>
              <div className="text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">Color Themes</div>
              <div className="flex flex-wrap gap-1 p-0.5 bg-zinc-100 dark:bg-gray-800 rounded-lg w-fit">
                <ThemeButton
                  selected={extraTheme === null}
                  onClick={() => setExtraTheme(null)}
                  emoji="⚪"
                  label="Default"
                  colors={['#6366f1', '#818cf8']}
                />
                <ThemeButton
                  selected={extraTheme === 'sepia'}
                  onClick={() => setExtraTheme('sepia')}
                  emoji="📜"
                  label="Sepia"
                  colors={['#d2691e', '#daa520']}
                />
                <ThemeButton
                  selected={extraTheme === 'forest'}
                  onClick={() => setExtraTheme('forest')}
                  emoji="🌲"
                  label="Forest"
                  colors={['#22c55e', '#16a34a']}
                />
                <ThemeButton
                  selected={extraTheme === 'ocean'}
                  onClick={() => setExtraTheme('ocean')}
                  emoji="🌊"
                  label="Ocean"
                  colors={['#0ea5e9', '#0284c7']}
                />
                <ThemeButton
                  selected={extraTheme === 'lavender'}
                  onClick={() => setExtraTheme('lavender')}
                  emoji="🌸"
                  label="Lavender"
                  colors={['#8b5cf6', '#7c3aed']}
                />
                <ThemeButton
                  selected={extraTheme === 'sunset'}
                  onClick={() => setExtraTheme('sunset')}
                  emoji="🌅"
                  label="Sunset"
                  colors={['#f97316', '#fb7185']}
                />
                <ThemeButton
                  selected={extraTheme === 'neon'}
                  onClick={() => setExtraTheme('neon')}
                  emoji="⚡"
                  label="Neon"
                  colors={['#22d3ee', '#a78bfa']}
                />
                <ThemeButton
                  selected={extraTheme === 'candy'}
                  onClick={() => setExtraTheme('candy')}
                  emoji="🍬"
                  label="Candy"
                  colors={['#ec4899', '#f472b6']}
                />
                <ThemeButton
                  selected={extraTheme === 'mint'}
                  onClick={() => setExtraTheme('mint')}
                  emoji="🌿"
                  label="Mint"
                  colors={['#2dd4bf', '#34d399']}
                />
              </div>
            </div>
          </div>

          {/* Date Format Settings */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📅</span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Date Format</h3>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Used when importing CSVs to interpret ambiguous dates</div>
            <div className="flex gap-1 p-0.5 bg-zinc-100 dark:bg-gray-800 rounded-lg overflow-hidden w-fit">
              {([
                { key: 'auto', label: 'Auto' },
                { key: 'YMD', label: 'YYYY-MM-DD' },
                { key: 'MDY', label: 'MM/DD/YYYY' },
                { key: 'DMY', label: 'DD/MM/YYYY' }
              ] as Array<{ key: StoredDatePreference, label: string }>).map((opt)=> (
                <DateFormatButton
                  key={opt.key}
                  selected={datePref === opt.key}
                  onClick={()=>{ setDatePref(opt.key); setStoredDatePreference(opt.key) }}
                  icon="📆"
                  label={opt.label}
                />
              ))}
            </div>
          </div>

          {/* Updates Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔄</span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Updates</h3>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Check for and install application updates</div>
            <div className="space-y-3">
              <Button 
                onClick={handleCheckUpdate} 
                disabled={isChecking}
                variant="secondary"
                className="flex items-center gap-2 w-40"
              >
                {isChecking ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isChecking ? 'Checking...' : 'Check for Updates'}
              </Button>
              
              {updateInfo && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Update Available: v{updateInfo.version}
                    </span>
                    <Button 
                      onClick={handleInstallUpdate}
                      size="sm"
                      className="flex items-center gap-2 w-24"
                    >
                      <Download className="w-4 h-4" />
                      Install
                    </Button>
                  </div>
                  {updateInfo.body && (
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {updateInfo.body}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Database Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🗄️</span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Database</h3>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Manage your database location and settings</div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <Button
                  onClick={async ()=>{
                    const p = await databasePath()
                    setDbPath(p)
                    alert(`Database file: ${p}`)
                  }}
                  className="flex items-center gap-2 w-32"
                >
                  <Download className="w-4 h-4"/> Show DB Path
                </Button>
                <span className="opacity-70 truncate">{dbPath}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Button
                  onClick={async ()=>{
                    const p = await databasePath()
                    if (!p) {
                      alert('Error: Could not determine database path. This might indicate a configuration issue.')
                      return
                    }
                    
                    // Extract directory path from the database file path
                    const dirPath = p.substring(0, p.lastIndexOf('/'))
                    console.log('Database file path:', p)
                    console.log('Attempting to open directory:', dirPath)
                    
                    try {
                      // Try to open the directory containing the database file using the opener plugin
                      // @ts-ignore - type definitions may not be available yet
                      const opener = await import('@tauri-apps/plugin-opener')
                      console.log('Opener plugin loaded:', opener)
                      const anyOpener: any = opener as any
                      console.log('Available methods:', Object.keys(anyOpener))
                      
                      // Try different possible function names to open the directory
                      if (typeof anyOpener.open === 'function') {
                        console.log('Using opener.open to open directory')
                        await anyOpener.open(dirPath)
                      } else if (typeof anyOpener.openPath === 'function') {
                        console.log('Using opener.openPath to open directory')
                        await anyOpener.openPath(dirPath)
                      } else {
                        throw new Error('No suitable open function found in opener plugin')
                      }
                      console.log('Directory opened successfully')
                    } catch (openError: any) {
                      console.error('Failed to open file location:', openError)
                      
                      // Determine the specific error reason
                      let errorReason = 'Unknown error'
                      let suggestion = 'Try opening the path manually in your file manager.'
                      
                      if (openError?.message) {
                        const errorMsg = openError.message.toLowerCase()
                        
                        if (errorMsg.includes('permission') || errorMsg.includes('access')) {
                          errorReason = 'Permission denied - insufficient file system permissions'
                          suggestion = 'Check if the app has permission to access files, or try running as administrator.'
                        } else if (errorMsg.includes('not found') || errorMsg.includes('no such file')) {
                          errorReason = 'Database file or directory does not exist'
                          suggestion = 'The database may not have been created yet. Try adding a book first.'
                        } else if (errorMsg.includes('opener') || errorMsg.includes('plugin')) {
                          errorReason = 'File opener plugin not available or not working'
                          suggestion = 'This feature requires the desktop app. Make sure you are not using the web version.'
                        } else if (errorMsg.includes('platform') || errorMsg.includes('unsupported')) {
                          errorReason = 'Opening files not supported on this platform'
                          suggestion = 'Your operating system may not support automatic file opening.'
                        } else {
                          errorReason = `System error: ${openError.message}`
                        }
                      } else if (typeof openError === 'string') {
                        errorReason = openError
                      }
                      
                      // Fallback: copy directory path to clipboard
                      try {
                        await copyToClipboard(dirPath)
                        alert(`❌ Cannot Open File Location\n\nReason: ${errorReason}\n\nSuggestion: ${suggestion}\n\n✅ Database directory path copied to clipboard:\n${dirPath}\n\nYou can paste this path into your file manager to navigate there manually. The database file "${p.split('/').pop()}" will be in that directory.`)
                      } catch (clipboardError: any) {
                        console.error('Failed to copy to clipboard:', clipboardError)
                        
                        let clipboardErrorReason = 'Unknown clipboard error'
                        if (clipboardError?.message) {
                          if (clipboardError.message.includes('permission')) {
                            clipboardErrorReason = 'No permission to access clipboard'
                          } else if (clipboardError.message.includes('plugin')) {
                            clipboardErrorReason = 'Clipboard plugin not available'
                          } else {
                            clipboardErrorReason = clipboardError.message
                          }
                        }
                        
                        alert(`❌ Cannot Open File Location\n\nReason: ${errorReason}\n\nSuggestion: ${suggestion}\n\n❌ Also failed to copy to clipboard\nClipboard Error: ${clipboardErrorReason}\n\n📁 Database directory path (copy manually):\n${dirPath}\n\n📄 Database file: ${p.split('/').pop()}`)
                      }
                    }
                  }}
                  className="flex items-center gap-2 w-40"
                >
                  <Download className="w-4 h-4"/> Open DB File Location
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Button
                  onClick={async ()=>{
                    const p = await open({ multiple: false, directory: false, canCreateDirectories: true, defaultPath: 'localreads.sqlite' })
                    if (p && typeof p === 'string') {
                      await setDatabasePath(p)
                      setDbPath(p)
                      alert(`Database path updated. Will use: ${p}`)
                    }
                  }}
                  className="flex items-center gap-2 w-40"
                >
                  <Download className="w-4 h-4"/> Change DB Location
                </Button>
                <span className="opacity-70">Pick a .sqlite file (existing or new)</span>
              </div>
            </div>
          </div>

          {/* Import/Export Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📥📤</span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Import & Export</h3>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Manage your data with CSV and JSON formats</div>
            
            {/* Books Section */}
            <div className="mb-6">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                <span className="text-base">📚</span>
                Books & Library
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={async ()=>{
                    setExporting(true)
                    try {
                      console.log('Starting library export...')
                      const rows = await listBooks()
                      console.log('Got rows:', rows.length)
                      const csv = await exportCsvFor(rows as any)
                      console.log('Generated CSV length:', csv.length)
                      const filePath = await save({
                        title: 'Export Library CSV',
                        defaultPath: 'localreads.csv',
                        filters: [{ name: 'CSV', extensions: ['csv'] }]
                      })
                      console.log('Selected file path:', filePath)
                      if (filePath) {
                        await writeTextFile(filePath as string, csv)
                        console.log('File written successfully')
                        alert('Library CSV exported successfully!')
                      } else {
                        console.log('No file path selected')
                      }
                    } catch (error) {
                      console.error('Export failed:', error)
                      alert(`Export failed: ${error}`)
                    } finally {
                      setExporting(false)
                    }
                  }}
                  className="flex items-center gap-1 justify-center text-xs w-28"
                  size="sm"
                  disabled={exporting}
                >
                  <FileDown className="w-3 h-3"/> {exporting ? 'Exporting…' : 'Export CSV'}
                </Button>
                <Button
                  onClick={async ()=>{
                    setImporting(true)
                    try {
                      const filePath = await open({ multiple: false, filters: [{ name: 'CSV', extensions: ['csv'] }] })
                      if (!filePath) return
                      const text = await readTextFile(filePath as string)
                      const { importCsv } = await import('@/db/repo')
                      await importCsv(text)
                      alert('Library CSV import complete')
                    } finally {
                      setImporting(false)
                    }
                  }}
                  className="flex items-center gap-1 justify-center text-xs w-28"
                  size="sm"
                  disabled={importing}
                >
                  <Upload className="w-3 h-3"/> {importing ? 'Importing…' : 'Import CSV'}
                </Button>
                <Button
                  onClick={async ()=>{
                    try {
                      const template = generateBooksCsvTemplate()
                      const filePath = await save({
                        title: 'Save Books CSV Template',
                        defaultPath: 'books_template.csv',
                        filters: [{ name: 'CSV', extensions: ['csv'] }]
                      })
                      if (filePath) {
                        await writeTextFile(filePath as string, template)
                        alert('Books CSV template saved successfully!\n\nThe template includes these columns:\ntitle, author, seriesName, seriesNumber, seriesNames, seriesNumbers, obtained, type, status, tags, latestStart, latestEnd, latestRating, latestReview, highlightsCount')
                      }
                    } catch (error) {
                      alert(`Template export failed: ${error}`)
                    }
                  }}
                  className="flex items-center gap-1 justify-center text-xs w-28"
                  size="sm"
                  variant="secondary"
                >
                  <FileDown className="w-3 h-3"/> Template
                </Button>
              </div>
            </div>

            {/* Gems Section */}
            <div className="mb-6">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                <span className="text-base">✨</span>
                Gems
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={async ()=>{
                    setExporting(true)
                    try {
                      console.log('Starting gems export...')
                      const csv = await exportHighlightsCsv()
                      console.log('Generated gems CSV length:', csv.length)
                      const filePath = await save({
                        title: 'Export Gems CSV',
                        defaultPath: 'gems.csv',
                        filters: [{ name: 'CSV', extensions: ['csv'] }]
                      })
                      console.log('Selected gems file path:', filePath)
                      if (filePath) {
                        await writeTextFile(filePath as string, csv)
                        console.log('Gems file written successfully')
                        alert('Gems CSV exported successfully!')
                      } else {
                        console.log('No gems file path selected')
                      }
                    } catch (error) {
                      console.error('Gems export failed:', error)
                      alert(`Gems export failed: ${error}`)
                    } finally {
                      setExporting(false)
                    }
                  }}
                  className="flex items-center gap-1 justify-center text-xs w-28"
                  size="sm"
                  disabled={exporting}
                >
                  <FileDown className="w-3 h-3"/> {exporting ? 'Exporting…' : 'Export CSV'}
                </Button>
                <Button
                  onClick={async ()=>{
                    setImporting(true)
                    try {
                      const filePath = await open({ multiple: false, filters: [{ name: 'CSV', extensions: ['csv'] }] })
                      if (!filePath) return
                      const text = await readTextFile(filePath as string)
                      await importHighlightsCsv(text)
                      alert('Gems import complete')
                    } finally {
                      setImporting(false)
                    }
                  }}
                  className="flex items-center gap-1 justify-center text-xs w-28"
                  size="sm"
                  disabled={importing}
                >
                  <Upload className="w-3 h-3"/> {importing ? 'Importing…' : 'Import CSV'}
                </Button>
                <Button
                  onClick={async ()=>{
                    try {
                      const template = generateHighlightsCsvTemplate()
                      const filePath = await save({
                        title: 'Save Gems CSV Template',
                        defaultPath: 'gems_template.csv',
                        filters: [{ name: 'CSV', extensions: ['csv'] }]
                      })
                      if (filePath) {
                        await writeTextFile(filePath as string, template)
                        alert('Gems CSV template saved successfully!\n\nThe template includes these columns:\nid, book, author, text, created_at, commentary')
                      }
                    } catch (error) {
                      alert(`Template export failed: ${error}`)
                    }
                  }}
                  className="flex items-center gap-1 justify-center text-xs w-28"
                  size="sm"
                  variant="secondary"
                >
                  <FileDown className="w-3 h-3"/> Template
                </Button>
              </div>
            </div>

            {/* Reads Section */}
            <div className="mb-6">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                <span className="text-base">📖</span>
                Reads
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={async ()=>{
                    setExporting(true)
                    try {
                      const csv = await exportReadsCsv()
                      const filePath = await save({
                        title: 'Export Reads CSV',
                        defaultPath: 'reads.csv',
                        filters: [{ name: 'CSV', extensions: ['csv'] }]
                      })
                      if (filePath) {
                        await writeTextFile(filePath as string, csv)
                        alert('Reads CSV exported successfully!')
                      }
                    } catch (error) {
                      alert(`Reads export failed: ${error}`)
                    } finally {
                      setExporting(false)
                    }
                  }}
                  className="flex items-center gap-1 justify-center text-xs w-28"
                  size="sm"
                  disabled={exporting}
                >
                  <FileDown className="w-3 h-3"/> {exporting ? 'Exporting…' : 'Export CSV'}
                </Button>
                <Button
                  onClick={async ()=>{
                    setImporting(true)
                    try {
                      const filePath = await open({ multiple: false, filters: [{ name: 'CSV', extensions: ['csv'] }] })
                      if (!filePath) return
                      const text = await readTextFile(filePath as string)
                      await importReadsCsv(text)
                      alert('Reads CSV import complete')
                    } finally {
                      setImporting(false)
                    }
                  }}
                  className="flex items-center gap-1 justify-center text-xs w-28"
                  size="sm"
                  disabled={importing}
                >
                  <Upload className="w-3 h-3"/> {importing ? 'Importing…' : 'Import CSV'}
                </Button>
                <Button
                  onClick={async ()=>{
                    try {
                      const template = generateReadsCsvTemplate()
                      const filePath = await save({
                        title: 'Save Reads CSV Template',
                        defaultPath: 'reads_template.csv',
                        filters: [{ name: 'CSV', extensions: ['csv'] }]
                      })
                      if (filePath) {
                        await writeTextFile(filePath as string, template)
                        alert('Reads CSV template saved successfully!\n\nColumns:\nid, book_id, title, author, start_date, end_date, rating, review, format, current_page, total_pages, progress_percentage')
                      }
                    } catch (error) {
                      alert(`Template export failed: ${error}`)
                    }
                  }}
                  className="flex items-center gap-1 justify-center text-xs w-28"
                  size="sm"
                  variant="secondary"
                >
                  <FileDown className="w-3 h-3"/> Template
                </Button>
              </div>
            </div>

            {/* Full Data Backup Section */}
            <div className="mb-4">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                <span className="text-base">💾</span>
                Full Data Backup (JSON)
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={async ()=>{
                    setExporting(true)
                    try {
                      console.log('Starting JSON export...')
                      const json = await exportJson()
                      console.log('Generated JSON length:', json.length)
                      const filePath = await save({
                        title: 'Export Full JSON',
                        defaultPath: 'localreads.json',
                        filters: [{ name: 'JSON', extensions: ['json'] }]
                      })
                      console.log('Selected JSON file path:', filePath)
                      if (filePath) {
                        await writeTextFile(filePath as string, json)
                        console.log('JSON file written successfully')
                        alert('JSON exported successfully!')
                      } else {
                        console.log('No JSON file path selected')
                      }
                    } catch (error) {
                      console.error('JSON export failed:', error)
                      alert(`JSON export failed: ${error}`)
                    } finally {
                      setExporting(false)
                    }
                  }}
                  className="flex items-center gap-1 justify-center text-xs w-28"
                  size="sm"
                  disabled={exporting}
                >
                  <FileDown className="w-3 h-3"/> {exporting ? 'Exporting…' : 'Export Backup'}
                </Button>
                <Button
                  onClick={async ()=>{
                    setImporting(true)
                    try {
                      const filePath = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] })
                      if (!filePath) return
                      const text = await readTextFile(filePath as string)
                      await importJson(text)
                      alert('JSON import complete')
                    } finally {
                      setImporting(false)
                    }
                  }}
                  className="flex items-center gap-1 justify-center text-xs w-28"
                  size="sm"
                  disabled={importing}
                >
                  <Upload className="w-3 h-3"/> {importing ? 'Importing…' : 'Restore Backup'}
                </Button>
              </div>
            </div>
          </div>

          {/* Data Cleanup Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🧹</span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Data Cleanup</h3>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Find and resolve data inconsistencies</div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  onBack()
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('show-duplicates'))
                  }, 50)
                }}
                className="flex items-center gap-1 justify-center text-xs w-28"
                size="sm"
              >
                <ListChecks className="w-3 h-3"/> Find Duplicates
              </Button>
              <Button
                onClick={() => {
                  onBack()
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('show-non-compliant'))
                  }, 50)
                }}
                className="flex items-center gap-1 justify-center text-xs w-32"
                size="sm"
              >
                <ListChecks className="w-3 h-3"/> Find Non-Compliant
              </Button>
            </div>
          </div>

          {/* App Information */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">ℹ️</span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">App Information</h3>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Version details and application information</div>
            
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-3">
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">{APP_INFO.description}</p>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">App Name</span>
                <span className="text-sm text-zinc-900 dark:text-zinc-100">{APP_INFO.name}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">App ID</span>
                <span className="text-sm text-zinc-900 dark:text-zinc-100 font-mono">{APP_INFO.identifier}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Version</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-900 dark:text-zinc-100">{APP_INFO.version}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        const versionInfo = `${APP_INFO.name} v${APP_INFO.version}\nApp ID: ${APP_INFO.identifier}\nBuild: ${APP_INFO.buildType}\nDatabase: ${APP_INFO.database}\nFramework: ${APP_INFO.framework}\nUI: ${APP_INFO.uiLibrary}\nBuild Date: ${APP_INFO.buildTime}`
                        await copyToClipboard(versionInfo)
                        addToast({
                          title: 'Copied!',
                          message: 'Complete app information copied to clipboard',
                          type: 'success',
                          duration: 2000
                        })
                      } catch (error) {
                        addToast({
                          title: 'Copy Failed',
                          message: 'Failed to copy version information',
                          type: 'error',
                          duration: 3000
                        })
                      }
                    }}
                    className="p-1 h-6 w-6 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    title="Copy complete app info"
                  >
                    📋
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Build Date</span>
                <span className="text-sm text-zinc-900 dark:text-zinc-100">{APP_INFO.buildTime}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Build Type</span>
                <span className="text-sm text-zinc-900 dark:text-zinc-100">{APP_INFO.buildType}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Database</span>
                <span className="text-sm text-zinc-900 dark:text-zinc-100">{APP_INFO.database}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Framework</span>
                <span className="text-sm text-zinc-900 dark:text-zinc-100">{APP_INFO.framework}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">UI Library</span>
                <span className="text-sm text-zinc-900 dark:text-zinc-100">{APP_INFO.uiLibrary}</span>
              </div>
              
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Update Status</span>
                  <div className="flex items-center gap-2">
                    {updateInfo ? (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                        Update Available
                      </span>
                    ) : (
                      <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded-full">
                        Up to Date
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Repository</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      // Open repository in default browser
                      if (typeof window !== 'undefined' && 'open' in window) {
                        window.open(APP_INFO.repository, '_blank')
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                    title="Open repository"
                  >
                    GitHub ↗
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
        </div>
      </div>
    </ModalBackdrop>
  )
}

function ModeButton({ selected, onClick, icon, label }: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      className={`flex flex-col items-center gap-1 p-2 rounded-md transition-all duration-300 min-w-20 max-w-20 flex-shrink-0 settings-button-fixed ${
        selected
          ? 'bg-white dark:bg-zinc-600 shadow-md text-indigo-600 dark:text-white font-medium border border-indigo-200 dark:border-zinc-500'
          : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-white'
      }`}
      style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}
      onClick={onClick}
    >
      <span className="text-sm">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

function DateFormatButton({ selected, onClick, icon, label }: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      className={`flex flex-col items-center gap-1 p-2 rounded-md transition-all duration-300 min-w-24 max-w-24 flex-shrink-0 date-format-button-fixed ${
        selected
          ? 'bg-white dark:bg-zinc-600 shadow-md text-indigo-600 dark:text-white font-medium border border-indigo-200 dark:border-zinc-500'
          : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-white'
      }`}
      style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}
      onClick={onClick}
    >
      <span className="text-sm">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

function ThemeButton({ selected, onClick, emoji, label, colors }: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  colors: string[];
}) {
  return (
    <button
      className={`flex flex-col items-center gap-1 p-2 rounded-md transition-all duration-300 min-w-20 max-w-20 flex-shrink-0 settings-button-fixed ${
        selected
          ? 'bg-white dark:bg-zinc-600 shadow-md text-indigo-600 dark:text-white font-medium border border-indigo-200 dark:border-zinc-500'
          : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-white'
      }`}
      style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}
      onClick={onClick}
    >
      <span className="text-sm">{emoji}</span>
      <div className="flex gap-0.5 mb-0.5">
        {colors.map((color, index) => (
          <div
            key={index}
            className="w-1.5 h-1.5 rounded-full border border-white dark:border-zinc-800"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </button>
  )
}

function ThemeCard({ selected, onClick, title, description, colors, emoji, themeName }: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  colors: string[];
  emoji: string;
  themeName: string;
}) {
  // Check if we're in dark mode
  const isDarkMode = document.documentElement.classList.contains('dark')
  
  // Define theme-specific colors for selected state - light mode
  const lightThemeColors = {
    default: { border: '#6366f1', bg: '#f0f9ff', text: '#1e40af', dot: '#6366f1' },
    sepia: { border: '#d2691e', bg: '#fef7ed', text: '#451a03', dot: '#d2691e' },
    forest: { border: '#22c55e', bg: '#f0fdf4', text: '#052e16', dot: '#22c55e' },
    ocean: { border: '#0ea5e9', bg: '#f0f9ff', text: '#0c2340', dot: '#0ea5e9' },
    lavender: { border: '#8b5cf6', bg: '#faf5ff', text: '#2e1065', dot: '#8b5cf6' },
    sunset: { border: '#f97316', bg: '#fff7ed', text: '#7c2d12', dot: '#f97316' },
    neon: { border: '#22d3ee', bg: '#f8fbff', text: '#0b1020', dot: '#22d3ee' },
    candy: { border: '#ec4899', bg: '#fff1f7', text: '#831843', dot: '#ec4899' },
    mint: { border: '#2dd4bf', bg: '#f0fdfa', text: '#064e3b', dot: '#2dd4bf' }
  }
  
  // Define theme-specific colors for selected state - dark mode
  const darkThemeColors = {
    default: { border: '#6366f1', bg: '#1e1b4b', text: '#c7d2fe', dot: '#6366f1' },
    sepia: { border: '#d2691e', bg: '#451a03', text: '#fed7aa', dot: '#d2691e' },
    forest: { border: '#22c55e', bg: '#14532d', text: '#bbf7d0', dot: '#22c55e' },
    ocean: { border: '#0ea5e9', bg: '#0c4a6e', text: '#bae6fd', dot: '#0ea5e9' },
    lavender: { border: '#8b5cf6', bg: '#581c87', text: '#e9d5ff', dot: '#8b5cf6' },
    sunset: { border: '#ea580c', bg: '#140f0e', text: '#ffe4e6', dot: '#ea580c' },
    neon: { border: '#06b6d4', bg: '#0b0f19', text: '#e0f2fe', dot: '#06b6d4' },
    candy: { border: '#db2777', bg: '#160f15', text: '#fce7f3', dot: '#db2777' },
    mint: { border: '#14b8a6', bg: '#0c1412', text: '#d1fae5', dot: '#14b8a6' }
  }
  
  const themeColors = isDarkMode ? darkThemeColors : lightThemeColors
  const theme = themeColors[themeName as keyof typeof themeColors] || themeColors.default
  
  return (
    <div
      className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 hover:scale-105 ${
        selected
          ? `shadow-lg dark:shadow-xl`
          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
      }`}
      style={selected ? {
        borderColor: theme.border,
        boxShadow: `0 10px 25px -3px ${theme.border}20, 0 4px 6px -2px ${theme.border}10`
      } : {}}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <div className="font-semibold text-sm text-zinc-900 dark:text-white">
            {title}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-300">
            {description}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        {colors.map((color, index) => (
          <div
            key={index}
            className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-800 shadow-md transition-transform hover:scale-110"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {selected && (
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-900 dark:text-white">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: theme.dot }}
          ></div>
          Active Theme
        </div>
      )}
    </div>
  )
}