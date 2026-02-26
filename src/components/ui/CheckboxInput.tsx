import { forwardRef, type InputHTMLAttributes } from 'react'

type CheckboxTone = 'default' | 'purple' | 'teal'

interface CheckboxInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  tone?: CheckboxTone
}

const toneClasses: Record<CheckboxTone, string> = {
  default: '',
  purple: 'fj-checkbox-purple',
  teal: 'fj-checkbox-teal',
}

const CheckboxInput = forwardRef<HTMLInputElement, CheckboxInputProps>(function CheckboxInput(
  { className = '', tone = 'default', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={`fj-checkbox ${toneClasses[tone]} ${className}`.trim()}
      {...props}
    />
  )
})

export default CheckboxInput
