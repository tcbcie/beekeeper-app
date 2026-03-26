import { Dispatch, SetStateAction } from 'react'
import { XCircle, Trash2, CheckSquare, Square, ChevronDown, ChevronUp, Grid3X3 } from 'lucide-react'
import { Graft, GRAFT_STATUSES, FRAME_STATUSES, FRAME_STATUS_VALUES, CUP_COLORS } from './graftConstants'
import Button from '@/components/ui/Button'

interface CellFrameProps {
  grafts: Graft[]
  frameRows?: number | null
  cellsPerRow?: number | null
  frameCollapsed: boolean
  setFrameCollapsed: Dispatch<SetStateAction<boolean>>
  selectMode: boolean
  selectedIds: Set<string>
  bulkStatusDraft: string
  bulkDateDraft: string
  toggleSelect: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
  handleBulkStatusChange: (newStatus: string) => void
  handleBulkDateChange: (date: string) => void
  handleBulkDelete: () => void
  updateGraftStatus: (graftId: string, newStatus: string) => void
  updateGraftStatusDate: (graftId: string, date: string) => void
  deleteGraft: (graftId: string) => void
}

export default function CellFrame({
  grafts,
  frameRows,
  cellsPerRow,
  frameCollapsed,
  setFrameCollapsed,
  selectMode,
  selectedIds,
  bulkStatusDraft,
  bulkDateDraft,
  toggleSelect,
  selectAll,
  deselectAll,
  handleBulkStatusChange,
  handleBulkDateChange,
  handleBulkDelete,
  updateGraftStatus,
  updateGraftStatusDate,
}: CellFrameProps) {
  if (grafts.length === 0) {
    return (
      <div className="border border-dashed border-amber-300 dark:border-amber-700 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 p-6 text-center">
        <Grid3X3 size={32} className="mx-auto mb-3 text-amber-600 dark:text-amber-400" />
        <h5 className="text-sm font-semibold text-foreground mb-1">Set Up Your Grafting Frame</h5>
        <p className="text-sm text-text-secondary mb-3">
          Generate individual cell records to track each graft&apos;s progress from cup to mated queen.
        </p>
        <ul className="text-xs text-text-tertiary space-y-1 max-w-xs mx-auto text-left">
          <li className="flex items-start gap-1.5">
            <span className="text-amber-600 dark:text-amber-400 mt-0.5">&#x2022;</span>
            Creates a tracking record for each cell in your frame
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-amber-600 dark:text-amber-400 mt-0.5">&#x2022;</span>
            Visual frame layout based on your row configuration
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-amber-600 dark:text-amber-400 mt-0.5">&#x2022;</span>
            Track status, queen marking, and distribution for each cell
          </li>
        </ul>
      </div>
    )
  }

  return (
    <div>
      {/* Bulk Action Bar */}
      {selectMode && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-forest-200 bg-forest-50 dark:border-forest-800 dark:bg-forest-950/20 p-3">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          <Button type="button" onClick={selectAll} className="text-xs text-forest-600 dark:text-forest-400 hover:underline">
            Select All
          </Button>
          {selectedIds.size > 0 && (
            <Button type="button" onClick={deselectAll} className="text-xs text-text-secondary hover:underline">
              Deselect All
            </Button>
          )}
          <span className="text-border">|</span>
          <select
            value={bulkStatusDraft}
            onChange={(e) => handleBulkStatusChange(e.target.value)}
            className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground dark:bg-surface-elevated"
          >
            <option value="">Change Status...</option>
            {FRAME_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={bulkDateDraft}
            onChange={(e) => handleBulkDateChange(e.target.value)}
            className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground dark:bg-surface-elevated"
            title="Change date for selected"
          />
          <Button
            type="button"
            onClick={handleBulkDelete}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
          >
            <Trash2 size={12} />
            Delete
          </Button>
        </div>
      )}

      {/* Frame Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Cell Frame</span>
        <Button
          type="button"
          onClick={() => setFrameCollapsed(prev => !prev)}
          className="flex items-center gap-1 rounded border border-border bg-surface/80 px-2 py-1.5 text-xs text-text-tertiary hover:bg-surface-elevated hover:text-foreground dark:bg-surface-elevated/80"
        >
          {frameCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {frameCollapsed ? 'Show' : 'Hide'}
        </Button>
      </div>

      {/* Frame Visualisation */}
      {!frameCollapsed && (
        <div className="overflow-x-auto">
          <div className="min-w-fit rounded-lg border-4 border-amber-700 bg-amber-50/90 p-2 shadow-inner dark:border-amber-800 dark:bg-amber-950/25 sm:p-4">
            {(() => {
              let rows: Graft[][]
              if (frameRows && cellsPerRow) {
                rows = Array.from({ length: frameRows }, (_, r) =>
                  grafts.slice(r * cellsPerRow, (r + 1) * cellsPerRow)
                ).filter(row => row.length > 0)
                const shown = frameRows * cellsPerRow
                if (grafts.length > shown) {
                  rows.push(grafts.slice(shown))
                }
              } else {
                rows = [grafts]
              }

              return rows.map((rowGrafts, rowIdx) => (
                <div key={rowIdx} className={rowIdx > 0 ? 'mt-4' : ''}>
                  {/* Horizontal bar */}
                  <div className="h-2 bg-amber-600 dark:bg-amber-700 rounded mx-2" />
                  {/* Cell cups hanging below */}
                  <div className="flex justify-between pt-1 px-2">
                    {rowGrafts.map(graft => {
                      const isFrameStage = FRAME_STATUS_VALUES.includes(graft.status)
                      return (
                        <div key={graft.id} className="flex flex-col items-center flex-1 min-w-0">
                          {/* Connector line */}
                          <div className="w-0.5 h-2 bg-amber-600 dark:bg-amber-700" />
                          {/* Select checkbox above cup (frame-stage grafts only) */}
                          {selectMode && isFrameStage && (
                            <div className="mb-0.5">
                              {selectedIds.has(graft.id)
                                ? <CheckSquare size={12} className="text-forest-600 dark:text-forest-400" />
                                : <Square size={12} className="text-text-tertiary" />
                              }
                            </div>
                          )}
                          {/* Cup */}
                          <Button
                            type="button"
                            onClick={selectMode && isFrameStage ? () => toggleSelect(graft.id) : undefined}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              CUP_COLORS[graft.status] || 'bg-surface-secondary text-text-secondary border border-border'
                            } ${selectMode && isFrameStage ? 'cursor-pointer' : ''} ${
                              selectedIds.has(graft.id)
                                ? 'ring-2 ring-forest-500 ring-offset-1'
                                : ''
                            }`}
                            title={`#${graft.cell_number} - ${GRAFT_STATUSES.find(s => s.value === graft.status)?.label || graft.status}`}
                          >
                            {graft.cell_number}
                          </Button>
                          {/* Status dropdown + delete (frame-stage grafts only) */}
                          {!selectMode && isFrameStage && (
                            <div className="flex flex-col items-center mt-1 gap-0.5">
                              <select
                                value={graft.status}
                                onChange={(e) => updateGraftStatus(graft.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-16 rounded border border-border bg-surface px-0 py-1 text-center text-[10px] text-foreground dark:bg-surface-elevated"
                              >
                                {FRAME_STATUSES.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                              <input
                                key={`${graft.id}-sd-${graft.status_date ?? ''}`}
                                type="date"
                                defaultValue={graft.status_date || ''}
                                onChange={(e) => updateGraftStatusDate(graft.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-16 rounded border border-border bg-surface px-0 py-0.5 text-center text-[10px] text-foreground dark:bg-surface-elevated"
                              />
                              <div className="flex gap-0.5">
                                <Button
                                  type="button"
                                  onClick={() => updateGraftStatus(graft.id, 'failed')}
                                  className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                                  title="Failed"
                                >
                                  <XCircle size={10} />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

