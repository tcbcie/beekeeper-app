import type { ReactNode } from 'react'

type InfoPanelTone = 'blue' | 'purple' | 'amber' | 'teal'

interface InfoPanelProps {
  tone?: InfoPanelTone
  title?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  titleClassName?: string
}

const panelToneClasses: Record<InfoPanelTone, string> = {
  blue: 'fj-panel-blue',
  purple: 'fj-panel-purple',
  amber: 'fj-panel-amber',
  teal: 'fj-panel-teal',
}

const titleToneClasses: Record<InfoPanelTone, string> = {
  blue: 'fj-text-info',
  purple: 'text-purple-900 dark:text-purple-100',
  amber: 'fj-text-warning',
  teal: 'text-teal-800 dark:text-teal-200',
}

const bodyToneClasses: Record<InfoPanelTone, string> = {
  blue: 'text-text-secondary',
  purple: 'text-text-secondary',
  amber: 'text-text-secondary',
  teal: 'text-text-secondary',
}

export default function InfoPanel({
  tone = 'blue',
  title,
  children,
  className = '',
  contentClassName = '',
  titleClassName = '',
}: InfoPanelProps) {
  return (
    <div className={`${panelToneClasses[tone]} p-4 ${className}`.trim()}>
      {title && (
        <p className={`text-sm font-medium mb-2 ${titleToneClasses[tone]} ${titleClassName}`.trim()}>
          {title}
        </p>
      )}
      <div className={`${bodyToneClasses[tone]} ${contentClassName}`.trim()}>
        {children}
      </div>
    </div>
  )
}
