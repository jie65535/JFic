import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { Book, Chapter } from '@/db/types'
import { addChapter, truncateChapters } from './useChapters'
import { buildMessagesForGeneration } from '@/utils/messages'
import { ApiError, streamChat } from '@/utils/api'
import { extractChapterTitle } from '@/utils/title'
import { CONTEXT_HARD_LIMIT } from '@/utils/constants'
import { estimateContextUsage } from '@/utils/tokenEstimate'
import { isConfigValid } from './useConfig'
import type { Config } from '@/db/types'

export type GenStatus = 'idle' | 'generating' | 'error' | 'full'

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
    async (creativeIdea: string, regenerate?: number): Promise<boolean> => {
      if (!isConfigValid(config)) {
        toast.error('请先在「配置」页完成 API 设置')
        return false
      }
      if (!book) return false
      if (inFlightRef.current) return false

      let priorChapters: Chapter[]
      let nextNumber: number
      if (regenerate) {
        priorChapters = chapters.filter((c) => c.number < regenerate)
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
        return false
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
          onDelta: (d) => {
            setState((s) =>
              s.status === 'generating'
                ? { ...s, streamingContent: s.streamingContent + d }
                : s,
            )
          },
        })

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
        return !aborted
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : (e as Error).message
        setState({
          status: 'error',
          streamingNumber: null,
          streamingContent: '',
          streamingCreativeIdea: '',
          errorMessage: msg,
        })
        toast.error(msg)
        return false
      } finally {
        abortRef.current = null
        inFlightRef.current = false
      }
    },
    [book, chapters, config],
  )

  const regenerate = useCallback(
    async (number: number, creativeIdea: string): Promise<boolean> => {
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
