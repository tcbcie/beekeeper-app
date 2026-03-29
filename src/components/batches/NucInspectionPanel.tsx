'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ClipboardList, Tag, Scale, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { getQueenColorFromYear } from '@/types/queen'
import { COLOUR_DOTS, MARKABLE_STATUSES, formatDateIrish } from './graftConstants'
import NucInspectionCard from './NucInspectionCard'
import Button from '@/components/ui/Button'

interface NucInspection {
  id: string
  nuc_id: string
  inspection_date: string
  queen_seen: boolean
  queen_status: string | null
  eggs_present: boolean
  larvae_present: boolean
  population: string | null
  temperament: string | null
  notes: string | null
  created_at: string
}

interface NucInspectionFormData {
  inspection_date: string
  queen_seen: boolean
  queen_status: string
  eggs_present: boolean
  larvae_present: boolean
  population: string
  temperament: string
  notes: string
}

interface NucInspectionPanelProps {
  nucId: string
  nucNumber: string
  userId: string
  graftId?: string | null
  emergenceDate?: string | null
  onInspectionChange?: () => void
  readOnly?: boolean
  existingQueenMarkedAt?: string | null
  existingQueenMarked?: boolean
  existingQueenNumber?: string | null
  autoOpenForm?: boolean
  graftStatus?: string | null
}

const QUEEN_STATUSES = ['virgin', 'mated', 'laying', 'missing', 'dead']

interface QueenWeight {
  id: string
  weight_mg: number
  weighed_at: string
  notes: string | null
  created_at: string
}

export default function NucInspectionPanel({ nucId, nucNumber, userId, graftId, emergenceDate, onInspectionChange, readOnly, existingQueenMarkedAt, existingQueenMarked, existingQueenNumber, autoOpenForm, graftStatus }: NucInspectionPanelProps) {
  const toast = useToast()
  const [inspections, setInspections] = useState<NucInspection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(autoOpenForm === true)
  const [editingInspection, setEditingInspection] = useState<NucInspection | null>(null)
  const [showMarkForm, setShowMarkForm] = useState(false)
  const [markQueenNumber, setMarkQueenNumber] = useState('')
  const [markDate, setMarkDate] = useState(new Date().toISOString().split('T')[0])
  const [formData, setFormData] = useState<NucInspectionFormData>({
    inspection_date: new Date().toISOString().split('T')[0],
    queen_seen: false,
    queen_status: '',
    eggs_present: false,
    larvae_present: false,
    population: '',
    temperament: '',
    notes: '',
  })

  const fetchInspections = useCallback(async () => {
    const { data, error } = await supabase
      .from('mating_nuc_inspections')
      .select('*')
      .eq('nuc_id', nucId)
      .order('inspection_date', { ascending: false })

    if (error) {
      console.error('Error fetching inspections:', error)
      toast.error('Failed to load inspections')
    } else {
      setInspections(data || [])
    }
    setLoading(false)
  }, [nucId, toast])

  useEffect(() => {
    fetchInspections()
  }, [fetchInspections])

  const resetForm = () => {
    setFormData({
      inspection_date: new Date().toISOString().split('T')[0],
      queen_seen: false,
      queen_status: '',
      eggs_present: false,
      larvae_present: false,
      population: '',
      temperament: '',
      notes: '',
    })
    setEditingInspection(null)
    setShowForm(false)
  }

  const handleEdit = (inspection: NucInspection) => {
    setEditingInspection(inspection)
    setFormData({
      inspection_date: inspection.inspection_date,
      queen_seen: inspection.queen_seen,
      queen_status: inspection.queen_status || '',
      eggs_present: inspection.eggs_present,
      larvae_present: inspection.larvae_present,
      population: inspection.population || '',
      temperament: inspection.temperament || '',
      notes: inspection.notes || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const inspectionData = {
      nuc_id: nucId,
      inspection_date: formData.inspection_date,
      queen_seen: formData.queen_seen,
      queen_status: formData.queen_status || null,
      eggs_present: formData.eggs_present,
      larvae_present: formData.larvae_present,
      population: formData.population || null,
      temperament: formData.temperament || null,
      notes: formData.notes || null,
      user_id: userId,
    }

    try {
      if (editingInspection) {
        const { error } = await supabase
          .from('mating_nuc_inspections')
          .update(inspectionData)
          .eq('id', editingInspection.id)
          .eq('user_id', userId)

        if (error) throw error
        toast.success('Inspection updated')
      } else {
        const { error } = await supabase
          .from('mating_nuc_inspections')
          .insert([inspectionData])

        if (error) throw error
        toast.success('Inspection recorded')
      }

      // Auto-update nuc status and linked graft status based on queen status
      const qs = formData.queen_status
      const nucUpdate: Record<string, string> = {}
      let graftStatus: string | null = null

      const inspectionDate = formData.inspection_date

      if (formData.queen_seen) {
        nucUpdate.queen_last_seen_at = inspectionDate
      }

      if (qs === 'virgin') {
        nucUpdate.status = 'virgin'
        nucUpdate.queen_emerged_at = inspectionDate
        graftStatus = 'emerged'
      } else if (qs === 'mated') {
        nucUpdate.status = 'mating'
        nucUpdate.mating_confirmed_at = inspectionDate
        graftStatus = 'mated'
      } else if (qs === 'laying') {
        nucUpdate.status = 'laying'
        nucUpdate.mating_confirmed_at = inspectionDate
        graftStatus = 'mated'
      } else if (qs === 'dead' || qs === 'missing') {
        nucUpdate.status = 'failed'
        nucUpdate.failed_at = inspectionDate
        graftStatus = 'failed'
      }

      if (Object.keys(nucUpdate).length > 0) {
        const { error: nucSyncError } = await supabase
          .from('mating_nucs')
          .update(nucUpdate)
          .eq('id', nucId)
          .eq('user_id', userId)

        if (nucSyncError) console.error('Error syncing nuc status:', nucSyncError)
      }

      if (graftStatus && graftId) {
        const { error: graftSyncError } = await supabase
          .from('batch_grafts')
          .update({ status: graftStatus, status_date: inspectionDate })
          .eq('id', graftId)
          .eq('user_id', userId)

        if (graftSyncError) console.error('Error syncing graft status:', graftSyncError)
      }

      resetForm()
      fetchInspections()
      onInspectionChange?.()
    } catch (error) {
      console.error('Error saving inspection:', error)
      toast.error('Failed to save inspection')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this inspection record?')) return

    const { error } = await supabase
      .from('mating_nuc_inspections')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting inspection:', error)
      toast.error('Failed to delete inspection')
      return
    }

    // Recalculate nuc derived fields from remaining inspections
    const { data: remaining } = await supabase
      .from('mating_nuc_inspections')
      .select('inspection_date, queen_seen, queen_status')
      .eq('nuc_id', nucId)
      .order('inspection_date', { ascending: true })

    const nucReset: Record<string, string | null> = {
      status: 'setup',
      queen_emerged_at: null,
      mating_confirmed_at: null,
      queen_last_seen_at: null,
      failed_at: null,
    }
    let graftStatus: string | null = null

    if (remaining && remaining.length > 0) {
      for (const insp of remaining) {
        if (insp.queen_seen) {
          nucReset.queen_last_seen_at = insp.inspection_date
        }
        const qs = insp.queen_status
        if (qs === 'virgin') {
          nucReset.status = 'virgin'
          nucReset.queen_emerged_at = nucReset.queen_emerged_at || insp.inspection_date
          graftStatus = 'emerged'
        } else if (qs === 'mated') {
          nucReset.status = 'mating'
          nucReset.mating_confirmed_at = nucReset.mating_confirmed_at || insp.inspection_date
          graftStatus = 'mated'
        } else if (qs === 'laying') {
          nucReset.status = 'laying'
          nucReset.mating_confirmed_at = nucReset.mating_confirmed_at || insp.inspection_date
          graftStatus = 'mated'
        } else if (qs === 'dead' || qs === 'missing') {
          nucReset.status = 'failed'
          nucReset.failed_at = insp.inspection_date
          graftStatus = 'failed'
        }
      }
    }

    await supabase
      .from('mating_nucs')
      .update(nucReset)
      .eq('id', nucId)
      .eq('user_id', userId)

    if (graftId) {
      await supabase
        .from('batch_grafts')
        .update({ status: graftStatus || 'in_nuc' })
        .eq('id', graftId)
        .eq('user_id', userId)
    }

    toast.success('Inspection deleted')
    fetchInspections()
    onInspectionChange?.()
  }

  const markColour = emergenceDate ? getQueenColorFromYear(emergenceDate) : ''

  const [markSaving, setMarkSaving] = useState(false)

  // Weight Queen state
  const [showWeightForm, setShowWeightForm] = useState(false)
  const [weightValue, setWeightValue] = useState('')
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0])
  const [weightNotes, setWeightNotes] = useState('')
  const [weightSaving, setWeightSaving] = useState(false)
  const [weightHistory, setWeightHistory] = useState<QueenWeight[]>([])

  const fetchWeightHistory = useCallback(async () => {
    if (!graftId) return
    const { data } = await supabase
      .from('queen_weights')
      .select('id, weight_mg, weighed_at, notes, created_at')
      .eq('graft_id', graftId)
      .order('weighed_at', { ascending: false })
    setWeightHistory(data || [])
  }, [graftId])

  const handleWeighQueen = async () => {
    if (!weightValue || !graftId) return
    const parsed = parseInt(weightValue, 10)
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Please enter a valid weight in mg')
      return
    }
    setWeightSaving(true)
    try {
      const { error } = await supabase
        .from('queen_weights')
        .insert([{
          user_id: userId,
          graft_id: graftId,
          weight_mg: parsed,
          weighed_at: weightDate,
          notes: weightNotes || null,
        }])
      if (error) throw error
      toast.success('Queen weight recorded')
      setWeightValue('')
      setWeightDate(new Date().toISOString().split('T')[0])
      setWeightNotes('')
      fetchWeightHistory()
      onInspectionChange?.()
    } catch (error) {
      console.error('Error recording queen weight:', error)
      toast.error('Failed to record weight')
    } finally {
      setWeightSaving(false)
    }
  }

  const handleDeleteWeight = async (weightId: string) => {
    if (!confirm('Delete this weight record?')) return
    const { error } = await supabase
      .from('queen_weights')
      .delete()
      .eq('id', weightId)
      .eq('user_id', userId)
    if (error) {
      console.error('Error deleting weight:', error)
      toast.error('Failed to delete weight')
      return
    }
    toast.success('Weight record deleted')
    fetchWeightHistory()
    onInspectionChange?.()
  }

  const handleMarkQueen = async () => {
    setMarkSaving(true)
    try {
      if (graftId) {
        const { error: graftError } = await supabase
          .from('batch_grafts')
          .update({ queen_marked: true, queen_number: markQueenNumber || null })
          .eq('id', graftId)
          .eq('user_id', userId)

        if (graftError) throw graftError
      }

      const { error: nucError } = await supabase
        .from('mating_nucs')
        .update({ queen_marked_at: markDate })
        .eq('id', nucId)
        .eq('user_id', userId)

      if (nucError) throw nucError

      toast.success('Queen marked successfully')
      setShowMarkForm(false)
      setMarkQueenNumber('')
      setMarkDate(new Date().toISOString().split('T')[0])
      onInspectionChange?.()
    } catch (error) {
      console.error('Error marking queen:', error)
      toast.error('Failed to mark queen')
    } finally {
      setMarkSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-surface-secondary/30">
        <p className="text-sm text-text-secondary">Loading inspections...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 bg-surface-secondary/30 border-t border-border">
      {/* Header */}
      <div className="flex items-center flex-wrap gap-3 mb-4">
        {!readOnly && !showForm && !showMarkForm && !showWeightForm && (
          <Button
            onClick={() => setShowForm(true)}
            tone="success"
            size="sm"
            className="inline-flex items-center gap-1.5"
          >
            <Plus size={16} />
            Add Inspection
          </Button>
        )}
        {!readOnly && graftId && !showForm && !showMarkForm && !showWeightForm && (
          <Button
            onClick={() => {
              setMarkDate(existingQueenMarkedAt ? existingQueenMarkedAt.split('T')[0] : new Date().toISOString().split('T')[0])
              setMarkQueenNumber(existingQueenNumber || '')
              setShowMarkForm(true)
            }}
            tone="neutral"
            size="sm"
            className="inline-flex items-center gap-1.5"
          >
            <Tag size={16} />
            {existingQueenMarked ? 'Edit Marking' : 'Mark Queen'}
          </Button>
        )}
        {!readOnly && graftId && graftStatus && MARKABLE_STATUSES.includes(graftStatus) && !showForm && !showMarkForm && !showWeightForm && (
          <Button
            onClick={() => { fetchWeightHistory(); setShowWeightForm(true) }}
            tone="neutral"
            size="sm"
            className="inline-flex items-center gap-1.5"
          >
            <Scale size={16} />
            Weight Queen
          </Button>
        )}
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ClipboardList size={20} className="text-forest-600" />
          Inspections for {nucNumber} ({inspections.length})
        </h3>
      </div>

      {/* Mark Queen Form */}
      {showMarkForm && (
        <div className="mb-6 p-4 bg-surface-elevated rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="text-md font-medium text-foreground mb-3">{existingQueenMarked ? 'Edit Queen Marking' : 'Mark Queen'}</h4>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Date:</label>
              <input
                type="date"
                value={markDate}
                onChange={(e) => setMarkDate(e.target.value)}
                className="px-2 py-1 text-sm border border-border rounded-md bg-surface text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Colour:</span>
              {markColour && COLOUR_DOTS[markColour] ? (
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block w-4 h-4 rounded-full ${COLOUR_DOTS[markColour]}`} />
                  <span className="text-sm font-medium text-foreground">{markColour}</span>
                </span>
              ) : (
                <span className="text-sm text-text-tertiary">Unknown</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Queen #:</label>
              <input
                type="text"
                value={markQueenNumber}
                onChange={(e) => setMarkQueenNumber(e.target.value)}
                placeholder="Optional"
                className="w-32 px-2 py-1 text-sm border border-border rounded-md bg-surface text-foreground"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleMarkQueen}
                tone="success"
                size="sm"
                disabled={markSaving}
              >
                {markSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={() => { setShowMarkForm(false); setMarkQueenNumber(''); setMarkDate(new Date().toISOString().split('T')[0]) }}
                tone="neutral"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Weight Queen Form */}
      {showWeightForm && (
        <div className="mb-6 p-4 bg-surface-elevated rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-md font-medium text-foreground mb-3">Record Queen Weight</h4>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Date:</label>
              <input
                type="date"
                value={weightDate}
                onChange={(e) => setWeightDate(e.target.value)}
                className="px-2 py-1 text-sm border border-border rounded-md bg-surface text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Weight (mg):</label>
              <input
                type="number"
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
                min="1"
                step="1"
                placeholder="e.g. 220"
                className="w-24 px-2 py-1 text-sm border border-border rounded-md bg-surface text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Notes:</label>
              <input
                type="text"
                value={weightNotes}
                onChange={(e) => setWeightNotes(e.target.value)}
                placeholder="Optional"
                className="w-48 px-2 py-1 text-sm border border-border rounded-md bg-surface text-foreground"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleWeighQueen}
                tone="success"
                size="sm"
                disabled={weightSaving || !weightValue}
              >
                {weightSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={() => { setShowWeightForm(false); setWeightValue(''); setWeightDate(new Date().toISOString().split('T')[0]); setWeightNotes('') }}
                tone="neutral"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
          {/* Weight History */}
          {weightHistory.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-sm font-medium text-text-secondary mb-2">Previous Weights:</p>
              <div className="space-y-1">
                {weightHistory.map(w => (
                  <div key={w.id} className="flex items-center gap-3 text-sm text-text-secondary">
                    <span>{formatDateIrish(w.weighed_at)}: <strong className="text-foreground">{w.weight_mg} mg</strong></span>
                    {w.notes && <span className="text-text-tertiary">— {w.notes}</span>}
                    {!readOnly && (
                      <button
                        onClick={() => handleDeleteWeight(w.id)}
                        className="text-red-500 hover:text-red-700 p-0.5"
                        title="Delete weight record"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-surface-elevated rounded-lg border border-forest-200 dark:border-forest-800">
          <h4 className="text-md font-medium text-foreground mb-4">
            {editingInspection ? 'Edit Inspection' : 'New Inspection'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
                <input
                  type="date"
                  value={formData.inspection_date}
                  onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Queen Status</label>
                <select
                  value={formData.queen_status}
                  onChange={(e) => setFormData({ ...formData, queen_status: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                >
                  <option value="">Select status</option>
                  {QUEEN_STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.queen_seen}
                  onChange={(e) => setFormData({ ...formData, queen_seen: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Queen Seen</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.eggs_present}
                  onChange={(e) => setFormData({ ...formData, eggs_present: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Eggs Present</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.larvae_present}
                  onChange={(e) => setFormData({ ...formData, larvae_present: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Larvae Present</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Population</label>
                <select
                  value={formData.population}
                  onChange={(e) => setFormData({ ...formData, population: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                >
                  <option value="">Select</option>
                  <option value="strong">Strong</option>
                  <option value="moderate">Moderate</option>
                  <option value="weak">Weak</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Temperament</label>
                <select
                  value={formData.temperament}
                  onChange={(e) => setFormData({ ...formData, temperament: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                >
                  <option value="">Select</option>
                  <option value="calm">Calm</option>
                  <option value="nervous">Nervous</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                placeholder="Any observations..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                tone="success"
                size="sm"
              >
                {editingInspection ? 'Update' : 'Save'} Inspection
              </Button>
              <Button
                type="button"
                onClick={resetForm}
                tone="neutral"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Inspections List */}
      {inspections.length === 0 && !showForm ? (
        <div className="text-center py-8 text-text-secondary">
          <ClipboardList size={32} className="mx-auto mb-2 opacity-50" />
          <p>No inspections recorded yet.</p>
          <p className="text-sm mt-1">Click &quot;Add Inspection&quot; to record your first observation.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inspections.map((inspection) => (
            <NucInspectionCard
              key={inspection.id}
              inspection={inspection}
              onEdit={() => handleEdit(inspection)}
              onDelete={() => handleDelete(inspection.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}
