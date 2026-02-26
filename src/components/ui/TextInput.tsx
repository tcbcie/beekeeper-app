import { forwardRef, type InputHTMLAttributes } from 'react'

type ControlTone = 'default' | 'danger' | 'purple' | 'teal'

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  danger?: boolean
  tone?: ControlTone
}

const toneClasses: Record<ControlTone, string> = {
  default: '',
  danger: 'fj-control-danger',
  purple: 'fj-control-purple',
  teal: 'fj-control-teal',
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className = '', danger = false, tone = 'default', ...props },
  ref
) {
  const resolvedTone = danger ? 'danger' : tone

  return (
    <input
      ref={ref}
      className={`fj-control ${toneClasses[resolvedTone]} ${className}`.trim()}
      {...props}
    />
  )
})

export default TextInput
