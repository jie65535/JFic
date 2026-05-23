import { Link } from 'react-router-dom'
import {
  Github,
  Plus,
  Sparkles,
  ShieldCheck,
  BookOpenText,
  Layers,
  Settings2,
} from 'lucide-react'
import { useBooks } from '@/hooks/useBooks'
import { Button } from '@/components/ui/button'
import { BookCard } from '@/components/book/BookCard'
import { ThemeToggle } from '@/components/ThemeToggle'
import { GITHUB_URL } from '@/utils/constants'

export default function HomePage() {
  const { books, isLoading } = useBooks()

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center pt-32 text-muted-foreground">
            加载中...
          </div>
        ) : books.length === 0 ? (
          <Landing />
        ) : (
          <Bookshelf books={books} />
        )}
      </main>
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        JFic · 用完整上下文，写出原汁原味的同人
      </footer>
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm">
            J
          </span>
          <span className="text-lg">JFic</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/config">
            <Button variant="ghost" size="icon" aria-label="API 配置">
              <Settings2 className="h-4 w-4" />
            </Button>
          </Link>
          <ThemeToggle />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button variant="ghost" size="icon" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>
    </header>
  )
}

const features = [
  {
    icon: Layers,
    title: '1M 上下文，原著全文载入',
    desc: '不压缩、不摘要、不切片，将原著每一个字都作为上下文交给大模型。',
  },
  {
    icon: Sparkles,
    title: '无损续写',
    desc: '拒绝花哨的压缩与总结技术，信息零丢失，续写质量不打折。',
  },
  {
    icon: ShieldCheck,
    title: '数据完全本地',
    desc: 'API Key、原著、章节全部存储在浏览器中，无需注册，隐私无忧。',
  },
  {
    icon: BookOpenText,
    title: '像读小说一样创作',
    desc: '不是聊天框，是真正的阅读器体验。',
  },
]

function Landing() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="text-center">
        <h1 className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-4xl font-bold leading-tight tracking-tight text-transparent sm:text-5xl">
          用完整上下文，
          <br />
          写出原汁原味的同人
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          上传原著、配置 API、点击续写——
          <br className="sm:hidden" />
          剩下的交给 1M token 上下文窗口。
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/new">
            <Button size="lg" className="gap-1.5">
              开始创作
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/config">
            <Button size="lg" variant="outline">
              配置 API
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <Icon className="mb-3 h-5 w-5 text-foreground" />
            <h3 className="mb-1.5 font-semibold tracking-tight">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        默认使用 DeepSeek V4 Pro · 1M 上下文 · 低成本高质量创作
      </p>
    </div>
  )
}

function Bookshelf({ books }: { books: NonNullable<ReturnType<typeof useBooks>['books']> }) {
  return (
    <div className="relative mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">我的书架</h2>
          <p className="mt-1 text-sm text-muted-foreground">共 {books.length} 本</p>
        </div>
        <Link to="/new">
          <Button>
            <Plus className="h-4 w-4" />
            新建书籍
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </div>
      <Link
        to="/new"
        className="fixed bottom-6 right-6 sm:hidden inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label="新建书籍"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  )
}
