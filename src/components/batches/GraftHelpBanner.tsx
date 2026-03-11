import { X } from 'lucide-react'
import IconButton from '@/components/ui/IconButton'
import { GRAFT_STATUSES } from './graftConstants'

interface GraftHelpBannerProps {
  show: boolean
  onClose: () => void
}

const getStatusChipClassName = (statusValue: 'grafted' | 'accepted' | 'sealed') =>
  GRAFT_STATUSES.find((status) => status.value === statusValue)?.color ||
  'border border-border bg-surface-secondary text-foreground'

export default function GraftHelpBanner({ show, onClose }: GraftHelpBannerProps) {
  if (!show) return null

  return (
    <div className="relative rounded-xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-800/80 dark:bg-blue-950/25">
      <IconButton
        type="button"
        onClick={onClose}
        size="xs"
        className="absolute right-2 top-2 text-blue-500 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-300/80 dark:hover:bg-blue-900/40 dark:hover:text-blue-200"
      >
        <X size={14} />
      </IconButton>
      <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">How Graft Tracking Works</h5>
      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`rounded px-2 py-0.5 font-medium ${getStatusChipClassName('grafted')}`}>Grafted</span>
          <span className="text-blue-400 dark:text-blue-500">&rarr;</span>
          <span className={`rounded px-2 py-0.5 font-medium ${getStatusChipClassName('accepted')}`}>Accepted</span>
          <span className="text-blue-400 dark:text-blue-500">&rarr;</span>
          <span className={`rounded px-2 py-0.5 font-medium ${getStatusChipClassName('sealed')}`}>Sealed</span>
          <span>&rarr;</span>
          <span className="text-text-secondary">moves to table below</span>
        </div>
        <p><strong>Frame</strong> &mdash; tracks cells from grafting through to sealing. Mark cells as <em>Failed</em> if they don&apos;t take. Use <em>Select All</em> + <em>Change Status</em> to advance cells in bulk.</p>
        <p><strong>Queen Tracking Table</strong> &mdash; appears once cells are sealed. Track queen marking, assign queen numbers, change status (Caged &rarr; Emerged &rarr; In Nuc &rarr; Mated), and distribute queen cells or queens.</p>
      </div>
    </div>
  )
}
