import React, { useEffect, useState } from 'react'
import { Download, X, RefreshCw } from 'lucide-react'
import { autoUpdater, UpdateInfo } from '@/utils/updater'

interface UpdateNotificationProps {
  onClose?: () => void
}

export default function UpdateNotification({ onClose }: UpdateNotificationProps) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const checkUpdates = async () => {
      const update = await autoUpdater.checkForUpdates()
      if (update) {
        setUpdateInfo(update)
        setIsVisible(true)
      }
    }

    // Check for updates on mount
    checkUpdates()

    // Check for updates every hour
    const interval = setInterval(checkUpdates, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await autoUpdater.installUpdate()
    } catch (error) {
      console.error('Update failed:', error)
      setIsInstalling(false)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible || !updateInfo) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Update Available
              </h3>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              Version {updateInfo.version} is available
            </p>
            {updateInfo.body && (
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                {updateInfo.body}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-md transition-colors"
              >
                {isInstalling ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isInstalling ? 'Installing...' : 'Install Update'}
              </button>
              <button
                onClick={handleClose}
                className="px-3 py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm rounded-md transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="ml-2 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
