import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type AppIconSize = 'sm' | 'md' | 'lg' | 'xl'

export type AppIconValue = LucideIcon | ReactNode

interface AppIconProps {
  icon: AppIconValue
  size?: AppIconSize
  className?: string
  title?: string
}

const sizeClasses: Record<AppIconSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
}

function isLucideIcon(icon: AppIconValue): icon is LucideIcon {
  return (
    typeof icon === 'function' ||
    (typeof icon === 'object' &&
      icon !== null &&
      'render' in icon &&
      typeof (icon as { render?: unknown }).render === 'function')
  )
}

export default function AppIcon({
  icon,
  size = 'md',
  className = '',
  title,
}: AppIconProps) {
  if (isLucideIcon(icon)) {
    const Icon = icon
    return (
      <Icon
        className={`${sizeClasses[size]} ${className}`.trim()}
        aria-hidden={title ? undefined : true}
        {...(title ? { 'aria-label': title } : {})}
      />
    )
  }

  return <span className={className}>{icon}</span>
}
