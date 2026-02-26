import { forwardRef, type SelectHTMLAttributes } from 'react'

type ControlTone = 'default' | 'danger' | 'purple' | 'teal'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  tone?: ControlTone
}

const toneClasses: Record<ControlTone, string> = {
  default: '',
  danger: 'fj-control-danger',
  purple: 'fj-control-purple',
  teal: 'fj-control-teal',
}

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { className = '', children, tone = 'default', ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={`fj-control ${toneClasses[tone]} ${className}`.trim()}
      {...props}
    >
      {children}
    </select>
  )
})

export default SelectField
