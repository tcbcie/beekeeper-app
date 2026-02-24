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
}

export const GRAFT_STATUSES = [
  { value: 'grafted', label: 'Grafted', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'sealed', label: 'Sealed', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  { value: 'caged', label: 'Caged', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'emerged', label: 'Emerged', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'in_nuc', label: 'In Nuc', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { value: 'mated', label: 'Mated', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  { value: 'sold', label: 'Distributed/Sold', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
]

export const FRAME_STATUSES = [
  { value: 'grafted', label: 'Grafted', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'sealed', label: 'Sealed', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
]

export const TABLE_STATUSES = [
  { value: 'sealed', label: 'Sealed', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  { value: 'caged', label: 'Caged', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'emerged', label: 'Emerged', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'in_nuc', label: 'In Nuc', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { value: 'mated', label: 'Mated', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  { value: 'sold', label: 'Distributed/Sold', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
]

export const FRAME_STATUS_VALUES = ['grafted', 'accepted']

export const DISTRIBUTABLE_STATUSES = ['sealed', 'caged', 'emerged', 'in_nuc', 'mated']

export const CUP_COLORS: Record<string, string> = {
  grafted: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  accepted: 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200',
  sealed: 'bg-cyan-200 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200',
  caged: 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  emerged: 'bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
  in_nuc: 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
  mated: 'bg-teal-200 dark:bg-teal-900 text-teal-800 dark:text-teal-200',
  failed: 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200',
  sold: 'bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
}

export const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  queen_cell: { label: 'Queen Cell', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  virgin_queen: { label: 'Virgin Queen', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  mated_queen: { label: 'Mated Queen', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
}

export const COLOUR_DOTS: Record<string, string> = {
  White: 'bg-gray-200 dark:bg-gray-400',
  Yellow: 'bg-yellow-400',
  Red: 'bg-red-500',
  Green: 'bg-green-500',
  Blue: 'bg-blue-500',
}

// Format date to Irish format (DD/MM/YYYY)
export const formatDateIrish = (dateString: string | null): string => {
  if (!dateString) return '-'
  const parts = dateString.split('T')[0].split('-')
  if (parts.length !== 3) return dateString
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}
