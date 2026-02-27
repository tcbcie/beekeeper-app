import type { HTMLAttributes, ReactNode } from 'react'

import Surface from '@/components/ui/Surface'

type CardPadding = 'none' | 'sm' | 'md' | 'lg'
type CardTone = 'default' | 'blue' | 'purple' | 'teal' | 'amber'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children: ReactNode
  padding?: CardPadding
  tone?: CardTone
}

export default function Card({
  children,
  className,
  padding = 'md',
  tone = 'default',
  ...props
}: CardProps) {
  return (
    <Surface className={className} padded={padding} tone={tone} {...props}>
      {children}
    </Surface>
  )
}

