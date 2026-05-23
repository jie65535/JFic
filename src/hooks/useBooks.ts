import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { db } from '@/db'
import type { Book } from '@/db/types'

export function useBooks() {
  const books = useLiveQuery(
    async () => (await db.books.orderBy('updatedAt').reverse().toArray()) as Book[],
    [],
  )
  return { books: books ?? [], isLoading: books === undefined }
}

export function useBook(id: string | undefined) {
  const book = useLiveQuery(async () => {
    if (!id) return null
    return (await db.books.get(id)) ?? null
  }, [id])
  return { book: book as Book | null | undefined, isLoading: book === undefined }
}

export async function createBook(opts: {
  name: string
  novelText: string
  systemPrompt: string
}): Promise<string> {
  const now = Date.now()
  const id = nanoid(10)
  await db.books.add({
    id,
    name: opts.name,
    novelText: opts.novelText,
    systemPrompt: opts.systemPrompt,
    createdAt: now,
    updatedAt: now,
  })
  return id
}

export async function updateBook(id: string, patch: Partial<Book>): Promise<void> {
  await db.books.update(id, { ...patch, updatedAt: Date.now() })
}

/** 仅更新 lastReadChapter,不刷新 updatedAt(避免书架排序被频繁滚动扰动) */
export async function saveReadingPosition(id: string, chapterNumber: number): Promise<void> {
  await db.books.update(id, { lastReadChapter: chapterNumber })
}

export async function deleteBook(id: string): Promise<void> {
  await db.transaction('rw', db.books, db.chapters, async () => {
    await db.chapters.where('bookId').equals(id).delete()
    await db.books.delete(id)
  })
}
