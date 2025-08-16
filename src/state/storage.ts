export type StoredDatePreference = 'auto' | 'YMD' | 'MDY' | 'DMY'

const KEY = 'localreads.datePreference'

export function getStoredDatePreference(): StoredDatePreference {
  if (typeof localStorage === 'undefined') return 'auto'
  const v = localStorage.getItem(KEY) as StoredDatePreference | null
  return v || 'auto'
}

export function setStoredDatePreference(pref: StoredDatePreference): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(KEY, pref)
}

