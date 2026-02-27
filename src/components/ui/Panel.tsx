import type { ReactNode } from 'react'
import Surface from '@/components/ui/Surface'

type PanelPadding = 'sm' | 'md' | 'lg' | 'none'

interface PanelProps {
  children: ReactNode
  className?: string
  padding?: PanelPadding
}

export default function Panel({
  children,
  className = '',
  padding = 'md',
}: PanelProps) {
  return (
    <Surface className={className} padded={padding}>
      {children}
    </Surface>
  )
}
