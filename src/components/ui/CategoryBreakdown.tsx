'use client'

import Panel from '@/components/ui/Panel'
import { formatMoney } from '@/lib/crm-currency'

export interface CategoryAmount {
  name: string
  amount: number
}

interface CategoryBreakdownProps {
  title: string
  /** Short note on the right of the title, e.g. "All income". */
  caption?: string
  /** Ungrouped rows; amounts with the same name are added together. */
  items: CategoryAmount[]
  isUkNi: boolean
  /** Shown when nothing adds up above zero. Without it the panel is hidden. */
  emptyText?: string
}

/**
 * Money by category as a ranked bar list, largest first. Shared by Profit & Loss
 * and CRM Sales Insights so both screens group, sort and draw it the same way.
 */
export default function CategoryBreakdown({ title, caption, items, isUkNi, emptyText }: CategoryBreakdownProps) {
  const totals = new Map<string, number>()
  for (const { name, amount } of items) {
    totals.set(name, (totals.get(name) || 0) + (Number(amount) || 0))
  }
  const rows = [...totals]
    .filter(([, amount]) => amount > 0)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
  const max = rows.length > 0 ? rows[0].amount : 0

  if (rows.length === 0 && !emptyText) return null

  return (
    <Panel padding="md">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {caption && <span className="text-sm text-text-tertiary">{caption}</span>}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-text-tertiary">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.name}>
              <div className="flex items-center justify-between gap-3 text-sm mb-1">
                <span className="text-text-secondary">{r.name}</span>
                <span className="font-medium text-foreground tabular-nums">{formatMoney(r.amount, isUkNi)}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-elevated overflow-hidden" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-forest-500"
                  style={{ width: `${max > 0 ? Math.max(4, (r.amount / max) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
