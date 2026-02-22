'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Search, User } from 'lucide-react'
import type { RecipientUser, RecipientApiary, RecipientHive, CreateDistributionData, BulkDistributionData } from '@/hooks/useGraftDistributions'

interface DistributeGraftModalProps {
  graftId: string
  batchId: string
  cellNumber: number
  graftStatus: string
  userId: string
  groupMemberIds?: string[]
  searchUsers: (text: string) => Promise<RecipientUser[]>
  fetchRecipientApiaries: (userId: string) => Promise<RecipientApiary[]>
  fetchRecipientHives: (userId: string, apiaryId: string) => Promise<RecipientHive[]>
  onSave: (data: CreateDistributionData) => Promise<boolean>
  onClose: () => void
  // Bulk mode props
  bulkGrafts?: { id: string; status: string; cell_number: number }[]
  onBulkSave?: (data: BulkDistributionData) => Promise<boolean>
}

const TYPE_FROM_GRAFT_STATUS: Record<string, 'queen_cell' | 'virgin_queen' | 'mated_queen'> = {
  accepted: 'queen_cell',
  caged: 'queen_cell',
  emerged: 'virgin_queen',
  in_nuc: 'virgin_queen',
  mated: 'mated_queen',
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  queen_cell: { label: 'Queen Cell', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  virgin_queen: { label: 'Virgin Queen', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  mated_queen: { label: 'Mated Queen', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
}

export default function DistributeGraftModal({
  graftId,
  batchId,
  cellNumber,
  graftStatus,
  userId,
  groupMemberIds,
  searchUsers,
  fetchRecipientApiaries,
  fetchRecipientHives,
  onSave,
  onClose,
  bulkGrafts,
  onBulkSave,
}: DistributeGraftModalProps) {
  const isBulk = bulkGrafts && bulkGrafts.length > 0
  // In bulk mode, use the most advanced status among selected grafts for the distribution type
  const effectiveStatus = isBulk
    ? bulkGrafts.reduce((best, g) => {
        const order = ['accepted', 'caged', 'emerged', 'in_nuc', 'mated']
        return order.indexOf(g.status) > order.indexOf(best) ? g.status : best
      }, bulkGrafts[0].status)
    : graftStatus
  const distributionType = TYPE_FROM_GRAFT_STATUS[effectiveStatus] || 'queen_cell'
  const typeInfo = TYPE_LABELS[distributionType]

  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<RecipientUser[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<RecipientUser | null>(null)
  const searchCounter = useRef(0)

  const [apiaries, setApiaries] = useState<RecipientApiary[]>([])
  const [hives, setHives] = useState<RecipientHive[]>([])
  const [selectedApiaryId, setSelectedApiaryId] = useState('')
  const [selectedHiveId, setSelectedHiveId] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const [distributionDate, setDistributionDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Debounced user search with stale-result guard
  useEffect(() => {
    if (searchText.length < 2) {
      setSearchResults([])
      return
    }
    const requestId = ++searchCounter.current
    const timer = setTimeout(async () => {
      setSearching(true)
      const results = await searchUsers(searchText)
      // Only apply results if this is still the latest request
      if (requestId === searchCounter.current) {
        setSearchResults(results)
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText, searchUsers])

  // Fetch apiaries when user selected
  useEffect(() => {
    if (!selectedUser) {
      setApiaries([])
      return
    }
    fetchRecipientApiaries(selectedUser.id).then(setApiaries)
  }, [selectedUser, fetchRecipientApiaries])

  // Fetch hives when apiary selected
  useEffect(() => {
    if (!selectedUser || !selectedApiaryId) {
      setHives([])
      return
    }
    fetchRecipientHives(selectedUser.id, selectedApiaryId).then(setHives)
  }, [selectedUser, selectedApiaryId, fetchRecipientHives])

  const handleSelectUser = useCallback((user: RecipientUser) => {
    setSelectedUser(user)
    setSearchText('')
    setSearchResults([])
    setSelectedApiaryId('')
    setSelectedHiveId('')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setSaving(true)

    let success: boolean
    if (isBulk && onBulkSave) {
      const bulkData: BulkDistributionData = {
        batch_id: batchId,
        distribution_type: distributionType,
        recipient_user_id: selectedUser.id,
        recipient_apiary_id: selectedApiaryId || null,
        recipient_hive_id: selectedHiveId || null,
        distribution_date: distributionDate,
        notes: notes || null,
        user_id: userId,
        grafts: bulkGrafts.map((g) => ({ id: g.id, previous_graft_status: g.status })),
      }
      success = await onBulkSave(bulkData)
    } else {
      const data: CreateDistributionData = {
        graft_id: graftId,
        batch_id: batchId,
        distribution_type: distributionType,
        recipient_user_id: selectedUser.id,
        recipient_apiary_id: selectedApiaryId || null,
        recipient_hive_id: selectedHiveId || null,
        distribution_date: distributionDate,
        notes: notes || null,
        user_id: userId,
        previous_graft_status: graftStatus,
      }
      success = await onSave(data)
    }

    setSaving(false)
    if (success) onClose()
  }

  const isGroupMember = selectedUser && groupMemberIds?.includes(selectedUser.id)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">
            {isBulk ? `Distribute ${bulkGrafts.length} Grafts` : `Distribute Cell #${cellNumber}`}
          </h3>
          <button onClick={onClose} className="p-2 text-text-secondary hover:text-foreground rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[70vh] space-y-4">
          {/* Distribution Type Badge */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
          </div>

          {/* Recipient Search */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Recipient *</label>
            {selectedUser ? (
              <div className="flex items-center gap-2 p-2 bg-surface-elevated dark:bg-surface-elevated rounded-lg border border-border">
                <User size={16} className="text-text-tertiary" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {selectedUser.full_name || 'No name'}
                  </div>
                  <div className="text-xs text-text-tertiary truncate">{selectedUser.email}</div>
                </div>
                {isGroupMember && (
                  <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    Group
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { setSelectedUser(null); setApiaries([]); setHives([]) }}
                  className="p-1 text-text-tertiary hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
                    autoFocus
                  />
                </div>
                {(searchResults.length > 0 || searching) && (
                  <div className="absolute z-10 w-full mt-1 bg-surface dark:bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searching ? (
                      <div className="p-3 text-sm text-text-tertiary text-center">Searching...</div>
                    ) : (
                      searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="w-full text-left p-3 hover:bg-surface-elevated dark:hover:bg-surface-elevated border-b border-border last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {user.full_name || 'No name'}
                              </div>
                              <div className="text-xs text-text-tertiary truncate">{user.email}</div>
                            </div>
                            {groupMemberIds?.includes(user.id) && (
                              <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 shrink-0">
                                Group
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Distribution Date */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Distribution Date</label>
            <input
              type="date"
              value={distributionDate}
              onChange={(e) => setDistributionDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
            />
          </div>

          {/* Recipient Apiary — shown for virgin_queen and mated_queen */}
          {selectedUser && (distributionType === 'virgin_queen' || distributionType === 'mated_queen') && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Recipient&apos;s Apiary
              </label>
              <select
                value={selectedApiaryId}
                onChange={(e) => { setSelectedApiaryId(e.target.value); setSelectedHiveId('') }}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
              >
                <option value="">Select apiary (optional)</option>
                {apiaries.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Recipient Hive — shown only for mated_queen with selected apiary */}
          {selectedUser && distributionType === 'mated_queen' && selectedApiaryId && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Recipient&apos;s Hive
              </label>
              <select
                value={selectedHiveId}
                onChange={(e) => setSelectedHiveId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
              >
                <option value="">Select hive (optional)</option>
                {hives.map((h) => (
                  <option key={h.id} value={h.id}>{h.hive_number}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
              placeholder="Optional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!selectedUser || saving}
              className="flex-1 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Distribute'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-foreground rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
