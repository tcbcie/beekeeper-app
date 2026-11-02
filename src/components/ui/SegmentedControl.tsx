'use client'

interface SegmentedControlProps<T extends string> {
  label: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}

/** A small set of mutually exclusive views, which stays on one line rather than wrapping like tabs. */
export default function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-border bg-surface-secondary p-1">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={`min-h-[48px] min-w-0 flex-1 truncate rounded-md px-3 text-sm font-semibold ${
            option.value === value
              ? 'bg-forest-800 text-white'
              : 'text-text-primary'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
