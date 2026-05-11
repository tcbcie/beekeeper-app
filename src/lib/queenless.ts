// Single source of truth for the queenless-reason workflow.
//
// Used by the hive form (option list), the submit handler (mapping the chosen
// reason onto the linked queen's status for lineage accuracy) and the badge
// surfaces (short label for the red pill on cards / detail / apiary pages).

export const QUEENLESS_REASONS = [
  { value: 'swarmed', formLabel: 'Swarmed', shortLabel: 'Swarmed', queenStatus: 'swarmed' },
  { value: 'superseded', formLabel: 'Superseded', shortLabel: 'Superseded', queenStatus: 'superseded' },
  { value: 'dead', formLabel: 'Queen died', shortLabel: 'Dead', queenStatus: 'dead' },
  { value: 'failed', formLabel: 'Failed (drone-laying / poor laying)', shortLabel: 'Failed', queenStatus: 'retired' },
  { value: 'removed', formLabel: 'Removed (requeening)', shortLabel: 'Removed', queenStatus: 'retired' },
  { value: 'unknown', formLabel: 'Unknown', shortLabel: 'Unknown', queenStatus: 'retired' },
] as const

export type QueenlessReason = (typeof QUEENLESS_REASONS)[number]['value']

const REASON_BY_VALUE: Map<string, (typeof QUEENLESS_REASONS)[number]> = new Map(
  QUEENLESS_REASONS.map((r) => [r.value, r])
)

// Short pill text. Returns "Queenless" alone for null / unknown / unrecognised
// values so the badge stays terse when there is nothing useful to add.
export function formatQueenlessLabel(reason: string | null | undefined): string {
  if (!reason || reason === 'unknown') return 'Queenless'
  const match = REASON_BY_VALUE.get(reason)
  return match ? `Queenless (${match.shortLabel})` : 'Queenless'
}

// Map the reason onto the queen's own status so her record tells the truthful
// story for lineage analysis. Unknown reasons fall through to 'retired'.
export function mapReasonToQueenStatus(reason: string | null | undefined): string {
  if (!reason) return 'retired'
  return REASON_BY_VALUE.get(reason)?.queenStatus ?? 'retired'
}
