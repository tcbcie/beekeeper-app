import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
}

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
}

export default function LoadingSpinner({
  text = 'Loading...',
  size = 'md',
  className = ''
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 p-8 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className={`${sizeClasses[size]} text-forest-600 dark:text-forest-400 animate-spin`}
        aria-hidden="true"
      />
      {text && (
        <span className={`${textSizeClasses[size]} text-text-secondary`}>
          {text}
        </span>
      )}
      <span className="sr-only">{text}</span>
    </div>
  )
}
