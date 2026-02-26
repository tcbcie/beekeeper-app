import type { ReactNode } from 'react'

type AlertTone = 'success' | 'error' | 'info' | 'warning'

interface AlertPanelProps {
  tone?: AlertTone
  icon?: ReactNode
  title?: ReactNode
  children?: ReactNode
  className?: string
  bodyClassName?: string
  titleClassName?: string
  endSlot?: ReactNode
  endSlotClassName?: string
}

const toneClasses: Record<AlertTone, string> = {
  success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  error: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
}

const titleToneClasses: Record<AlertTone, string> = {
  success: 'text-green-900 dark:text-green-200',
  error: 'text-red-900 dark:text-red-200',
  info: 'text-blue-900 dark:text-blue-200',
  warning: 'text-amber-900 dark:text-amber-200',
}

const bodyToneClasses: Record<AlertTone, string> = {
  success: 'text-green-700 dark:text-green-300',
  error: 'text-red-800 dark:text-red-300',
  info: 'text-blue-800 dark:text-blue-300',
  warning: 'text-amber-800 dark:text-amber-300',
}

export default function AlertPanel({
  tone = 'info',
  icon,
  title,
  children,
  className = '',
  bodyClassName = '',
  titleClassName = '',
  endSlot,
  endSlotClassName = '',
}: AlertPanelProps) {
  return (
    <div className={`flex items-start gap-3 p-3 border rounded-md ${toneClasses[tone]} ${className}`.trim()}>
      {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
      <div className="min-w-0 flex-1">
        {title && (
          <p className={`text-sm font-medium ${titleToneClasses[tone]} ${titleClassName}`.trim()}>
            {title}
          </p>
        )}
        {children && (
          <div className={`${title ? 'mt-1' : ''} ${bodyToneClasses[tone]} ${bodyClassName}`.trim()}>
            {children}
          </div>
        )}
      </div>
      {endSlot && <div className={`flex-shrink-0 ${endSlotClassName}`.trim()}>{endSlot}</div>}
    </div>
  )
}
