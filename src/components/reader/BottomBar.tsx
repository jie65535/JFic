import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Send, Square, Infinity as InfinityIcon } from 'lucide-react'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { cn } from '@/utils/cn'

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onAbort: () => void
  isGenerating: boolean
  disabled?: boolean
  infiniteMode: boolean
  onInfiniteChange: (v: boolean) => void
  autoMode: boolean
  onAutoChange: (v: boolean) => void
}

export function BottomBar({
  value,
  onChange,
  onSubmit,
  onAbort,
  isGenerating,
  disabled,
  infiniteMode,
  onInfiniteChange,
  autoMode,
  onAutoChange,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  // 自适应高度
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (!isGenerating && !disabled) onSubmit()
    }
  }

  return (
    <div
      className={cn(
        'sticky bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur',
        'supports-[backdrop-filter]:bg-background/80',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <Switch
                checked={autoMode}
                onCheckedChange={onAutoChange}
                disabled={infiniteMode}
                aria-label="自动续写"
              />
              <span className="text-muted-foreground">读到末章自动续</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <Switch
                checked={infiniteMode}
                onCheckedChange={onInfiniteChange}
                aria-label="无限模式"
              />
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <InfinityIcon className="h-3 w-3" /> 无限
              </span>
            </label>
          </div>
          <span className="text-muted-foreground/70 hidden sm:inline">
            Ctrl/⌘ + Enter 续写
          </span>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="创作方向或创意（可留空，AI 自动续写）"
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'min-h-[44px] max-h-[200px] scrollbar-thin',
            )}
          />
          {isGenerating ? (
            <Button
              variant="destructive"
              size="lg"
              onClick={onAbort}
              className="h-11 px-4 shrink-0"
            >
              <Square className="h-4 w-4 fill-current" />
              停止
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={onSubmit}
              disabled={disabled}
              className="h-11 px-4 shrink-0"
            >
              <Send className="h-4 w-4" />
              续写
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
