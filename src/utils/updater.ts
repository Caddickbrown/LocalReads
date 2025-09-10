// Optional: These imports are only available in the Tauri runtime.
// To avoid hard failures in web builds, resolve them dynamically at runtime.
let checkUpdate: any
let installUpdate: any

async function loadTauriUpdater() {
  console.log('🔍 Loading Tauri updater...')
  console.log('Window available:', typeof window !== 'undefined')
  console.log('Tauri internals available:', !!(window as any).__TAURI_INTERNALS__)
  
  if (typeof window === 'undefined') {
    console.log('❌ Window not available')
    return false
  }
  
  if (!(window as any).__TAURI_INTERNALS__) {
    console.log('❌ Tauri internals not available')
    return false
  }
  
  try {
    // @ts-ignore - runtime loaded
    const updater = await import('@tauri-apps/plugin-updater')
    console.log('✅ Updater plugin loaded:', updater)
    console.log('Available functions:', Object.keys(updater))
    checkUpdate = updater.checkUpdate
    installUpdate = updater.installUpdate
    return true
  } catch (error) {
    console.error('❌ Failed to load updater plugin:', error)
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
    console.log('🔄 Starting update check...')
    
    if (this.isChecking) {
      console.log('⚠️ Update check already in progress')
      return this.updateAvailable
    }

    try {
      this.isChecking = true
      console.log('🔧 Loading Tauri updater...')
      const ready = await loadTauriUpdater()
      if (!ready) {
        console.log('❌ Tauri updater not available')
        return null
      }
      
      console.log('🔍 Calling checkUpdate()...')
      const update = await checkUpdate()
      console.log('📊 Update check result:', update)
      
      if (update.available) {
        this.updateAvailable = {
          version: update.manifest?.version || 'Unknown',
          date: update.manifest?.date || new Date().toISOString(),
          body: update.manifest?.body || 'Update available'
        }
        console.log('✅ Update available:', this.updateAvailable)
        return this.updateAvailable
      }
      
      this.updateAvailable = null
      console.log('ℹ️ No updates available')
      return null
    } catch (error) {
      console.error('❌ Failed to check for updates:', error)
      return null
    } finally {
      this.isChecking = false
    }
  }

  async installUpdate(): Promise<boolean> {
    if (!this.updateAvailable) {
      console.log('❌ No update available to install')
      return false
    }

    try {
      const ready = await loadTauriUpdater()
      if (!ready) return false
      
      console.log('📥 Installing update...')
      await installUpdate()
      console.log('✅ Update installed successfully')
      // Note: In Tauri 2.0, the app will automatically restart after update installation
      return true
    } catch (error) {
      console.error('❌ Failed to install update:', error)
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
