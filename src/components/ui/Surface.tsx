import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

type SurfaceTone = 'default' | 'blue' | 'purple' | 'teal' | 'amber'
type SurfacePadding = 'none' | 'sm' | 'md' | 'lg'

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  tone?: SurfaceTone
  padded?: SurfacePadding
  elevated?: boolean
}

const toneClasses: Record<SurfaceTone, string> = {
  default: '',
  blue: 'fj-panel-blue',
  purple: 'fj-panel-purple',
  teal: 'fj-panel-teal',
  amber: 'fj-panel-amber',
}

const paddingClasses: Record<SurfacePadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export default function Surface({
  children,
  className,
  tone = 'default',
  padded = 'none',
  elevated = true,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        elevated && 'field-journal-panel',
        tone !== 'default' && toneClasses[tone],
        paddingClasses[padded],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

