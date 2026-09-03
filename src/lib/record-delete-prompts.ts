/**
 * One wording for every "delete this record" confirmation.
 *
 * Before Phase 4 these were seven near-identical native `confirm()` strings —
 * "Are you sure you want to delete this treatment?" and so on. Two problems
 * with that. The native dialogue cannot be styled, so it ignored the contrast
 * and target-size floors the rest of the application meets; and none of the
 * strings named the record, so on a list of ninety a beekeeper could not tell
 * which one they were about to destroy.
 *
 * Every prompt now names the hive and the date, and says plainly that the
 * action cannot be undone.
 */

interface DeletePromptInput {
  /** Lower-case noun phrase, e.g. 'inspection', 'varroa check'. */
  recordLabel: string
  hiveNumber?: string | null
  /** ISO date (YYYY-MM-DD) or a full timestamp. */
  date?: string | null
  /** Appended when deleting also changes something else. */
  consequence?: string
}

/**
 * Formats an ISO date as DD/MM/YYYY without going through `new Date()`.
 *
 * Parsing 'YYYY-MM-DD' as a Date treats it as UTC midnight, which renders as
 * the previous day for anyone west of Greenwich. Splitting the string avoids
 * that entirely, and every record date reaches us in this shape.
 */
function formatRecordDate(value?: string | null): string | null {
  if (!value) return null
  const [datePart] = value.split('T')
  const [year, month, day] = datePart.split('-')
  if (!year || !month || !day) return null
  return `${day}/${month}/${year}`
}

export function buildDeleteRecordPrompt({
  recordLabel,
  hiveNumber,
  date,
  consequence,
}: DeletePromptInput) {
  // Identify the record by whatever it actually has. A record with neither a
  // hive nor a date still gets a usable prompt rather than a dangling "from".
  const identity = [
    hiveNumber ? `hive ${hiveNumber}` : null,
    formatRecordDate(date) ? `recorded on ${formatRecordDate(date)}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  const subject = identity ? `the ${recordLabel} for ${identity}` : `this ${recordLabel}`

  return {
    title: `Delete this ${recordLabel}?`,
    message: `You are about to delete ${subject}. This cannot be undone.${
      consequence ? ` ${consequence}` : ''
    }`,
    confirmLabel: 'Delete',
    cancelLabel: 'Keep it',
    variant: 'danger' as const,
  }
}

/**
 * Deleting a hive removes it outright — there is no soft delete on `hives`, so
 * the row and its history go together. Archiving is the reversible option and
 * the prompt says so, because the two sat side by side on the card with no
 * indication that only one could be taken back.
 */
export function buildDeleteHivePrompt(hiveNumber?: string | null) {
  return {
    title: 'Delete this hive?',
    message: `${
      hiveNumber ? `Hive ${hiveNumber}` : 'This hive'
    } and its records will be permanently removed. This cannot be undone. To keep the history and stop tracking the hive, archive it instead.`,
    confirmLabel: 'Delete permanently',
    cancelLabel: 'Cancel',
    variant: 'danger' as const,
  }
}

/**
 * Unarchiving was implemented twice — natively on the hives list and through
 * the shared dialogue in `useHiveDetail`. The migrated wording is kept here so
 * the same action asks the same question from either screen.
 */
export function buildUnarchiveHivePrompt(hiveNumber?: string | null) {
  return {
    title: `Unarchive ${hiveNumber ? `hive ${hiveNumber}` : 'this hive'}?`,
    message:
      'The hive returns to your active list, its status is set back to active, and the archive date and reason are cleared.',
    confirmLabel: 'Unarchive',
    cancelLabel: 'Cancel',
    variant: 'warning' as const,
  }
}
