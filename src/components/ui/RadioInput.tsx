import { forwardRef, type InputHTMLAttributes } from 'react'

type RadioTone = 'default' | 'blue' | 'green' | 'purple' | 'teal' | 'amber'

interface RadioInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  tone?: RadioTone
}

const toneClasses: Record<RadioTone, string> = {
  default: '',
  blue: 'fj-radio-blue',
  green: 'fj-radio-green',
  purple: 'fj-radio-purple',
  teal: 'fj-radio-teal',
  amber: 'fj-radio-amber',
}

const RadioInput = forwardRef<HTMLInputElement, RadioInputProps>(function RadioInput(
  { className = '', tone = 'default', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type="radio"
      className={`fj-radio ${toneClasses[tone]} ${className}`.trim()}
      {...props}
    />
  )
})

export default RadioInput
