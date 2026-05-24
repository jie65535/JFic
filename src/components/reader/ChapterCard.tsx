import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, RotateCw, Sparkles, Square } from 'lucide-react'
import type { Chapter } from '@/db/types'
import { ChapterMarkdown } from './Markdown'
import { Button } from '../ui/button'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { formatNumber } from '@/utils/format'
import { AUTO_CREATIVE_IDEA } from '@/utils/constants'
import { cn } from '@/utils/cn'

interface Props {
  chapter: Chapter
  /** 后续章节数,用于重新生成确认框文案 */
  trailingCount: number
  onRegenerate: (number: number) => void
  disabled?: boolean
  /** true 时显示 placeholder,等外部切回 false 才挂载 markdown */
  lazy?: boolean
  /** 本章正在流式生成:头部换 spinner + 停止按钮,隐藏元信息/重新生成 */
  streaming?: boolean
  onAbort?: () => void
  streamingCreativeIdea?: string
}

// 故意略低估真实高度,这样 placeholder → 实化时章节只可能撑高文档,
// 不会让总高度减小触发 scrollTop 被 clamp。挂载后 minHeight 释放。
function estimateHeight(chars: number): number {
  return Math.ceil(chars / 38) * 28 + 120
}

export function ChapterCard({
  chapter,
  trailingCount,
  onRegenerate,
  disabled,
  lazy = true,
  streaming,
  onAbort,
  streamingCreativeIdea,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // 一旦渲染过就常驻 DOM,不再回 placeholder——避免来回切换抖动,也避免段落锚点
  // 在用户滚走后失效。流式中的章节由外部保证 lazy=false。
  const [rendered, setRendered] = useState(!lazy || !!streaming)

  useEffect(() => {
    if ((!lazy || streaming) && !rendered) setRendered(true)
  }, [lazy, streaming, rendered])

  const totalThis = chapter.promptTokens + chapter.completionTokens
  const hitRate =
    chapter.promptTokens > 0
      ? Math.round((chapter.cacheHitTokens / chapter.promptTokens) * 100)
      : 0

  const hasContent = chapter.content.trim().length > 0
  const ideaText = (streamingCreativeIdea ?? '').trim()
  const ideaForShow = ideaText || AUTO_CREATIVE_IDEA
  const isAutoIdea = ideaText.length === 0

  return (
    <article
      id={`chapter-${chapter.number}`}
      className={cn(
        'rounded-2xl bg-card px-6 py-7 sm:px-8 sm:py-9 animate-fade-in scroll-mt-14',
        streaming ? 'border-2 border-primary/30' : 'border border-border',
      )}
      data-chapter-number={chapter.number}
      style={!rendered ? { minHeight: estimateHeight(chapter.content.length) } : undefined}
    >
      {streaming && (
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-primary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          正在创作第 {chapter.number} 章…
          {onAbort && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 gap-1 text-xs text-destructive hover:bg-destructive/10"
              onClick={onAbort}
            >
              <Square className="h-3 w-3 fill-current" />
              停止
            </Button>
          )}
        </div>
      )}

      {rendered ? (
        streaming && !hasContent ? (
          <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3.5 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <div className="text-sm leading-relaxed">
                <span className="text-muted-foreground">
                  {isAutoIdea ? '正在自动续写,创意方向:' : '正在以此创意创作:'}
                </span>
                <p className="mt-1 text-foreground italic">"{ideaForShow}"</p>
              </div>
            </div>
          </div>
        ) : (
          <ChapterMarkdown content={chapter.content} />
        )
      ) : (
        <div className="text-xs text-muted-foreground/40 select-none pointer-events-none">
          第 {chapter.number} 章 · {chapter.title}
        </div>
      )}

      {!streaming && rendered && (
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
      )}

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
