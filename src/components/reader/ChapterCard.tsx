import { useState } from 'react'
import { ChevronDown, ChevronUp, RotateCw } from 'lucide-react'
import type { Chapter } from '@/db/types'
import { ChapterMarkdown } from './Markdown'
import { Button } from '../ui/button'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { formatNumber } from '@/utils/format'

interface Props {
  chapter: Chapter
  trailingCount: number // 后续章节数，用于重新生成提示
  onRegenerate: (number: number) => void
  disabled?: boolean
}

export function ChapterCard({ chapter, trailingCount, onRegenerate, disabled }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const totalThis = chapter.promptTokens + chapter.completionTokens
  const hitRate =
    chapter.promptTokens > 0
      ? Math.round((chapter.cacheHitTokens / chapter.promptTokens) * 100)
      : 0

  return (
    <article
      id={`chapter-${chapter.number}`}
      className="rounded-2xl border border-border bg-card px-6 py-7 sm:px-8 sm:py-9 animate-fade-in scroll-mt-14"
      data-chapter-number={chapter.number}
    >
      <ChapterMarkdown content={chapter.content} />

      <div className="mt-8 border-t border-border pt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            生成于 {new Date(chapter.createdAt).toLocaleString('zh-CN')} ·
            本章约 {formatNumber(chapter.content.length)} 字
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="h-7 gap-1 text-xs"
            >
              元信息
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => setConfirmOpen(true)}
              className="h-7 gap-1 text-xs"
            >
              <RotateCw className="h-3 w-3" />
              重新生成
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="mt-3 rounded-md bg-muted px-3 py-2.5 text-xs space-y-1.5">
            <div>
              <span className="text-muted-foreground">创意方向:</span>{' '}
              {chapter.creativeIdea || <em className="text-muted-foreground">(自动续写)</em>}
            </div>
            <div className="text-muted-foreground">
              输入 {formatNumber(chapter.promptTokens)} · 输出{' '}
              {formatNumber(chapter.completionTokens)} · 缓存命中{' '}
              {formatNumber(chapter.cacheHitTokens)} / {formatNumber(chapter.promptTokens)}{' '}
              ({hitRate}%) · 本章总计 {formatNumber(totalThis)}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`重新生成第 ${chapter.number} 章?`}
        description={
          trailingCount > 0
            ? `本操作将先删除当前章之后的 ${trailingCount} 章(后续章节基于旧正文创作)，然后重新生成本章。是否继续?`
            : '将重新生成本章，原有内容会被覆盖。'
        }
        variant="destructive"
        confirmText="重新生成"
        onConfirm={() => onRegenerate(chapter.number)}
      />
    </article>
  )
}
