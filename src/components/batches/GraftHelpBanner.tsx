import { X } from 'lucide-react'
import IconButton from '@/components/ui/IconButton'

interface GraftHelpBannerProps {
  show: boolean
  onClose: () => void
}

export default function GraftHelpBanner({ show, onClose }: GraftHelpBannerProps) {
  if (!show) return null

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 relative">
      <IconButton
        type="button"
        onClick={onClose}
        size="xs"
        className="absolute top-2 right-2 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
      >
        <X size={14} />
      </IconButton>
      <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">How Graft Tracking Works</h5>
      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded bg-surface-secondary border border-border font-medium">Grafted</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-green-200 dark:bg-green-900 font-medium">Accepted</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-cyan-200 dark:bg-cyan-900 font-medium">Sealed</span>
          <span>&rarr;</span>
          <span className="text-text-secondary">moves to table below</span>
        </div>
        <p><strong>Frame</strong> &mdash; tracks cells from grafting through to sealing. Mark cells as <em>Failed</em> if they don&apos;t take. Use <em>Select All</em> + <em>Change Status</em> to advance cells in bulk.</p>
        <p><strong>Queen Tracking Table</strong> &mdash; appears once cells are sealed. Track queen marking, assign queen numbers, change status (Caged &rarr; Emerged &rarr; In Nuc &rarr; Mated), and distribute queen cells or queens.</p>
      </div>
    </div>
  )
}
