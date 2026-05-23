import { Sparkles } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
        <Sparkles className="h-6 w-6 text-foreground" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">还没有章节</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        在底部输入框写下你的创意方向(或直接留空让 AI 自由发挥)，点击「续写」开始第一章。
      </p>
    </div>
  )
}
