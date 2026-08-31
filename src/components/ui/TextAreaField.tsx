import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { FieldShell, useFieldSemantics, type FieldSemanticsProps } from './fieldSemantics'

type ControlTone = 'default' | 'danger' | 'purple' | 'teal'

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldSemanticsProps {
  tone?: ControlTone
}

const toneClasses: Record<ControlTone, string> = {
  default: '',
  danger: 'fj-control-danger',
  purple: 'fj-control-purple',
  teal: 'fj-control-teal',
}

const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  {
    className = '',
    tone = 'default',
    label,
    helpText,
    error,
    id,
    'aria-describedby': ariaDescribedBy,
    ...props
  },
  ref
) {
  const semantics = useFieldSemantics({ id, label, helpText, error, describedBy: ariaDescribedBy })
  const resolvedTone = semantics.invalid ? 'danger' : tone

  return (
    <FieldShell
      semantics={semantics}
      label={label}
      helpText={helpText}
      error={error}
      required={props.required}
    >
      <textarea
        ref={ref}
        id={semantics.controlId}
        aria-describedby={semantics.describedBy}
        aria-invalid={semantics.invalid || undefined}
        className={`fj-control ${toneClasses[resolvedTone]} ${className}`.trim()}
        {...props}
      />
    </FieldShell>
  )
})

export default TextAreaField
