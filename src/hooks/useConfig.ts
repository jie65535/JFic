import { useLiveQuery } from 'dexie-react-hooks'
import { db, saveConfig } from '@/db'
import type { Config } from '@/db/types'

export function useConfig() {
  // 查询返回 null 表示"无记录已加载",undefined 表示"仍在加载"。
  const config = useLiveQuery(async () => (await db.config.get('global')) ?? null, [])
  return {
    config: (config ?? undefined) as Config | undefined,
    isLoading: config === undefined,
    save: saveConfig,
  }
}

export function isConfigValid(c: Config | undefined): c is Config {
  return !!c && !!c.baseUrl && !!c.apiKey && !!c.model
}
