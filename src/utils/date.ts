export type DatePreference = 'auto' | 'YMD' | 'MDY' | 'DMY'

const monthNames: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
}

function pad2(n: number): string { return String(n).padStart(2, '0') }

function isValidYmd(yyyy: number, mm: number, dd: number): boolean {
  if (yyyy < 1000 || yyyy > 9999) return false
  if (mm < 1 || mm > 12) return false
  if (dd < 1 || dd > 31) return false
  // Basic month/day validation
  const thirtyDay = new Set([4, 6, 9, 11])
  if (thirtyDay.has(mm) && dd > 30) return false
  if (mm === 2) {
    const leap = (yyyy % 4 === 0 && (yyyy % 100 !== 0 || yyyy % 400 === 0))
    if (dd > (leap ? 29 : 28)) return false
  }
  return true
}

function normalizeYmd(yyyy: number, mm: number, dd: number): string | null {
  if (!isValidYmd(yyyy, mm, dd)) return null
  return `${yyyy}-${pad2(mm)}-${pad2(dd)}`
}

function parseTwoDigitYear(y: number): number {
  if (y >= 100) return y
  // 70-99 => 1900s, 00-69 => 2000s
  return y >= 70 ? 1900 + y : 2000 + y
}

/**
 * Parse an arbitrary date string into canonical YYYY-MM-DD or return null if not parseable.
 * Pref disambiguates ambiguous day/month orders when both are <= 12.
 */
export function parseToIsoDate(input: string | null | undefined, pref: DatePreference = 'auto'): string | null {
  if (!input) return null
  const s = String(input).trim()
  if (!s) return null

  // Already ISO date or datetime
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/)
  if (isoMatch) {
    const yyyy = Number(isoMatch[1])
    const mm = Number(isoMatch[2])
    const dd = Number(isoMatch[3])
    return normalizeYmd(yyyy, mm, dd)
  }

  // Y/M/D with separators
  const ymdMatch = s.match(/^\s*(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})\s*$/)
  if (ymdMatch) {
    const yyyy = Number(ymdMatch[1])
    const mm = Number(ymdMatch[2])
    const dd = Number(ymdMatch[3])
    return normalizeYmd(yyyy, mm, dd)
  }

  // D/M/Y or M/D/Y with separators
  const dmyOrMdy = s.match(/^\s*(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\s*$/)
  if (dmyOrMdy) {
    const a = Number(dmyOrMdy[1])
    const b = Number(dmyOrMdy[2])
    let y = Number(dmyOrMdy[3])
    y = parseTwoDigitYear(y)
    // Heuristics: if one part > 12 it's the day
    let day: number, month: number
    if (a > 12 && b <= 12) { day = a; month = b }
    else if (b > 12 && a <= 12) { day = b; month = a }
    else {
      // Ambiguous; use preference
      const mode = pref === 'auto' ? 'MDY' : pref
      if (mode === 'DMY') { day = a; month = b }
      else { month = a; day = b }
    }
    return normalizeYmd(y, month, day)
  }

  // Month name formats: 31 Jan 2024, Jan 31, 2024, 2024 Jan 31
  const words = s.replace(/,/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length >= 3) {
    const lower = words.map(w => w.toLowerCase())
    const monthIdx = lower.findIndex(w => monthNames[w] != null)
    if (monthIdx >= 0) {
      const m = monthNames[lower[monthIdx]]
      // Try to identify year and day from the remaining tokens
      const nums = lower.map(w => Number(w)).map(n => (Number.isFinite(n) ? Number(n) : NaN))
      const yearIdx = nums.findIndex(n => Number.isFinite(n) && (n >= 70 || n >= 1000))
      if (yearIdx >= 0) {
        let yyyy = nums[yearIdx]
        if (yyyy < 100) yyyy = parseTwoDigitYear(yyyy)
        // Day is the other numeric token that's 1..31 and not the year
        let dd = NaN
        for (let i = 0; i < nums.length; i++) {
          if (i === yearIdx) continue
          const n = nums[i]
          if (Number.isFinite(n) && n >= 1 && n <= 31) { dd = n; break }
        }
        if (Number.isFinite(dd)) return normalizeYmd(yyyy, m, Number(dd))
      }
    }
  }

  // Fallback: let Date try to parse, then format if valid and stable
  const dt = new Date(s)
  if (!isNaN(dt.getTime())) {
    const yyyy = dt.getFullYear()
    const mm = dt.getMonth() + 1
    const dd = dt.getDate()
    return normalizeYmd(yyyy, mm, dd)
  }

  return null
}


