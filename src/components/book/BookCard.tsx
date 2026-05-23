import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Book } from '@/db/types'
import { db } from '@/db'
import { deleteBook } from '@/hooks/useBooks'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Button } from '../ui/button'
import { formatRelativeTime } from '@/utils/format'

export function BookCard({ book }: { book: Book }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const count = useLiveQuery(
    async () => db.chapters.where('bookId').equals(book.id).count(),
    [book.id],
    0,
  )

  return (
    <div className="group relative rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-foreground/20">
      <Link to={`/book/${book.id}`} className="block">
        <h3 className="mb-1 line-clamp-1 text-lg font-semibold tracking-tight">
          {book.name}
        </h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          原著约 {Math.round(book.novelText.length / 1000)} k 字
        </p>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{count} 章</span>
          <span>{formatRelativeTime(book.updatedAt)}</span>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setConfirmOpen(true)
        }}
        aria-label="删除"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`删除《${book.name}》?`}
        description="将永久删除该书及全部章节，数据无法恢复。"
        variant="destructive"
        confirmText="永久删除"
        onConfirm={() => deleteBook(book.id)}
      />
    </div>
  )
}
