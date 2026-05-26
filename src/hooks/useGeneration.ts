import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { Book, Chapter } from '@/db/types'
import { addChapter, restoreChapters, truncateChapters } from './useChapters'
import { buildMessagesForGeneration } from '@/utils/messages'
import { ApiError, streamChat } from '@/utils/api'
import { extractChapterTitle } from '@/utils/title'
import { CONTEXT_HARD_LIMIT } from '@/utils/constants'
import { estimateContextUsage } from '@/utils/tokenEstimate'
import { isConfigValid } from './useConfig'
import type { Config } from '@/db/types'

export type GenStatus = 'idle' | 'generating' | 'error' | 'full'

/**
 * 调用结果。区分 error/full/aborted/noop 是为了让调用方决定要不要把刚清空的
 * 提示词还回输入框 —— 用户主动 abort 跟接口报错的处理就不一样。
 */
export type GenerateResult = 'ok' | 'aborted' | 'error' | 'full' | 'noop'

export interface GenerationState {
  status: GenStatus
  streamingNumber: number | null
  streamingContent: string
  streamingCreativeIdea: string
  errorMessage: string | null
}

export function useGeneration(opts: {
  config: Config | undefined
  book: Book | null | undefined
  chapters: Chapter[]
}) {
  const { config, book, chapters } = opts
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    streamingNumber: null,
    streamingContent: '',
    streamingCreativeIdea: '',
    errorMessage: null,
  })
  const abortRef = useRef<AbortController | null>(null)
  // 并发标志走 ref 不走 state:state.status 进 generate deps 会让每条 streaming
  // delta 重建 generate,带动整个调用图的 effect 反复触发。
  const inFlightRef = useRef(false)

  // 切书时清掉残留 streaming state,否则 ReaderPage 会基于上一本书的
  // streamingNumber 合并出一张"假章节卡"
  useEffect(() => {
    setState({
      status: 'idle',
      streamingNumber: null,
      streamingContent: '',
      streamingCreativeIdea: '',
      errorMessage: null,
    })
  }, [book?.id])

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  /**
   * 生成下一章(或重新生成指定章节)。
   *
   * @param creativeIdea 用户的创意输入(可为空)
   * @param regenerate  若提供章节号，则触发重新生成:删除该章及之后，重新写入
   */
  const generate = useCallback(
    async (creativeIdea: string, regenerate?: number): Promise<GenerateResult> => {
      if (!isConfigValid(config)) {
        toast.error('请先在「配置」页完成 API 设置')
        return 'noop'
      }
      if (!book) return 'noop'
      if (inFlightRef.current) return 'noop'

      let priorChapters: Chapter[]
      let nextNumber: number
      // 重新生成时,把待截断的章节快照到内存,接口失败时回滚 —— 否则用户为了
      // 换一章,结果新章没生成、连带后续章节也丢光,体验非常糟糕
      let truncated: Chapter[] = []
      if (regenerate) {
        priorChapters = chapters.filter((c) => c.number < regenerate)
        truncated = chapters.filter((c) => c.number >= regenerate)
        nextNumber = regenerate
      } else {
        priorChapters = chapters
        nextNumber = (chapters[chapters.length - 1]?.number ?? 0) + 1
      }

      const usage = estimateContextUsage({
        novelText: book.novelText,
        systemPrompt: book.systemPrompt,
        chapters: priorChapters,
      })
      if (usage.total >= CONTEXT_HARD_LIMIT) {
        setState({
          status: 'full',
          streamingNumber: null,
          streamingContent: '',
          streamingCreativeIdea: '',
          errorMessage: '上下文窗口已接近上限，无法继续生成。建议导出全部章节，以当前同人作品为原著开启新书继续创作。',
        })
        toast.error('上下文窗口已满')
        return 'full'
      }

      // 先锁住再 yield,防止 await 期间二次进入
      const ctrl = new AbortController()
      abortRef.current = ctrl
      inFlightRef.current = true

      if (regenerate) {
        await truncateChapters(book.id, regenerate)
      }

      setState({
        status: 'generating',
        streamingNumber: nextNumber,
        streamingContent: '',
        streamingCreativeIdea: creativeIdea,
        errorMessage: null,
      })

      const messages = buildMessagesForGeneration({
        systemPrompt: book.systemPrompt,
        novelText: book.novelText,
        priorChapters,
        nextNumber,
        creativeIdea,
      })

      try {
        const { text, usage: apiUsage, aborted } = await streamChat({
          config,
          messages,
          signal: ctrl.signal,
          thinking: config.thinking,
          reasoningEffort: config.reasoningEffort,
          onDelta: (d) => {
            setState((s) =>
              s.status === 'generating'
                ? { ...s, streamingContent: s.streamingContent + d }
                : s,
            )
          },
        })

        // 接口"安静地返回空"时(HTTP 200 但流里没有任何 content delta)兜底成错误,
        // 走下面的 catch 分支统一处理:回滚截断章节、还原提示词、显示 toast。
        // 没这一行的话用户会看到卡片消失却没有任何反馈,以为是自己点错了。
        if (!aborted && !text.trim()) {
          throw new ApiError('服务端返回空响应,可能是模型/接口异常,请重试')
        }

        // 即使中断也尝试保存已生成内容
        const finalText = text.trim()
        if (finalText) {
          const title = extractChapterTitle(finalText, nextNumber)
          await addChapter({
            bookId: book.id,
            number: nextNumber,
            title,
            content: finalText,
            creativeIdea: creativeIdea.trim(),
            promptTokens: apiUsage.promptTokens,
            completionTokens: apiUsage.completionTokens,
            cacheHitTokens: apiUsage.cacheHitTokens,
            cacheMissTokens: apiUsage.cacheMissTokens,
          })
        }

        // 保留 streamingNumber/streamingContent 直到 useLiveQuery 把新章节同步进
        // chapters。ReaderPage 据此合并出 virtualChapter 撑位,等真章节通过 key
        // 复用 DOM 节点后再撤掉;否则中间会有一帧文档高度骤减导致视口跳变。
        setState({
          status: 'idle',
          streamingNumber: finalText ? nextNumber : null,
          streamingContent: finalText,
          streamingCreativeIdea: '',
          errorMessage: null,
        })
        if (aborted && !finalText) {
          toast.info('已中断')
        }
        return aborted ? 'aborted' : 'ok'
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : (e as Error).message
        // 接口直接报错时既没拿到内容也没保存,把刚才截断的章节回滚回去
        if (truncated.length > 0) {
          try {
            await restoreChapters(book.id, truncated)
          } catch {
            // 回滚失败就只能认栽,接口错误的 toast 已经告诉用户出了什么事
          }
        }
        setState({
          status: 'error',
          streamingNumber: null,
          streamingContent: '',
          streamingCreativeIdea: '',
          errorMessage: msg,
        })
        toast.error(msg)
        return 'error'
      } finally {
        abortRef.current = null
        inFlightRef.current = false
      }
    },
    [book, chapters, config],
  )

  const regenerate = useCallback(
    async (number: number, creativeIdea: string): Promise<GenerateResult> => {
      return generate(creativeIdea, number)
    },
    [generate],
  )

  return {
    state,
    generate,
    regenerate,
    abort,
  }
}
