import React, { useEffect, useState } from 'react'
import { Keyboard } from 'lucide-react'
import Library from '@/components/Library'
import Dashboard from '@/components/Dashboard'
import Highlights from '@/components/Highlights'
import Settings from '@/components/Settings'
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp'
// import UpdateNotification from '@/components/UpdateNotification'
import { useTheme } from '@/hooks/useTheme'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export default function App(){
  const { dark, mode, setMode, extraTheme, setExtraTheme } = useTheme()
  const [view, setView] = useState<'library'|'dashboard'|'highlights'|'settings'>('library')
  const [refresh, setRefresh] = useState(0)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'l',
      ctrlKey: true,
      action: () => setView('library'),
      description: 'Go to Library'
    },
    {
      key: 'd',
      ctrlKey: true,
      action: () => setView('dashboard'),
      description: 'Go to Dashboard'
    },
    {
      key: 'h',
      ctrlKey: true,
      action: () => setView('highlights'),
      description: 'Go to Highlights'
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => setView('settings'),
      description: 'Go to Settings'
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        setView('library')
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('add-book'))
        }, 100)
      },
      description: 'Add New Book'
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => {
        setRefresh(prev => prev + 1)
        window.dispatchEvent(new CustomEvent('refresh-library'))
      },
      description: 'Refresh Library'
    },
    {
      key: '/',
      action: () => {
        setView('library')
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
          if (searchInput) {
            searchInput.focus()
            searchInput.select()
          }
        }, 100)
      },
      description: 'Focus Search'
    },
    {
      key: '?',
      action: () => setShowKeyboardHelp(prev => !prev),
      description: 'Show/Hide Keyboard Shortcuts'
    }
  ], [view, refresh])

  return (
    <div className={`${dark ? 'dark' : ''} ${extraTheme ? `theme-${extraTheme}` : ''}`}>
      <div className="app-container">
        <div className="max-w-7xl mx-auto p-4 space-y-3">
          <div className="flex gap-2 p-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 card">
            <NavButton active={view==='library'} onClick={()=>setView('library')} extraTheme={extraTheme}>
              📚 Library
            </NavButton>
            <NavButton active={view==='dashboard'} onClick={()=>setView('dashboard')} extraTheme={extraTheme}>
              📊 Dashboard
            </NavButton>
            <NavButton active={view==='highlights'} onClick={()=>setView('highlights')} extraTheme={extraTheme}>
              ✨ Highlights
            </NavButton>
            <NavButton active={view==='settings'} onClick={()=>setView('settings')} extraTheme={extraTheme}>
              ⚙️ Settings
            </NavButton>
            
            {/* Keyboard shortcuts indicator */}
            <button
              onClick={() => setShowKeyboardHelp(true)}
              className="ml-auto px-3 py-2 rounded-xl transition-all duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 group"
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {view==='library' && <Library onOpenHighlights={()=>setView('highlights')} onOpenDashboard={()=>setView('dashboard')} refreshSignal={refresh} />}
          {view==='dashboard' && <Dashboard onBack={()=>setView('library')} onYearClick={(y)=>{ setView('library'); window.dispatchEvent(new CustomEvent('filter-year', { detail: y })); }}/>}
          {view==='highlights' && <Highlights onBack={()=>setView('library')} />}
          {view==='settings' && <Settings mode={mode} setMode={setMode} extraTheme={extraTheme} setExtraTheme={setExtraTheme} onBack={()=>setView('library')} />}
        </div>
      </div>
      
      {/* Auto-update notification */}
      {/* <UpdateNotification /> */}
      
      {/* Keyboard shortcuts help */}
      <KeyboardShortcutsHelp 
        isOpen={showKeyboardHelp} 
        onClose={() => setShowKeyboardHelp(false)} 
      />
    </div>
  )
}

function NavButton({ active, onClick, children, extraTheme }: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  extraTheme: string | null;
}) {
  if (active && extraTheme) {
    return (
      <button 
        className="px-4 py-2 rounded-xl font-medium transition-all duration-300 btn-primary transform hover:scale-105"
        onClick={onClick}
      >
        {children}
      </button>
    )
  }
  
  return (
    <button 
      className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
        active ? 'bg-zinc-100 dark:bg-zinc-800 shadow-sm' : ''
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}