import type { ReactNode } from 'react'

/**
 * Keeps a list or detail screen's main action in thumb reach on a phone, pinned above the bottom
 * bar. On larger screens it sits in the page as usual.
 * The screen must leave room for it with `.pb-sticky-action`, or it will cover the last row.
 */
export default function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky-action-bar border-t border-border bg-surface/95 p-2 backdrop-blur-lg md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
      {children}
    </div>
  )
}
