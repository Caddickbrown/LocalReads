export function useTheme() {
    const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('localreads.themeMode')) as 'light'|'dark'|'system'|null
    let mode: 'light'|'dark'|'system' = saved ?? 'system'
    const dark = mode === 'dark' ? true : mode === 'light' ? false : !!mql && mql.matches
    function setMode(m: 'light'|'dark'|'system'){
      localStorage.setItem('localreads.themeMode', m)
      location.reload() // simplest persistence for now; in-app toggling can be added
    }
    return { mode, setMode, dark }
  }