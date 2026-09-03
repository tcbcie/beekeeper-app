import type { Hive } from '@/types/hive'

/**
 * Whether the queen in this hive is clipped.
 *
 * There are two clipped flags, and which one is authoritative depends on the
 * hive — because the interface only lets you edit one of them at a time.
 *
 * `HiveFormSection` shows its ✂ Queen Clipped toggle **only when the hive has no
 * linked queen record and is not queenless**, so for a hive with an assigned
 * queen the beekeeper's only way to record clipping is the queen form, which
 * writes `queens.queen_clipped`. For a hive without one, the hive form's toggle
 * writes `hives.queen_clipped`.
 *
 * Reading a single column therefore misses whichever population the other one
 * covers: the queen record for the 108 hives that have one, the hive flag for
 * the 185 that do not. Reading both the way they are written is the only rule
 * that matches what the beekeeper actually did.
 *
 * A queenless hive has no queen to clip, so it reports false regardless — again
 * mirroring the form, which hides the toggle in that state.
 */
export function isQueenClipped(hive: Pick<Hive, 'queens' | 'queen_clipped' | 'is_queenless'>): boolean {
  if (hive.is_queenless) return false
  if (hive.queens?.id) return Boolean(hive.queens.queen_clipped)
  return Boolean(hive.queen_clipped)
}
