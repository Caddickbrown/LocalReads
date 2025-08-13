// Optional: These imports are only available in the Tauri runtime.
// To avoid hard failures in web builds, resolve them dynamically at runtime.
let checkUpdate: any
let installUpdate: any
let relaunch: any

async function loadTauriUpdater() {
  if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return false
  try {
    // @ts-ignore - runtime loaded
    const updater = await import('@tauri-apps/api/updater')
    // @ts-ignore - runtime loaded
    const processApi = await import('@tauri-apps/api/process')
    checkUpdate = updater.checkUpdate
    installUpdate = updater.installUpdate
    relaunch = processApi.relaunch
    return true
  } catch {
    return false
  }
}

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
      const ready = await loadTauriUpdater()
      if (!ready) {
        return null
      }
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
      const ready = await loadTauriUpdater()
      if (!ready) return false
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
