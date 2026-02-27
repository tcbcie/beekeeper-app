import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type ButtonTone = 'neutral' | 'blue' | 'purple' | 'success' | 'amber' | 'danger'
type ButtonSize = 'md' | 'sm' | 'xs'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone
  size?: ButtonSize
  fullWidth?: boolean
}

const toneClasses: Record<ButtonTone, string> = {
  neutral: 'fj-btn-neutral',
  blue: 'fj-btn-blue',
  purple: 'fj-btn-purple',
  success: 'fj-btn-success',
  amber: 'fj-btn-amber',
  danger: 'fj-btn-danger',
}

const sizeClasses: Record<ButtonSize, string> = {
  md: '',
  sm: 'fj-btn-sm',
  xs: 'fj-btn-xs',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, tone = 'neutral', size = 'md', fullWidth = false, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('fj-btn', toneClasses[tone], sizeClasses[size], fullWidth && 'w-full', className)}
      {...props}
    />
  )
})

export default Button

