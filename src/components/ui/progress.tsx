import * as ProgressPrimitive from '@radix-ui/react-progress'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '@/utils/cn'

interface ProgressProps
  extends ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { className, value, indicatorClassName, ...rest },
  ref,
) {
  const v = Math.max(0, Math.min(100, value ?? 0))
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
        className,
      )}
      value={v}
      {...rest}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full transition-all duration-300 ease-out',
          indicatorClassName ?? 'bg-primary',
        )}
        style={{ width: `${v}%` }}
      />
    </ProgressPrimitive.Root>
  )
})
