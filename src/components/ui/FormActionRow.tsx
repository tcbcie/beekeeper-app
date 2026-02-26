import type { ReactNode } from 'react'

type ActionRowPadding = 'none' | 'sm' | 'md'

interface FormActionRowProps {
  children: ReactNode
  className?: string
  bordered?: boolean
  padding?: ActionRowPadding
}

const paddingClasses: Record<ActionRowPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'px-6 py-4',
}

export default function FormActionRow({
  children,
  className = '',
  bordered = false,
  padding = 'none',
}: FormActionRowProps) {
  const borderClasses = bordered ? 'border-t border-border' : ''

  return (
    <div className={`flex gap-3 ${borderClasses} ${paddingClasses[padding]} ${className}`.trim()}>
      {children}
    </div>
  )
}
