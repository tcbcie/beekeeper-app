'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { QrCode, ChevronDown, ChevronUp, Box, Plus, X, Trash2 } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import SelectField from '@/components/ui/SelectField'
import ModalShell from '@/components/ui/ModalShell'
import NucQRCode from '@/components/mating-nucs/NucQRCode'
import { useToast } from '@/components/ui/Toast'

interface MatingNuc {
  id: string
  nuc_number: string
  reference_code: string | null
  status: string
  equipment_status: string
  mating_location: string | null
  setup_date: string
  notes: string | null
  retired_at: string | null
  graft_id: string | null
  batch_id: string | null
  rearing_batches?: { batch_name: string; emergence_date: string | null } | null
  qr_tag_code?: string | null
}

type EquipmentFilter = 'all' | 'active' | 'ready' | 'retired'

const EQUIPMENT_STATUS_TONE: Record<string, 'green' | 'amber' | 'neutral'> = {
  active: 'green',
  ready: 'amber',
  retired: 'neutral',
}

const REARING_STATUS_TONE: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'neutral'> = {
  setup: 'neutral',
  graft_introduced: 'blue',
  cell_introduced: 'blue',
  virgin: 'purple',
  mating: 'amber',
  laying: 'green',
  failed: 'red',
  sold: 'neutral',
  merged: 'neutral',
}

interface ManageNucsTabProps {
  userId: string
}

export default function ManageNucsTab({ userId }: ManageNucsTabProps) {
  const searchParams = useSearchParams()
  const highlightNucId = searchParams.get('nuc')

  const [nucs, setNucs] = useState<MatingNuc[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<EquipmentFilter>('all')
  const [expandedNucId, setExpandedNucId] = useState<string | null>(null)
  const [qrModalNuc, setQrModalNuc] = useState<MatingNuc | null>(null)
  const [editingStatusNucId, setEditingStatusNucId] = useState<string | null>(null)
  const [editingStatusValue, setEditingStatusValue] = useState<string>('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createNucNumber, setCreateNucNumber] = useState('')
  const [createNucNotes, setCreateNucNotes] = useState('')
  const [createQrTagId, setCreateQrTagId] = useState('')
  const [availableQrTags, setAvailableQrTags] = useState<{ id: string; code: string }[]>([])
  const [creating, setCreating] = useState(false)
  const [deletingNucId, setDeletingNucId] = useState<string | null>(null)
  const { showToast } = useToast()

  const fetchNucs = useCallback(async () => {
    const { data, error } = await supabase
      .from('mating_nucs')
      .select('id, nuc_number, reference_code, status, equipment_status, mating_location, setup_date, notes, retired_at, graft_id, batch_id, rearing_batches(batch_name, emergence_date)')
      .eq('user_id', userId)
      .eq('is_inventory', true)
      .order('setup_date', { ascending: false })

    if (error) {
      showToast('Failed to load mating nucs', 'error')
      setLoading(false)
      return
    }

    // Fetch QR tag codes for all nucs
    const nucIds = (data || []).map(n => n.id)
    const tagMap: Record<string, string> = {}

    if (nucIds.length > 0) {
      const { data: tagData } = await supabase
        .from('qr_tags')
        .select('mating_nuc_id, code')
        .in('mating_nuc_id', nucIds)

      if (tagData) {
        for (const t of tagData) {
          if (t.mating_nuc_id) tagMap[t.mating_nuc_id] = t.code
        }
      }
    }

    setNucs((data || []).map(n => {
      const rb = Array.isArray(n.rearing_batches) ? n.rearing_batches[0] : n.rearing_batches
      return {
        ...n,
        rearing_batches: rb ?? null,
        qr_tag_code: tagMap[n.id] || null,
      }
    }))
    setLoading(false)
  }, [userId, showToast])

  const fetchAvailableQrTags = useCallback(async () => {
    const { data } = await supabase
      .from('qr_tags')
      .select('id, code')
      .eq('user_id', userId)
      .is('hive_id', null)
      .is('mating_nuc_id', null)
      .like('code', 'MN-%')
      .order('code')

    setAvailableQrTags(data || [])
  }, [userId])

  useEffect(() => {
    fetchNucs()
    fetchAvailableQrTags()
  }, [fetchNucs, fetchAvailableQrTags])

  // Auto-expand highlighted nuc from URL params
  useEffect(() => {
    if (highlightNucId && !loading) {
      setExpandedNucId(highlightNucId)
      const timer = setTimeout(() => {
        document.getElementById(`nuc-${highlightNucId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [highlightNucId, loading])

  const handleEquipmentStatusChange = async (nucId: string, newStatus: string) => {
    const currentNuc = nucs.find(n => n.id === nucId)
    if (currentNuc?.equipment_status === newStatus) {
      setEditingStatusNucId(null)
      return
    }

    const { error } = await supabase
      .from('mating_nucs')
      .update({
        equipment_status: newStatus,
        retired_at: newStatus === 'retired' ? new Date().toISOString() : null,
      })
      .eq('id', nucId)
      .eq('user_id', userId)

    if (error) {
      showToast('Failed to update status', 'error')
      return
    }

    showToast(`Equipment status updated to ${newStatus}`, 'success')
    setEditingStatusNucId(null)
    await fetchNucs()
  }

  const handleCreateNuc = async (e: React.FormEvent) => {
    e.preventDefault()

    // If nuc number is empty but a QR tag is selected, use the tag code as the nuc number
    const selectedTag = availableQrTags.find(t => t.id === createQrTagId)
    const nucNumber = createNucNumber.trim() || selectedTag?.code || ''

    if (!nucNumber) {
      showToast('Nuc number is required (or select a QR tag)', 'error')
      return
    }

    setCreating(true)
    const { data: inserted, error } = await supabase
      .from('mating_nucs')
      .insert([{
        nuc_number: nucNumber,
        notes: createNucNotes.trim() || null,
        equipment_status: 'ready',
        status: 'setup',
        setup_date: new Date().toISOString().split('T')[0],
        user_id: userId,
        is_inventory: true,
      }])
      .select('id')
      .single()

    if (error || !inserted) {
      setCreating(false)
      showToast('Failed to create nuc', 'error')
      return
    }

    // Assign QR tag if selected
    if (createQrTagId) {
      const { error: tagError } = await supabase
        .from('qr_tags')
        .update({ mating_nuc_id: inserted.id, assigned_at: new Date().toISOString() })
        .eq('id', createQrTagId)

      if (tagError) {
        setCreating(false)
        showToast('Nuc created but failed to assign QR tag — try assigning it manually', 'error')
        await fetchNucs()
        await fetchAvailableQrTags()
        return
      }
    }

    setCreating(false)
    showToast(`Nuc ${nucNumber} created`, 'success')
    setCreateNucNumber('')
    setCreateNucNotes('')
    setCreateQrTagId('')
    setShowCreateForm(false)
    await fetchNucs()
    await fetchAvailableQrTags()
  }

  const handleDeleteNuc = async (nucId: string) => {
    // Unassign any QR tag first
    await supabase
      .from('qr_tags')
      .update({ mating_nuc_id: null, assigned_at: null })
      .eq('mating_nuc_id', nucId)
      .eq('user_id', userId)

    const { error } = await supabase
      .from('mating_nucs')
      .delete()
      .eq('id', nucId)
      .eq('user_id', userId)

    if (error) {
      showToast('Failed to delete nuc', 'error')
      return
    }

    showToast('Nuc deleted', 'success')
    setDeletingNucId(null)
    await fetchNucs()
    await fetchAvailableQrTags()
  }

  const filteredNucs = nucs.filter(n => {
    if (filter === 'all') return true
    return n.equipment_status === filter
  })

  const formatStatus = (status: string) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  if (nucs.length === 0 && !showCreateForm) {
    return (
      <div className="mt-4">
        <EmptyState
          icon={Box}
          title="No Mating Nucs Yet"
          description="Register your physical nuc boxes here. They will then be available for selection in the Nuc Setup tab."
          actionLabel="Add Nuc"
          actionOnClick={() => setShowCreateForm(true)}
        />
      </div>
    )
  }

  return (
    <>
      {/* Header with create button */}
      <div className="mt-4 flex justify-between items-center">
        <div />
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 flex items-center gap-2"
        >
          {showCreateForm ? <X size={16} /> : <Plus size={16} />}
          {showCreateForm ? 'Cancel' : 'Add Nuc'}
        </Button>
      </div>

      {/* Create Nuc Form */}
      {showCreateForm && (
        <div className="mt-3 bg-surface rounded-lg shadow-lg p-6 border border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Register New Nuc</h3>
          <form onSubmit={handleCreateNuc} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Nuc Number</label>
              <input
                type="text"
                value={createNucNumber}
                onChange={(e) => setCreateNucNumber(e.target.value)}
                placeholder="e.g., N1, N2, A-01"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
              <input
                type="text"
                value={createNucNotes}
                onChange={(e) => setCreateNucNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">QR Tag</label>
              {availableQrTags.length > 0 ? (
                <select
                  value={createQrTagId}
                  onChange={(e) => setCreateQrTagId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                >
                  <option value="">None</option>
                  {availableQrTags.map(t => (
                    <option key={t.id} value={t.id}>{t.code}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-text-tertiary py-2">No unassigned MN- tags available. Generate tags on the <a href="/dashboard/qr-tags" className="text-forest-600 hover:underline">QR Tags</a> page.</p>
              )}
            </div>
            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700"
              >
                {creating ? 'Creating...' : 'Create Nuc'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(['all', 'active', 'ready', 'retired'] as EquipmentFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-forest-600 text-white'
                : 'bg-surface-secondary text-text-secondary hover:bg-surface-elevated'
            }`}
          >
            {f === 'all' ? 'All' : formatStatus(f)}
            <span className="ml-1.5 text-xs opacity-75">
              ({f === 'all' ? nucs.length : nucs.filter(n => n.equipment_status === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* Nuc cards */}
      <div className="mt-4 space-y-3">
        {filteredNucs.length === 0 ? (
          <p className="text-text-tertiary text-center py-8">No mating nucs match this filter.</p>
        ) : (
          filteredNucs.map(nuc => {
            const isExpanded = expandedNucId === nuc.id
            const displayNumber = nuc.nuc_number || nuc.reference_code || 'Unnamed'

            return (
              <div
                key={nuc.id}
                id={`nuc-${nuc.id}`}
                className={`bg-surface rounded-lg shadow border transition-colors ${
                  highlightNucId === nuc.id ? 'border-forest-500 ring-2 ring-forest-500/20' : 'border-border'
                }`}
              >
                {/* Card header */}
                <div
                  className="p-4 cursor-pointer flex items-center justify-between gap-3"
                  onClick={() => setExpandedNucId(isExpanded ? null : nuc.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-foreground">Nuc {displayNumber}</span>
                      <Badge tone={EQUIPMENT_STATUS_TONE[nuc.equipment_status] || 'neutral'}>
                        {formatStatus(nuc.equipment_status)}
                      </Badge>
                      <Badge tone={REARING_STATUS_TONE[nuc.status] || 'neutral'}>
                        {formatStatus(nuc.status)}
                      </Badge>
                      {nuc.qr_tag_code && (
                        <span className="inline-flex items-center gap-1 text-xs text-text-tertiary font-mono">
                          <QrCode size={12} /> {nuc.qr_tag_code}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                      {nuc.mating_location && <span>{nuc.mating_location}</span>}
                      {nuc.rearing_batches && (
                        <span className="text-text-tertiary">{nuc.rearing_batches.batch_name}</span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={20} className="text-text-tertiary" /> : <ChevronDown size={20} className="text-text-tertiary" />}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4">
                    {/* Equipment status + QR actions */}
                    <div className="flex flex-wrap gap-2">
                      {editingStatusNucId === nuc.id ? (
                        <div className="flex items-center gap-2">
                          <SelectField
                            value={editingStatusValue}
                            onChange={e => setEditingStatusValue(e.target.value)}
                            className="w-32"
                          >
                            <option value="active">Active</option>
                            <option value="ready">Ready</option>
                            <option value="retired">Retired</option>
                          </SelectField>
                          <Button
                            onClick={() => handleEquipmentStatusChange(nuc.id, editingStatusValue)}
                            className="fj-btn fj-btn-blue fj-btn-sm"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={() => setEditingStatusNucId(null)}
                            className="fj-btn fj-btn-neutral fj-btn-sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => { setEditingStatusNucId(nuc.id); setEditingStatusValue(nuc.equipment_status) }}
                          className="fj-btn fj-btn-neutral fj-btn-sm"
                        >
                          Change Status
                        </Button>
                      )}
                      <Button
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setQrModalNuc(nuc) }}
                        className="fj-btn fj-btn-neutral fj-btn-sm inline-flex items-center gap-1"
                      >
                        <QrCode size={14} />
                        {nuc.qr_tag_code ? 'View QR' : 'Assign QR'}
                      </Button>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-text-tertiary">Setup date</span>
                        <p className="text-foreground">{new Date(nuc.setup_date).toLocaleDateString()}</p>
                      </div>
                      {nuc.mating_location && (
                        <div>
                          <span className="text-text-tertiary">Mating location</span>
                          <p className="text-foreground">{nuc.mating_location}</p>
                        </div>
                      )}
                      {nuc.rearing_batches && (
                        <div>
                          <span className="text-text-tertiary">Rearing batch</span>
                          <p className="text-foreground">{nuc.rearing_batches.batch_name}</p>
                        </div>
                      )}
                      {nuc.notes && (
                        <div className="col-span-2">
                          <span className="text-text-tertiary">Notes</span>
                          <p className="text-foreground">{nuc.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <div className="pt-2 border-t border-border">
                      {deletingNucId === nuc.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-text-secondary">Delete this nuc permanently?</span>
                          <Button
                            onClick={() => handleDeleteNuc(nuc.id)}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Confirm
                          </Button>
                          <Button
                            onClick={() => setDeletingNucId(null)}
                            className="px-3 py-1 text-xs bg-surface-secondary text-foreground rounded"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setDeletingNucId(nuc.id)}
                          className="fj-btn fj-btn-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 inline-flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Delete Nuc
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* QR Modal */}
      {qrModalNuc && (
        <ModalShell
          title={`QR Code — Nuc ${qrModalNuc.nuc_number || qrModalNuc.reference_code || 'Unnamed'}`}
          maxWidthClassName="max-w-sm"
          onClose={() => setQrModalNuc(null)}
          closeOnBackdrop
          bodyClassName="p-6"
        >
          {qrModalNuc.qr_tag_code ? (
            <NucQRCode
              tagCode={qrModalNuc.qr_tag_code}
              nucNumber={qrModalNuc.nuc_number || qrModalNuc.reference_code || 'Unnamed'}
            />
          ) : (
            <div className="text-center">
              <QrCode size={48} className="mx-auto mb-4 text-text-tertiary" />
              <p className="text-text-secondary mb-4">No QR tag assigned to this nuc yet.</p>
              <a
                href="/dashboard/qr-tags"
                className="fj-btn bg-forest-600 text-white hover:bg-forest-700 inline-block"
              >
                Manage QR Tags
              </a>
            </div>
          )}
        </ModalShell>
      )}
    </>
  )
}
