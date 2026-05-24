import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Menu } from 'lucide-react'
import { toast } from 'sonner'
import type { Chapter } from '@/db/types'
import { useBook, saveReadingPosition } from '@/hooks/useBooks'
import { useChapters } from '@/hooks/useChapters'
import { useConfig, isConfigValid } from '@/hooks/useConfig'
import { useGeneration } from '@/hooks/useGeneration'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { ReaderSidebar } from '@/components/reader/Sidebar'
import { ChapterCard } from '@/components/reader/ChapterCard'
import { EmptyState } from '@/components/reader/EmptyState'
import { BottomBar } from '@/components/reader/BottomBar'
import { BookCover } from '@/components/reader/BookCover'
import { exportChaptersAsTxt } from '@/utils/export'
import { extractChapterTitle } from '@/utils/title'

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>()
  const { book, isLoading: bookLoading } = useBook(id)
  const { chapters, isLoading: chLoading } = useChapters(id)
  const { config } = useConfig()
  const gen = useGeneration({ config, book, chapters })

  const [creativeIdea, setCreativeIdea] = useState('')
  const [autoMode, setAutoMode] = useState(false)
  const [infiniteMode, setInfiniteMode] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeNumber, setActiveNumber] = useState<number | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const didRestoreRef = useRef(false)

  // 滚动驱动:活跃章节 + 章内段落索引,顺便 debounce 写库。
  // 段落锚点比像素偏移稳定:跨设备宽度变化、字号调整都不会偏。
  // 保存也放在 scroll handler 里,因为段落索引是局部变量而不是 React state,
  // 不能靠 useEffect deps 触发写库,否则同一章内滚动不会保存。
  const bookId = book?.id
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !bookId) return

    let raf = 0
    let saveTimer: number | null = null

    const scheduleSave = (num: number, paragraph: number) => {
      if (!didRestoreRef.current) return
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = window.setTimeout(() => {
        void saveReadingPosition(bookId, num, paragraph)
      }, 600)
    }

    const compute = () => {
      raf = 0
      const cards = el.querySelectorAll<HTMLElement>('[data-chapter-number]')
      if (cards.length === 0) {
        setActiveNumber(null)
        return
      }
      const containerRect = el.getBoundingClientRect()
      const probe = el.scrollTop + 80

      let activeEl: HTMLElement | null = null
      for (const card of cards) {
        const top = card.getBoundingClientRect().top - containerRect.top + el.scrollTop
        if (top <= probe) activeEl = card
        else break
      }
      if (!activeEl) activeEl = cards[0]

      const num = Number(activeEl.dataset.chapterNumber)
      if (Number.isNaN(num)) return

      let paragraphIdx = 0
      const proseEl = activeEl.querySelector('.prose-chapter') as HTMLElement | null
      if (proseEl) {
        const blocks = proseEl.children
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i] as HTMLElement
          const top = block.getBoundingClientRect().top - containerRect.top + el.scrollTop
          if (top <= probe) paragraphIdx = i
          else break
        }
      }

      setActiveNumber(num)
      scheduleSave(num, paragraphIdx)
    }

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(compute)
    }

    // 首次主动算一次,否则没滚动 activeNumber 一直为 null
    compute()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
      if (saveTimer) clearTimeout(saveTimer)
    }
  }, [bookId, chapters.length, gen.state.status])

  // 阅读位置恢复:目标章节可能是 lazy placeholder,先滚到章节顶让 scroll handler
  // 推进 activeNumber → 触发 ChapterCard 翻面挂载 markdown,等下一帧 layout 完成
  // 再跳到具体段落。
  useEffect(() => {
    if (didRestoreRef.current) return
    if (!book || chapters.length === 0) return
    const target = book.lastReadChapter
    if (target == null) {
      didRestoreRef.current = true
      return
    }
    const paragraphIdx = book.lastReadParagraph ?? 0
    didRestoreRef.current = true

    requestAnimationFrame(() => {
      const node = document.getElementById(`chapter-${target}`)
      if (!node) return
      node.scrollIntoView({ block: 'start' })
      setTimeout(() => {
        const proseEl = node.querySelector('.prose-chapter') as HTMLElement | null
        const block = proseEl?.children[paragraphIdx] as HTMLElement | undefined
        if (block) block.scrollIntoView({ block: 'start' })
      }, 120)
    })
  }, [book, chapters.length])

  // 用户阅读到最新章时就提前触发生成,这样读完末章新章节已经在;否则等读到底
  // 部再触发用户要干等几十秒。
  const lastChapterNumber = chapters[chapters.length - 1]?.number ?? 0
  const isAtLastChapter = activeNumber !== null && activeNumber === lastChapterNumber
  const isIdle = gen.state.status === 'idle'

  const ideaRef = useRef(creativeIdea)
  useEffect(() => {
    ideaRef.current = creativeIdea
  }, [creativeIdea])

  const triggerLockRef = useRef(false)
  const genGenerateRef = useRef(gen.generate)
  useEffect(() => {
    genGenerateRef.current = gen.generate
  }, [gen.generate])

  useEffect(() => {
    if (!isIdle) return
    if (!book) return
    if (!autoMode && !infiniteMode) return
    if (chapters.length === 0) return
    if (!isAtLastChapter && !infiniteMode) return
    if (triggerLockRef.current) return
    triggerLockRef.current = true
    void genGenerateRef.current(ideaRef.current).finally(() => {
      triggerLockRef.current = false
    })
  }, [
    isIdle,
    isAtLastChapter,
    autoMode,
    infiniteMode,
    book,
    chapters.length,
  ])

  const handleInfiniteChange = useCallback((v: boolean) => {
    setInfiniteMode(v)
    if (v) setAutoMode(false)
  }, [])

  // 通过预检后才清输入框,避免配置不通过时丢失用户输入
  const handleSubmit = useCallback(() => {
    if (!book) return
    if (!isConfigValid(config)) {
      toast.error('请先在「配置」页完成 API 设置')
      return
    }
    if (gen.state.status === 'generating') return
    const idea = creativeIdea
    setCreativeIdea('')
    void gen.generate(idea)
  }, [book, config, creativeIdea, gen])

  const handleRegenerate = useCallback(
    async (number: number) => {
      if (!isConfigValid(config)) {
        toast.error('请先在「配置」页完成 API 设置')
        return
      }
      if (gen.state.status === 'generating') return
      const ch = chapters.find((c) => c.number === number)
      const idea = creativeIdea.trim() || ch?.creativeIdea || ''
      setCreativeIdea('')
      await gen.regenerate(number, idea)
    },
    [chapters, config, creativeIdea, gen],
  )

  const handleJump = useCallback((number: number) => {
    const el = document.getElementById(`chapter-${number}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setDrawerOpen(false)
  }, [])

  const handleExport = useCallback(() => {
    if (!book) return
    if (chapters.length === 0) {
      toast.error('暂无章节可导出')
      return
    }
    exportChaptersAsTxt(book, chapters)
    toast.success(`已导出 ${chapters.length} 章`)
  }, [book, chapters])

  const isGenerating = gen.state.status === 'generating'
  const isFull = gen.state.status === 'full'

  // 把流式中的"虚拟章节"合并进 chapters,与 DB 章节共用 ChapterCard 渲染。
  // 生成完成时 React 通过 key=number 复用同一个 DOM 节点,只是 streaming prop
  // 翻面,浏览器 scroll anchoring 能稳住视口;否则切换不同组件会让视口跳变。
  const renderedChapters = useMemo<Chapter[]>(() => {
    const sNum = gen.state.streamingNumber
    if (sNum == null) return chapters
    if (chapters.some((c) => c.number === sNum)) return chapters
    if (!book) return chapters
    const sContent = gen.state.streamingContent
    const virtual: Chapter = {
      id: `streaming-${sNum}`,
      bookId: book.id,
      number: sNum,
      title: extractChapterTitle(sContent, sNum),
      content: sContent,
      creativeIdea: gen.state.streamingCreativeIdea,
      promptTokens: 0,
      completionTokens: 0,
      cacheHitTokens: 0,
      cacheMissTokens: 0,
      createdAt: Date.now(),
    }
    return [...chapters, virtual]
  }, [
    chapters,
    gen.state.streamingNumber,
    gen.state.streamingContent,
    gen.state.streamingCreativeIdea,
    book,
  ])

  const sidebarProps = useMemo(
    () =>
      book && {
        book,
        chapters,
        activeNumber,
        generation: gen.state,
        onJump: handleJump,
        onExport: handleExport,
      },
    [book, chapters, activeNumber, gen.state, handleJump, handleExport],
  )

  if (bookLoading || chLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        加载中…
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">书籍不存在</p>
        <Link to="/">
          <Button variant="outline">返回书架</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="hidden lg:block w-72 shrink-0 border-r border-border">
        {sidebarProps && <ReaderSidebar {...sidebarProps} />}
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="w-80 lg:hidden">
          {sidebarProps && <ReaderSidebar {...sidebarProps} />}
        </DrawerContent>
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="lg:hidden flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            aria-label="目录"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <h1 className="truncate text-sm font-semibold tracking-tight flex-1">
            {book.name}
          </h1>
          <Link to="/">
            <Button variant="ghost" size="icon" aria-label="返回">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin" tabIndex={0}>
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10 space-y-6">
            <BookCover book={book} chapters={chapters} />

            {renderedChapters.length === 0 && !isGenerating && <EmptyState />}

            {renderedChapters.map((c, idx) => {
              const isLast = idx === renderedChapters.length - 1
              const isStreamingChapter =
                c.number === gen.state.streamingNumber && isGenerating
              // 末章必须真实渲染:流式中的章节是末章,placeholder 偏矮会让生成完成
              // 那一帧文档高度突减,scrollTop 被 clamp 到底
              const anchor = activeNumber ?? renderedChapters[0]?.number ?? 0
              const isNear = Math.abs(c.number - anchor) <= 2
              return (
                <ChapterCard
                  // key=number: virtualChapter 和 DB 真章节复用同一 ChapterCard
                  // 实例 / DOM 节点,生成完成时不引起组件卸载
                  key={c.number}
                  chapter={c}
                  trailingCount={renderedChapters.length - 1 - idx}
                  onRegenerate={handleRegenerate}
                  disabled={isGenerating}
                  lazy={!isLast && !isNear}
                  streaming={isStreamingChapter}
                  onAbort={isStreamingChapter ? gen.abort : undefined}
                  streamingCreativeIdea={
                    isStreamingChapter ? gen.state.streamingCreativeIdea : undefined
                  }
                />
              )
            })}

            {isFull && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
                {gen.state.errorMessage}
              </div>
            )}
          </div>
        </div>

        <BottomBar
          value={creativeIdea}
          onChange={setCreativeIdea}
          onSubmit={handleSubmit}
          onAbort={gen.abort}
          isGenerating={isGenerating}
          disabled={isFull}
          autoMode={autoMode}
          onAutoChange={(v) => setAutoMode(v)}
          infiniteMode={infiniteMode}
          onInfiniteChange={handleInfiniteChange}
        />
      </div>
    </div>
  )
}
