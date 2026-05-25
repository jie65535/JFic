import Dexie, { type Table } from 'dexie'
import type { Book, Chapter, Config } from './types'

class JFicDB extends Dexie {
  config!: Table<Config, string>
  books!: Table<Book, string>
  chapters!: Table<Chapter, string>

  constructor() {
    super('jfic')
    this.version(1).stores({
      config: 'id',
      books: 'id, updatedAt, createdAt',
      chapters: 'id, bookId, [bookId+number], number, createdAt',
    })
  }
}

export const db = new JFicDB()

export async function getConfig(): Promise<Config | undefined> {
  return db.config.get('global')
}

export async function saveConfig(patch: Partial<Omit<Config, 'id'>>): Promise<void> {
  const cur = await db.config.get('global')
  const next: Config = {
    id: 'global',
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    model: 'deepseek-v4-pro',
    theme: 'system',
    thinking: true,
    reasoningEffort: 'high',
    ...cur,
    ...patch,
  }
  await db.config.put(next)
}
