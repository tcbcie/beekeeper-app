import { forwardRef, type SelectHTMLAttributes } from 'react'
import { FieldShell, useFieldSemantics, type FieldSemanticsProps } from './fieldSemantics'

type ControlTone = 'default' | 'danger' | 'purple' | 'teal'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldSemanticsProps {
  tone?: ControlTone
}

const toneClasses: Record<ControlTone, string> = {
  default: '',
  danger: 'fj-control-danger',
  purple: 'fj-control-purple',
  teal: 'fj-control-teal',
}

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  {
    className = '',
    children,
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
      <select
        ref={ref}
        id={semantics.controlId}
        aria-describedby={semantics.describedBy}
        aria-invalid={semantics.invalid || undefined}
        className={`fj-control ${toneClasses[resolvedTone]} ${className}`.trim()}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
})

export default SelectField
