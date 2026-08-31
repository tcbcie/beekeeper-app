'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, ExternalLink, MapPin } from 'lucide-react'
import ModalShell from '@/components/ui/ModalShell'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useQueenAssignments, type QueenAssignmentInput } from '@/hooks/useQueenAssignments'
import type { QueenAssignment } from '@/types/queen'

interface QueenAssignmentHistoryProps {
  queenId: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Approximate, human-friendly span between two instants.
function formatDuration(startIso: string, endIso: string | null): string {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const days = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)))
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`
  if (days < 56) return `${Math.round(days / 7)} weeks`
  const months = Math.round(days / 30)
  if (months < 24) return `${months} month${months === 1 ? '' : 's'}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem ? `${years} yr ${rem} mo` : `${years} year${years === 1 ? '' : 's'}`
}

const EMPTY_FORM: QueenAssignmentInput = {
  location_type: 'hive',
  location_label: '',
  started_at: new Date().toISOString().split('T')[0],
  ended_at: null,
  notes: null,
}

export default function QueenAssignmentHistory({ queenId }: QueenAssignmentHistoryProps) {
  const toast = useToast()
  const confirmDialog = useConfirm()
  const { assignments, loading, addAssignment, updateAssignment, deleteAssignment } = useQueenAssignments(queenId)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Entries still linked to a live hive/nuc display that record's current
  // name, so a hand-edited label would not show — warn the user in the form.
  const editingEntry = editingId ? assignments.find((a) => a.id === editingId) : null
  const editingIsLinked = !!(editingEntry && (editingEntry.hive_id || editingEntry.mating_nuc_id))
  const [form, setForm] = useState<QueenAssignmentInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (a: QueenAssignment) => {
    setEditingId(a.id)
    setForm({
      location_type: a.location_type,
      location_label: a.display_label || a.location_label || '',
      started_at: a.started_at.slice(0, 10),
      ended_at: a.ended_at ? a.ended_at.slice(0, 10) : null,
      notes: a.notes,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.started_at) {
      toast.warning('Please enter a start date.')
      return
    }
    setSaving(true)
    const result = editingId
      ? await updateAssignment(editingId, form)
      : await addAssignment(form)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(editingId ? 'Assignment updated.' : 'Assignment added.')
    setShowForm(false)
  }

  const handleDelete = async (a: QueenAssignment) => {
    const ok = await confirmDialog({
      title: 'Delete assignment?',
      message: `Remove the ${a.location_type === 'nuc' ? 'parked' : 'production'} stint "${a.display_label || a.location_label || 'unknown'}" from this queen's history?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    const result = await deleteAssignment(a.id)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Assignment removed.')
  }

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Assignment History</h2>
        <Button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-sm font-medium bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600"
        >
          <Plus size={16} />
          Add entry
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-text-tertiary">Loading…</p>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          No assignment history yet. Moves between hives and mating nucs are recorded automatically;
          use “Add entry” to record an earlier placement.
        </p>
      ) : (
        <ul className="space-y-3">
          {assignments.map((a) => {
            const parked = a.location_type === 'nuc'
            const current = !a.ended_at
            return (
              <li
                key={a.id}
                className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3 rounded-lg border border-border bg-surface-secondary"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-sm font-semibold border ${
                        parked
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                          : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
                      }`}
                    >
                      {parked ? 'Parked' : 'Production'}
                    </span>
                    {current && (
                      <span className="px-2 py-0.5 rounded text-sm font-semibold bg-forest-100 dark:bg-forest-900/40 text-forest-700 dark:text-forest-300 border border-forest-300 dark:border-forest-700">
                        Current
                      </span>
                    )}
                    {a.hive_id ? (
                      <Link
                        href={`/dashboard/hives/${a.hive_id}`}
                        className="inline-flex items-center gap-1 font-medium text-forest-600 dark:text-forest-400 hover:underline"
                      >
                        {a.display_label || a.location_label || 'Hive'}
                        <ExternalLink size={12} />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-text-primary">
                        <MapPin size={12} className="text-text-tertiary" />
                        {a.display_label || a.location_label || (parked ? 'Mating nuc' : 'Hive')}
                      </span>
                    )}
                    {a.apiary_name && (
                      <span className="text-sm text-text-secondary">· {a.apiary_name}</span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">
                    {formatDate(a.started_at)} — {a.ended_at ? formatDate(a.ended_at) : 'Current'}
                    <span className="text-text-tertiary"> · {formatDuration(a.started_at, a.ended_at)}</span>
                  </p>
                  {a.notes && <p className="text-sm text-text-primary mt-1">{a.notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    className="p-2 rounded hover:bg-surface-elevated text-text-secondary"
                    aria-label="Edit assignment"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a)}
                    className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400"
                    aria-label="Delete assignment"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {showForm && (
        <ModalShell
          title={editingId ? 'Edit assignment' : 'Add assignment'}
          onClose={() => setShowForm(false)}
          closeOnBackdrop
          footer={
            <div className="border-t border-border px-6 py-4 flex flex-col sm:flex-row justify-end gap-3">
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-surface dark:bg-surface-elevated text-text-primary rounded-lg hover:bg-surface-elevated font-medium"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 disabled:opacity-50 font-medium"
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Type</label>
              <select
                value={form.location_type}
                onChange={(e) => setForm({ ...form, location_type: e.target.value as 'hive' | 'nuc' })}
                className="w-full px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
              >
                <option value="hive">Production (hive)</option>
                <option value="nuc">Parked (mating nuc)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Location label</label>
              <input
                type="text"
                value={form.location_label}
                onChange={(e) => setForm({ ...form, location_label: e.target.value })}
                placeholder="e.g. 77-HMN+ or Nuc 3"
                className="w-full px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
              />
              {editingIsLinked && (
                <p className="text-sm text-text-secondary mt-1">
                  This entry is linked to a live hive or nuc, so the timeline always shows that
                  record&apos;s current name rather than this label.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Start date</label>
                <input
                  type="date"
                  value={form.started_at}
                  onChange={(e) => setForm({ ...form, started_at: e.target.value })}
                  className="w-full px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  End date <span className="text-text-tertiary font-normal">(blank = current)</span>
                </label>
                <input
                  type="date"
                  value={form.ended_at || ''}
                  onChange={(e) => setForm({ ...form, ended_at: e.target.value || null })}
                  className="w-full px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Notes</label>
              <textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
                rows={2}
                className="w-full px-4 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
              />
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
