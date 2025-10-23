'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Queen {
  id: string
  queen_number: string
}

interface Batch {
  id: string
  batch_name: string
  mother_queen_id: string | null
  graft_date: string
  cell_count: number | null
  emergence_date: string | null
  status: string
  notes: string | null
  queens?: {
    queen_number: string
  } | null
}

interface FormData {
  batch_name: string
  mother_queen_id: string
  graft_date: string
  cell_count: string
  emergence_date: string
  status: string
  notes: string
}

export default function BatchesPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<Batch[]>([])
  const [queens, setQueens] = useState<Queen[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    batch_name: '',
    mother_queen_id: '',
    graft_date: new Date().toISOString().split('T')[0],
    cell_count: '',
    emergence_date: '',
    status: 'grafted',
    notes: '',
  })

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
    }
    initUser()
  }, [])

  const fetchBatches = async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('rearing_batches')
      .select('*, queens(queen_number)')
      .eq('user_id', currentUserId)
      .order('graft_date', { ascending: false })

    if (data) setBatches(data)
    setLoading(false)
  }

  const fetchQueens = async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('queens')
      .select('id, queen_number')
      .eq('status', 'active')
      .eq('user_id', currentUserId)
      .order('queen_number')

    if (data) setQueens(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      const dataToSubmit = {
        batch_name: formData.batch_name,
        mother_queen_id: formData.mother_queen_id || null,
        graft_date: formData.graft_date,
        cell_count: formData.cell_count ? parseInt(formData.cell_count) : null,
        emergence_date: formData.emergence_date || null,
        status: formData.status,
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
    setFormData({
      batch_name: batch.batch_name,
      mother_queen_id: batch.mother_queen_id || '',
      graft_date: batch.graft_date,
      cell_count: batch.cell_count?.toString() || '',
      emergence_date: batch.emergence_date || '',
      status: batch.status,
      notes: batch.notes || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this QueenCraft?')) {
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
      graft_date: new Date().toISOString().split('T')[0],
      cell_count: '',
      emergence_date: '',
      status: 'grafted',
      notes: '',
    })
  }

  if (loading) return <LoadingSpinner text="Loading QueenCraft..." />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">QueenCraft 🥚</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New QueenCraft'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingBatch ? 'Edit QueenCraft' : 'Create New QueenCraft'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Mother Queen</label>
              <select
                value={formData.mother_queen_id}
                onChange={(e) => setFormData({...formData, mother_queen_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select mother queen</option>
                {queens.map((q: Queen) => (
                  <option key={q.id} value={q.id}>{q.queen_number}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Graft Date *</label>
              <input
                type="date"
                value={formData.graft_date}
                onChange={(e) => setFormData({...formData, graft_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cell Count</label>
              <input
                type="number"
                value={formData.cell_count}
                onChange={(e) => setFormData({...formData, cell_count: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Emergence Date</label>
              <input
                type="date"
                value={formData.emergence_date}
                onChange={(e) => setFormData({...formData, emergence_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="grafted">Grafted</option>
                <option value="emerged">Emerged</option>
                <option value="mated">Mated</option>
                <option value="completed">Completed</option>
              </select>
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
                {editingBatch ? 'Update' : 'Create'} QueenCraft
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mother Queen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Graft Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cells</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {batches.map((batch: Batch) => (
              <tr key={batch.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{batch.batch_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.queens?.queen_number || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.graft_date}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.cell_count || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    batch.status === 'grafted' ? 'bg-blue-100 text-blue-800' :
                    batch.status === 'emerged' ? 'bg-purple-100 text-purple-800' :
                    batch.status === 'mated' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {batch.status}
                  </span>
                </td>
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
          <div className="text-center py-8 text-gray-500">No QueenCraft found. Create your first QueenCraft!</div>
        )}
      </div>
    </div>
  )
}