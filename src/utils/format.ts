export function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return '刚刚'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  const d = new Date(ts)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

export function formatPercent(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`
}

export function byteSize(s: string): number {
  return new Blob([s]).size
}
