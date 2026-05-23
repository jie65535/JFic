import { cn } from '@/utils/cn'
import type { GenStatus } from '@/hooks/useGeneration'

interface Props {
  status: GenStatus
  streamingNumber: number | null
  lastNumber: number
  errorMessage?: string | null
}

const dotClass: Record<GenStatus, string> = {
  idle: 'bg-muted-foreground/60',
  generating: 'bg-emerald-500 animate-pulse',
  error: 'bg-red-500',
  full: 'bg-red-500',
}

export function StatusIndicator({ status, streamingNumber, lastNumber, errorMessage }: Props) {
  let label: string
  if (status === 'generating' && streamingNumber)
    label = `正在创作第 ${streamingNumber} 章…`
  else if (status === 'error') label = errorMessage || '生成出错'
  else if (status === 'full') label = '上下文已满'
  else if (lastNumber > 0) label = `第 ${lastNumber} 章已就绪`
  else label = '就绪'

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={cn('inline-block h-2 w-2 rounded-full', dotClass[status])} />
      <span className="line-clamp-1">{label}</span>
    </div>
  )
}
