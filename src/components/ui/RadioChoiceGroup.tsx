import type { ChangeEventHandler, ReactNode } from 'react'

import RadioInput from '@/components/ui/RadioInput'

interface RadioChoiceGroupProps {
  children: ReactNode
  className?: string
}

interface RadioChoiceOptionProps {
  name: string
  value: string
  checked: boolean
  onChange: ChangeEventHandler<HTMLInputElement>
  title: ReactNode
  description?: ReactNode
  tone?: 'default' | 'blue' | 'green' | 'purple' | 'teal' | 'amber'
  icon?: ReactNode
  className?: string
  disabled?: boolean
}

export function RadioChoiceGroup({ children, className = '' }: RadioChoiceGroupProps) {
  return <div className={`grid grid-cols-1 gap-3 ${className}`.trim()}>{children}</div>
}

export function RadioChoiceOption({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  tone = 'default',
  icon,
  className = '',
  disabled = false,
}: RadioChoiceOptionProps) {
  const activeToneClass =
    tone === 'blue'
      ? 'fj-choice-option-active-blue'
      : tone === 'green'
        ? 'fj-choice-option-active-green'
        : tone === 'purple'
          ? 'fj-choice-option-active-purple'
          : tone === 'teal'
            ? 'fj-choice-option-active-teal'
            : tone === 'amber'
              ? 'fj-choice-option-active-amber'
              : 'fj-choice-option-active'

  return (
    <label
      className={`fj-choice-option ${checked ? activeToneClass : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`.trim()}
    >
      <RadioInput
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        tone={tone}
        disabled={disabled}
      />
      <span className="flex flex-col">
        <span className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-foreground">{title}</span>
        </span>
        {description && <span className="text-xs text-text-tertiary">{description}</span>}
      </span>
    </label>
  )
}
