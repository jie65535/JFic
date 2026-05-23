import { useEffect } from 'react'
import { useConfig } from './useConfig'
import { saveConfig } from '@/db'
import type { ThemePref } from '@/db/types'

function applyThemeClass(pref: ThemePref) {
  const root = document.documentElement
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = pref === 'dark' || (pref === 'system' && sysDark)
  root.classList.toggle('dark', isDark)
}

/** 在应用根部调用，订阅 config.theme + 系统主题变化 */
export function useThemeEffect() {
  const { config } = useConfig()
  const pref: ThemePref = config?.theme ?? 'system'

  useEffect(() => {
    applyThemeClass(pref)
  }, [pref])

  useEffect(() => {
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyThemeClass('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [pref])
}

export function useTheme() {
  const { config } = useConfig()
  const pref: ThemePref = config?.theme ?? 'system'
  return {
    pref,
    setPref: (next: ThemePref) => saveConfig({ theme: next }),
  }
}
