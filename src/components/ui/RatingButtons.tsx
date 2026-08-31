'use client'

interface RatingButtonsProps {
  value: number
  onChange: (value: number) => void
  label: string
  helpText?: string
  showNotRecorded?: boolean
}

export default function RatingButtons({
  value,
  onChange,
  label,
  helpText,
  showNotRecorded = true
}: RatingButtonsProps) {
  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text-secondary">
        {label}: {value === 0 ? 'Not Recorded' : renderStars(value)}
      </label>

      {/* Mobile: 3 columns for better touch targets, Desktop: 5-6 columns */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
              value === rating
                ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300'
                : 'bg-surface-secondary text-foreground hover:bg-surface-elevated active:bg-surface-elevated'
            }`}
            aria-label={`Rate ${rating} stars`}
          >
            {rating}
          </button>
        ))}
        {showNotRecorded && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
              value === 0
                ? 'bg-forest-600 text-white shadow-lg ring-2 ring-forest-300'
                : 'bg-surface-secondary text-foreground hover:bg-surface-elevated active:bg-surface-elevated'
            }`}
            aria-label="Not recorded"
          >
            Not Recorded
          </button>
        )}
      </div>

      {helpText && (
        <p className="text-sm text-text-tertiary mt-2">{helpText}</p>
      )}
    </div>
  )
}
