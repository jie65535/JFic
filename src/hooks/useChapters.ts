import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { db } from '@/db'
import type { Chapter } from '@/db/types'

export function useChapters(bookId: string | undefined) {
  const chapters = useLiveQuery(async () => {
    if (!bookId) return []
    return (await db.chapters
      .where('bookId')
      .equals(bookId)
      .sortBy('number')) as Chapter[]
  }, [bookId])
  return { chapters: chapters ?? [], isLoading: chapters === undefined }
}

export async function chaptersOf(bookId: string): Promise<Chapter[]> {
  return (await db.chapters.where('bookId').equals(bookId).sortBy('number')) as Chapter[]
}

export async function addChapter(c: Omit<Chapter, 'id' | 'createdAt'>): Promise<string> {
  const existing = await db.chapters
    .where('[bookId+number]')
    .equals([c.bookId, c.number])
    .first()
  if (existing) {
    await db.chapters.update(existing.id, { ...c })
    await db.books.update(c.bookId, { updatedAt: Date.now() })
    return existing.id
  }
  const id = nanoid(10)
  await db.chapters.add({ ...c, id, createdAt: Date.now() })
  await db.books.update(c.bookId, { updatedAt: Date.now() })
  return id
}

export async function replaceChapter(
  bookId: string,
  number: number,
  patch: Partial<Chapter>,
): Promise<void> {
  const existing = await db.chapters
    .where('[bookId+number]')
    .equals([bookId, number])
    .first()
  if (!existing) return
  await db.chapters.update(existing.id, patch)
  await db.books.update(bookId, { updatedAt: Date.now() })
}

/** 删除指定章节及其后所有章节(用于重新生成场景) */
export async function truncateChapters(bookId: string, fromNumber: number): Promise<void> {
  await db.transaction('rw', db.chapters, db.books, async () => {
    const toDelete = await db.chapters
      .where('bookId')
      .equals(bookId)
      .and((c) => c.number >= fromNumber)
      .toArray()
    if (toDelete.length === 0) return
    await db.chapters.bulkDelete(toDelete.map((c) => c.id))
    await db.books.update(bookId, { updatedAt: Date.now() })
  })
}
