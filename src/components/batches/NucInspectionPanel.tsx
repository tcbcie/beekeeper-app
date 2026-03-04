'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ClipboardList, Tag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { getQueenColorFromYear } from '@/types/queen'
import { COLOUR_DOTS } from './graftConstants'
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
}

const QUEEN_STATUSES = ['virgin', 'mated', 'laying', 'missing', 'dead']

export default function NucInspectionPanel({ nucId, nucNumber, userId, graftId, emergenceDate, onInspectionChange, readOnly }: NucInspectionPanelProps) {
  const toast = useToast()
  const [inspections, setInspections] = useState<NucInspection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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

        if (nucSyncError) console.error('Error syncing nuc status:', nucSyncError)
      }

      if (graftStatus && graftId) {
        const { error: graftSyncError } = await supabase
          .from('batch_grafts')
          .update({ status: graftStatus, status_date: inspectionDate })
          .eq('id', graftId)

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

    if (error) {
      console.error('Error deleting inspection:', error)
      toast.error('Failed to delete inspection')
    } else {
      toast.success('Inspection deleted')
      fetchInspections()
      onInspectionChange?.()
    }
  }

  const markColour = emergenceDate ? getQueenColorFromYear(emergenceDate) : ''

  const [markSaving, setMarkSaving] = useState(false)

  const handleMarkQueen = async () => {
    setMarkSaving(true)
    try {
      if (graftId) {
        const { error: graftError } = await supabase
          .from('batch_grafts')
          .update({ queen_marked: true, queen_number: markQueenNumber || null })
          .eq('id', graftId)

        if (graftError) throw graftError
      }

      const { error: nucError } = await supabase
        .from('mating_nucs')
        .update({ queen_marked_at: markDate })
        .eq('id', nucId)

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
        {!readOnly && !showForm && !showMarkForm && (
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
        {!readOnly && graftId && !showForm && !showMarkForm && (
          <Button
            onClick={() => setShowMarkForm(true)}
            tone="neutral"
            size="sm"
            className="inline-flex items-center gap-1.5"
          >
            <Tag size={16} />
            Mark Queen
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
          <h4 className="text-md font-medium text-foreground mb-3">Mark Queen</h4>
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
