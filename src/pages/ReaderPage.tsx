import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Menu } from 'lucide-react'
import { toast } from 'sonner'
import { useBook, saveReadingPosition } from '@/hooks/useBooks'
import { useChapters } from '@/hooks/useChapters'
import { useConfig, isConfigValid } from '@/hooks/useConfig'
import { useGeneration } from '@/hooks/useGeneration'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { ReaderSidebar } from '@/components/reader/Sidebar'
import { ChapterCard } from '@/components/reader/ChapterCard'
import { StreamingCard } from '@/components/reader/StreamingCard'
import { EmptyState } from '@/components/reader/EmptyState'
import { BottomBar } from '@/components/reader/BottomBar'
import { BookCover } from '@/components/reader/BookCover'
import { exportChaptersAsTxt } from '@/utils/export'

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
  // 用户是否手动打断了自动跟随(向上滚动)
  const userInterruptedRef = useRef(false)
  const touchStartYRef = useRef(0)
  // 标记本次 scroll 事件来自程序化 scrollTo，不应重置打断标志
  const programmaticScrollRef = useRef(false)
  // 首次加载时是否已根据 lastReadChapter 恢复过位置
  const didRestoreRef = useRef(false)

  // === 自动滚动跟随:基于用户输入事件判定意图,避免被程序化滚动反向影响 ===
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const interrupt = () => {
      userInterruptedRef.current = true
    }
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) interrupt()
    }
    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (e: TouchEvent) => {
      const start = touchStartYRef.current
      const cur = e.touches[0]?.clientY ?? start
      // 手指向下拖动 = 内容向上滚 = 想往回读
      if (cur - start > 8) interrupt()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) interrupt()
    }
    // 用户自己滚到底部,自动重新挂钩
    const onScroll = () => {
      if (programmaticScrollRef.current) {
        programmaticScrollRef.current = false
        return
      }
      if (!userInterruptedRef.current) return
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distance < 30) userInterruptedRef.current = false
    }

    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('keydown', onKeyDown)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('scroll', onScroll)
    }
  }, [])

  // 流式更新时,若未被打断则跟到底
  useEffect(() => {
    if (gen.state.status !== 'generating') return
    if (userInterruptedRef.current) return
    const el = scrollRef.current
    if (!el) return
    programmaticScrollRef.current = true
    el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
  }, [gen.state.status, gen.state.streamingContent])

  // 每次新一轮生成开始(content 还是空),重置打断标志
  useEffect(() => {
    if (gen.state.status === 'generating' && gen.state.streamingContent === '') {
      userInterruptedRef.current = false
    }
  }, [gen.state.status, gen.state.streamingContent])

  // === IntersectionObserver: 跟踪当前可见章节 ===
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const cards = el.querySelectorAll<HTMLElement>('[data-chapter-number]')
    if (cards.length === 0) {
      setActiveNumber(null)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) {
          const num = Number(
            (visible[0].target as HTMLElement).dataset.chapterNumber,
          )
          if (!Number.isNaN(num)) setActiveNumber(num)
        }
      },
      { root: el, threshold: [0.1, 0.5] },
    )
    cards.forEach((c) => observer.observe(c))
    return () => observer.disconnect()
  }, [chapters.length, gen.state.status])

  // === 阅读位置恢复:首次章节加载完后,跳到 lastReadChapter ===
  useEffect(() => {
    if (didRestoreRef.current) return
    if (!book || chapters.length === 0) return
    const target = book.lastReadChapter
    if (target == null) {
      didRestoreRef.current = true
      return
    }
    // 等一帧让 DOM 渲染出来
    requestAnimationFrame(() => {
      const node = document.getElementById(`chapter-${target}`)
      if (node) {
        node.scrollIntoView({ block: 'start' })
      }
      didRestoreRef.current = true
    })
  }, [book, chapters.length])

  // === 阅读位置保存:activeNumber 变化时 debounce 写库 ===
  useEffect(() => {
    if (!book || activeNumber == null) return
    if (!didRestoreRef.current) return // 还没恢复完别覆盖
    if (book.lastReadChapter === activeNumber) return
    const t = setTimeout(() => {
      void saveReadingPosition(book.id, activeNumber)
    }, 800)
    return () => clearTimeout(t)
  }, [activeNumber, book])

  // === 自动续写:检测用户滚到最后一章 → 自动触发 ===
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

  // === 提交续写,通过预检后才清空输入框,避免配置不通过时丢失用户输入 ===
  const handleSubmit = useCallback(() => {
    if (!book) return
    if (!isConfigValid(config)) {
      toast.error('请先在「配置」页完成 API 设置')
      return
    }
    if (gen.state.status === 'generating') return
    const idea = creativeIdea
    setCreativeIdea('')
    userInterruptedRef.current = false
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
      userInterruptedRef.current = false
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

            {chapters.length === 0 && !isGenerating && <EmptyState />}

            {chapters.map((c, idx) => (
              <ChapterCard
                key={c.id}
                chapter={c}
                trailingCount={chapters.length - 1 - idx}
                onRegenerate={handleRegenerate}
                disabled={isGenerating}
              />
            ))}

            {isGenerating && gen.state.streamingNumber && (
              <StreamingCard
                number={gen.state.streamingNumber}
                content={gen.state.streamingContent}
                creativeIdea={gen.state.streamingCreativeIdea}
                onAbort={gen.abort}
              />
            )}

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
