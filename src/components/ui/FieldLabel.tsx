import type { ReactNode } from 'react'

interface FieldLabelProps {
  children: ReactNode
  htmlFor?: string
  className?: string
  required?: boolean
  requiredClassName?: string
}

export default function FieldLabel({
  children,
  htmlFor,
  className = '',
  required = false,
  requiredClassName = 'text-red-500',
}: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className={`block text-sm font-medium text-text-secondary mb-1 ${className}`.trim()}>
      {children}
      {required && <span className={`ml-1 ${requiredClassName}`.trim()}>*</span>}
    </label>
  )
}
