import { checkUpdate, installUpdate } from '@tauri-apps/api/updater'
import { relaunch } from '@tauri-apps/api/process'

export interface UpdateInfo {
  version: string
  date: string
  body: string
}

export class AutoUpdater {
  private static instance: AutoUpdater
  private updateAvailable: UpdateInfo | null = null
  private isChecking = false

  static getInstance(): AutoUpdater {
    if (!AutoUpdater.instance) {
      AutoUpdater.instance = new AutoUpdater()
    }
    return AutoUpdater.instance
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (this.isChecking) {
      return this.updateAvailable
    }

    try {
      this.isChecking = true
      const update = await checkUpdate()
      
      if (update.available) {
        this.updateAvailable = {
          version: update.manifest?.version || 'Unknown',
          date: update.manifest?.date || new Date().toISOString(),
          body: update.manifest?.body || 'Update available'
        }
        return this.updateAvailable
      }
      
      this.updateAvailable = null
      return null
    } catch (error) {
      console.error('Failed to check for updates:', error)
      return null
    } finally {
      this.isChecking = false
    }
  }

  async installUpdate(): Promise<boolean> {
    if (!this.updateAvailable) {
      return false
    }

    try {
      await installUpdate()
      await relaunch()
      return true
    } catch (error) {
      console.error('Failed to install update:', error)
      return false
    }
  }

  getUpdateInfo(): UpdateInfo | null {
    return this.updateAvailable
  }

  hasUpdate(): boolean {
    return this.updateAvailable !== null
  }
}

export const autoUpdater = AutoUpdater.getInstance()
