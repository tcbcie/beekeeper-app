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

interface Harvest {
  id: string
  hive_id: string
  harvest_date: string
  honey_weight: number | null
  wax_weight: number | null
  unit: string
  frames_harvested: number | null
  notes: string
  hives?: {
    hive_number: string
  }
}

interface FormData {
  hive_id: string
  harvest_date: string
  honey_weight: number | null
  wax_weight: number | null
  unit: string
  frames_harvested: number | null
  notes: string
}

export default function HarvestPage() {
  const router = useRouter()
  const [harvests, setHarvests] = useState<Harvest[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null)
  const [loading, setLoading] = useState(true)
  const [formApiaryId, setFormApiaryId] = useState<string>('')
  const [formData, setFormData] = useState<FormData>({
    hive_id: '',
    harvest_date: new Date().toISOString().split('T')[0],
    honey_weight: null,
    wax_weight: null,
    unit: 'kg',
    frames_harvested: null,
    notes: '',
  })

  useEffect(() => {
    fetchHarvests()
    fetchHives()
    fetchApiaries()
  }, [])

  const fetchHarvests = async () => {
    const { data } = await supabase
      .from('harvests')
      .select('*, hives(hive_number)')
      .order('harvest_date', { ascending: false })

    if (data) setHarvests(data as Harvest[])
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
      harvest_date: formData.harvest_date,
      honey_weight: formData.honey_weight,
      wax_weight: formData.wax_weight,
      unit: formData.unit,
      frames_harvested: formData.frames_harvested,
      notes: formData.notes,
    }

    if (editingHarvest) {
      const { error } = await supabase
        .from('harvests')
        .update(submitData)
        .eq('id', editingHarvest.id)

      if (error) {
        alert(`Error updating harvest: ${error.message}`)
        return
      }
    } else {
      const { error } = await supabase
        .from('harvests')
        .insert([submitData])

      if (error) {
        alert(`Error adding harvest: ${error.message}`)
        return
      }
    }

    fetchHarvests()
    resetForm()
  }

  const handleEdit = (harvest: Harvest) => {
    setEditingHarvest(harvest)

    // Find the hive's apiary to pre-populate the apiary selector
    const selectedHive = hives.find(h => h.id === harvest.hive_id)
    if (selectedHive?.apiary_id) {
      setFormApiaryId(selectedHive.apiary_id)
    } else {
      setFormApiaryId('')
    }

    setFormData({
      hive_id: harvest.hive_id,
      harvest_date: harvest.harvest_date,
      honey_weight: harvest.honey_weight,
      wax_weight: harvest.wax_weight,
      unit: harvest.unit,
      frames_harvested: harvest.frames_harvested,
      notes: harvest.notes || '',
    })

    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this harvest record?')) {
      const { error } = await supabase
        .from('harvests')
        .delete()
        .eq('id', id)

      if (!error) fetchHarvests()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingHarvest(null)
    setFormApiaryId('')
    setFormData({
      hive_id: '',
      harvest_date: new Date().toISOString().split('T')[0],
      honey_weight: null,
      wax_weight: null,
      unit: 'kg',
      frames_harvested: null,
      notes: '',
    })
  }

  if (loading) return <LoadingSpinner text="Loading harvests..." />

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
          <h1 className="text-responsive-3xl font-bold text-gray-900">Harvest Records 🍯</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 min-h-[48px] bg-amber-600 text-white rounded-lg hover:bg-amber-700 active:bg-amber-800 font-medium flex items-center gap-2 touch-manipulation w-full sm:w-auto"
        >
          <Plus size={18} />
          {showForm ? 'Cancel' : 'Add Harvest'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingHarvest ? 'Edit Harvest' : 'Record New Harvest'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Harvest Date *</label>
              <input
                type="date"
                value={formData.harvest_date}
                onChange={(e) => setFormData({...formData, harvest_date: e.target.value})}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md"
                required
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
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Honey Weight</label>
              <input
                type="number"
                step="0.1"
                value={formData.honey_weight || ''}
                onChange={(e) => setFormData({...formData, honey_weight: e.target.value ? parseFloat(e.target.value) : null})}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md"
                placeholder="0.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wax Weight</label>
              <input
                type="number"
                step="0.1"
                value={formData.wax_weight || ''}
                onChange={(e) => setFormData({...formData, wax_weight: e.target.value ? parseFloat(e.target.value) : null})}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md"
                placeholder="0.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frames Harvested</label>
              <input
                type="number"
                value={formData.frames_harvested || ''}
                onChange={(e) => setFormData({...formData, frames_harvested: e.target.value ? parseInt(e.target.value) : null})}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md"
                placeholder="0"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Quality, color, water content, etc..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-amber-600 text-white rounded-lg hover:bg-amber-700 active:bg-amber-800 touch-manipulation font-medium"
              >
                {editingHarvest ? 'Update' : 'Add'} Harvest
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
        {harvests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No harvest records yet. Click &ldquo;Add Harvest&rdquo; to get started.
          </div>
        ) : (
          harvests.map((harvest) => (
            <div key={harvest.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">Hive: {harvest.hives?.hive_number || 'Unknown'}</h3>
                  <p className="text-sm text-gray-500">{harvest.harvest_date}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(harvest)}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-600 hover:text-blue-900 hover:bg-blue-50 active:bg-blue-100 rounded-lg touch-manipulation"
                    aria-label="Edit harvest"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(harvest.id)}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-600 hover:text-red-900 hover:bg-red-50 active:bg-red-100 rounded-lg touch-manipulation"
                    aria-label="Delete harvest"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-amber-50 rounded">
                  <div className="text-xs text-gray-500 mb-1">Honey</div>
                  <div className="text-sm font-medium text-amber-700">
                    {harvest.honey_weight ? `${harvest.honey_weight} ${harvest.unit}` : 'Not recorded'}
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded">
                  <div className="text-xs text-gray-500 mb-1">Wax</div>
                  <div className="text-sm font-medium text-yellow-700">
                    {harvest.wax_weight ? `${harvest.wax_weight} ${harvest.unit}` : 'Not recorded'}
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <div className="text-xs text-gray-500 mb-1">Frames</div>
                  <div className="text-sm font-medium text-green-700">
                    {harvest.frames_harvested ? harvest.frames_harvested : 'Not recorded'}
                  </div>
                </div>
              </div>

              {harvest.notes && (
                <div className="p-3 bg-blue-50 rounded">
                  <span className="text-sm font-medium text-gray-700">Notes: </span>
                  <span className="text-sm text-gray-600">{harvest.notes}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
