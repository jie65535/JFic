import * as DialogPrimitive from '@radix-ui/react-dialog'
import { type ComponentPropsWithoutRef, type ReactNode, forwardRef } from 'react'
import { cn } from '@/utils/cn'

/** 抽屉式弹层(用于移动端侧栏)。基于 Radix Dialog。 */
export const Drawer = DialogPrimitive.Root
export const DrawerTrigger = DialogPrimitive.Trigger
export const DrawerClose = DialogPrimitive.Close

interface DrawerContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'left' | 'right'
  children: ReactNode
}

export const DrawerContent = forwardRef<HTMLDivElement, DrawerContentProps>(
  function DrawerContent({ className, children, side = 'left', ...rest }, ref) {
    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-fade-in',
          )}
        />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'fixed top-0 z-50 h-full w-80 max-w-[85vw] bg-card border-r border-border shadow-xl',
            'data-[state=open]:animate-slide-up',
            'outline-none',
            side === 'left' ? 'left-0' : 'right-0 border-r-0 border-l',
            className,
          )}
          {...rest}
        >
          <DialogPrimitive.Title className="sr-only">侧边栏</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    )
  },
)
