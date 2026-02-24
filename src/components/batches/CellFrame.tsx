import { Dispatch, SetStateAction } from 'react'
import { Trash2, CheckSquare, Square, ChevronDown, ChevronUp, Grid3X3 } from 'lucide-react'
import { Graft, GRAFT_STATUSES, FRAME_STATUSES, FRAME_STATUS_VALUES, CUP_COLORS } from './graftConstants'

interface CellFrameProps {
  grafts: Graft[]
  frameRows?: number | null
  cellsPerRow?: number | null
  frameCollapsed: boolean
  setFrameCollapsed: Dispatch<SetStateAction<boolean>>
  selectMode: boolean
  selectedIds: Set<string>
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
  toggleSelect,
  selectAll,
  deselectAll,
  handleBulkStatusChange,
  handleBulkDateChange,
  handleBulkDelete,
  updateGraftStatus,
  updateGraftStatusDate,
  deleteGraft,
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
        <div className="flex flex-wrap items-center gap-2 p-3 bg-forest-50 dark:bg-forest-950/30 rounded-lg border border-forest-200 dark:border-forest-800 mb-4">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          <button type="button" onClick={selectAll} className="text-xs text-forest-600 dark:text-forest-400 hover:underline">
            Select All
          </button>
          {selectedIds.size > 0 && (
            <button type="button" onClick={deselectAll} className="text-xs text-text-secondary hover:underline">
              Deselect All
            </button>
          )}
          <span className="text-border">|</span>
          <select
            onChange={(e) => { if (e.target.value) { handleBulkStatusChange(e.target.value); e.target.value = '' } }}
            defaultValue=""
            className="px-2 py-1 text-xs border border-border rounded bg-surface text-foreground"
          >
            <option value="" disabled>Change Status...</option>
            {FRAME_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <input
            type="date"
            onChange={(e) => { if (e.target.value) handleBulkDateChange(e.target.value) }}
            className="px-2 py-1 text-xs border border-border rounded bg-surface text-foreground"
            title="Change date for selected"
          />
          <button
            type="button"
            onClick={handleBulkDelete}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}

      {/* Frame Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Cell Frame</span>
        <button
          type="button"
          onClick={() => setFrameCollapsed(prev => !prev)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-text-tertiary hover:text-foreground rounded"
        >
          {frameCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {frameCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {/* Frame Visualisation */}
      {!frameCollapsed && (
        <div className="overflow-x-auto">
          <div className="border-4 border-amber-700 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-2 sm:p-4 min-w-fit">
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
                          <button
                            type="button"
                            onClick={selectMode && isFrameStage ? () => toggleSelect(graft.id) : undefined}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              CUP_COLORS[graft.status] || 'bg-gray-200 text-gray-700'
                            } ${selectMode && isFrameStage ? 'cursor-pointer' : ''} ${
                              selectedIds.has(graft.id)
                                ? 'ring-2 ring-forest-500 ring-offset-1'
                                : ''
                            }`}
                            title={`#${graft.cell_number} - ${GRAFT_STATUSES.find(s => s.value === graft.status)?.label || graft.status}`}
                          >
                            {graft.cell_number}
                          </button>
                          {/* Status dropdown + delete (frame-stage grafts only) */}
                          {!selectMode && isFrameStage && (
                            <div className="flex flex-col items-center mt-1 gap-0.5">
                              <select
                                value={graft.status}
                                onChange={(e) => updateGraftStatus(graft.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-16 px-0 py-1 text-[10px] rounded border border-border bg-surface text-foreground text-center"
                              >
                                {FRAME_STATUSES.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                              <input
                                type="date"
                                value={graft.status_date || ''}
                                onChange={(e) => updateGraftStatusDate(graft.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-16 px-0 py-0.5 text-[10px] rounded border border-border bg-surface text-foreground text-center"
                              />
                              <div className="flex gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => deleteGraft(graft.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                  title="Delete"
                                >
                                  <Trash2 size={10} />
                                </button>
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
