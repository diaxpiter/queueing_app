import * as LabelPrimitive from '@radix-ui/react-label'
import type * as React from 'react'

import { cn } from '@/lib/utils'

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'font-label text-[10.5px] font-semibold uppercase leading-none tracking-[0.18em] text-dim',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
