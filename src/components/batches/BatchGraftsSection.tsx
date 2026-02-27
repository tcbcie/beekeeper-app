'use client'

import { Plus, CheckSquare, HelpCircle } from 'lucide-react'
import { useBatchGrafts } from '@/hooks/useBatchGrafts'
import { GRAFT_STATUSES } from './graftConstants'
import GraftHelpBanner from './GraftHelpBanner'
import CellFrame from './CellFrame'
import QueenTrackingSection from './QueenTrackingSection'
import DistributionList from './DistributionList'
import DistributeGraftModal from './DistributeGraftModal'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'

interface BatchGraftsSectionProps {
  batchId: string
  userId: string
  cellCount: number | null
  frameRows?: number | null
  cellsPerRow?: number | null
  groupId?: string | null
  emergenceDate?: string | null
  onCountsChange?: (counts: { grafts_accepted: number; queens_hatched: number; queens_mated: number }) => void
}

export default function BatchGraftsSection({ batchId, userId, cellCount, frameRows, cellsPerRow, groupId, emergenceDate, onCountsChange }: BatchGraftsSectionProps) {
  const hook = useBatchGrafts({ batchId, userId, cellCount, groupId, emergenceDate, onCountsChange })

  if (hook.loading) {
    return <div className="text-sm text-text-secondary">Loading grafts...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-y-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">Individual Cells/Grafts</h4>
          <IconButton
            type="button"
            onClick={() => hook.setShowHelp(!hook.showHelp)}
            size="xs"
            className={`transition-colors ${hook.showHelp ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' : 'text-text-tertiary hover:text-blue-600'}`}
            title="How this works"
          >
            <HelpCircle size={16} />
          </IconButton>
        </div>
        <div className="flex gap-2">
          {hook.grafts.length > 0 && (
            <Button
              type="button"
              onClick={() => { if (hook.selectMode) { hook.exitSelectMode() } else { hook.exitTableSelectMode(); hook.setSelectMode(true) } }}
              tone={hook.selectMode ? 'success' : 'neutral'}
              size="sm"
              className={`inline-flex items-center gap-1 ${
                hook.selectMode
                  ? ''
                  : 'border border-forest-600 text-forest-600 dark:border-forest-400 dark:text-forest-400 hover:bg-forest-50 dark:hover:bg-forest-950/30'
              }`}
            >
              <CheckSquare size={14} />
              {hook.selectMode ? 'Done' : 'Bulk Actions'}
            </Button>
          )}
          <Button
            type="button"
            onClick={hook.generateGrafts}
            tone="success"
            size="sm"
            className="inline-flex items-center gap-1"
          >
            <Plus size={14} />
            Generate Cell Records
          </Button>
        </div>
      </div>

      {/* Help Banner */}
      <GraftHelpBanner show={hook.showHelp} onClose={() => hook.setShowHelp(false)} />

      {/* Status Summary */}
      {hook.grafts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {GRAFT_STATUSES.filter(s => hook.statusCounts[s.value] > 0).map(s => (
            <span key={s.value} className={`px-2 py-1 rounded text-xs font-medium ${s.color}`}>
              {s.label}: {hook.statusCounts[s.value]}
            </span>
          ))}
        </div>
      )}

      {/* Cell Frame */}
      <CellFrame
        grafts={hook.grafts}
        frameRows={frameRows}
        cellsPerRow={cellsPerRow}
        frameCollapsed={hook.frameCollapsed}
        setFrameCollapsed={hook.setFrameCollapsed}
        selectMode={hook.selectMode}
        selectedIds={hook.selectedIds}
        toggleSelect={hook.toggleSelect}
        selectAll={hook.selectAll}
        deselectAll={hook.deselectAll}
        handleBulkStatusChange={hook.handleBulkStatusChange}
        handleBulkDateChange={hook.handleBulkDateChange}
        handleBulkDelete={hook.handleBulkDelete}
        updateGraftStatus={hook.updateGraftStatus}
        updateGraftStatusDate={hook.updateGraftStatusDate}
        deleteGraft={hook.deleteGraft}
      />

      {/* Queen Tracking */}
      <QueenTrackingSection
        grafts={hook.grafts}
        tableGrafts={hook.tableGrafts}
        distributedGraftIds={hook.distributedGraftIds}
        unlockedGraftIds={hook.unlockedGraftIds}
        setUnlockedGraftIds={hook.setUnlockedGraftIds}
        markingColour={hook.markingColour}
        emergenceYear={hook.emergenceYear}
        distLoading={hook.distLoading}
        tableSelectMode={hook.tableSelectMode}
        setTableSelectMode={hook.setTableSelectMode}
        tableSelectedIds={hook.tableSelectedIds}
        toggleTableSelect={hook.toggleTableSelect}
        selectAllTable={hook.selectAllTable}
        deselectAllTable={hook.deselectAllTable}
        exitSelectMode={hook.exitSelectMode}
        exitTableSelectMode={hook.exitTableSelectMode}
        handleTableBulkStatusChange={hook.handleTableBulkStatusChange}
        handleTableBulkQueenMarked={hook.handleTableBulkQueenMarked}
        handleTableBulkDelete={hook.handleTableBulkDelete}
        setBulkDistributeGrafts={hook.setBulkDistributeGrafts}
        updateGraftStatus={hook.updateGraftStatus}
        updateGraftStatusDate={hook.updateGraftStatusDate}
        updateGraftQueenMarked={hook.updateGraftQueenMarked}
        updateGraftQueenNumber={hook.updateGraftQueenNumber}
        deleteGraft={hook.deleteGraft}
        setDistributeGraft={hook.setDistributeGraft}
      />

      {/* Distributions */}
      <DistributionList
        distributions={hook.distributions}
        grafts={hook.grafts}
        distLoading={hook.distLoading}
        handleToggleMating={hook.handleToggleMating}
        handleDeleteDistribution={hook.handleDeleteDistribution}
      />

      {/* Distribute Modal (single) */}
      {hook.distributeGraft && hook.grafts.some(g => g.id === hook.distributeGraft!.id) && (
        <DistributeGraftModal
          graftId={hook.distributeGraft.id}
          batchId={batchId}
          cellNumber={hook.distributeGraft.cell_number}
          graftStatus={hook.distributeGraft.status}
          userId={userId}
          groupMemberIds={hook.groupMemberIds}
          searchUsers={hook.searchUsers}
          fetchRecipientApiaries={hook.fetchRecipientApiaries}
          fetchRecipientHives={hook.fetchRecipientHives}
          onSave={hook.handleDistributeSave}
          onClose={() => hook.setDistributeGraft(null)}
        />
      )}

      {/* Distribute Modal (bulk from table) */}
      {hook.bulkDistributeGrafts && hook.bulkDistributeGrafts.length > 0 && (
        <DistributeGraftModal
          graftId={hook.bulkDistributeGrafts[0].id}
          batchId={batchId}
          cellNumber={hook.bulkDistributeGrafts[0].cell_number}
          graftStatus={hook.bulkDistributeGrafts[0].status}
          userId={userId}
          groupMemberIds={hook.groupMemberIds}
          searchUsers={hook.searchUsers}
          fetchRecipientApiaries={hook.fetchRecipientApiaries}
          fetchRecipientHives={hook.fetchRecipientHives}
          onSave={hook.handleDistributeSave}
          onClose={() => hook.setBulkDistributeGrafts(null)}
          bulkGrafts={hook.bulkDistributeGrafts.map(g => ({ id: g.id, status: g.status, cell_number: g.cell_number }))}
          onBulkSave={hook.handleBulkDistributeSave}
        />
      )}
    </div>
  )
}
