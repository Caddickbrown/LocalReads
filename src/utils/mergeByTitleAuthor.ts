import type { Book } from '@/types'
export function mergeTitleAuthorKey(a: Pick<Book,'title'|'author'>) {
  return `${a.title.trim().toLowerCase()}|${a.author.trim().toLowerCase()}`
}