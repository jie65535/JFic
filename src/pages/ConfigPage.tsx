import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useConfig } from '@/hooks/useConfig'
import { saveConfig } from '@/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ConfigPage() {
  const navigate = useNavigate()
  const { config } = useConfig()
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('deepseek-v4-pro')
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (config) {
      setBaseUrl(config.baseUrl || 'https://api.deepseek.com')
      setApiKey(config.apiKey || '')
      setModel(config.model || 'deepseek-v4-pro')
    }
  }, [config])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!baseUrl.trim() || !apiKey.trim() || !model.trim()) {
      toast.error('请填写完整')
      return
    }
    await saveConfig({
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    })
    toast.success('已保存')
    navigate(-1)
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon" aria-label="返回">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">API 配置</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              OpenAI 兼容接口的基础地址，无需附带 /v1。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showKey ? '隐藏' : '显示'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                onClick={() => setShowKey((s) => !s)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              API Key 仅明文保存在你本地的浏览器中，不经过任何服务器。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">模型</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="deepseek-v4-pro"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Link to="/">
              <Button type="button" variant="ghost">
                取消
              </Button>
            </Link>
            <Button type="submit">保存</Button>
          </div>
        </form>
      </main>
    </div>
  )
}
