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
                : 'bg-sage-100 dark:bg-slate-700 text-foreground hover:bg-sage-200 dark:hover:bg-slate-600 active:bg-sage-300 dark:active:bg-slate-500'
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
            className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
              value === 0
                ? 'bg-sage-500 dark:bg-slate-500 text-white shadow-lg ring-2 ring-sage-400 dark:ring-slate-400'
                : 'bg-sage-100 dark:bg-slate-700 text-foreground hover:bg-sage-200 dark:hover:bg-slate-600 active:bg-sage-300 dark:active:bg-slate-500'
            }`}
            aria-label="Not recorded"
          >
            Not Recorded
          </button>
        )}
      </div>

      {helpText && (
        <p className="text-xs text-text-tertiary mt-2">{helpText}</p>
      )}
    </div>
  )
}
