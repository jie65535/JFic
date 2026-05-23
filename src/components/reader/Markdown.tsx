import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/utils/cn'

interface Props {
  content: string
  className?: string
}

/** 章节正文 markdown 渲染(受控 prose 样式) */
export const ChapterMarkdown = memo(function ChapterMarkdown({
  content,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'prose prose-neutral dark:prose-invert max-w-none prose-chapter',
        'prose-headings:font-semibold prose-p:my-3',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
})
