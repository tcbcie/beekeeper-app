// Shared visual helpers for queen trait displays (Report tab + Compare view).

export const colorBadgeClass = (color: string): string => {
  switch (color) {
    case 'White': return 'bg-surface-secondary text-text-primary border-border'
    case 'Yellow': return 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200 border-yellow-400 dark:border-yellow-700'
    case 'Red': return 'bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-200 border-red-400 dark:border-red-700'
    case 'Green': return 'bg-green-200 dark:bg-green-900/40 text-green-900 dark:text-green-200 border-green-400 dark:border-green-700'
    case 'Blue': return 'bg-blue-200 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 border-blue-400 dark:border-blue-700'
    default: return 'bg-surface-secondary text-text-primary border-border'
  }
}

export const TraitBar = ({ value }: { value: number | null }) => {
  const filled = value == null ? 0 : Math.round(value)
  return (
    <div className="flex gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-2 w-6 rounded-sm ${
            i <= filled
              ? 'bg-forest-500 dark:bg-forest-400'
              : 'bg-surface-secondary dark:bg-surface-elevated border border-border'
          }`}
        />
      ))}
    </div>
  )
}

export const formatRating = (value: number | null) =>
  value == null ? '—' : `${value.toFixed(1)} / 5`
