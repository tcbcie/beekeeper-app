export type GraftStatus = 'grafted' | 'accepted' | 'sealed' | 'caged' | 'emerged' | 'in_nuc' | 'mated' | 'failed' | 'sold'

export interface Graft {
  id: string
  batch_id: string
  cell_number: number
  status: GraftStatus
  status_date: string | null
  notes: string | null
  queen_marked: boolean
  queen_number: string | null
  breeder_queen_id: string | null
  latest_weight_mg?: number | null
}

export interface BatchBreederQueen {
  queen_id: string
  queen_number: string
}

const STATUS_CHIP_CLASSES = {
  grafted: 'bg-surface-secondary text-foreground border border-border dark:bg-surface-elevated dark:text-foreground dark:border-border',
  accepted: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  sealed: 'bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
  caged: 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  emerged: 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  in_nuc: 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  mated: 'bg-teal-100 text-teal-800 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  failed: 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  sold: 'bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
} as const

const STATUS_CUP_CLASSES: Record<string, string> = {
  grafted: 'bg-surface-secondary text-foreground border border-border dark:bg-surface-elevated dark:text-foreground dark:border-border',
  accepted: 'bg-green-200 text-green-900 border border-green-300 dark:bg-green-900/45 dark:text-green-200 dark:border-green-700',
  sealed: 'bg-cyan-200 text-cyan-900 border border-cyan-300 dark:bg-cyan-900/45 dark:text-cyan-200 dark:border-cyan-700',
  caged: 'bg-blue-200 text-blue-900 border border-blue-300 dark:bg-blue-900/45 dark:text-blue-200 dark:border-blue-700',
  emerged: 'bg-purple-200 text-purple-900 border border-purple-300 dark:bg-purple-900/45 dark:text-purple-200 dark:border-purple-700',
  in_nuc: 'bg-amber-200 text-amber-900 border border-amber-300 dark:bg-amber-900/45 dark:text-amber-200 dark:border-amber-700',
  mated: 'bg-teal-200 text-teal-900 border border-teal-300 dark:bg-teal-900/45 dark:text-teal-200 dark:border-teal-700',
  failed: 'bg-red-200 text-red-900 border border-red-300 dark:bg-red-900/45 dark:text-red-200 dark:border-red-700',
  sold: 'bg-indigo-200 text-indigo-900 border border-indigo-300 dark:bg-indigo-900/45 dark:text-indigo-200 dark:border-indigo-700',
}

export const GRAFT_STATUSES = [
  { value: 'grafted', label: 'Grafted', color: STATUS_CHIP_CLASSES.grafted },
  { value: 'accepted', label: 'Accepted', color: STATUS_CHIP_CLASSES.accepted },
  { value: 'sealed', label: 'Sealed', color: STATUS_CHIP_CLASSES.sealed },
  { value: 'caged', label: 'Caged', color: STATUS_CHIP_CLASSES.caged },
  { value: 'emerged', label: 'Emerged', color: STATUS_CHIP_CLASSES.emerged },
  { value: 'in_nuc', label: 'In Nuc', color: STATUS_CHIP_CLASSES.in_nuc },
  { value: 'mated', label: 'Mated', color: STATUS_CHIP_CLASSES.mated },
  { value: 'failed', label: 'Failed', color: STATUS_CHIP_CLASSES.failed },
  { value: 'sold', label: 'Distributed/Sold', color: STATUS_CHIP_CLASSES.sold },
]

export const FRAME_STATUSES = [
  { value: 'grafted', label: 'Grafted', color: STATUS_CHIP_CLASSES.grafted },
  { value: 'accepted', label: 'Accepted', color: STATUS_CHIP_CLASSES.accepted },
  { value: 'sealed', label: 'Sealed', color: STATUS_CHIP_CLASSES.sealed },
  { value: 'failed', label: 'Failed', color: STATUS_CHIP_CLASSES.failed },
]

export const TABLE_STATUSES = [
  { value: 'sealed', label: 'Sealed', color: STATUS_CHIP_CLASSES.sealed },
  { value: 'caged', label: 'Caged', color: STATUS_CHIP_CLASSES.caged },
  { value: 'emerged', label: 'Emerged', color: STATUS_CHIP_CLASSES.emerged },
  { value: 'in_nuc', label: 'In Nuc', color: STATUS_CHIP_CLASSES.in_nuc },
  { value: 'mated', label: 'Mated', color: STATUS_CHIP_CLASSES.mated },
  { value: 'failed', label: 'Failed', color: STATUS_CHIP_CLASSES.failed },
  { value: 'sold', label: 'Distributed/Sold', color: STATUS_CHIP_CLASSES.sold },
]

export const FRAME_STATUS_VALUES = ['grafted', 'accepted']

// mating_nuc status values that imply the queen has emerged (hatched) / mated.
// Used by the batch + report count hooks so a nuc promoted straight to one of
// these statuses (without an inspection that stamps queen_emerged_at /
// mating_confirmed_at) is still counted.
export const NUC_HATCHED_STATUSES = ['virgin', 'mating', 'laying']
export const NUC_MATED_STATUSES = ['mating', 'laying']

export type NucSignalRow = {
  graft_id: string | null
  status: string | null
  queen_emerged_at: string | null
  mating_confirmed_at: string | null
}

// Single source of truth for deriving which grafts have an emerged (hatched) or
// mated queen from their linked mating_nucs rows. A nuc signals via an inspection
// timestamp (queen_emerged_at / mating_confirmed_at) or via its own status
// (virgin/mating/laying). Returns sets keyed by graft_id, so multiple nuc rows per
// graft (no UNIQUE constraint on graft_id) collapse to one — any signal wins.
export function buildNucSignalSets(rows: NucSignalRow[]): { hatched: Set<string>; mated: Set<string> } {
  const hatched = new Set<string>()
  const mated = new Set<string>()
  for (const n of rows) {
    if (!n.graft_id) continue
    if (n.queen_emerged_at || n.mating_confirmed_at || (n.status && NUC_HATCHED_STATUSES.includes(n.status))) hatched.add(n.graft_id)
    if (n.mating_confirmed_at || (n.status && NUC_MATED_STATUSES.includes(n.status))) mated.add(n.graft_id)
  }
  return { hatched, mated }
}

export const MARKABLE_STATUSES = ['emerged', 'in_nuc', 'mated']

export const DISTRIBUTABLE_STATUSES = ['sealed', 'caged', 'emerged', 'in_nuc', 'mated']

export const CUP_COLORS: Record<string, string> = STATUS_CUP_CLASSES

export const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  queen_cell: { label: 'Queen Cell', color: STATUS_CHIP_CLASSES.caged },
  virgin_queen: { label: 'Virgin Queen', color: STATUS_CHIP_CLASSES.emerged },
  mated_queen: { label: 'Mated Queen', color: STATUS_CHIP_CLASSES.mated },
}

export const COLOUR_DOTS: Record<string, string> = {
  White: 'bg-white border border-slate-300 dark:bg-white dark:border-slate-300',
  Yellow: 'bg-yellow-400',
  Red: 'bg-red-500',
  Green: 'bg-green-500',
  Blue: 'bg-blue-500',
}

// Format date to Irish format (DD/MM/YYYY)
export { formatDateIrish } from '@/lib/date-utils'
