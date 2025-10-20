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
      <label className="block text-sm font-medium text-gray-700">
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
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
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
                ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
            }`}
            aria-label="Not recorded"
          >
            Not Recorded
          </button>
        )}
      </div>

      {helpText && (
        <p className="text-xs text-gray-500 mt-2">{helpText}</p>
      )}
    </div>
  )
}
