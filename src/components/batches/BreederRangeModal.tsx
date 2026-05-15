'use client'

import { useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import { BatchBreederQueen } from './graftConstants'
import type { BreederRange } from '@/hooks/useBatchGrafts'

interface BreederRangeModalProps {
  breederQueens: BatchBreederQueen[]
  cellCount: number
  startCellNumber: number
  onConfirm: (ranges: BreederRange[]) => void
  onClose: () => void
}

interface DraftRow {
  queen_id: string
  queen_number: string
  start: string
  end: string
}

const evenSplit = (queens: BatchBreederQueen[], total: number): DraftRow[] => {
  const n = queens.length
  if (n === 0) return []
  const base = Math.floor(total / n)
  const extra = total - base * n
  const rows: DraftRow[] = []
  let cursor = 1
  for (let i = 0; i < n; i++) {
    const size = base + (i < extra ? 1 : 0)
    const start = size > 0 ? cursor : 0
    const end = size > 0 ? cursor + size - 1 : 0
    rows.push({
      queen_id: queens[i].queen_id,
      queen_number: queens[i].queen_number,
      start: start ? String(start) : '',
      end: end ? String(end) : '',
    })
    cursor += size
  }
  return rows
}

export default function BreederRangeModal({
  breederQueens,
  cellCount,
  startCellNumber,
  onConfirm,
  onClose,
}: BreederRangeModalProps) {
  const [rows, setRows] = useState<DraftRow[]>(() => evenSplit(breederQueens, cellCount))
  const [error, setError] = useState<string | null>(null)

  const endCellNumber = startCellNumber + cellCount - 1

  const updateRow = (index: number, key: 'start' | 'end', value: string) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [key]: value } : r))
    setError(null)
  }

  const parsedRanges = useMemo<BreederRange[] | null>(() => {
    // Strict positive-integer parse: reject "1.5", "1e3", "  1", "-1", etc.
    // Native <input type="number"> tolerates these in many browsers; the modal
    // must not silently round or accept them — bad data here means the wrong
    // cells get attributed to the wrong queen.
    const POSITIVE_INT = /^[1-9]\d*$/
    const parsed: BreederRange[] = []
    for (const r of rows) {
      const sRaw = r.start.trim()
      const eRaw = r.end.trim()
      if (sRaw === '' && eRaw === '') continue
      if (!POSITIVE_INT.test(sRaw) || !POSITIVE_INT.test(eRaw)) return null
      const s = Number(sRaw)
      const e = Number(eRaw)
      if (s > cellCount || e > cellCount) return null
      if (s > e) return null
      parsed.push({ queen_id: r.queen_id, start: s, end: e })
    }
    return parsed
  }, [rows, cellCount])

  const handleConfirm = () => {
    if (!parsedRanges) {
      setError(`Each range must be valid numbers between 1 and ${cellCount}, with start ≤ end.`)
      return
    }
    if (parsedRanges.length === 0) {
      setError('Assign at least one breeder queen to a cell range.')
      return
    }
    const sorted = [...parsedRanges].sort((a, b) => a.start - b.start)
    if (sorted[0].start !== 1) {
      setError(`Cells must be covered starting at 1 (cell ${startCellNumber}). Currently first covered: ${sorted[0].start}.`)
      return
    }
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const cur = sorted[i]
      if (cur.start !== prev.end + 1) {
        if (cur.start <= prev.end) {
          setError(`Ranges overlap between rows ending at ${prev.end} and starting at ${cur.start}.`)
        } else {
          setError(`Gap between cells ${prev.end} and ${cur.start} — every cell must be assigned.`)
        }
        return
      }
    }
    if (sorted[sorted.length - 1].end !== cellCount) {
      setError(`Ranges must cover all ${cellCount} cells (last covered: ${sorted[sorted.length - 1].end}).`)
      return
    }
    onConfirm(parsedRanges)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-surface dark:bg-surface-elevated shadow-xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Assign cells to breeder queens</h3>
          <p className="text-sm text-text-secondary mt-1">
            Cells {startCellNumber}–{endCellNumber} ({cellCount} total). Enter the start and end cell number for each queen (numbered 1–{cellCount} within this generation). Ranges must cover every cell with no gaps or overlaps.
          </p>
        </div>

        <div className="p-5 space-y-3">
          {rows.map((row, idx) => (
            <div key={row.queen_id} className="flex flex-wrap items-center gap-3">
              <div className="min-w-[8rem] flex-1 text-sm font-medium text-foreground">{row.queen_number}</div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-secondary">Start</label>
                <input
                  type="number"
                  min={1}
                  max={cellCount}
                  value={row.start}
                  onChange={(e) => updateRow(idx, 'start', e.target.value)}
                  className="w-20 px-2 py-1 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
                />
                <label className="text-xs text-text-secondary">End</label>
                <input
                  type="number"
                  min={1}
                  max={cellCount}
                  value={row.end}
                  onChange={(e) => updateRow(idx, 'end', e.target.value)}
                  className="w-20 px-2 py-1 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
                />
              </div>
            </div>
          ))}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          )}
        </div>

        <div className="p-5 border-t border-border flex justify-end gap-2">
          <Button type="button" onClick={onClose} tone="neutral" size="sm">Cancel</Button>
          <Button type="button" onClick={handleConfirm} tone="success" size="sm">Generate Cells</Button>
        </div>
      </div>
    </div>
  )
}
