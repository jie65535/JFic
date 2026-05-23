import type { LabelHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none text-foreground',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...rest}
    />
  )
}
