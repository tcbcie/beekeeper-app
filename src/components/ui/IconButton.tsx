import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type IconButtonTone = 'default' | 'blue' | 'green' | 'amber' | 'danger'
type IconButtonSize = 'md' | 'sm' | 'xs'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: IconButtonTone
  size?: IconButtonSize
}

const toneClasses: Record<IconButtonTone, string> = {
  default: '',
  blue: 'fj-icon-btn-blue',
  green: 'fj-icon-btn-green',
  amber: 'fj-icon-btn-amber',
  danger: 'fj-icon-btn-danger',
}

const sizeClasses: Record<IconButtonSize, string> = {
  md: 'p-2',
  sm: 'p-1.5',
  xs: 'fj-icon-btn-xs',
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, tone = 'default', size = 'md', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('fj-icon-btn', toneClasses[tone], sizeClasses[size], className)}
      {...props}
    />
  )
})

export default IconButton

