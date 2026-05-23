import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Upload,
  FileText,
  Sparkles,
  Loader2,
  Check,
  X as XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useConfig, isConfigValid } from '@/hooks/useConfig'
import { saveConfig } from '@/db'
import { createBook } from '@/hooks/useBooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { decodeFileSmart } from '@/utils/encoding'
import { byteSize, formatNumber } from '@/utils/format'
import { GENERAL_GUIDE, INIT_PROMPT, MAX_NOVEL_BYTES } from '@/utils/constants'
import { streamChat, ApiError } from '@/utils/api'
import { cn } from '@/utils/cn'

type Step = 'config' | 'upload' | 'choose' | 'analyzing' | 'review'

export default function NewBookPage() {
  const navigate = useNavigate()
  const { config } = useConfig()

  const [step, setStep] = useState<Step>('config')

  // API config 表单（如果未配置则需要）
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('deepseek-v4-pro')

  // 上传 & 书名
  const [name, setName] = useState('')
  const [novelText, setNovelText] = useState('')
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 分析阶段
  const [systemPrompt, setSystemPrompt] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  // 初始化:如果已经有 config，跳过 config 步骤
  useEffect(() => {
    if (config) {
      setBaseUrl(config.baseUrl || 'https://api.deepseek.com')
      setApiKey(config.apiKey || '')
      setModel(config.model || 'deepseek-v4-pro')
    }
    if (isConfigValid(config)) {
      setStep((cur) => (cur === 'config' ? 'upload' : cur))
    }
  }, [config])

  const onPickFile = () => fileInputRef.current?.click()

  const onFileChosen = async (file: File | null) => {
    if (!file) return
    if (file.size > MAX_NOVEL_BYTES) {
      toast.error(
        `原著文件不能超过 1MB（当前 ${(file.size / 1024 / 1024).toFixed(2)} MB），请精简后再上传。`,
      )
      return
    }
    if (!/\.(txt|md)$/i.test(file.name)) {
      toast.error('请上传 .txt 或 .md 文件')
      return
    }
    try {
      const text = await decodeFileSmart(file)
      if (byteSize(text) > MAX_NOVEL_BYTES * 1.05) {
        toast.error('解码后内容超过 1MB 限额，请精简后再上传。')
        return
      }
      setNovelText(text)
      setFileName(file.name)
      // 用文件名(去后缀)作为默认书名
      const base = file.name.replace(/\.[^.]+$/, '')
      setName((cur) => cur || base)
    } catch (e) {
      console.error(e)
      toast.error('文件读取失败：' + (e as Error).message)
    }
  }

  const startAnalysis = async () => {
    if (!isConfigValid(config)) {
      toast.error('请先完成 API 配置')
      return
    }
    setStep('analyzing')
    setStreamingText('')
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const messages = [
        {
          role: 'user' as const,
          content: INIT_PROMPT + '\n\n' + novelText,
        },
      ]
      const { text, aborted } = await streamChat({
        config,
        messages,
        signal: ctrl.signal,
        onDelta: (d) => setStreamingText((t) => t + d),
      })
      if (aborted) {
        setStep('choose')
        return
      }
      setSystemPrompt(text)
      setStep('review')
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message
      toast.error('分析失败：' + msg)
      setStep('choose')
    } finally {
      abortRef.current = null
    }
  }

  const abortAnalysis = () => {
    abortRef.current?.abort()
  }

  const useQuickStart = async () => {
    await persistAndEnter(GENERAL_GUIDE)
  }

  const confirmAnalysis = async () => {
    if (!systemPrompt.trim()) {
      toast.error('系统提示词不能为空')
      return
    }
    await persistAndEnter(systemPrompt.trim())
  }

  const persistAndEnter = async (prompt: string) => {
    if (!name.trim()) {
      toast.error('请填写书名')
      return
    }
    try {
      const id = await createBook({
        name: name.trim(),
        novelText,
        systemPrompt: prompt,
      })
      navigate(`/book/${id}`, { replace: true })
    } catch {
      toast.error('创建失败，请检查浏览器存储空间')
    }
  }

  const saveApiConfig = async () => {
    if (!baseUrl.trim() || !apiKey.trim() || !model.trim()) {
      toast.error('请填写完整 API 配置')
      return
    }
    await saveConfig({
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    })
    setStep('upload')
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon" aria-label="返回">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">新建书籍</h1>
          <Stepper step={step} hasConfig={!!isConfigValid(config)} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {step === 'config' && (
          <ApiConfigStep
            baseUrl={baseUrl}
            apiKey={apiKey}
            model={model}
            setBaseUrl={setBaseUrl}
            setApiKey={setApiKey}
            setModel={setModel}
            onNext={saveApiConfig}
          />
        )}

        {step === 'upload' && (
          <UploadStep
            name={name}
            setName={setName}
            novelText={novelText}
            fileName={fileName}
            onPickFile={onPickFile}
            onClearFile={() => {
              setNovelText('')
              setFileName('')
            }}
            fileInputRef={fileInputRef}
            onFileChosen={onFileChosen}
            onNext={() => {
              if (!name.trim()) {
                toast.error('请填写书名')
                return
              }
              if (!novelText) {
                toast.error('请上传原著文件')
                return
              }
              setStep('choose')
            }}
          />
        )}

        {step === 'choose' && (
          <ChooseStep
            onAnalyze={startAnalysis}
            onQuick={useQuickStart}
            onBack={() => setStep('upload')}
          />
        )}

        {step === 'analyzing' && (
          <AnalyzingStep streamingText={streamingText} onAbort={abortAnalysis} />
        )}

        {step === 'review' && (
          <ReviewStep
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            onConfirm={confirmAnalysis}
            onRedo={() => {
              setSystemPrompt('')
              setStreamingText('')
              startAnalysis()
            }}
          />
        )}
      </main>
    </div>
  )
}

function Stepper({ step, hasConfig }: { step: Step; hasConfig: boolean }) {
  const labels: { key: Step | 'analyze'; label: string }[] = []
  if (!hasConfig) labels.push({ key: 'config', label: 'API' })
  labels.push({ key: 'upload', label: '原著' })
  labels.push({ key: 'analyze', label: '分析' })
  const stepIndex = (() => {
    if (step === 'config') return 0
    if (step === 'upload') return hasConfig ? 0 : 1
    return hasConfig ? 1 : 2
  })()
  return (
    <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
      {labels.map((l, i) => (
        <span
          key={l.key}
          className={cn(
            'inline-flex items-center gap-1.5',
            i === stepIndex && 'text-foreground',
          )}
        >
          <span
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]',
              i < stepIndex
                ? 'bg-primary border-primary text-primary-foreground'
                : i === stepIndex
                  ? 'border-foreground text-foreground'
                  : 'border-border',
            )}
          >
            {i < stepIndex ? <Check className="h-3 w-3" /> : i + 1}
          </span>
          {l.label}
        </span>
      ))}
    </div>
  )
}

function ApiConfigStep({
  baseUrl,
  apiKey,
  model,
  setBaseUrl,
  setApiKey,
  setModel,
  onNext,
}: {
  baseUrl: string
  apiKey: string
  model: string
  setBaseUrl: (v: string) => void
  setApiKey: (v: string) => void
  setModel: (v: string) => void
  onNext: () => void
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onNext()
      }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold tracking-tight">第一步:API 配置</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          配置一次，所有书籍共用。仅存储在你本地浏览器。
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="baseUrl">Base URL</Label>
        <Input
          id="baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiKey">API Key</Label>
        <Input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">模型</Label>
        <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <Button type="submit">下一步</Button>
      </div>
    </form>
  )
}

function UploadStep({
  name,
  setName,
  novelText,
  fileName,
  onPickFile,
  onClearFile,
  fileInputRef,
  onFileChosen,
  onNext,
}: {
  name: string
  setName: (v: string) => void
  novelText: string
  fileName: string
  onPickFile: () => void
  onClearFile: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileChosen: (file: File | null) => void
  onNext: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">第二步:上传原著</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          .txt 文件，限制 ≤ 1MB（约 30 万中文字）。自动检测编码。
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bookName">书名</Label>
        <Input
          id="bookName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：原著名 · 同人续写"
        />
      </div>

      <div className="space-y-2">
        <Label>原著文件</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,text/plain"
          className="hidden"
          onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
        />
        {!novelText ? (
          <Dropzone onPick={onPickFile} onFile={onFileChosen} />
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  约 {formatNumber(novelText.length)} 字
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClearFile} aria-label="清除">
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext}>下一步</Button>
      </div>
    </div>
  )
}

function ChooseStep({
  onAnalyze,
  onQuick,
  onBack,
}: {
  onAnalyze: () => void
  onQuick: () => void
  onBack: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">第三步:选择起手路径</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          AI 分析会生成一份贴合原作风貌的"灵魂指引"，强烈推荐;也可跳过直接开写。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={onAnalyze}
          className="flex flex-col items-start gap-3 rounded-2xl border-2 border-primary/50 bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md"
        >
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold tracking-tight">AI 个性化分析</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              由 AI 通读原著，生成定制化的创作者身份、风格指南、人物档案。
              <br />
              耗时约 30 秒，消耗一次 API 调用。
            </p>
          </div>
          <span className="mt-auto text-xs font-medium text-primary">推荐 →</span>
        </button>
        <button
          onClick={onQuick}
          className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-foreground/30 hover:shadow-md"
        >
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold tracking-tight">快速开始</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              使用内置通用创作指南，立即进入阅读器。
              <br />
              提示词后续可在书籍设置中编辑。
            </p>
          </div>
          <span className="mt-auto text-xs font-medium text-muted-foreground">立即开始 →</span>
        </button>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          上一步
        </Button>
      </div>
    </div>
  )
}

function AnalyzingStep({
  streamingText,
  onAbort,
}: {
  streamingText: string
  onAbort: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <p className="font-medium">正在分析原著…</p>
          <p className="text-xs text-muted-foreground">这可能需要 30-60 秒,请耐心等待</p>
        </div>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onAbort}>
          取消
        </Button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 text-sm whitespace-pre-wrap scrollbar-thin">
        {streamingText || (
          <span className="text-muted-foreground">等待模型响应…</span>
        )}
      </div>
    </div>
  )
}

function ReviewStep({
  systemPrompt,
  setSystemPrompt,
  onConfirm,
  onRedo,
}: {
  systemPrompt: string
  setSystemPrompt: (v: string) => void
  onConfirm: () => void
  onRedo: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">确认创作"灵魂指引"</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          这份提示词将作为后续每次续写的系统消息。可随意编辑后再确认，进入阅读器后也可继续修改。
        </p>
      </div>
      <Textarea
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        className="min-h-[55vh] font-mono text-xs leading-relaxed"
      />
      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onRedo}>
          重新分析
        </Button>
        <Button onClick={onConfirm}>开始创作 →</Button>
      </div>
    </div>
  )
}

function Dropzone({
  onPick,
  onFile,
}: {
  onPick: () => void
  onFile: (file: File | null) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!dragOver) setDragOver(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    // 仅当离开容器(而非进入子元素)时关掉高亮
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setDragOver(false)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0] ?? null
    onFile(file)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={onKeyDown}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card px-6 py-10 text-center transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        dragOver
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border hover:border-foreground/40 hover:bg-accent',
      )}
    >
      <Upload
        className={cn(
          'h-6 w-6 transition-colors',
          dragOver ? 'text-primary' : 'text-muted-foreground',
        )}
      />
      <div>
        <p className="text-sm font-medium">
          {dragOver ? '松开以上传' : '点击或拖拽 txt 文件到此处'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">≤ 1MB · 自动识别编码</p>
      </div>
    </div>
  )
}
