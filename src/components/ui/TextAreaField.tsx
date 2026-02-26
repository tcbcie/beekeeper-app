import { forwardRef, type TextareaHTMLAttributes } from 'react'

type ControlTone = 'default' | 'danger' | 'purple' | 'teal'

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  tone?: ControlTone
}

const toneClasses: Record<ControlTone, string> = {
  default: '',
  danger: 'fj-control-danger',
  purple: 'fj-control-purple',
  teal: 'fj-control-teal',
}

const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { className = '', tone = 'default', ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={`fj-control ${toneClasses[tone]} ${className}`.trim()}
      {...props}
    />
  )
})

export default TextAreaField
