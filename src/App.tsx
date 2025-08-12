import React, { useEffect, useState } from 'react'
import Library from '@/components/Library'
import Dashboard from '@/components/Dashboard'
import Highlights from '@/components/Highlights'
import Settings from '@/components/Settings'
// import UpdateNotification from '@/components/UpdateNotification'
import { useTheme } from '@/hooks/useTheme'

export default function App(){
  const { dark, mode, setMode } = useTheme()
  const [view, setView] = useState<'library'|'dashboard'|'highlights'|'settings'>('library')
  const [refresh, setRefresh] = useState(0)

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="max-w-7xl mx-auto p-4 space-y-3">
          <div className="flex gap-2">
            <button className={`px-3 py-2 rounded-xl border ${view==='library'?'bg-zinc-100 dark:bg-zinc-900':''}`} onClick={()=>setView('library')}>Library</button>
            <button className={`px-3 py-2 rounded-xl border ${view==='dashboard'?'bg-zinc-100 dark:bg-zinc-900':''}`} onClick={()=>setView('dashboard')}>Dashboard</button>
            <button className={`px-3 py-2 rounded-xl border ${view==='highlights'?'bg-zinc-100 dark:bg-zinc-900':''}`} onClick={()=>setView('highlights')}>Highlights</button>
            <button className={`px-3 py-2 rounded-xl border ${view==='settings'?'bg-zinc-100 dark:bg-zinc-900':''}`} onClick={()=>setView('settings')}>Settings</button>
          </div>

          {view==='library' && <Library onOpenHighlights={()=>setView('highlights')} onOpenDashboard={()=>setView('dashboard')} refreshSignal={refresh} />}
          {view==='dashboard' && <Dashboard onBack={()=>setView('library')} onYearClick={(y)=>{ setView('library'); window.dispatchEvent(new CustomEvent('filter-year', { detail: y })); }}/>}
          {view==='highlights' && <Highlights onBack={()=>setView('library')} />}
          {view==='settings' && <Settings mode={mode} setMode={setMode} onBack={()=>setView('library')} />}
        </div>
      </div>
      
      {/* Auto-update notification */}
      {/* <UpdateNotification /> */}
    </div>
  )
}