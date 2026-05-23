import { Monitor, Moon, Sun } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown'
import { Button } from './ui/button'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { pref, setPref } = useTheme()

  const Icon = pref === 'light' ? Sun : pref === 'dark' ? Moon : Monitor

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="切换主题">
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setPref('light')}>
          <Sun className="h-4 w-4" /> 浅色
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setPref('dark')}>
          <Moon className="h-4 w-4" /> 深色
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setPref('system')}>
          <Monitor className="h-4 w-4" /> 跟随系统
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
