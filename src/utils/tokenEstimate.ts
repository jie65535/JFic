/**
 * 中文友好的 token 估算：
 *   chineseChars × 1.5 + otherChars × 0.3
 * 中文范围按 Unicode 一(U+4E00) ~ 鿿(U+9FFF) 判定。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  let zh = 0
  let other = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0x4e00 && code <= 0x9fff) zh++
    else other++
  }
  return Math.ceil(zh * 1.5 + other * 0.3)
}

/** 一次消息结构粗略开销(role 字段、分隔等) */
export const MSG_STRUCT_OVERHEAD = 8

export interface TokenBreakdown {
  novelTokens: number
  systemTokens: number
  chaptersTokens: number
  overhead: number
  total: number
}

export function estimateContextUsage(opts: {
  novelText: string
  systemPrompt: string
  chapters: { content: string; creativeIdea: string }[]
}): TokenBreakdown {
  const novelTokens = estimateTokens(opts.novelText)
  const systemTokens = estimateTokens(opts.systemPrompt)
  let chaptersTokens = 0
  for (const c of opts.chapters) {
    chaptersTokens += estimateTokens(c.content) + estimateTokens(c.creativeIdea)
  }
  // 每章 2 条消息(user + assistant) + 第 1 章用户消息含原著
  const overhead = MSG_STRUCT_OVERHEAD * (1 + opts.chapters.length * 2)
  const total = novelTokens + systemTokens + chaptersTokens + overhead
  return { novelTokens, systemTokens, chaptersTokens, overhead, total }
}
