import { Link } from 'react-router-dom'
import { ArrowLeft, Download, Settings, BookOpen } from 'lucide-react'
import type { Book, Chapter } from '@/db/types'
import { Button } from '../ui/button'
import { ThemeToggle } from '../ThemeToggle'
import { TokenBar } from './TokenBar'
import { StatusIndicator } from './StatusIndicator'
import { cn } from '@/utils/cn'
import { estimateContextUsage } from '@/utils/tokenEstimate'
import { formatNumber, formatPercent } from '@/utils/format'
import type { GenerationState } from '@/hooks/useGeneration'

interface Props {
  book: Book
  chapters: Chapter[]
  activeNumber: number | null
  generation: GenerationState
  onJump: (number: number) => void
  onExport: () => void
}

export function ReaderSidebar({
  book,
  chapters,
  activeNumber,
  generation,
  onJump,
  onExport,
}: Props) {
  const breakdown = estimateContextUsage({
    novelText: book.novelText,
    systemPrompt: book.systemPrompt,
    chapters,
  })

  const totalPromptTokens = chapters.reduce((a, c) => a + c.promptTokens, 0)
  const totalCompletionTokens = chapters.reduce((a, c) => a + c.completionTokens, 0)
  const totalCacheHitTokens = chapters.reduce((a, c) => a + c.cacheHitTokens, 0)
  const totalApiTokens = totalPromptTokens + totalCompletionTokens
  const cacheHitRate = totalPromptTokens > 0 ? totalCacheHitTokens / totalPromptTokens : 0

  return (
    <aside className="flex h-full w-full flex-col bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="icon" aria-label="返回">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold tracking-tight">{book.name}</h2>
          </div>
          <ThemeToggle />
        </div>
        <div className="mt-3">
          <StatusIndicator
            status={generation.status}
            streamingNumber={generation.streamingNumber}
            lastNumber={chapters[chapters.length - 1]?.number ?? 0}
            errorMessage={generation.errorMessage}
          />
        </div>
      </div>

      <div className="border-b border-border px-4 py-3 space-y-3">
        <TokenBar breakdown={breakdown} />
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          实际消耗 {formatNumber(totalApiTokens)} · 缓存命中{' '}
          {formatPercent(cacheHitRate)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" /> 章节目录 · {chapters.length}
          </div>
          {chapters.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground/80">尚无章节</p>
          ) : (
            <ul className="space-y-0.5">
              {chapters.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => onJump(c.number)}
                    className={cn(
                      'w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                      'hover:bg-accent',
                      activeNumber === c.number &&
                        'bg-accent text-accent-foreground font-medium',
                    )}
                  >
                    <span className="text-muted-foreground mr-1.5">第 {c.number} 章</span>
                    <span className="line-clamp-1">{c.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-border px-2 py-2 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          disabled={chapters.length === 0}
          className="flex-1 justify-start gap-2 text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          导出 .txt
        </Button>
        <Link to={`/book/${book.id}/settings`} className="flex-1">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs">
            <Settings className="h-3.5 w-3.5" />
            书籍设置
          </Button>
        </Link>
      </div>
    </aside>
  )
}
