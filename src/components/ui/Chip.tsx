import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type ChipTone = 'neutral' | 'amber'
type ChipSize = 'sm' | 'xs'

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone
  size?: ChipSize
}

const toneClasses: Record<ChipTone, string> = {
  neutral: 'fj-chip-neutral',
  amber: 'fj-chip-amber',
}

const sizeClasses: Record<ChipSize, string> = {
  sm: 'fj-chip-sm',
  xs: 'fj-chip-xs',
}

export default function Chip({
  className,
  tone = 'neutral',
  size = 'sm',
  ...props
}: ChipProps) {
  return <span className={cn('fj-chip', toneClasses[tone], sizeClasses[size], className)} {...props} />
}

