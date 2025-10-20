'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Apiary {
  id: string
  name: string
}

interface Hive {
  id: string
  hive_number: string
  apiary_id: string | null
}

interface Feeding {
  id: string
  hive_id: string
  feed_date: string
  feed_type: string
  quantity: number | null
  unit: string
  notes: string
  hives?: {
    hive_number: string
  }
}

interface FormData {
  hive_id: string
  feed_date: string
  feed_type: string
  quantity: number | null
  unit: string
  notes: string
}

export default function FeedingPage() {
  const router = useRouter()
  const [feedings, setFeedings] = useState<Feeding[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingFeeding, setEditingFeeding] = useState<Feeding | null>(null)
  const [loading, setLoading] = useState(true)
  const [formApiaryId, setFormApiaryId] = useState<string>('')
  const [formData, setFormData] = useState<FormData>({
    hive_id: '',
    feed_date: new Date().toISOString().split('T')[0],
    feed_type: '',
    quantity: null,
    unit: 'kg',
    notes: '',
  })

  useEffect(() => {
    fetchFeedings()
    fetchHives()
    fetchApiaries()
  }, [])

  const fetchFeedings = async () => {
    const { data } = await supabase
      .from('feedings')
      .select('*, hives(hive_number)')
      .order('feed_date', { ascending: false })

    if (data) setFeedings(data as Feeding[])
    setLoading(false)
  }

  const fetchHives = async () => {
    const { data } = await supabase
      .from('hives')
      .select('id, hive_number, apiary_id')
      .order('hive_number')

    if (data) setHives(data as Hive[])
  }

  const fetchApiaries = async () => {
    const { data } = await supabase
      .from('apiaries')
      .select('id, name')
      .order('name')

    if (data) setApiaries(data as Apiary[])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      hive_id: formData.hive_id,
      feed_date: formData.feed_date,
      feed_type: formData.feed_type,
      quantity: formData.quantity,
      unit: formData.unit,
      notes: formData.notes,
    }

    if (editingFeeding) {
      const { error } = await supabase
        .from('feedings')
        .update(submitData)
        .eq('id', editingFeeding.id)

      if (error) {
        alert(`Error updating feeding: ${error.message}`)
        return
      }
    } else {
      const { error } = await supabase
        .from('feedings')
        .insert([submitData])

      if (error) {
        alert(`Error adding feeding: ${error.message}`)
        return
      }
    }

    fetchFeedings()
    resetForm()
  }

  const handleEdit = (feeding: Feeding) => {
    setEditingFeeding(feeding)

    // Find the hive's apiary to pre-populate the apiary selector
    const selectedHive = hives.find(h => h.id === feeding.hive_id)
    if (selectedHive?.apiary_id) {
      setFormApiaryId(selectedHive.apiary_id)
    } else {
      setFormApiaryId('')
    }

    setFormData({
      hive_id: feeding.hive_id,
      feed_date: feeding.feed_date,
      feed_type: feeding.feed_type,
      quantity: feeding.quantity,
      unit: feeding.unit,
      notes: feeding.notes || '',
    })

    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this feeding record?')) {
      const { error } = await supabase
        .from('feedings')
        .delete()
        .eq('id', id)

      if (!error) fetchFeedings()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingFeeding(null)
    setFormApiaryId('')
    setFormData({
      hive_id: '',
      feed_date: new Date().toISOString().split('T')[0],
      feed_type: '',
      quantity: null,
      unit: 'kg',
      notes: '',
    })
  }

  if (loading) return <LoadingSpinner text="Loading feedings..." />

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/inspections')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Back to inspections"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-responsive-3xl font-bold text-gray-900">Feeding Records 🍯</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 min-h-[48px] bg-amber-600 text-white rounded-lg hover:bg-amber-700 active:bg-amber-800 font-medium flex items-center gap-2 touch-manipulation w-full sm:w-auto"
        >
          <Plus size={18} />
          {showForm ? 'Cancel' : 'Add Feeding'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingFeeding ? 'Edit Feeding' : 'Record New Feeding'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apiary</label>
              <select
                value={formApiaryId}
                onChange={(e) => {
                  setFormApiaryId(e.target.value)
                  setFormData({...formData, hive_id: ''})
                }}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md"
              >
                <option value="">All Apiaries</option>
                {apiaries.map((apiary) => (
                  <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hive *</label>
              <select
                value={formData.hive_id}
                onChange={(e) => setFormData({...formData, hive_id: e.target.value})}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md"
                required
              >
                <option value="">Select hive</option>
                {hives
                  .filter(h => !formApiaryId || h.apiary_id === formApiaryId)
                  .map((h) => (
                    <option key={h.id} value={h.id}>{h.hive_number}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.feed_date}
                onChange={(e) => setFormData({...formData, feed_date: e.target.value})}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feed Type *</label>
              <select
                value={formData.feed_type}
                onChange={(e) => setFormData({...formData, feed_type: e.target.value})}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md"
                required
              >
                <option value="">Select type</option>
                <option value="Sugar Syrup (1:1)">Sugar Syrup (1:1)</option>
                <option value="Sugar Syrup (2:1)">Sugar Syrup (2:1)</option>
                <option value="Fondant">Fondant</option>
                <option value="Pollen Patty">Pollen Patty</option>
                <option value="Candy Board">Candy Board</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                step="0.1"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({...formData, quantity: e.target.value ? parseFloat(e.target.value) : null})}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md"
                placeholder="0.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md"
                required
              >
                <option value="kg">kg</option>
                <option value="liters">liters</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Additional observations or comments..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-amber-600 text-white rounded-lg hover:bg-amber-700 active:bg-amber-800 touch-manipulation font-medium"
              >
                {editingFeeding ? 'Update' : 'Add'} Feeding
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-gray-200 rounded-lg hover:bg-gray-300 active:bg-gray-400 touch-manipulation font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {feedings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No feeding records yet. Click &ldquo;Add Feeding&rdquo; to get started.
          </div>
        ) : (
          feedings.map((feeding) => (
            <div key={feeding.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">Hive: {feeding.hives?.hive_number || 'Unknown'}</h3>
                  <p className="text-sm text-gray-500">{feeding.feed_date}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(feeding)}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-600 hover:text-blue-900 hover:bg-blue-50 active:bg-blue-100 rounded-lg touch-manipulation"
                    aria-label="Edit feeding"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(feeding.id)}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-600 hover:text-red-900 hover:bg-red-50 active:bg-red-100 rounded-lg touch-manipulation"
                    aria-label="Delete feeding"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-amber-50 rounded">
                  <div className="text-xs text-gray-500 mb-1">Feed Type</div>
                  <div className="text-sm font-medium text-amber-700">{feeding.feed_type}</div>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <div className="text-xs text-gray-500 mb-1">Quantity</div>
                  <div className="text-sm font-medium text-green-700">
                    {feeding.quantity ? `${feeding.quantity} ${feeding.unit}` : 'Not specified'}
                  </div>
                </div>
              </div>

              {feeding.notes && (
                <div className="p-3 bg-blue-50 rounded">
                  <span className="text-sm font-medium text-gray-700">Notes: </span>
                  <span className="text-sm text-gray-600">{feeding.notes}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
