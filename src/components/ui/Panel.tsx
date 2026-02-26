import type { ReactNode } from 'react'

type PanelPadding = 'sm' | 'md' | 'lg' | 'none'

interface PanelProps {
  children: ReactNode
  className?: string
  padding?: PanelPadding
}

const paddingClasses: Record<PanelPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export default function Panel({
  children,
  className = '',
  padding = 'md',
}: PanelProps) {
  return (
    <div className={`field-journal-panel ${paddingClasses[padding]} ${className}`.trim()}>
      {children}
    </div>
  )
}

