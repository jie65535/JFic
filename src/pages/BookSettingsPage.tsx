import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useBook, updateBook, deleteBook } from '@/hooks/useBooks'
import { useChapters } from '@/hooks/useChapters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatNumber } from '@/utils/format'

export default function BookSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { book, isLoading } = useBook(id)
  const { chapters } = useChapters(id)

  const [name, setName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (book) {
      setName(book.name)
      setSystemPrompt(book.systemPrompt)
    }
  }, [book])

  const onSave = async () => {
    if (!book) return
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error('书名与系统提示词不能为空')
      return
    }
    try {
      await updateBook(book.id, {
        name: name.trim(),
        systemPrompt: systemPrompt.trim(),
      })
      toast.success('已保存')
    } catch {
      toast.error('保存失败，请检查浏览器存储空间')
    }
  }

  const onDelete = async () => {
    if (!book) return
    try {
      await deleteBook(book.id)
      toast.success('已删除')
      navigate('/', { replace: true })
    } catch {
      toast.error('删除失败')
    }
  }

  if (isLoading) return null
  if (!book) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        书籍不存在
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Link to={`/book/${book.id}`}>
            <Button variant="ghost" size="icon" aria-label="返回">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">书籍设置</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <section className="space-y-2">
          <Label htmlFor="bookName">书名</Label>
          <Input id="bookName" value={name} onChange={(e) => setName(e.target.value)} />
        </section>

        <section className="space-y-2">
          <div className="flex items-end justify-between">
            <Label htmlFor="sysprompt">系统提示词("灵魂指引")</Label>
            <span className="text-xs text-muted-foreground">
              {formatNumber(systemPrompt.length)} 字
            </span>
          </div>
          <Textarea
            id="sysprompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="min-h-[50vh] font-mono text-xs leading-relaxed"
          />
          <p className="text-xs text-muted-foreground">
            修改后将应用于后续生成。已生成的章节不受影响，但缓存可能不再命中。
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold">原著信息</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>原著字数: {formatNumber(book.novelText.length)}</div>
            <div>已有章节: {chapters.length} 章</div>
            <div>创建时间: {new Date(book.createdAt).toLocaleString('zh-CN')}</div>
            <div>最后修改: {new Date(book.updatedAt).toLocaleString('zh-CN')}</div>
          </div>
        </section>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            删除书籍
          </Button>
          <Button onClick={onSave}>
            <Save className="h-4 w-4" />
            保存
          </Button>
        </div>
      </main>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`删除《${book.name}》?`}
        description={`将永久删除该书及全部 ${chapters.length} 章节，数据无法恢复。`}
        variant="destructive"
        confirmText="永久删除"
        onConfirm={onDelete}
      />
    </div>
  )
}
