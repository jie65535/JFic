import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { Book, Chapter } from '@/db/types'
import { addChapter, replaceChapter, truncateChapters } from './useChapters'
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
  // 用 ref 维护并发标志,避免 state.status 写入 generate 的 deps,
  // 否则每条 streaming delta 都会重建 generate,带动整个调用图的 effect 反复触发。
  const inFlightRef = useRef(false)

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

      // 上下文上限检查
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

      // 先锁住再 yield，防止 await 期间二次进入
      const ctrl = new AbortController()
      abortRef.current = ctrl
      inFlightRef.current = true

      // 如果是重新生成，先截断后续章节
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

        // 即使中断也尝试保存已生成内容(若有)
        const finalText = text.trim()
        if (finalText) {
          const title = extractChapterTitle(finalText, nextNumber)
          const chapterFields = {
            bookId: book.id,
            number: nextNumber,
            title,
            content: finalText,
            creativeIdea: creativeIdea.trim(),
            promptTokens: apiUsage.promptTokens,
            completionTokens: apiUsage.completionTokens,
            cacheHitTokens: apiUsage.cacheHitTokens,
            cacheMissTokens: apiUsage.cacheMissTokens,
          }
          // 章节可能已存在(重新生成的情况下已经在 truncateChapters 删除了),add 即可
          await addChapter(chapterFields)
        }

        setState({
          status: 'idle',
          streamingNumber: null,
          streamingContent: '',
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

  // 重新生成已存在的章节(基于 generate)，但额外做一些防御
  const regenerate = useCallback(
    async (number: number, creativeIdea: string): Promise<boolean> => {
      return generate(creativeIdea, number)
    },
    [generate],
  )

  // 简单的章节内容编辑(供"补全中断章节"等场景，本期暂不实现)
  const editChapter = useCallback(
    async (bookId: string, number: number, content: string) => {
      const title = extractChapterTitle(content, number)
      await replaceChapter(bookId, number, { content, title })
    },
    [],
  )

  return {
    state,
    generate,
    regenerate,
    editChapter,
    abort,
  }
}
