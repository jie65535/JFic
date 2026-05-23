/**
 * 从章节正文 content 中提取标题。
 *
 * 期望格式：首行 `# 第N章 标题文本`
 * 容错顺序：
 *   1. markdown heading + 章节序号前缀(去掉) → 剩余作为 title
 *   2. markdown heading 但无章节序号 → 整段标题文本
 *   3. 首行非 heading → 截断 30 字
 *   4. 无任何首行内容 → `第 N 章`
 */
export function extractChapterTitle(content: string, number: number): string {
  const firstLine = (content.split(/\r?\n/)[0] || '').trim()
  if (!firstLine) return `第 ${number} 章`

  // 去掉 markdown heading 标记 (#, ##, 等)
  const stripHash = firstLine.replace(/^#{1,6}\s*/, '').trim()
  if (!stripHash) return `第 ${number} 章`

  // 尝试去掉 "第N章" 前缀，支持汉字/阿拉伯/罗马数字
  const m = stripHash.match(/^第[一-龥\d零一二三四五六七八九十百千万0-9]+章\s*[:：·\-—]?\s*(.*)$/)
  if (m) {
    const titlePart = m[1].trim()
    return titlePart || `第 ${number} 章`
  }

  // 不符合"第N章"前缀但有 heading，整段当 title(截断)
  return truncate(stripHash, 30)
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, n) + '…'
}
