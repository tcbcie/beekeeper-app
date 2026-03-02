import { Dispatch, SetStateAction, useState } from 'react'
import { Trash2, Send, CheckSquare, Square, Lock, LockOpen } from 'lucide-react'
import Button from '@/components/ui/Button'
import {
  Graft,
  GRAFT_STATUSES,
  TABLE_STATUSES,
  DISTRIBUTABLE_STATUSES,
  MARKABLE_STATUSES,
  COLOUR_DOTS,
  formatDateIrish,
} from './graftConstants'

interface QueenTrackingSectionProps {
  grafts: Graft[]
  tableGrafts: Graft[]
  distributedGraftIds: Set<string>
  unlockedGraftIds: Set<string>
  setUnlockedGraftIds: Dispatch<SetStateAction<Set<string>>>
  markingColour: string
  emergenceYear: number | null
  distLoading: boolean
  // Table selection
  tableSelectMode: boolean
  setTableSelectMode: (v: boolean) => void
  tableSelectedIds: Set<string>
  toggleTableSelect: (id: string) => void
  selectAllTable: () => void
  deselectAllTable: () => void
  exitSelectMode: () => void
  exitTableSelectMode: () => void
  // Table bulk
  handleTableBulkStatusChange: (newStatus: string, date?: string) => void
  handleTableBulkQueenMarked: (marked: boolean) => void
  handleTableBulkDelete: () => void
  setBulkDistributeGrafts: (grafts: Graft[] | null) => void
  // Row actions
  updateGraftStatus: (graftId: string, newStatus: string) => void
  updateGraftStatusDate: (graftId: string, date: string) => void
  updateGraftQueenMarked: (graftId: string, marked: boolean) => void
  updateGraftQueenNumber: (graftId: string, queenNumber: string) => void
  deleteGraft: (graftId: string) => void
  setDistributeGraft: (graft: Graft | null) => void
}

export default function QueenTrackingSection({
  grafts,
  tableGrafts,
  distributedGraftIds,
  unlockedGraftIds,
  setUnlockedGraftIds,
  markingColour,
  emergenceYear,
  distLoading,
  tableSelectMode,
  setTableSelectMode,
  tableSelectedIds,
  toggleTableSelect,
  selectAllTable,
  deselectAllTable,
  exitSelectMode,
  exitTableSelectMode,
  handleTableBulkStatusChange,
  handleTableBulkQueenMarked,
  handleTableBulkDelete,
  setBulkDistributeGrafts,
  updateGraftStatus,
  updateGraftStatusDate,
  updateGraftQueenMarked,
  updateGraftQueenNumber,
  deleteGraft,
  setDistributeGraft,
}: QueenTrackingSectionProps) {
  if (tableGrafts.length === 0) return null

  const [bulkDate, setBulkDate] = useState(() => new Date().toISOString().split('T')[0])

  return (
    <div className="pt-4 border-t border-border">
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-sm font-semibold text-foreground">Queen Tracking ({tableGrafts.length})</h4>
        <Button
          type="button"
          onClick={() => { if (tableSelectMode) { exitTableSelectMode() } else { exitSelectMode(); setTableSelectMode(true) } }}
          className={`px-3 py-1.5 text-sm rounded font-medium flex items-center gap-1 ${
            tableSelectMode
              ? 'bg-forest-600 text-white hover:bg-forest-700'
              : 'border border-forest-600 text-forest-600 dark:border-forest-400 dark:text-forest-400 hover:bg-forest-50 dark:hover:bg-forest-950/30'
          }`}
        >
          <CheckSquare size={14} />
          {tableSelectMode ? 'Done' : 'Bulk Actions'}
        </Button>
      </div>

      {/* Marking Colour Note */}
      {markingColour && emergenceYear && !isNaN(emergenceYear) && (
        <p className="text-xs text-text-secondary mb-2 flex items-center gap-1.5">
          Marking colour for this batch:
          <span className={`inline-block w-3 h-3 rounded-full ${COLOUR_DOTS[markingColour] || ''}`} />
          <span className="font-semibold">{markingColour}</span>
          ({emergenceYear})
        </p>
      )}

      {/* Table Bulk Action Bar */}
      {tableSelectMode && (
        <div className="flex flex-wrap items-center gap-2 p-3 mb-3 bg-forest-50 dark:bg-forest-950/30 rounded-lg border border-forest-200 dark:border-forest-800">
          <span className="text-sm font-medium text-foreground">{tableSelectedIds.size} selected</span>
          <Button type="button" onClick={selectAllTable} className="text-xs text-forest-600 dark:text-forest-400 hover:underline">
            Select All
          </Button>
          {tableSelectedIds.size > 0 && (
            <Button type="button" onClick={deselectAllTable} className="text-xs text-text-secondary hover:underline">
              Deselect All
            </Button>
          )}
          <span className="text-border">|</span>
          <input
            type="date"
            value={bulkDate}
            onChange={(e) => setBulkDate(e.target.value)}
            className="px-2 py-1 text-xs border border-border rounded bg-surface text-foreground"
          />
          <select
            onChange={(e) => { if (e.target.value) { handleTableBulkStatusChange(e.target.value, bulkDate); e.target.value = '' } }}
            defaultValue=""
            className="px-2 py-1 text-xs border border-border rounded bg-surface text-foreground"
          >
            <option value="" disabled>Change Status...</option>
            {TABLE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <Button
            type="button"
            onClick={() => handleTableBulkQueenMarked(true)}
            disabled={tableSelectedIds.size === 0}
            className="px-2 py-1 text-xs bg-forest-600 text-white rounded hover:bg-forest-700 disabled:opacity-50"
          >
            Mark All
          </Button>
          <Button
            type="button"
            onClick={() => handleTableBulkQueenMarked(false)}
            disabled={tableSelectedIds.size === 0}
            className="px-2 py-1 text-xs bg-surface-secondary text-foreground rounded hover:bg-surface-elevated disabled:opacity-50"
          >
            Unmark All
          </Button>
          {tableSelectedIds.size > 0 && Array.from(tableSelectedIds).every(id => {
            const g = grafts.find(gr => gr.id === id)
            return g && DISTRIBUTABLE_STATUSES.includes(g.status)
          }) && (
            <Button
              type="button"
              onClick={() => {
                const selected = grafts.filter(g => tableSelectedIds.has(g.id))
                setBulkDistributeGrafts(selected)
              }}
              className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
            >
              <Send size={12} />
              Distribute
            </Button>
          )}
          <Button
            type="button"
            onClick={handleTableBulkDelete}
            disabled={tableSelectedIds.size === 0}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
          >
            <Trash2 size={12} />
            Delete
          </Button>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-secondary">
            <tr>
              {tableSelectMode && <th className="px-2 py-2 w-8" />}
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Cell #</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Last Update</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Queen Marked</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Queen Number</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tableGrafts.map(graft => {
              const isDistributed = distributedGraftIds.has(graft.id) || graft.status === 'sold'
              const isLockedByFailed = graft.status === 'failed'
              const isLocked = (isDistributed || isLockedByFailed) && !unlockedGraftIds.has(graft.id)
              const canMark = MARKABLE_STATUSES.includes(graft.status)
              return (
                <tr key={graft.id} className={`hover:bg-surface-secondary ${tableSelectedIds.has(graft.id) ? 'ring-1 ring-inset ring-forest-500 bg-forest-50/50 dark:bg-forest-950/20' : ''} ${isLocked ? 'opacity-60' : ''}`}>
                  {tableSelectMode && (
                    <td className="px-2 py-2">
                      {!isLocked && (
                        <Button type="button" onClick={() => toggleTableSelect(graft.id)}>
                          {tableSelectedIds.has(graft.id)
                            ? <CheckSquare size={16} className="text-forest-600 dark:text-forest-400" />
                            : <Square size={16} className="text-text-tertiary" />
                          }
                        </Button>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2 text-sm font-medium text-foreground">#{graft.cell_number}</td>
                  <td className="px-3 py-2">
                    {isLocked ? (
                      isLockedByFailed ? (
                        <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 font-medium">
                          Failed
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-medium">
                          Distributed
                        </span>
                      )
                    ) : (
                      <select
                        value={graft.status}
                        onChange={(e) => updateGraftStatus(graft.id, e.target.value)}
                        className="px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
                      >
                        {TABLE_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isLocked ? (
                      <span className="text-xs text-text-secondary">{graft.status_date ? formatDateIrish(graft.status_date) : '-'}</span>
                    ) : (
                      <input
                        key={`${graft.id}-sd-${graft.status_date ?? ''}`}
                        type="date"
                        defaultValue={graft.status_date || ''}
                        onChange={(e) => updateGraftStatusDate(graft.id, e.target.value)}
                        className="w-32 px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={graft.queen_marked}
                      onChange={(e) => updateGraftQueenMarked(graft.id, e.target.checked)}
                      className="h-4 w-4 rounded border-border text-forest-600 focus:ring-forest-500"
                      disabled={isLocked || !canMark}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {(isLocked || !canMark) ? (
                      <span className="text-xs text-text-secondary">{graft.queen_number || '-'}</span>
                    ) : (
                      <input
                        key={`${graft.id}-qn-${graft.queen_number ?? ''}`}
                        type="text"
                        defaultValue={graft.queen_number || ''}
                        onBlur={(e) => {
                          const val = e.target.value.trim()
                          if (val !== (graft.queen_number || '')) {
                            updateGraftQueenNumber(graft.id, val)
                          }
                        }}
                        placeholder="Enter number..."
                        className="w-28 px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-1 justify-end items-center">
                      {(isDistributed || isLockedByFailed) && (
                        <Button
                          type="button"
                          onClick={() => setUnlockedGraftIds(prev => {
                            const next = new Set(prev)
                            if (next.has(graft.id)) next.delete(graft.id)
                            else next.add(graft.id)
                            return next
                          })}
                          className="p-1.5 text-text-tertiary hover:text-foreground hover:bg-surface-secondary rounded"
                          title={isLocked ? 'Unlock row' : 'Lock row'}
                        >
                          {isLocked ? <Lock size={14} /> : <LockOpen size={14} />}
                        </Button>
                      )}
                      {!isLocked && !distLoading && DISTRIBUTABLE_STATUSES.includes(graft.status) && !isDistributed && (
                        <Button
                          type="button"
                          onClick={() => setDistributeGraft(graft)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                          title="Distribute"
                        >
                          <Send size={14} />
                        </Button>
                      )}
                      {!isLocked && (
                        <Button
                          type="button"
                          onClick={() => deleteGraft(graft.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {tableGrafts.map(graft => {
          const statusInfo = GRAFT_STATUSES.find(s => s.value === graft.status)
          const isDistributed = distributedGraftIds.has(graft.id) || graft.status === 'sold'
          const isLockedByFailed = graft.status === 'failed'
          const isLocked = (isDistributed || isLockedByFailed) && !unlockedGraftIds.has(graft.id)
          const canMark = MARKABLE_STATUSES.includes(graft.status)
          return (
            <div key={graft.id} className={`p-3 bg-surface-elevated rounded-lg border border-border space-y-2 ${tableSelectedIds.has(graft.id) ? 'ring-1 ring-forest-500 bg-forest-50/50 dark:bg-forest-950/20' : ''} ${isLocked ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {tableSelectMode && !isLocked && (
                    <Button type="button" onClick={() => toggleTableSelect(graft.id)}>
                      {tableSelectedIds.has(graft.id)
                        ? <CheckSquare size={16} className="text-forest-600 dark:text-forest-400" />
                        : <Square size={16} className="text-text-tertiary" />
                      }
                    </Button>
                  )}
                  <span className="text-sm font-medium text-foreground">Cell #{graft.cell_number}</span>
                </div>
                {isLocked ? (
                  isLockedByFailed ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                      Failed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                      Distributed
                    </span>
                  )
                ) : (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo?.color || ''}`}>
                    {statusInfo?.label || graft.status}
                  </span>
                )}
              </div>
              {!isLocked && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-text-secondary">Status</label>
                    <select
                      value={graft.status}
                      onChange={(e) => updateGraftStatus(graft.id, e.target.value)}
                      className="px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
                    >
                      {TABLE_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-text-secondary">Last Update</label>
                    <input
                      key={`${graft.id}-sd-${graft.status_date ?? ''}`}
                      type="date"
                      defaultValue={graft.status_date || ''}
                      onChange={(e) => updateGraftStatusDate(graft.id, e.target.value)}
                      className="w-28 sm:w-32 px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-text-secondary">Queen Marked</label>
                    <input
                      type="checkbox"
                      checked={graft.queen_marked}
                      onChange={(e) => updateGraftQueenMarked(graft.id, e.target.checked)}
                      className="h-4 w-4 rounded border-border text-forest-600 focus:ring-forest-500"
                      disabled={!canMark}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-text-secondary shrink-0">Queen Number</label>
                    {canMark ? (
                    <input
                      key={`${graft.id}-qn-${graft.queen_number ?? ''}`}
                      type="text"
                      defaultValue={graft.queen_number || ''}
                      onBlur={(e) => {
                        const val = e.target.value.trim()
                        if (val !== (graft.queen_number || '')) {
                          updateGraftQueenNumber(graft.id, val)
                        }
                      }}
                      placeholder="Enter number..."
                      className="w-24 sm:w-28 px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
                    />
                    ) : (
                      <span className="text-xs text-text-secondary">{graft.queen_number || '-'}</span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-1 pt-1 border-t border-border items-center">
                {(isDistributed || isLockedByFailed) && (
                  <Button
                    type="button"
                    onClick={() => setUnlockedGraftIds(prev => {
                      const next = new Set(prev)
                      if (next.has(graft.id)) next.delete(graft.id)
                      else next.add(graft.id)
                      return next
                    })}
                    className="px-2 py-1 text-xs text-text-tertiary hover:text-foreground hover:bg-surface-secondary rounded flex items-center gap-1"
                  >
                    {isLocked ? <Lock size={12} /> : <LockOpen size={12} />}
                    {isLocked ? 'Unlock' : 'Lock'}
                  </Button>
                )}
                {!isLocked && !distLoading && DISTRIBUTABLE_STATUSES.includes(graft.status) && !isDistributed && (
                  <Button
                    type="button"
                    onClick={() => setDistributeGraft(graft)}
                    className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded flex items-center gap-1"
                  >
                    <Send size={12} />
                    Distribute
                  </Button>
                )}
                {!isLocked && (
                  <Button
                    type="button"
                    onClick={() => deleteGraft(graft.id)}
                    className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

