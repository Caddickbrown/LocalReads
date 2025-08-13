import React, { useState } from 'react'
import { Settings as SettingsIcon, RefreshCw, Download, Upload, FileDown } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Input, Textarea } from './ui'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'

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
import { exportCsvFor, listBooks, exportJson, importJson, exportHighlightsCsv, importHighlightsCsv, databasePath, setDatabasePath } from '@/db/repo'
// import { autoUpdater } from '@/utils/updater'

import { ThemeMode, ExtraTheme } from '@/hooks/useTheme'

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

  const handleCheckUpdate = async () => {
    setIsChecking(true)
    try {
      // const update = await autoUpdater.checkForUpdates()
      // setUpdateInfo(update)
      setUpdateInfo(null) // Temporary
    } catch (error) {
      console.error('Update check failed:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleInstallUpdate = async () => {
    try {
      // await autoUpdater.installUpdate()
      console.log('Update installation would happen here')
    } catch (error) {
      console.error('Update installation failed:', error)
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><SettingsIcon className="w-5 h-5"/> Settings</h2>
          <Button onClick={onBack}>Back to Library</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="text-sm font-medium mb-2">🌗 Dark Mode</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-4">Choose your preferred appearance</div>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
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

                     <div>
             <div className="text-sm font-medium mb-2">🎨 Color Themes</div>
             <div className="text-xs text-gray-600 dark:text-gray-400 mb-4">Choose a beautiful color theme to enhance your reading experience</div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                             <ThemeCard 
                selected={extraTheme === null}
                onClick={() => setExtraTheme(null)}
                title="Default"
                description="Clean and minimal"
                colors={['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe']}
                emoji="⚪"
                themeName="default"
              />
              
              <ThemeCard 
                selected={extraTheme === 'sepia'}
                onClick={() => setExtraTheme('sepia')}
                title="Sepia"
                description="Warm and vintage"
                colors={['#d2691e', '#daa520', '#cd853f', '#deb887']}
                emoji="📜"
                themeName="sepia"
              />
              
              <ThemeCard 
                selected={extraTheme === 'forest'}
                onClick={() => setExtraTheme('forest')}
                title="Forest"
                description="Natural and fresh"
                colors={['#22c55e', '#16a34a', '#15803d', '#166534']}
                emoji="🌲"
                themeName="forest"
              />
              
              <ThemeCard 
                selected={extraTheme === 'ocean'}
                onClick={() => setExtraTheme('ocean')}
                title="Ocean"
                description="Cool and calming"
                colors={['#0ea5e9', '#0284c7', '#0369a1', '#075985']}
                emoji="🌊"
                themeName="ocean"
              />
              
              <ThemeCard 
                selected={extraTheme === 'lavender'}
                onClick={() => setExtraTheme('lavender')}
                title="Lavender"
                description="Elegant and dreamy"
                colors={['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6']}
                emoji="🌸"
                themeName="lavender"
              />
             </div>
           </div>

          <div>
            <div className="text-sm font-medium mb-2">Updates</div>
            <div className="space-y-3">
              <Button 
                onClick={handleCheckUpdate} 
                disabled={isChecking}
                variant="secondary"
                className="flex items-center gap-2"
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
                      className="flex items-center gap-2"
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

          <div>
            <div className="text-sm font-medium mb-2">Database</div>
            <div className="flex items-center gap-2 text-xs">
              <Button
                onClick={async ()=>{
                  const p = await databasePath()
                  setDbPath(p)
                  alert(`Database file: ${p}`)
                }}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4"/> Show DB Path
              </Button>
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
                    const opener = await import('@tauri-apps/plugin-opener')
                    console.log('Opener plugin loaded:', opener)
                    console.log('Available methods:', Object.keys(opener))
                    
                    // Try different possible function names to open the directory
                    if (opener.open) {
                      console.log('Using opener.open to open directory')
                      await opener.open(dirPath)
                    } else if (opener.openPath) {
                      console.log('Using opener.openPath to open directory')
                      await opener.openPath(dirPath)
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
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4"/> Open DB File Location
              </Button>
              <span className="opacity-70 truncate">{dbPath}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Button
                onClick={async ()=>{
                  const p = await open({ multiple: false, directory: false, canCreateDirectories: true, defaultPath: 'localreads.sqlite' })
                  if (p && typeof p === 'string') {
                    await setDatabasePath(p)
                    setDbPath(p)
                    alert(`Database path updated. Will use: ${p}`)
                  }
                }}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4"/> Change DB Location
              </Button>
              <span className="opacity-70">Pick a .sqlite file (existing or new)</span>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Import / Export</div>
            <div className="flex flex-wrap gap-3">
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
                className="flex items-center gap-2"
                disabled={exporting}
              >
                <FileDown className="w-4 h-4"/> {exporting ? 'Exporting…' : 'Export CSV'}
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
                className="flex items-center gap-2"
                disabled={importing}
              >
                <Upload className="w-4 h-4"/> {importing ? 'Importing…' : 'Import CSV'}
              </Button>

              <Button
                onClick={async ()=>{
                  setImporting(true)
                  try {
                    const filePath = await open({ multiple: false, filters: [{ name: 'CSV', extensions: ['csv'] }] })
                    if (!filePath) return
                    const text = await readTextFile(filePath as string)
                    await importHighlightsCsv(text)
                    alert('Highlights import complete')
                  } finally {
                    setImporting(false)
                  }
                }}
                className="flex items-center gap-2"
                disabled={importing}
              >
                <Upload className="w-4 h-4"/> {importing ? 'Importing…' : 'Import Highlights CSV'}
              </Button>

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
                className="flex items-center gap-2"
                disabled={exporting}
              >
                <FileDown className="w-4 h-4"/> {exporting ? 'Exporting…' : 'Export JSON'}
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
                className="flex items-center gap-2"
                disabled={importing}
              >
                <Upload className="w-4 h-4"/> {importing ? 'Importing…' : 'Import JSON'}
              </Button>

              <Button
                onClick={async ()=>{
                  setExporting(true)
                  try {
                    console.log('Starting highlights export...')
                    const csv = await exportHighlightsCsv()
                    console.log('Generated highlights CSV length:', csv.length)
                    const filePath = await save({
                      title: 'Export Highlights CSV',
                      defaultPath: 'highlights.csv',
                      filters: [{ name: 'CSV', extensions: ['csv'] }]
                    })
                    console.log('Selected highlights file path:', filePath)
                    if (filePath) {
                      await writeTextFile(filePath as string, csv)
                      console.log('Highlights file written successfully')
                      alert('Highlights CSV exported successfully!')
                    } else {
                      console.log('No highlights file path selected')
                    }
                  } catch (error) {
                    console.error('Highlights export failed:', error)
                    alert(`Highlights export failed: ${error}`)
                  } finally {
                    setExporting(false)
                  }
                }}
                className="flex items-center gap-2"
                disabled={exporting}
              >
                <FileDown className="w-4 h-4"/> {exporting ? 'Exporting…' : 'Export Highlights CSV'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
      className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-300 ${
        selected
          ? 'bg-white dark:bg-zinc-600 shadow-md text-indigo-600 dark:text-white font-medium border border-indigo-200 dark:border-zinc-500'
          : 'hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 hover:text-gray-800 dark:hover:text-white'
      }`}
      onClick={onClick}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
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
    lavender: { border: '#8b5cf6', bg: '#faf5ff', text: '#2e1065', dot: '#8b5cf6' }
  }
  
  // Define theme-specific colors for selected state - dark mode
  const darkThemeColors = {
    default: { border: '#6366f1', bg: '#1e1b4b', text: '#c7d2fe', dot: '#6366f1' },
    sepia: { border: '#d2691e', bg: '#451a03', text: '#fed7aa', dot: '#d2691e' },
    forest: { border: '#22c55e', bg: '#14532d', text: '#bbf7d0', dot: '#22c55e' },
    ocean: { border: '#0ea5e9', bg: '#0c4a6e', text: '#bae6fd', dot: '#0ea5e9' },
    lavender: { border: '#8b5cf6', bg: '#581c87', text: '#e9d5ff', dot: '#8b5cf6' }
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