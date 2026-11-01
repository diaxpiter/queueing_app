import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-0.5 font-label text-[10.5px] font-semibold uppercase tracking-[0.1em]',
  {
    variants: {
      variant: {
        default: 'bg-primary/15 text-primary',
        muted: 'bg-secondary text-muted-foreground',
        success: 'bg-success/15 text-success',
        info: 'bg-info/15 text-info',
        warn: 'bg-copper/15 text-copper',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
