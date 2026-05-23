import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function Tooltip({
  children,
  content,
  side = 'top',
}: {
  children: ReactNode
  content: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={cn(
              'z-50 max-w-xs rounded-md border border-border bg-card px-3 py-1.5 text-xs',
              'text-card-foreground shadow-md',
              'data-[state=delayed-open]:animate-fade-in',
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-card" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
