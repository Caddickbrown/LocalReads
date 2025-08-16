import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ExtraTheme = 'sepia' | 'forest' | 'ocean' | 'lavender' | 'sunset' | 'neon' | 'candy' | 'mint'

export function useTheme() {
  const getSavedMode = () => (
    (typeof localStorage !== 'undefined' && localStorage.getItem('localreads.themeMode')) as ThemeMode | null
  ) ?? 'system'

  const getSavedExtraTheme = () => (
    (typeof localStorage !== 'undefined' && localStorage.getItem('localreads.extraTheme')) as ExtraTheme | null
  ) ?? null

  const [mode, setMode] = useState<ThemeMode>(getSavedMode)
  const [extraTheme, setExtraTheme] = useState<ExtraTheme | null>(getSavedExtraTheme)
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('localreads.themeMode', mode)
    }
  }, [mode])

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      if (extraTheme) {
        localStorage.setItem('localreads.extraTheme', extraTheme)
      } else {
        localStorage.removeItem('localreads.extraTheme')
      }
    }
  }, [extraTheme])

  const dark = mode === 'dark' ? true : mode === 'light' ? false : systemDark

  return { mode, setMode, dark, extraTheme, setExtraTheme }
}