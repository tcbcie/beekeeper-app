import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type NavTabTone = 'forest' | 'purple' | 'blue'
type NavTabSize = 'md' | 'lg'

interface NavTabButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  tone?: NavTabTone
  size?: NavTabSize
}

const sizeClasses: Record<NavTabSize, string> = {
  md: 'px-4 py-2',
  lg: 'px-6 py-3',
}

const activeClasses: Record<NavTabTone, string> = {
  forest: 'border-forest-600 dark:border-emerald-500 text-forest-600 dark:text-emerald-500',
  purple: 'border-purple-500 text-purple-600 dark:text-purple-400',
  blue: 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400',
}

const inactiveClasses = 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'

const NavTabButton = forwardRef<HTMLButtonElement, NavTabButtonProps>(function NavTabButton(
  { className, active = false, tone = 'forest', size = 'md', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap',
        sizeClasses[size],
        active ? activeClasses[tone] : inactiveClasses,
        className
      )}
      {...props}
    />
  )
})

export default NavTabButton
