'use client'

interface NumberSelectorProps {
  value: number | null
  onChange: (value: number | null) => void
  label: string
  min?: number
  max?: number
}

export default function NumberSelector({
  value,
  onChange,
  label,
  min = 1,
  max = 10
}: NumberSelectorProps) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min)

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label} {value !== null ? `(${value})` : ''}
      </label>

      {/* Mobile: 5 columns, Desktop: 10+ columns */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-11 gap-2">
        {numbers.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`min-h-[48px] min-w-[48px] sm:min-h-[52px] sm:min-w-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
              value === num
                ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
            }`}
            aria-label={`Select ${num}`}
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-sm transition-all touch-manipulation col-span-5 sm:col-span-2 md:col-span-1 ${
            value === null
              ? 'bg-gray-400 text-white shadow-lg ring-2 ring-gray-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
          }`}
          aria-label="Clear selection"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
