'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import NucInspectionCard from './NucInspectionCard'

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
  onInspectionChange?: () => void
}

const QUEEN_STATUSES = ['virgin', 'mated', 'laying', 'missing', 'dead']

export default function NucInspectionPanel({ nucId, nucNumber, userId, onInspectionChange }: NucInspectionPanelProps) {
  const toast = useToast()
  const [inspections, setInspections] = useState<NucInspection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingInspection, setEditingInspection] = useState<NucInspection | null>(null)
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

        // Auto-update nuc status based on queen status
        if (formData.queen_status === 'laying') {
          await supabase
            .from('mating_nucs')
            .update({
              status: 'laying',
              mating_confirmed_at: new Date().toISOString()
            })
            .eq('id', nucId)
        } else if (formData.queen_status === 'dead' || formData.queen_status === 'missing') {
          await supabase
            .from('mating_nucs')
            .update({ status: 'failed' })
            .eq('id', nucId)
        }

        toast.success('Inspection recorded')
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

  if (loading) {
    return (
      <div className="p-6 bg-sage-50 dark:bg-slate-800/30">
        <p className="text-sm text-text-secondary">Loading inspections...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 bg-sage-50 dark:bg-slate-800/30 border-t border-border">
      {/* Header */}
      <div className="flex items-center flex-wrap gap-3 mb-4">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-forest-600 text-white rounded-lg hover:bg-forest-700 font-medium flex items-center gap-1.5 text-sm"
          >
            <Plus size={16} />
            Add Inspection
          </button>
        )}
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ClipboardList size={20} className="text-forest-600" />
          Inspections for {nucNumber} ({inspections.length})
        </h3>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-forest-200 dark:border-forest-800">
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
              <button
                type="submit"
                className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700"
              >
                {editingInspection ? 'Update' : 'Save'} Inspection
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-foreground rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
