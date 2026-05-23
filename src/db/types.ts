export type ThemePref = 'light' | 'dark' | 'system'

export interface Config {
  id: 'global'
  baseUrl: string
  apiKey: string
  model: string
  theme: ThemePref
}

export interface Book {
  id: string
  name: string
  novelText: string
  systemPrompt: string
  createdAt: number
  updatedAt: number
  /** 上次阅读到的章节序号,用于刷新后恢复滚动位置 */
  lastReadChapter?: number
}

export interface Chapter {
  id: string
  bookId: string
  number: number
  title: string
  content: string
  creativeIdea: string
  promptTokens: number
  completionTokens: number
  cacheHitTokens: number
  cacheMissTokens: number
  createdAt: number
}
