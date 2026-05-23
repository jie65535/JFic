import { Progress } from '../ui/progress'
import { Tooltip } from '../ui/tooltip'
import { cn } from '@/utils/cn'
import {
  CONTEXT_WINDOW,
  TOKEN_BAND_GREEN,
  TOKEN_BAND_YELLOW,
  TOKEN_BAND_ORANGE,
} from '@/utils/constants'
import type { TokenBreakdown } from '@/utils/tokenEstimate'
import { formatNumber } from '@/utils/format'

export function TokenBar({ breakdown }: { breakdown: TokenBreakdown }) {
  const ratio = breakdown.total / CONTEXT_WINDOW
  const pct = Math.min(100, ratio * 100)
  const color =
    ratio < TOKEN_BAND_GREEN
      ? 'bg-emerald-500'
      : ratio < TOKEN_BAND_YELLOW
        ? 'bg-yellow-500'
        : ratio < TOKEN_BAND_ORANGE
          ? 'bg-orange-500'
          : 'bg-red-500'

  return (
    <Tooltip
      content={
        <div className="space-y-1 text-xs">
          <div>原著: {formatNumber(breakdown.novelTokens)}</div>
          <div>系统提示: {formatNumber(breakdown.systemTokens)}</div>
          <div>章节: {formatNumber(breakdown.chaptersTokens)}</div>
          <div className="border-t border-border pt-1">
            共计 ≈ {formatNumber(breakdown.total)} / {formatNumber(CONTEXT_WINDOW)} tokens
          </div>
        </div>
      }
      side="right"
    >
      <div className="cursor-help space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">上下文窗口</span>
          <span className={cn('font-medium', ratio >= TOKEN_BAND_ORANGE && 'text-red-500')}>
            {pct.toFixed(1)}%
          </span>
        </div>
        <Progress value={pct} indicatorClassName={color} />
        <div className="text-[10px] text-muted-foreground">
          ≈ {formatNumber(breakdown.total)} tokens
        </div>
      </div>
    </Tooltip>
  )
}
