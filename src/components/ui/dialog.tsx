import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { type ComponentPropsWithoutRef, type ReactNode, forwardRef } from 'react'
import { cn } from '@/utils/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export const DialogOverlay = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...rest }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
        'data-[state=open]:animate-fade-in data-[state=closed]:opacity-0',
        className,
      )}
      {...rest}
    />
  )
})

interface DialogContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showClose?: boolean
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent({ className, children, showClose = true, ...rest }, ref) {
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'bg-card border border-border rounded-2xl shadow-xl',
            'p-6 outline-none',
            'data-[state=open]:animate-slide-up',
            'max-h-[90vh] overflow-y-auto',
            className,
          )}
          {...rest}
        >
          {children}
          {showClose && (
            <DialogPrimitive.Close
              className={cn(
                'absolute right-4 top-4 rounded-md p-1 text-muted-foreground',
                'hover:bg-accent hover:text-accent-foreground transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  },
)

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4 space-y-1.5">{children}</div>
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>
}

export const DialogTitle = forwardRef<
  HTMLHeadingElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...rest }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...rest}
    />
  )
})

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...rest }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...rest}
    />
  )
})
