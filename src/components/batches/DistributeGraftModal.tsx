'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Search, User, Users, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { RecipientUser, RecipientApiary, RecipientHive, CreateDistributionData, BulkDistributionData } from '@/hooks/useGraftDistributions'
import { TYPE_LABELS } from './graftConstants'
import Button from '@/components/ui/Button'

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
  onSave: (data: CreateDistributionData) => Promise<boolean | null>
  onClose: () => void
  // Bulk mode props
  bulkGrafts?: { id: string; status: string; cell_number: number }[]
  onBulkSave?: (data: BulkDistributionData) => Promise<boolean | null>
}

const STATUS_ORDER: string[] = ['accepted', 'sealed', 'caged', 'emerged', 'in_nuc', 'mated']

const TYPE_FROM_GRAFT_STATUS: Record<string, 'queen_cell' | 'virgin_queen' | 'mated_queen'> = {
  accepted: 'queen_cell',
  sealed: 'queen_cell',
  caged: 'queen_cell',
  emerged: 'virgin_queen',
  in_nuc: 'virgin_queen',
  mated: 'mated_queen',
}

type RecipientMode = 'group' | 'app_user' | 'external'

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
  const effectiveStatus = isBulk
    ? bulkGrafts.reduce((best, g) => {
        return STATUS_ORDER.indexOf(g.status) > STATUS_ORDER.indexOf(best) ? g.status : best
      }, bulkGrafts[0].status)
    : graftStatus
  const distributionType = TYPE_FROM_GRAFT_STATUS[effectiveStatus] || 'queen_cell'
  const typeInfo = TYPE_LABELS[distributionType] || { label: 'Queen Cell', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' }

  const hasGroup = groupMemberIds && groupMemberIds.length > 0

  // Recipient mode
  const [recipientMode, setRecipientMode] = useState<RecipientMode>(hasGroup ? 'group' : 'app_user')

  // App user / group state
  const [groupFilter, setGroupFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<RecipientUser[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<RecipientUser | null>(null)
  const [groupMembers, setGroupMembers] = useState<RecipientUser[]>([])
  const searchCounter = useRef(0)

  // App user apiary / hive state
  const [apiaries, setApiaries] = useState<RecipientApiary[]>([])
  const [hives, setHives] = useState<RecipientHive[]>([])
  const [selectedApiaryId, setSelectedApiaryId] = useState('')
  const [selectedHiveId, setSelectedHiveId] = useState('')

  // External beekeeper state
  const [extName, setExtName] = useState('')
  const [extEmail, setExtEmail] = useState('')
  const [extPhone, setExtPhone] = useState('')
  const [extLocation, setExtLocation] = useState('')

  // Mating location for app-user queen_cell distributions
  const [matingLocation, setMatingLocation] = useState('')
  const [locationError, setLocationError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const [distributionDate, setDistributionDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const submittingRef = useRef(false)

  const switchMode = (mode: RecipientMode) => {
    setRecipientMode(mode)
    setSelectedUser(null)
    setSearchText('')
    setGroupFilter('')
    setSearchResults([])
    setSelectedApiaryId('')
    setSelectedHiveId('')
    setMatingLocation('')
    setLocationError('')
  }

  // Fetch group members when in group mode
  useEffect(() => {
    if (recipientMode !== 'group' || !groupMemberIds || groupMemberIds.length === 0) {
      setGroupMembers([])
      return
    }
    supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', groupMemberIds)
      .order('full_name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to fetch group members:', error)
          setGroupMembers([])
        } else if (data) {
          setGroupMembers(data as RecipientUser[])
        }
      })
  }, [recipientMode, groupMemberIds])

  // Debounced user search with stale-result guard (app_user mode only)
  useEffect(() => {
    if (recipientMode !== 'app_user' || searchText.length < 2) {
      setSearchResults([])
      return
    }
    const requestId = ++searchCounter.current
    const timer = setTimeout(async () => {
      setSearching(true)
      const results = await searchUsers(searchText)
      if (requestId === searchCounter.current) {
        setSearchResults(results)
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText, searchUsers, recipientMode])

  // Fetch apiaries when user selected
  useEffect(() => {
    if (!selectedUser) {
      setApiaries([])
      return
    }
    fetchRecipientApiaries(selectedUser.id).then(setApiaries, () => setApiaries([]))
  }, [selectedUser, fetchRecipientApiaries])

  // Fetch hives when apiary selected
  useEffect(() => {
    if (!selectedUser || !selectedApiaryId) {
      setHives([])
      return
    }
    fetchRecipientHives(selectedUser.id, selectedApiaryId).then(setHives, () => setHives([]))
  }, [selectedUser, selectedApiaryId, fetchRecipientHives])

  const handleSelectUser = useCallback((user: RecipientUser) => {
    setSelectedUser(user)
    setSearchText('')
    setSearchResults([])
    setSelectedApiaryId('')
    setSelectedHiveId('')
  }, [])

  const isExternal = recipientMode === 'external'
  const externalHasData = extName.trim() || extEmail.trim() || extPhone.trim() || extLocation.trim()
  const externalLocationRequired = isExternal && distributionType === 'queen_cell' && !extLocation.trim()
  const canSubmit = isExternal ? (!!externalHasData && !externalLocationRequired) : !!selectedUser

  const handleSubmit = async () => {
    if (!canSubmit || saving || submittingRef.current) return

    // For queen_cell app-user distributions, require either apiary or mating location
    if (!isExternal && distributionType === 'queen_cell' && !selectedApiaryId && !matingLocation.trim()) {
      setLocationError('Please select an apiary or enter a mating location')
      return
    }

    submittingRef.current = true
    setSaving(true)

    let success: boolean | null
    if (isBulk && onBulkSave) {
      const bulkData: BulkDistributionData = {
        batch_id: batchId,
        distribution_type: distributionType,
        recipient_user_id: isExternal ? null : selectedUser!.id,
        recipient_apiary_id: isExternal ? null : (selectedApiaryId || null),
        recipient_hive_id: isExternal ? null : (selectedHiveId || null),
        distribution_date: distributionDate,
        notes: notes || null,
        user_id: userId,
        grafts: bulkGrafts.map((g) => ({ id: g.id, previous_graft_status: g.status })),
        external_recipient_name: isExternal ? (extName.trim() || null) : null,
        external_recipient_email: isExternal ? (extEmail.trim() || null) : null,
        external_recipient_phone: isExternal ? (extPhone.trim() || null) : null,
        external_recipient_location: isExternal ? (extLocation.trim() || null) : null,
        mating_location: !isExternal ? (matingLocation.trim() || null) : null,
      }
      success = await onBulkSave(bulkData)
    } else {
      const data: CreateDistributionData = {
        graft_id: graftId,
        batch_id: batchId,
        distribution_type: distributionType,
        recipient_user_id: isExternal ? null : selectedUser!.id,
        recipient_apiary_id: isExternal ? null : (selectedApiaryId || null),
        recipient_hive_id: isExternal ? null : (selectedHiveId || null),
        distribution_date: distributionDate,
        notes: notes || null,
        user_id: userId,
        previous_graft_status: graftStatus,
        external_recipient_name: isExternal ? (extName.trim() || null) : null,
        external_recipient_email: isExternal ? (extEmail.trim() || null) : null,
        external_recipient_phone: isExternal ? (extPhone.trim() || null) : null,
        external_recipient_location: isExternal ? (extLocation.trim() || null) : null,
        mating_location: !isExternal ? (matingLocation.trim() || null) : null,
      }
      success = await onSave(data)
    }

    setSaving(false)
    submittingRef.current = false
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
          <Button onClick={onClose} className="p-2 text-text-secondary hover:text-foreground rounded">
            <X size={20} />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[70vh] space-y-4">
          {/* Distribution Type Badge */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Recipient *</label>

            {/* Mode toggles */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium mb-3">
              {hasGroup && (
                <Button
                  type="button"
                  onClick={() => switchMode('group')}
                  className={`flex-1 px-3 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                    recipientMode === 'group' ? 'bg-forest-600 text-white' : 'bg-surface text-text-secondary hover:bg-surface-elevated'
                  }`}
                >
                  <Users size={12} />
                  Group Member
                </Button>
              )}
              <Button
                type="button"
                onClick={() => switchMode('app_user')}
                className={`flex-1 px-3 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                  recipientMode === 'app_user' ? 'bg-forest-600 text-white' : 'bg-surface text-text-secondary hover:bg-surface-elevated'
                }`}
              >
                <User size={12} />
                App User
              </Button>
              <Button
                type="button"
                onClick={() => switchMode('external')}
                className={`flex-1 px-3 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                  recipientMode === 'external' ? 'bg-forest-600 text-white' : 'bg-surface text-text-secondary hover:bg-surface-elevated'
                }`}
              >
                <UserPlus size={12} />
                Other Beekeeper
              </Button>
            </div>

            {/* Selected app / group user chip */}
            {!isExternal && selectedUser && (
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
                <Button
                  type="button"
                  onClick={() => { setSelectedUser(null); setApiaries([]); setHives([]); setMatingLocation(''); setLocationError('') }}
                  className="p-1 text-text-tertiary hover:text-foreground"
                >
                  <X size={14} />
                </Button>
              </div>
            )}

            {/* Group member list */}
            {recipientMode === 'group' && !selectedUser && groupMembers.length > 0 && (
              <div>
                {groupMembers.length > 5 && (
                  <div className="relative mb-2">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      value={groupFilter}
                      onChange={(e) => setGroupFilter(e.target.value)}
                      placeholder="Filter members..."
                      className="w-full pl-9 pr-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
                    />
                  </div>
                )}
                <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {groupMembers
                    .filter((user) => {
                      if (!groupFilter.trim()) return true
                      const q = groupFilter.toLowerCase()
                      return (user.full_name || '').toLowerCase().includes(q) || (user.email || '').toLowerCase().includes(q)
                    })
                    .map((user) => (
                      <Button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full text-left p-3 hover:bg-surface-elevated dark:hover:bg-surface-elevated border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-text-tertiary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {user.full_name || 'No name'}
                            </div>
                            <div className="text-xs text-text-tertiary truncate">{user.email}</div>
                          </div>
                        </div>
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {/* App user search */}
            {recipientMode === 'app_user' && !selectedUser && (
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
                        <Button
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
                        </Button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* External beekeeper fields */}
            {isExternal && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Name</label>
                  <input
                    type="text"
                    value={extName}
                    onChange={(e) => setExtName(e.target.value)}
                    placeholder="Beekeeper name..."
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Email</label>
                  <input
                    type="email"
                    value={extEmail}
                    onChange={(e) => setExtEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Mobile</label>
                  <input
                    type="tel"
                    value={extPhone}
                    onChange={(e) => setExtPhone(e.target.value)}
                    placeholder="+353 ..."
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Apiary / Mating Location (closest Eircode){distributionType === 'queen_cell' && <span className="text-red-500"> *</span>}</label>
                  <input
                    type="text"
                    value={extLocation}
                    onChange={(e) => setExtLocation(e.target.value)}
                    placeholder="e.g. D01 AB12"
                    className={`w-full px-3 py-2 border rounded-md bg-surface text-foreground text-sm ${externalLocationRequired ? 'border-red-400' : 'border-border'}`}
                  />
                </div>
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

          {/* Recipient Apiary — shown for queen_cell, virgin_queen and mated_queen, app user only */}
          {!isExternal && selectedUser && (distributionType === 'queen_cell' || distributionType === 'virgin_queen' || distributionType === 'mated_queen') && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Recipient&apos;s Apiary
              </label>
              <select
                value={selectedApiaryId}
                onChange={(e) => { setSelectedApiaryId(e.target.value); setSelectedHiveId(''); setLocationError('') }}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
              >
                <option value="">Select apiary (optional)</option>
                {apiaries.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Mating Location — shown for queen_cell distributions to app users */}
          {!isExternal && selectedUser && distributionType === 'queen_cell' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Apiary / Mating Location (closest Eircode)
              </label>
              <input
                type="text"
                value={matingLocation}
                onChange={(e) => { setMatingLocation(e.target.value); setLocationError('') }}
                placeholder="e.g. D01 AB12"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
              />
              {locationError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{locationError}</p>
              )}
            </div>
          )}

          {/* Recipient Hive — shown only for mated_queen with selected apiary, app user only */}
          {!isExternal && selectedUser && distributionType === 'mated_queen' && selectedApiaryId && (
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
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className="flex-1 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Distribute'}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-secondary text-foreground rounded-lg hover:bg-surface-elevated text-sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

