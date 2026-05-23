import { Loader2, Square, Sparkles } from 'lucide-react'
import { ChapterMarkdown } from './Markdown'
import { Button } from '../ui/button'
import { AUTO_CREATIVE_IDEA } from '@/utils/constants'

export function StreamingCard({
  number,
  content,
  creativeIdea,
  onAbort,
}: {
  number: number
  content: string
  creativeIdea: string
  onAbort: () => void
}) {
  const hasContent = content.trim().length > 0
  const idea = creativeIdea.trim() || AUTO_CREATIVE_IDEA
  const isAuto = creativeIdea.trim().length === 0

  return (
    <article
      id="streaming-card"
      data-chapter-number={number}
      className="rounded-2xl border-2 border-primary/30 bg-card px-6 py-7 sm:px-8 sm:py-9 animate-fade-in scroll-mt-14"
    >
      <div className="mb-4 flex items-center gap-2 text-xs font-medium text-primary">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        正在创作第 {number} 章…
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 gap-1 text-xs text-destructive hover:bg-destructive/10"
          onClick={onAbort}
        >
          <Square className="h-3 w-3 fill-current" />
          停止
        </Button>
      </div>

      {!hasContent && (
        <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3.5 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <div className="text-sm leading-relaxed">
              <span className="text-muted-foreground">
                {isAuto ? '正在自动续写,创意方向:' : '正在以此创意创作:'}
              </span>
              <p className="mt-1 text-foreground italic">"{idea}"</p>
            </div>
          </div>
        </div>
      )}

      {hasContent && <ChapterMarkdown content={content} />}
    </article>
  )
}
