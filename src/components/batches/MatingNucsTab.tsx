'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X, ClipboardList, MapPin, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import NucInspectionPanel from './NucInspectionPanel'

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

interface Queen {
  id: string
  queen_number: string
  status: string
}

interface MatingNuc {
  id: string
  nuc_number: string
  graft_id: string | null
  batch_id: string | null
  queen_id: string | null
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
  queens?: {
    queen_number: string
  } | null
  mating_nuc_inspections?: { count: number }[]
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
  const [queens, setQueens] = useState<Queen[]>([])
  const [filteredGrafts, setFilteredGrafts] = useState<Graft[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingNuc, setEditingNuc] = useState<MatingNuc | null>(null)
  const [expandedNucId, setExpandedNucId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    nuc_number: '',
    batch_id: '',
    graft_id: '',
    queen_id: '',
    mating_location: '',
    status: 'setup',
    notes: '',
  })

  const fetchNucs = useCallback(async () => {
    const { data, error } = await supabase
      .from('mating_nucs')
      .select('*, batch_grafts(cell_number, status), rearing_batches(batch_name), queens(queen_number), mating_nuc_inspections(count)')
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

  const fetchQueens = useCallback(async () => {
    const { data } = await supabase
      .from('queens')
      .select('id, queen_number, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('queen_number')

    if (data) setQueens(data)
  }, [userId])

  useEffect(() => {
    fetchNucs()
    fetchBatches()
    fetchGrafts()
    fetchQueens()
  }, [fetchNucs, fetchBatches, fetchGrafts, fetchQueens])

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
      queen_id: '',
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
      queen_id: nuc.queen_id || '',
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
      queen_id: formData.queen_id || null,
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

  const toggleExpand = (nucId: string) => {
    setExpandedNucId(expandedNucId === nucId ? null : nucId)
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

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Grafted from</label>
              <select
                value={formData.queen_id}
                onChange={(e) => setFormData({ ...formData, queen_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
              >
                <option value="">Select queen (optional)</option>
                {queens.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.queen_number}
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
        <div className="space-y-2">
          {nucs.map(nuc => (
            <div key={nuc.id} className="bg-surface dark:bg-surface rounded-lg shadow border border-border overflow-hidden">
              {/* Nuc Row */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => toggleExpand(nuc.id)}
                    className="p-2 text-text-secondary hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors shrink-0"
                    title={expandedNucId === nuc.id ? 'Collapse' : 'Expand inspections'}
                  >
                    {expandedNucId === nuc.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <span className="font-semibold text-foreground text-lg">{nuc.nuc_number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(nuc.status)}`}>
                        {NUC_STATUSES.find(s => s.value === nuc.status)?.label}
                      </span>
                      <span className="text-sm text-text-secondary flex items-center gap-1">
                        <ClipboardList size={14} />
                        {nuc.mating_nuc_inspections?.[0]?.count || 0} inspections
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                      {nuc.rearing_batches && (
                        <span>
                          Batch: {nuc.rearing_batches.batch_name}
                          {nuc.batch_grafts && ` - Cell #${nuc.batch_grafts.cell_number}`}
                        </span>
                      )}
                      {nuc.queens && (
                        <span>Grafted from: {nuc.queens.queen_number}</span>
                      )}
                      {nuc.mating_location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {nuc.mating_location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={14} /> Setup: {formatDateIrish(nuc.setup_date)}
                      </span>
                      <span className="text-text-tertiary">
                        Updated: {formatDateIrish(nuc.updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1 shrink-0">
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
                </div>
              </div>

              {/* Expandable Inspection Panel */}
              {expandedNucId === nuc.id && (
                <NucInspectionPanel
                  nucId={nuc.id}
                  nucNumber={nuc.nuc_number}
                  userId={userId}
                  onInspectionChange={fetchNucs}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
