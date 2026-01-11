'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X, ClipboardList, MapPin, Calendar } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Batch {
  id: string
  batch_name: string
  graft_date: string
}

interface Graft {
  id: string
  batch_id: string
  cell_number: number
  status: string
  notes: string | null
}

interface MatingNuc {
  id: string
  nuc_number: string
  graft_id: string | null
  batch_id: string | null
  mating_location: string | null
  status: string
  setup_date: string
  cell_introduced_at: string | null
  queen_emerged_at: string | null
  mating_confirmed_at: string | null
  notes: string | null
  updated_at: string
  batch_grafts?: {
    cell_number: number
    status: string
  } | null
  rearing_batches?: {
    batch_name: string
  } | null
  mating_nuc_inspections?: { count: number }[]
}

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
}

interface MatingNucsTabProps {
  userId: string
}

const NUC_STATUSES = [
  { value: 'setup', label: 'Setup', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'cell_introduced', label: 'Cell Introduced', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'virgin', label: 'Virgin Queen', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'mating', label: 'Mating', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { value: 'laying', label: 'Laying', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  { value: 'sold', label: 'Sold', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
  { value: 'merged', label: 'Merged', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
]

const QUEEN_STATUSES = ['virgin', 'mated', 'laying', 'missing', 'dead']

// Format date to Irish format (DD/MM/YYYY)
const formatDateIrish = (dateString: string | null): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default function MatingNucsTab({ userId }: MatingNucsTabProps) {
  const toast = useToast()
  const [nucs, setNucs] = useState<MatingNuc[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [grafts, setGrafts] = useState<Graft[]>([])
  const [filteredGrafts, setFilteredGrafts] = useState<Graft[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingNuc, setEditingNuc] = useState<MatingNuc | null>(null)
  const [showInspectionForm, setShowInspectionForm] = useState(false)
  const [inspectingNuc, setInspectingNuc] = useState<MatingNuc | null>(null)
  const [inspections, setInspections] = useState<NucInspection[]>([])

  // Form state
  const [formData, setFormData] = useState({
    nuc_number: '',
    batch_id: '',
    graft_id: '',
    mating_location: '',
    status: 'setup',
    notes: '',
  })

  // Inspection form state
  const [inspectionData, setInspectionData] = useState({
    inspection_date: new Date().toISOString().split('T')[0],
    queen_seen: false,
    queen_status: '',
    eggs_present: false,
    larvae_present: false,
    population: '',
    temperament: '',
    notes: '',
  })

  const fetchNucs = useCallback(async () => {
    const { data, error } = await supabase
      .from('mating_nucs')
      .select('*, batch_grafts(cell_number, status), rearing_batches(batch_name), mating_nuc_inspections(count)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching nucs:', error)
    } else if (data) {
      setNucs(data)
    }
    setLoading(false)
  }, [userId])

  const fetchBatches = useCallback(async () => {
    const { data } = await supabase
      .from('rearing_batches')
      .select('id, batch_name, graft_date')
      .eq('user_id', userId)
      .order('graft_date', { ascending: false })

    if (data) setBatches(data)
  }, [userId])

  const fetchGrafts = useCallback(async () => {
    const { data } = await supabase
      .from('batch_grafts')
      .select('*')
      .eq('user_id', userId)
      .order('cell_number')

    if (data) setGrafts(data)
  }, [userId])

  const fetchInspections = useCallback(async (nucId: string) => {
    const { data } = await supabase
      .from('mating_nuc_inspections')
      .select('*')
      .eq('nuc_id', nucId)
      .eq('user_id', userId)
      .order('inspection_date', { ascending: false })

    if (data) setInspections(data)
  }, [userId])

  useEffect(() => {
    fetchNucs()
    fetchBatches()
    fetchGrafts()
  }, [fetchNucs, fetchBatches, fetchGrafts])

  // Filter grafts by selected batch
  useEffect(() => {
    if (formData.batch_id) {
      const filtered = grafts.filter(g => g.batch_id === formData.batch_id && g.status !== 'in_nuc')
      setFilteredGrafts(filtered)
    } else {
      setFilteredGrafts([])
    }
  }, [formData.batch_id, grafts])

  const resetForm = () => {
    setFormData({
      nuc_number: '',
      batch_id: '',
      graft_id: '',
      mating_location: '',
      status: 'setup',
      notes: '',
    })
    setEditingNuc(null)
    setShowForm(false)
  }

  const handleEdit = (nuc: MatingNuc) => {
    setEditingNuc(nuc)
    setFormData({
      nuc_number: nuc.nuc_number,
      batch_id: nuc.batch_id || '',
      graft_id: nuc.graft_id || '',
      mating_location: nuc.mating_location || '',
      status: nuc.status,
      notes: nuc.notes || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const nucData = {
      nuc_number: formData.nuc_number,
      batch_id: formData.batch_id || null,
      graft_id: formData.graft_id || null,
      mating_location: formData.mating_location || null,
      status: formData.status,
      notes: formData.notes || null,
      user_id: userId,
    }

    try {
      if (editingNuc) {
        const { error } = await supabase
          .from('mating_nucs')
          .update(nucData)
          .eq('id', editingNuc.id)

        if (error) throw error
        toast.success('Mating nuc updated')
      } else {
        const { error } = await supabase
          .from('mating_nucs')
          .insert([nucData])

        if (error) throw error

        // Update graft status to 'in_nuc' if a graft was selected
        if (formData.graft_id) {
          await supabase
            .from('batch_grafts')
            .update({ status: 'in_nuc' })
            .eq('id', formData.graft_id)
        }

        toast.success('Mating nuc created')
      }

      fetchNucs()
      fetchGrafts()
      resetForm()
    } catch (error) {
      console.error('Error saving nuc:', error)
      toast.error('Failed to save mating nuc')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mating nuc?')) return

    try {
      const { error } = await supabase
        .from('mating_nucs')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Mating nuc deleted')
      fetchNucs()
    } catch (error) {
      console.error('Error deleting nuc:', error)
      toast.error('Failed to delete mating nuc')
    }
  }

  const openInspectionForm = (nuc: MatingNuc) => {
    setInspectingNuc(nuc)
    setInspectionData({
      inspection_date: new Date().toISOString().split('T')[0],
      queen_seen: false,
      queen_status: '',
      eggs_present: false,
      larvae_present: false,
      population: '',
      temperament: '',
      notes: '',
    })
    fetchInspections(nuc.id)
    setShowInspectionForm(true)
  }

  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectingNuc) return

    try {
      const { error } = await supabase
        .from('mating_nuc_inspections')
        .insert([{
          nuc_id: inspectingNuc.id,
          inspection_date: inspectionData.inspection_date,
          queen_seen: inspectionData.queen_seen,
          queen_status: inspectionData.queen_status || null,
          eggs_present: inspectionData.eggs_present,
          larvae_present: inspectionData.larvae_present,
          population: inspectionData.population || null,
          temperament: inspectionData.temperament || null,
          notes: inspectionData.notes || null,
          user_id: userId,
        }])

      if (error) throw error

      // Auto-update nuc status based on queen status
      if (inspectionData.queen_status === 'laying') {
        await supabase
          .from('mating_nucs')
          .update({
            status: 'laying',
            mating_confirmed_at: new Date().toISOString()
          })
          .eq('id', inspectingNuc.id)
      } else if (inspectionData.queen_status === 'dead' || inspectionData.queen_status === 'missing') {
        await supabase
          .from('mating_nucs')
          .update({ status: 'failed' })
          .eq('id', inspectingNuc.id)
      }

      toast.success('Inspection recorded')
      fetchInspections(inspectingNuc.id)
      fetchNucs()

      // Reset form but keep modal open
      setInspectionData({
        inspection_date: new Date().toISOString().split('T')[0],
        queen_seen: false,
        queen_status: '',
        eggs_present: false,
        larvae_present: false,
        population: '',
        temperament: '',
        notes: '',
      })
    } catch (error) {
      console.error('Error saving inspection:', error)
      toast.error('Failed to save inspection')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = NUC_STATUSES.find(s => s.value === status)
    return statusConfig?.color || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return <div className="text-center py-8 text-text-secondary">Loading mating nucs...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">Mating Nucs</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 flex items-center gap-2"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Nuc'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            {editingNuc ? 'Edit Mating Nuc' : 'Create Mating Nuc'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Nuc Number *</label>
              <input
                type="text"
                value={formData.nuc_number}
                onChange={(e) => setFormData({ ...formData, nuc_number: e.target.value })}
                placeholder="e.g., N1, N2, A-01"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Batch</label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value, graft_id: '' })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
              >
                <option value="">Select batch (optional)</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.batch_name} ({formatDateIrish(b.graft_date)})
                  </option>
                ))}
              </select>
            </div>

            {formData.batch_id && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Cell/Graft</label>
                <select
                  value={formData.graft_id}
                  onChange={(e) => setFormData({ ...formData, graft_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                >
                  <option value="">Select cell (optional)</option>
                  {filteredGrafts.map(g => (
                    <option key={g.id} value={g.id}>
                      Cell #{g.cell_number} ({g.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Mating Location</label>
              <input
                type="text"
                value={formData.mating_location}
                onChange={(e) => setFormData({ ...formData, mating_location: e.target.value })}
                placeholder="e.g., Home Apiary, Mating Yard A"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
              >
                {NUC_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                placeholder="Any additional notes..."
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700"
              >
                {editingNuc ? 'Update Nuc' : 'Create Nuc'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-foreground rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Nucs List */}
      {nucs.length === 0 ? (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-8 text-center border border-border">
          <p className="text-text-secondary">No mating nucs yet. Create your first nuc above.</p>
        </div>
      ) : (
        <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border overflow-hidden">
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {nucs.map(nuc => (
              <div key={nuc.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-foreground">{nuc.nuc_number}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(nuc.status)}`}>
                      {NUC_STATUSES.find(s => s.value === nuc.status)?.label}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openInspectionForm(nuc)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                      <ClipboardList size={18} />
                    </button>
                    <button onClick={() => handleEdit(nuc)} className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(nuc.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                {nuc.rearing_batches && (
                  <p className="text-sm text-text-secondary">
                    Batch: {nuc.rearing_batches.batch_name}
                    {nuc.batch_grafts && ` - Cell #${nuc.batch_grafts.cell_number}`}
                  </p>
                )}
                {nuc.mating_location && (
                  <p className="text-sm text-text-secondary flex items-center gap-1">
                    <MapPin size={14} /> {nuc.mating_location}
                  </p>
                )}
                <div className="flex justify-between text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> Setup: {formatDateIrish(nuc.setup_date)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <ClipboardList size={12} /> {nuc.mating_nuc_inspections?.[0]?.count || 0}
                    </span>
                    <span>Updated: {formatDateIrish(nuc.updated_at)}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-elevated dark:bg-surface-elevated">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Nuc #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Batch</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Cell</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Location</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Inspections</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Last Updated</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {nucs.map(nuc => (
                  <tr key={nuc.id} className="hover:bg-surface-elevated dark:hover:bg-surface-elevated">
                    <td className="px-4 py-3 font-medium text-foreground">{nuc.nuc_number}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {nuc.rearing_batches?.batch_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {nuc.batch_grafts ? `#${nuc.batch_grafts.cell_number}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{nuc.mating_location || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(nuc.status)}`}>
                        {NUC_STATUSES.find(s => s.value === nuc.status)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {nuc.mating_nuc_inspections?.[0]?.count || 0}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-sm">
                      {formatDateIrish(nuc.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openInspectionForm(nuc)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="Inspect"
                        >
                          <ClipboardList size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(nuc)}
                          className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(nuc.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      {showInspectionForm && inspectingNuc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Inspect Nuc: {inspectingNuc.nuc_number}
                </h3>
                <button
                  onClick={() => setShowInspectionForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Inspection Form */}
              <form onSubmit={handleInspectionSubmit} className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
                    <input
                      type="date"
                      value={inspectionData.inspection_date}
                      onChange={(e) => setInspectionData({ ...inspectionData, inspection_date: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Queen Status</label>
                    <select
                      value={inspectionData.queen_status}
                      onChange={(e) => setInspectionData({ ...inspectionData, queen_status: e.target.value })}
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
                      checked={inspectionData.queen_seen}
                      onChange={(e) => setInspectionData({ ...inspectionData, queen_seen: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">Queen Seen</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={inspectionData.eggs_present}
                      onChange={(e) => setInspectionData({ ...inspectionData, eggs_present: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">Eggs Present</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={inspectionData.larvae_present}
                      onChange={(e) => setInspectionData({ ...inspectionData, larvae_present: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">Larvae Present</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Population</label>
                    <select
                      value={inspectionData.population}
                      onChange={(e) => setInspectionData({ ...inspectionData, population: e.target.value })}
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
                      value={inspectionData.temperament}
                      onChange={(e) => setInspectionData({ ...inspectionData, temperament: e.target.value })}
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
                    value={inspectionData.notes}
                    onChange={(e) => setInspectionData({ ...inspectionData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700"
                >
                  Save Inspection
                </button>
              </form>

              {/* Previous Inspections */}
              {inspections.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-2">Previous Inspections</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {inspections.map(insp => (
                      <div key={insp.id} className="bg-surface-elevated dark:bg-surface-elevated p-3 rounded-lg text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{formatDateIrish(insp.inspection_date)}</span>
                          {insp.queen_status && (
                            <span className="text-purple-600 dark:text-purple-400">
                              Queen: {insp.queen_status}
                            </span>
                          )}
                        </div>
                        <div className="text-text-secondary mt-1">
                          {insp.queen_seen && 'Queen seen • '}
                          {insp.eggs_present && 'Eggs • '}
                          {insp.larvae_present && 'Larvae • '}
                          {insp.population && `Pop: ${insp.population}`}
                        </div>
                        {insp.notes && <p className="text-text-tertiary mt-1">{insp.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
