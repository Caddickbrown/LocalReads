import React, { useState } from 'react'
import { Settings as SettingsIcon, RefreshCw, Download } from 'lucide-react'
import { Card, CardHeader, CardContent, Button } from './ui'
// import { autoUpdater } from '@/utils/updater'

export default function Settings({ mode, setMode, onBack }:{ mode:'light'|'dark'|'system', setMode:(m:'light'|'dark'|'system')=>void, onBack:()=>void }){
  const [isChecking, setIsChecking] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<any>(null)

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
            <div className="text-sm font-medium mb-2">Theme</div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" name="theme" checked={mode==='light'} onChange={()=>setMode('light')} /> Light</label>
              <label className="flex items-center gap-2"><input type="radio" name="theme" checked={mode==='dark'} onChange={()=>setMode('dark')} /> Dark</label>
              <label className="flex items-center gap-2"><input type="radio" name="theme" checked={mode==='system'} onChange={()=>setMode('system')} /> System</label>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Updates</div>
            <div className="space-y-3">
              <Button 
                onClick={handleCheckUpdate} 
                disabled={isChecking}
                variant="outline"
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
        </div>
      </CardContent>
    </Card>
  )
}