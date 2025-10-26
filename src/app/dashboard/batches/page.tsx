'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, Edit2, Trash2, X, Minus, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Queen {
  id: string
  queen_number: string
  hives?: Array<{
    queen_id: string
    hive_number: string
    apiaries: {
      name: string
    } | null
  }>
}

interface Apiary {
  id: string
  name: string
}

interface Hive {
  id: string
  hive_number: string
  apiary_id: string
}

interface Batch {
  id: string
  batch_name: string
  mother_queen_id: string | null
  starter_colony_hive_id: string | null
  graft_date: string
  cell_count: number | null
  grafts_accepted: number | null
  queens_hatched: number | null
  queens_mated: number | null
  acceptance_check_date: string | null
  emergence_date: string | null
  notes: string | null
  queens?: {
    queen_number: string
  } | null
  hives?: {
    hive_number: string
    apiaries?: {
      name: string
    }
  } | null
}

interface FormData {
  batch_name: string
  mother_queen_id: string
  starter_apiary_id: string
  starter_colony_hive_id: string
  graft_date: string
  cell_count: string
  grafts_accepted: string
  queens_hatched: string
  queens_mated: string
  acceptance_check_date: string
  emergence_date: string
  notes: string
}

// Format date to Irish format (DD/MM/YYYY)
const formatDateIrish = (dateString: string | null): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default function BatchesPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<Batch[]>([])
  const [queens, setQueens] = useState<Queen[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [filteredHives, setFilteredHives] = useState<Hive[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'planning' | 'selection'>('planning')
  const [formData, setFormData] = useState<FormData>({
    batch_name: '',
    mother_queen_id: '',
    starter_apiary_id: '',
    starter_colony_hive_id: '',
    graft_date: new Date().toISOString().split('T')[0],
    cell_count: '',
    grafts_accepted: '',
    queens_hatched: '',
    queens_mated: '',
    acceptance_check_date: '',
    emergence_date: '',
    notes: '',
  })

  const fetchBatches = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('rearing_batches')
      .select('*, queens(queen_number), hives(hive_number, apiaries(name))')
      .eq('user_id', currentUserId)
      .order('graft_date', { ascending: false })

    if (data) setBatches(data)
    setLoading(false)
  }, [userId])

  const fetchApiaries = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('apiaries')
      .select('id, name')
      .eq('user_id', currentUserId)
      .order('name')

    if (data) setApiaries(data)
  }, [userId])

  const fetchHives = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('hives')
      .select('id, hive_number, apiary_id')
      .eq('user_id', currentUserId)
      .order('hive_number')

    if (data) setHives(data)
  }, [userId])

  const fetchQueens = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // First, get all queens
    const { data: queensData, error: queensError } = await supabase
      .from('queens')
      .select('id, queen_number')
      .eq('status', 'active')
      .eq('user_id', currentUserId)
      .order('queen_number')

    if (queensError) {
      console.error('Error fetching queens:', queensError)
      return
    }

    if (!queensData) return

    // Then, get hives with apiaries for these queens
    const queenIds = queensData.map(q => q.id)
    const { data: hivesData } = await supabase
      .from('hives')
      .select('queen_id, hive_number, apiaries(name)')
      .in('queen_id', queenIds)
      .eq('user_id', currentUserId)

    // Merge the data
    const queensWithHives = queensData.map(queen => ({
      ...queen,
      hives: hivesData?.filter(h => h.queen_id === queen.id) || []
    }))

    setQueens(queensWithHives)
  }, [userId])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
      fetchBatches(id)
      fetchQueens(id)
      fetchApiaries(id)
      fetchHives(id)
    }
    initUser()
  }, [router, fetchBatches, fetchQueens, fetchApiaries, fetchHives])

  // Filter hives based on selected apiary
  useEffect(() => {
    if (formData.starter_apiary_id) {
      const filtered = hives.filter(h => h.apiary_id === formData.starter_apiary_id)
      setFilteredHives(filtered)
    } else {
      setFilteredHives([])
    }
  }, [formData.starter_apiary_id, hives])

  // Auto-calculate acceptance check date (graft_date + 1 day)
  useEffect(() => {
    if (formData.graft_date) {
      const graftDate = new Date(formData.graft_date)
      const acceptanceDate = new Date(graftDate)
      acceptanceDate.setDate(acceptanceDate.getDate() + 1)
      const calculatedDate = acceptanceDate.toISOString().split('T')[0]

      // Only update if the calculated date is different from current acceptance_check_date
      // This prevents infinite loops
      if (formData.acceptance_check_date !== calculatedDate && !editingBatch) {
        setFormData(prev => ({
          ...prev,
          acceptance_check_date: calculatedDate
        }))
      }
    }
  }, [formData.graft_date, formData.acceptance_check_date, editingBatch])

  // Auto-calculate emergence date (graft_date + 12 days)
  useEffect(() => {
    if (formData.graft_date) {
      const graftDate = new Date(formData.graft_date)
      const emergenceDate = new Date(graftDate)
      emergenceDate.setDate(emergenceDate.getDate() + 12)
      const calculatedDate = emergenceDate.toISOString().split('T')[0]

      // Only update if the calculated date is different from current emergence_date
      // This prevents infinite loops
      if (formData.emergence_date !== calculatedDate && !editingBatch) {
        setFormData(prev => ({
          ...prev,
          emergence_date: calculatedDate
        }))
      }
    }
  }, [formData.graft_date, formData.emergence_date, editingBatch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      const dataToSubmit = {
        batch_name: formData.batch_name,
        mother_queen_id: formData.mother_queen_id || null,
        starter_colony_hive_id: formData.starter_colony_hive_id || null,
        graft_date: formData.graft_date,
        cell_count: formData.cell_count ? parseInt(formData.cell_count) : null,
        grafts_accepted: formData.grafts_accepted ? parseInt(formData.grafts_accepted) : null,
        queens_hatched: formData.queens_hatched ? parseInt(formData.queens_hatched) : null,
        queens_mated: formData.queens_mated ? parseInt(formData.queens_mated) : null,
        acceptance_check_date: formData.acceptance_check_date || null,
        emergence_date: formData.emergence_date || null,
        notes: formData.notes || null,
      }

      if (editingBatch) {
        const { error } = await supabase
          .from('rearing_batches')
          .update(dataToSubmit)
          .eq('id', editingBatch.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('rearing_batches')
          .insert([{ ...dataToSubmit, user_id: userId }])

        if (error) throw error
      }

      fetchBatches()
      resetForm()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      alert(errorMessage)
    }
  }

  const handleEdit = (batch: Batch) => {
    setEditingBatch(batch)
    // Find the apiary_id from the hive if it exists
    const hive = hives.find(h => h.id === batch.starter_colony_hive_id)
    setFormData({
      batch_name: batch.batch_name,
      mother_queen_id: batch.mother_queen_id || '',
      starter_apiary_id: hive?.apiary_id || '',
      starter_colony_hive_id: batch.starter_colony_hive_id || '',
      graft_date: batch.graft_date,
      cell_count: batch.cell_count?.toString() || '',
      grafts_accepted: batch.grafts_accepted?.toString() || '',
      queens_hatched: batch.queens_hatched?.toString() || '',
      queens_mated: batch.queens_mated?.toString() || '',
      acceptance_check_date: batch.acceptance_check_date || '',
      emergence_date: batch.emergence_date || '',
      notes: batch.notes || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this batch?')) {
      const { error } = await supabase
        .from('rearing_batches')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (!error) fetchBatches()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingBatch(null)
    setFormData({
      batch_name: '',
      mother_queen_id: '',
      starter_apiary_id: '',
      starter_colony_hive_id: '',
      graft_date: new Date().toISOString().split('T')[0],
      cell_count: '',
      grafts_accepted: '',
      queens_hatched: '',
      queens_mated: '',
      acceptance_check_date: '',
      emergence_date: '',
      notes: '',
    })
  }

  if (loading) return <LoadingSpinner text="Loading Queen Rearing..." />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Queen Rearing 🥚</h1>
          <p className="text-sm text-gray-600 mt-1">3-5-8 - The Queen is made!</p>
        </div>
        {activeTab === 'planning' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancel' : 'New Batch'}
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('planning')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'planning'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Planning
            </button>
            <button
              onClick={() => setActiveTab('selection')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'selection'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Selection
            </button>
          </nav>
        </div>
      </div>

      {/* Planning Tab Content */}
      {activeTab === 'planning' && (
        <>
          {showForm && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">
                {editingBatch ? 'Edit Batch' : 'Create New Batch'}
              </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
              <input
                type="text"
                value={formData.batch_name}
                onChange={(e) => setFormData({...formData, batch_name: e.target.value})}
                placeholder="e.g., Spring 2024 - Batch 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Breeder Queen</label>
              <select
                value={formData.mother_queen_id}
                onChange={(e) => setFormData({...formData, mother_queen_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select breeder queen (optional)</option>
                {queens.map((q: Queen) => {
                  const hive = q.hives && q.hives.length > 0 ? q.hives[0] : null
                  const apiary = hive?.apiaries?.name || ''
                  const hiveNumber = hive?.hive_number || ''
                  const location = apiary && hiveNumber ? ` (${apiary} - ${hiveNumber})` : ''
                  return (
                    <option key={q.id} value={q.id}>
                      {q.queen_number}{location}
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Graft Date *
              </label>
              <input
                type="date"
                value={formData.graft_date}
                onChange={(e) => setFormData({...formData, graft_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starter Colony Apiary</label>
              <select
                value={formData.starter_apiary_id}
                onChange={(e) => {
                  setFormData({...formData, starter_apiary_id: e.target.value, starter_colony_hive_id: ''})
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select apiary (optional)</option>
                {apiaries.map((apiary) => (
                  <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starter Colony Hive</label>
              <select
                value={formData.starter_colony_hive_id}
                onChange={(e) => setFormData({...formData, starter_colony_hive_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={!formData.starter_apiary_id}
              >
                <option value="">Select hive (optional)</option>
                {filteredHives.map((hive) => (
                  <option key={hive.id} value={hive.id}>{hive.hive_number}</option>
                ))}
              </select>
            </div>

            {/* Batch Quantities - Grouped Vertically */}
            <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Batch Quantities</h4>
              <div className="space-y-3">
                {/* Number of Grafts */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Number of Grafts</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.cell_count || '0')
                        if (val > 0) setFormData({...formData, cell_count: (val - 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.cell_count}
                      onChange={(e) => setFormData({...formData, cell_count: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.cell_count || '0')
                        setFormData({...formData, cell_count: (val + 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Grafts Accepted */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Grafts Accepted</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.grafts_accepted || '0')
                        if (val > 0) setFormData({...formData, grafts_accepted: (val - 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.grafts_accepted}
                      onChange={(e) => setFormData({...formData, grafts_accepted: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.grafts_accepted || '0')
                        setFormData({...formData, grafts_accepted: (val + 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Queens Hatched */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Queens Hatched</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_hatched || '0')
                        if (val > 0) setFormData({...formData, queens_hatched: (val - 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.queens_hatched}
                      onChange={(e) => setFormData({...formData, queens_hatched: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_hatched || '0')
                        setFormData({...formData, queens_hatched: (val + 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Queens Mated */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Queens Mated</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_mated || '0')
                        if (val > 0) setFormData({...formData, queens_mated: (val - 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.queens_mated}
                      onChange={(e) => setFormData({...formData, queens_mated: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_mated || '0')
                        setFormData({...formData, queens_mated: (val + 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Check Date</label>
              <input
                type="date"
                value={formData.acceptance_check_date}
                onChange={(e) => setFormData({...formData, acceptance_check_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-set to graft date + 1 day</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                Expected Day to Hatch
                <div className="group relative">
                  <MessageCircle size={14} className="text-gray-400 cursor-help" />
                  <div className="invisible group-hover:visible absolute left-0 top-6 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    Assuming the larvae are approximately four days after the egg was laid, they should all be of the same age and ideally no more than 12 hours old at the time of grafting.
                  </div>
                </div>
              </label>
              <input
                type="date"
                value={formData.emergence_date}
                onChange={(e) => setFormData({...formData, emergence_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-set to graft date + 12 days</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Weather conditions, acceptance rate, observations..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editingBatch ? 'Update' : 'Create'} Batch
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Breeder Queen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Graft Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grafts</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accepted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hatched</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acceptance Check</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {batches.map((batch: Batch) => (
              <tr key={batch.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{batch.batch_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.queens?.queen_number || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatDateIrish(batch.graft_date)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.cell_count || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.grafts_accepted || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.queens_hatched || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.queens_mated || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatDateIrish(batch.acceptance_check_date)}</td>
                <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                  <button onClick={() => handleEdit(batch)} className="text-blue-600 hover:text-blue-900">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(batch.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {batches.length === 0 && (
          <div className="text-center py-8 text-gray-500">No rearing batch found. Create your first!</div>
        )}
          </div>
        </>
      )}

      {/* Selection Tab Content */}
      {activeTab === 'selection' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-2">Selection tools coming soon</p>
            <p className="text-gray-400 text-sm">Track and select the best performing queens from your batches</p>
          </div>
        </div>
      )}
    </div>
  )
}