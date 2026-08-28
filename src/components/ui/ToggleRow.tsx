'use client'

import { useId, type ReactNode } from 'react'

interface ToggleRowProps {
  id: string
  label: string
  /** One line saying what turning this on actually does. */
  description?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Revealed beneath the row while on — the settings this toggle unlocks. */
  children?: ReactNode
}

/**
 * A single on/off setting as a full-width row.
 *
 * The whole row is the label, so the tap target is the row rather than the
 * 44px switch — it matters on a phone, and more so for the older eyes this app
 * is built for. Rows separate with a divider instead of each sitting in its own
 * bordered card: a settings list reads as a list, not as a stack of boxes.
 */
export default function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  children,
}: ToggleRowProps) {
  const descriptionId = useId()

  return (
    <div className="border-t border-border first:border-t-0">
      <label
        htmlFor={id}
        className={`flex items-center justify-between gap-4 py-3 min-h-[3rem] ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        }`}
      >
        <span className="min-w-0">
          <span className="block text-base font-medium text-foreground">{label}</span>
          {description && (
            <span id={descriptionId} className="mt-0.5 block text-sm text-text-secondary">
              {description}
            </span>
          )}
        </span>

        <span className="inline-flex flex-shrink-0 items-center">
          <input
            type="checkbox"
            id={id}
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            // The row is the label, so without this the accessible name would be
            // the label *and* the whole description read as one run-on phrase.
            // Naming it explicitly and describing it separately is what a screen
            // reader wants, and it costs the row nothing as a tap target.
            aria-label={label}
            aria-describedby={description ? descriptionId : undefined}
            className="sr-only peer"
          />
          {/* `relative` belongs here, on the track: the knob is this element's
              ::after and must position against it, not against whatever ancestor
              happens to be positioned. */}
          <span className="relative w-11 h-6 bg-surface-secondary peer-focus-visible:ring-4 peer-focus-visible:ring-amber-300 dark:peer-focus-visible:ring-amber-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></span>
        </span>
      </label>

      {/* Dependent settings sit inside the row's block so they read as belonging
          to it, and outside the <label> so their own inputs stay independently
          labelled. */}
      {checked && children && <div className="pb-4 space-y-4">{children}</div>}
    </div>
  )
}
