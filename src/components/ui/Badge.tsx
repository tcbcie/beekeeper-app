import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type BadgeTone = 'neutral' | 'blue' | 'red' | 'amber' | 'green' | 'purple'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'fj-badge-neutral',
  blue: 'fj-badge-blue',
  red: 'fj-badge-red',
  amber: 'fj-badge-amber',
  green: 'fj-badge-green',
  purple: 'fj-badge-purple',
}

export default function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return <span className={cn('fj-badge', toneClasses[tone], className)} {...props} />
}

