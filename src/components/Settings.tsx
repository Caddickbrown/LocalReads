import React from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Card, CardHeader, CardContent, Button } from './ui'

export default function Settings({ mode, setMode, onBack }:{ mode:'light'|'dark'|'system', setMode:(m:'light'|'dark'|'system')=>void, onBack:()=>void }){
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><SettingsIcon className="w-5 h-5"/> Settings</h2>
          <Button onClick={onBack}>Back to Library</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium mb-2">Theme</div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" name="theme" checked={mode==='light'} onChange={()=>setMode('light')} /> Light</label>
              <label className="flex items-center gap-2"><input type="radio" name="theme" checked={mode==='dark'} onChange={()=>setMode('dark')} /> Dark</label>
              <label className="flex items-center gap-2"><input type="radio" name="theme" checked={mode==='system'} onChange={()=>setMode('system')} /> System</label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}