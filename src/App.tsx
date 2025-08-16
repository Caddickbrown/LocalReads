import React, { useEffect, useState } from 'react'
import { Keyboard, Search, ChevronLeft, ChevronRight, ChevronRight as BreadcrumbChevron, Settings as SettingsIcon } from 'lucide-react'
import Library from '@/components/Library'
import Dashboard from '@/components/Dashboard'
import Highlights from '@/components/Highlights'
import Settings from '@/components/Settings'
import NextUp from '@/components/NextUp'
import ReReads from '@/components/ReReads'
import Authors from '@/components/Authors'
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp'
// import UpdateNotification from '@/components/UpdateNotification'
import { useTheme } from '@/hooks/useTheme'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Input, ToastProvider } from '@/components/ui'

// Helper function to detect OS
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

export default function App(){
  const { dark, mode, setMode, extraTheme, setExtraTheme } = useTheme()
  const [view, setView] = useState<'library'|'dashboard'|'highlights'|'nextup'|'rereads'|'authors'>('library')
  const [refresh, setRefresh] = useState(0)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [breadcrumbs, setBreadcrumbs] = useState<{label: string, action?: () => void}[]>([])
  const [contextInfo, setContextInfo] = useState<string>('')

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'l',
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
      action: () => setView('library'),
      description: 'Go to Library'
    },
    {
      key: 'd',
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
      action: () => setView('dashboard'),
      description: 'Go to Dashboard'
    },
    {
      key: 'h',
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
      action: () => setView('highlights'),
      description: 'Go to Gems'
    },
    {
      key: 'a',
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
      action: () => setView('authors'),
      description: 'Go to Authors'
    },

    {
      key: 'u',
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
      action: () => setView('nextup'),
      description: 'Go to Next Up'
    },
    {
      key: 'r',
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
      shiftKey: true,
      action: () => setView('rereads'),
      description: 'Go to Re-reads'
    },
    {
      key: 'n',
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
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
      ...(isMac ? { metaKey: true } : { ctrlKey: true }),
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

  // Update breadcrumbs based on current view and context
  useEffect(() => {
    const crumbs: {label: string, action?: () => void}[] = []
    
    // Add root crumb
    crumbs.push({ label: 'Home', action: () => setView('library') })
    
    // Add current view crumb
    switch (view) {
      case 'library':
        crumbs.push({ label: 'Library' })
        break
      case 'dashboard':
        crumbs.push({ label: 'Dashboard' })
        break
      case 'highlights':
        crumbs.push({ label: 'Gems' })
        break
      case 'authors':
        crumbs.push({ label: 'Authors' })
        break
      case 'nextup':
        crumbs.push({ label: 'Next Up' })
        break
      case 'rereads':
        crumbs.push({ label: 'Re-reads' })
        break
    }
    
    // Add context info if available
    if (contextInfo) {
      crumbs.push({ label: contextInfo })
    }
    
    setBreadcrumbs(crumbs)
  }, [view, contextInfo])

  // Listen for breadcrumb context updates from child components
  useEffect(() => {
    const handleBreadcrumbUpdate = (event: any) => {
      setContextInfo(event.detail || '')
    }
    
    window.addEventListener('update-breadcrumb', handleBreadcrumbUpdate)
    return () => window.removeEventListener('update-breadcrumb', handleBreadcrumbUpdate)
  }, [])

  // Listen for global search clear requests from children
  useEffect(() => {
    const handleClearGlobalSearch = () => setGlobalSearch('')
    window.addEventListener('clear-global-search', handleClearGlobalSearch as EventListener)
    return () => window.removeEventListener('clear-global-search', handleClearGlobalSearch as EventListener)
  }, [])

  // Update breadcrumb context based on global search
  useEffect(() => {
    if (globalSearch && view === 'library') {
      setContextInfo(`Search: "${globalSearch}"`)
    } else if (!globalSearch && contextInfo.startsWith('Search:')) {
      setContextInfo('')
    }
  }, [globalSearch, view, contextInfo])

  return (
    <ToastProvider>
      <div className={`${dark ? 'dark' : ''} ${extraTheme ? `theme-${extraTheme}` : ''}`}>
        <div className="app-container min-h-screen bg-zinc-50 dark:bg-zinc-900">
                  {/* Mobile Navigation */}
          <div className="block sm:hidden">
            {/* Mobile Header with Search and Settings */}
            <div className="p-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 safe-top backdrop-blur supports-[backdrop-filter]:bg-zinc-50/80 dark:supports-[backdrop-filter]:bg-zinc-900/80">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-70"/>
                  <Input 
                    className="pl-9 w-full" 
                    placeholder="Search books..." 
                    value={globalSearch} 
                    onChange={(e:any)=>setGlobalSearch(e.target.value)} 
                  />
                </div>
                
                {/* Settings Button */}
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-xl transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  title="Settings"
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Mobile Content */}
            <div className="mobile-content px-2 pt-2 pb-24 safe-bottom">
              <div className="max-w-7xl mx-auto">
                {view==='library' && <Library onOpenHighlights={()=>setView('highlights')} onOpenDashboard={()=>setView('dashboard')} refreshSignal={refresh} globalSearch={globalSearch} />}
                {view==='dashboard' && <Dashboard onBack={()=>setView('library')} onYearClick={(y)=>{ 
                  console.log('Dashboard onYearClick called with year:', y);
                  setView('library'); 
                  console.log('Dispatching filter-year event with detail:', y);
                  window.dispatchEvent(new CustomEvent('filter-year', { detail: y })); 
                }}/>} 
                {view==='highlights' && <Highlights onBack={()=>setView('library')} />}
                {view==='nextup' && <NextUp onBack={()=>setView('library')} />}
                {view==='rereads' && <ReReads onBack={()=>setView('library')} />}
                {view==='authors' && (
                  <Authors 
                    onBack={()=>setView('library')}
                    onSelectAuthor={(name)=>{ setView('library'); setGlobalSearch(name); }}
                  />
                )}
              </div>
            </div>

            {/* Mobile Navigation Tabs (Fixed) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 gap-1 p-2 bg-white/90 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 backdrop-blur card safe-bottom">
              <NavButton active={view==='library'} onClick={()=>setView('library')} extraTheme={extraTheme} mobile>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">📚</span>
                  <span className="text-xs">Library</span>
                </div>
              </NavButton>
              <NavButton active={view==='dashboard'} onClick={()=>setView('dashboard')} extraTheme={extraTheme} mobile>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">📈</span>
                  <span className="text-xs">Dashboard</span>
                </div>
              </NavButton>
              <NavButton active={view==='highlights'} onClick={()=>setView('highlights')} extraTheme={extraTheme} mobile>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">💎</span>
                  <span className="text-xs">Gems</span>
                </div>
              </NavButton>
              <NavButton active={view==='nextup'} onClick={()=>setView('nextup')} extraTheme={extraTheme} mobile>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">🧭</span>
                  <span className="text-xs">Next Up</span>
                </div>
              </NavButton>
              <NavButton active={view==='rereads'} onClick={()=>setView('rereads')} extraTheme={extraTheme} mobile>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">🔁</span>
                  <span className="text-xs">Re-reads</span>
                </div>
              </NavButton>
            </div>
          </div>

          {/* Desktop Layout with Sidebar */}
          <div className="hidden sm:flex h-screen">
            {/* Sidebar */}
            <div 
              className="relative bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 w-16 overflow-visible group"
              onMouseEnter={() => setSidebarExpanded(true)}
              onMouseLeave={() => setSidebarExpanded(false)}
            >
              {/* Expanded overlay */}
              <div className={`absolute inset-0 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 sidebar-slide z-10 ${
                sidebarExpanded ? 'w-64 shadow-xl' : 'w-16 shadow-none'
              }`}>
                <div className="flex flex-col h-full relative z-20">
                  {/* Sidebar Header */}
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 min-h-[73px] flex items-center">
                    <div className="flex items-center w-full">
                      <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
                        <img src={new URL('../src-tauri/icons/icon.png', import.meta.url).href} alt="LocalReads" className="w-8 h-8 rounded" />
                      </div>
                      <div className={`ml-3 overflow-hidden sidebar-text-slide ${
                        sidebarExpanded ? 'opacity-100 max-w-xs delay-150 transform translate-x-0' : 'opacity-0 max-w-0 delay-0 transform -translate-x-2'
                      }`}>
                        <h1 className="text-heading-2 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">LocalReads</h1>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <nav className="flex-1 p-2 space-y-1">
                  <SidebarButton 
                    active={view==='library'} 
                    onClick={()=>setView('library')} 
                    icon="📚" 
                    label="Library" 
                    expanded={sidebarExpanded}
                    extraTheme={extraTheme}
                  />
                  <SidebarButton 
                    active={view==='dashboard'} 
                    onClick={()=>setView('dashboard')} 
                    icon="📈" 
                    label="Dashboard" 
                    expanded={sidebarExpanded}
                    extraTheme={extraTheme}
                  />
                  <SidebarButton 
                    active={view==='highlights'} 
                    onClick={()=>setView('highlights')} 
                    icon="💎" 
                    label="Gems" 
                    expanded={sidebarExpanded}
                    extraTheme={extraTheme}
                  />
                  <SidebarButton 
                    active={view==='authors'} 
                    onClick={()=>setView('authors')} 
                    icon="👤" 
                    label="Authors" 
                    expanded={sidebarExpanded}
                    extraTheme={extraTheme}
                  />
                  <SidebarButton 
                    active={view==='nextup'} 
                    onClick={()=>setView('nextup')} 
                    icon="🧭" 
                    label="Next Up" 
                    expanded={sidebarExpanded}
                    extraTheme={extraTheme}
                  />
                  <SidebarButton 
                    active={view==='rereads'} 
                    onClick={()=>setView('rereads')} 
                    icon="🔁" 
                    label="Re-reads" 
                    expanded={sidebarExpanded}
                    extraTheme={extraTheme}
                  />

                </nav>

                  {/* Sidebar Footer */}
                  <div className="p-2 border-t border-zinc-200 dark:border-zinc-700">
                    <SidebarButton 
                      active={false}
                      onClick={() => setShowKeyboardHelp(true)} 
                      icon={<Keyboard className="w-5 h-5" />}
                      label="Shortcuts" 
                      expanded={sidebarExpanded}
                      extraTheme={extraTheme}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top Header */}
              <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2">
                    {/* Breadcrumbs */}
                    {breadcrumbs.length > 1 && (
                      <nav className="flex items-center gap-2 text-sm">
                        {breadcrumbs.map((crumb, index) => (
                          <React.Fragment key={index}>
                            {index > 0 && (
                              <BreadcrumbChevron className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                            )}
                            {crumb.action ? (
                              <button
                                onClick={crumb.action}
                                className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                              >
                                {crumb.label}
                              </button>
                            ) : (
                              <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                                {crumb.label}
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </nav>
                    )}
                    
                    {/* Page Title */}
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 capitalize">
                      {view === 'nextup' 
                        ? 'Next Up' 
                        : view === 'rereads' 
                        ? 'Re-reads' 
                        : view === 'highlights' 
                        ? 'Gems' 
                        : view === 'authors'
                        ? 'Authors'
                        : view}
                    </h2>
                  </div>
              
                              {/* Search Input and Settings */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-70"/>
                      <Input 
                        className="pl-9 w-64" 
                        placeholder="Search books..." 
                        value={globalSearch} 
                        onChange={(e:any)=>setGlobalSearch(e.target.value)} 
                      />
                    </div>
                    
                    {/* Settings Button */}
                    <button
                      onClick={() => setShowSettings(true)}
                      className="p-2 rounded-xl transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      title="Settings"
                    >
                      <SettingsIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
            </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4">
                <div className="max-w-7xl mx-auto">
                            {view==='library' && <Library onOpenHighlights={()=>setView('highlights')} onOpenDashboard={()=>setView('dashboard')} refreshSignal={refresh} globalSearch={globalSearch} />}
                  {view==='dashboard' && <Dashboard onBack={()=>setView('library')} onYearClick={(y)=>{ 
                    console.log('Dashboard onYearClick called with year:', y);
                    setView('library'); 
                    console.log('Dispatching filter-year event with detail:', y);
                    window.dispatchEvent(new CustomEvent('filter-year', { detail: y })); 
                  }}/>}
                  {view==='highlights' && <Highlights onBack={()=>setView('library')} />}
                  {view==='nextup' && <NextUp onBack={()=>setView('library')} />}
                  {view==='rereads' && <ReReads onBack={()=>setView('library')} />}
                  {view==='authors' && (
                    <Authors 
                      onBack={()=>setView('library')}
                      onSelectAuthor={(name)=>{ setView('library'); setGlobalSearch(name); }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Auto-update notification */}
        {/* <UpdateNotification /> */}
        
        {/* Keyboard shortcuts help */}
        <KeyboardShortcutsHelp 
          isOpen={showKeyboardHelp} 
          onClose={() => setShowKeyboardHelp(false)} 
        />
        
        {/* Settings modal */}
        {showSettings && (
          <Settings 
            mode={mode} 
            setMode={setMode} 
            extraTheme={extraTheme} 
            setExtraTheme={setExtraTheme} 
            onBack={() => setShowSettings(false)} 
          />
        )}
      </div>
    </ToastProvider>
  )
}

function NavButton({ active, onClick, children, extraTheme, mobile = false }: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  extraTheme: string | null;
  mobile?: boolean;
}) {
  const baseClasses = mobile 
    ? "p-3 rounded-xl font-medium transition-all duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[60px] flex items-center justify-center" 
    : "px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
  
  const activeClasses = active ? 'bg-zinc-100 dark:bg-zinc-800 shadow-sm' : ''
  
  if (active && extraTheme && !mobile) {
    return (
      <button 
        className={`${baseClasses} btn-primary transform hover:scale-105`}
        onClick={onClick}
      >
        {children}
      </button>
    )
  }
  
  return (
    <button 
      className={`${baseClasses} ${activeClasses}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function SidebarButton({ active, onClick, icon, label, expanded, extraTheme }: {
  active: boolean;
  onClick: () => void;
  icon: string | React.ReactNode;
  label: string;
  expanded: boolean;
  extraTheme: string | null;
}) {
  const baseClasses = "w-full flex items-center p-3 rounded-xl font-medium transition-all duration-200 ease-out hover:bg-zinc-100 dark:hover:bg-zinc-700 group"
  const activeClasses = active ? 'bg-zinc-100 dark:bg-zinc-700 shadow-sm' : ''
  
  if (active && extraTheme) {
    return (
      <button 
        className={`${baseClasses} btn-primary transform hover:scale-105`}
        onClick={onClick}
        title={label}
      >
        <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
          {typeof icon === 'string' ? <span className="text-lg">{icon}</span> : icon}
        </div>
        <div className={`ml-3 overflow-hidden sidebar-text-slide ${
          expanded ? 'opacity-100 max-w-xs delay-150 transform translate-x-0' : 'opacity-0 max-w-0 delay-0 transform -translate-x-2'
        }`}>
          <span className="whitespace-nowrap block">
            {label}
          </span>
        </div>
      </button>
    )
  }
  
  return (
    <button 
      className={`${baseClasses} ${activeClasses}`}
      onClick={onClick}
      title={label}
    >
      <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
        {typeof icon === 'string' ? <span className="text-lg">{icon}</span> : icon}
      </div>
      <div className={`ml-3 overflow-hidden sidebar-text-slide ${
        expanded ? 'opacity-100 max-w-xs delay-150 transform translate-x-0' : 'opacity-0 max-w-0 delay-0 transform -translate-x-2'
      }`}>
        <span className="whitespace-nowrap block">
          {label}
        </span>
      </div>
    </button>
  )
}