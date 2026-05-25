export type ThemePref = 'light' | 'dark' | 'system'

export interface Config {
  id: 'global'
  baseUrl: string
  apiKey: string
  model: string
  theme: ThemePref
  /** DeepSeek 思考模式开关。关闭后直接出文，可能更"听话"但准确性下降 */
  thinking: boolean
  /** 思考强度，仅在 thinking=true 时生效。high 是服务端默认，max 让模型思考更久 */
  reasoningEffort: 'high' | 'max'
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
  /** 上次阅读到的段落在该章节内的索引(以 markdown 顶层块为单位:p/h1/ul/...) */
  lastReadParagraph?: number
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
