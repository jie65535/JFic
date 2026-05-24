import type { ChatMessage } from './messages'

export interface ApiConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface Usage {
  promptTokens: number
  completionTokens: number
  cacheHitTokens: number
  cacheMissTokens: number
}

export interface StreamResult {
  text: string
  usage: Usage
  aborted: boolean
}

export class ApiError extends Error {
  status?: number
  detail?: string
  constructor(message: string, opts?: { status?: number; detail?: string }) {
    super(message)
    this.name = 'ApiError'
    this.status = opts?.status
    this.detail = opts?.detail
  }
}

function normalizeBaseUrl(base: string): string {
  return base.replace(/\/+$/, '')
}

/**
 * 调用 OpenAI 兼容的 chat completions(流式)。
 *
 * - 调用方传入 messages 即可，KV Cache 命中靠调用方保证前缀稳定
 * - 通过 AbortController 中断
 * - onDelta 用于流式追加输出到 UI
 */
export async function streamChat(opts: {
  config: ApiConfig
  messages: ChatMessage[]
  signal: AbortSignal
  onDelta: (delta: string) => void
  temperature?: number
}): Promise<StreamResult> {
  const { config, messages, signal, onDelta } = opts
  const url = `${normalizeBaseUrl(config.baseUrl)}/v1/chat/completions`

  let resp: Response
  try {
    resp = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        temperature: opts.temperature ?? 1.5,
      }),
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { text: '', usage: emptyUsage(), aborted: true }
    }
    throw new ApiError(`网络错误：${(err as Error).message}`)
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '')
    throw new ApiError(humanizeStatus(resp.status, detail), {
      status: resp.status,
      detail,
    })
  }

  if (!resp.body) {
    throw new ApiError('响应无 body')
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let text = ''
  let usage: Usage = emptyUsage()
  let aborted = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // 按行处理 SSE
      let idx: number
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const rawLine = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 1)
        const line = rawLine.replace(/\r$/, '').trim()
        if (!line || !line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '[DONE]') {
          continue
        }
        try {
          const json = JSON.parse(payload)
          const delta: string | undefined = json?.choices?.[0]?.delta?.content
          if (delta) {
            text += delta
            onDelta(delta)
          }
          // OpenAI/DeepSeek 兼容 usage 字段
          if (json?.usage) {
            usage = parseUsage(json.usage)
          }
        } catch {
          // 忽略无法解析的行
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      aborted = true
    } else {
      throw err
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // ignore
    }
  }

  return { text, usage, aborted }
}

function parseUsage(u: any): Usage {
  const promptTokens = u.prompt_tokens ?? 0
  const completionTokens = u.completion_tokens ?? 0
  // DeepSeek 风格
  let cacheHitTokens = u.prompt_cache_hit_tokens ?? undefined
  let cacheMissTokens = u.prompt_cache_miss_tokens ?? undefined
  // OpenAI 风格 fallback
  if (cacheHitTokens === undefined && u.prompt_tokens_details?.cached_tokens !== undefined) {
    cacheHitTokens = u.prompt_tokens_details.cached_tokens
    cacheMissTokens = Math.max(0, promptTokens - cacheHitTokens)
  }
  if (cacheMissTokens === undefined && cacheHitTokens !== undefined) {
    cacheMissTokens = Math.max(0, promptTokens - cacheHitTokens)
  }
  return {
    promptTokens,
    completionTokens,
    cacheHitTokens: cacheHitTokens ?? 0,
    cacheMissTokens: cacheMissTokens ?? 0,
  }
}

function emptyUsage(): Usage {
  return { promptTokens: 0, completionTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0 }
}

function humanizeStatus(status: number, detail: string): string {
  const snippet = detail.slice(0, 300)
  if (status === 401) return `API Key 无效或已过期(401)。${snippet}`
  if (status === 402) return `账户余额不足(402)。${snippet}`
  if (status === 404) return `模型或接口不存在(404)。${snippet}`
  if (status === 429) return `请求过于频繁(429)。${snippet}`
  if (status >= 500) return `服务端错误(${status})。${snippet}`
  return `请求失败(${status})。${snippet}`
}
