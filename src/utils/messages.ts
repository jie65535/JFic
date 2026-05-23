import type { Chapter } from '@/db/types'
import { buildFirstChapterUserMessage, buildNextChapterUserMessage } from './constants'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 从源数据(systemPrompt + novelText + chapters) 纯函数式重建 messages。
 *
 * - chapters 应按 number 升序传入
 * - 重建结果与之前完全一致(逐字节)，确保服务端 KV Cache 命中
 */
export function buildMessages(opts: {
  systemPrompt: string
  novelText: string
  chapters: Chapter[]
}): ChatMessage[] {
  const { systemPrompt, novelText, chapters } = opts
  const msgs: ChatMessage[] = []
  msgs.push({ role: 'system', content: systemPrompt })

  if (chapters.length === 0) return msgs

  // 第 1 章
  const first = chapters[0]
  msgs.push({
    role: 'user',
    content: buildFirstChapterUserMessage(novelText, first.creativeIdea),
  })
  msgs.push({ role: 'assistant', content: first.content })

  // 第 2 章及以后
  for (let i = 1; i < chapters.length; i++) {
    const ch = chapters[i]
    msgs.push({
      role: 'user',
      content: buildNextChapterUserMessage(ch.number, ch.creativeIdea),
    })
    msgs.push({ role: 'assistant', content: ch.content })
  }
  return msgs
}

/**
 * 为生成下一章准备 messages（包含 user 消息但不含尚未生成的 assistant）。
 *
 * @param nextNumber 即将生成的章节序号
 * @param creativeIdea 用户输入的创意方向（允许为空，构造函数内部会替换）
 */
export function buildMessagesForGeneration(opts: {
  systemPrompt: string
  novelText: string
  priorChapters: Chapter[] // 不含正在生成的这一章
  nextNumber: number
  creativeIdea: string
}): ChatMessage[] {
  const msgs = buildMessages({
    systemPrompt: opts.systemPrompt,
    novelText: opts.novelText,
    chapters: opts.priorChapters,
  })

  if (opts.nextNumber === 1) {
    msgs.push({
      role: 'user',
      content: buildFirstChapterUserMessage(opts.novelText, opts.creativeIdea),
    })
  } else {
    msgs.push({
      role: 'user',
      content: buildNextChapterUserMessage(opts.nextNumber, opts.creativeIdea),
    })
  }
  return msgs
}
