import type { Book } from '@/types'
export function mergeTitleAuthorKey(a: Pick<Book,'title'|'author'>) {
  const normalizeAuthors = (authors: string) => {
    return authors
      .split(/[;,]/) // support ';' or ',' separated authors
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join(';')
  }
  return `${a.title.trim().toLowerCase()}|${normalizeAuthors(a.author || '')}`
}