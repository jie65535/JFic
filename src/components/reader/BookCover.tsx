import { useState } from 'react'
import { BookText, ChevronDown, ChevronUp, Clock, Hash } from 'lucide-react'
import type { Book, Chapter } from '@/db/types'
import { Progress } from '../ui/progress'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format'
import { estimateContextUsage } from '@/utils/tokenEstimate'
import {
  CONTEXT_WINDOW,
  TOKEN_BAND_GREEN,
  TOKEN_BAND_YELLOW,
  TOKEN_BAND_ORANGE,
} from '@/utils/constants'

interface Props {
  book: Book
  chapters: Chapter[]
}

export function BookCover({ book, chapters }: Props) {
  const [expanded, setExpanded] = useState(false)

  const totalChars = chapters.reduce((a, c) => a + c.content.length, 0)
  const breakdown = estimateContextUsage({
    novelText: book.novelText,
    systemPrompt: book.systemPrompt,
    chapters,
  })
  const ratio = breakdown.total / CONTEXT_WINDOW
  const pct = Math.min(100, ratio * 100)
  const barColor =
    ratio < TOKEN_BAND_GREEN
      ? 'bg-emerald-500'
      : ratio < TOKEN_BAND_YELLOW
        ? 'bg-yellow-500'
        : ratio < TOKEN_BAND_ORANGE
          ? 'bg-orange-500'
          : 'bg-red-500'

  const lastRead = book.lastReadChapter
  const lastReadValid =
    lastRead != null && chapters.some((c) => c.number === lastRead)

  return (
    <article
      id="book-cover"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border px-6 py-8 sm:px-10 sm:py-12',
        'bg-gradient-to-br from-card via-card to-secondary/40',
      )}
    >
      <div className="relative">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">
          JFic · 同人创作
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl font-serif">
          {book.name}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BookText className="h-3.5 w-3.5" />
            原著约 {formatNumber(book.novelText.length)} 字
          </span>
          <span className="inline-flex items-center gap-1">
            <Hash className="h-3.5 w-3.5" />
            {chapters.length} 章 · 已创作 {formatNumber(totalChars)} 字
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            创建于 {new Date(book.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>

        {lastReadValid && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground">
            上次读到 第 {lastRead} 章
          </div>
        )}

        <div className="mt-7 max-w-md space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">上下文窗口</span>
            <span
              className={cn(
                'font-medium',
                ratio >= TOKEN_BAND_ORANGE && 'text-red-500',
              )}
            >
              {pct.toFixed(1)}% · {formatNumber(breakdown.total)} /{' '}
              {formatNumber(CONTEXT_WINDOW)}
            </span>
          </div>
          <Progress value={pct} indicatorClassName={barColor} className="h-1.5" />
        </div>

        <div className="mt-7 border-t border-border/70 pt-4">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="font-medium">灵魂指引 · 系统提示词</span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {expanded ? (
            <div className="mt-3 max-h-[40vh] overflow-y-auto rounded-md bg-background/60 px-3.5 py-3 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground scrollbar-thin">
              {book.systemPrompt}
            </div>
          ) : (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
              {firstParagraph(book.systemPrompt)}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

function firstParagraph(s: string): string {
  const trimmed = s.trim()
  const firstBreak = trimmed.indexOf('\n\n')
  if (firstBreak === -1) return trimmed
  return trimmed.slice(0, firstBreak)
}
