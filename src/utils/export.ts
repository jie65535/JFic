import type { Book, Chapter } from '@/db/types'

/** 导出全部章节为 .txt 文件并触发下载 */
export function exportChaptersAsTxt(book: Book, chapters: Chapter[]) {
  const lines: string[] = []
  lines.push(book.name)
  lines.push('')
  for (const c of chapters) {
    // content 首行已是 # 第N章 标题，导出时去掉 # 号
    const content = c.content.replace(/^#+\s*/, '')
    lines.push(content.trim())
    lines.push('')
    lines.push('')
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(book.name)}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || 'book'
}
