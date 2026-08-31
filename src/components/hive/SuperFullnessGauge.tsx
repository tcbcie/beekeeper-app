'use client'

interface SuperFullnessGaugeProps {
  /** Fullness percentage, 0-100. Values outside the range are clamped. */
  value: number
  /** Diameter in pixels. Defaults to 22 to fit inside the drawn super box. */
  size?: number
}

// Small circular ring gauge showing how full a honey super is, drawn beside
// the super on the hive card. Purely presentational — no state, no data access.
export default function SuperFullnessGauge({ value, size = 22 }: SuperFullnessGaugeProps) {
  const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
  const radius = 8
  const circumference = 2 * Math.PI * radius
  const dash = (clamped / 100) * circumference

  return (
    <span className="inline-flex items-center gap-1" title={`${Math.round(clamped)}% full`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 22 22"
        className="shrink-0"
        role="img"
        aria-label={`${Math.round(clamped)} percent full`}
      >
        <circle
          cx="11"
          cy="11"
          r={radius}
          fill="none"
          strokeWidth="3"
          className="stroke-amber-200 dark:stroke-amber-900"
        />
        <circle
          cx="11"
          cy="11"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 11 11)"
          className="stroke-amber-600 dark:stroke-amber-400"
        />
      </svg>
      <span className="text-sm font-bold text-amber-900 dark:text-amber-200 tabular-nums">
        {Math.round(clamped)}%
      </span>
    </span>
  )
}
