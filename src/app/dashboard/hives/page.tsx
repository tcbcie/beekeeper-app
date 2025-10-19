'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Apiary {
  id: string
  name: string
}

interface Queen {
  id: string
  queen_number: string
}

interface Hive {
  id: string
  hive_number: string
  apiary_id: string | null
  queen_id: string | null
  queen_marked: boolean
  queen_marking_color: string | null
  queen_mated: boolean
  queen_clipped: boolean
  status: string
  notes: string | null
  apiaries?: {
    name: string
  }
  queens?: {
    queen_number: string
  }
}

interface FormData {
  hive_number: string
  apiary_id: string
  queen_id: string
  queen_marked: boolean
  queen_marking_color: string
  queen_mated: boolean
  queen_clipped: boolean
  status: string
  notes: string
}

export default function HivesPage() {
  const [hives, setHives] = useState<Hive[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [queens, setQueens] = useState<Queen[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingHive, setEditingHive] = useState<Hive | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<FormData>({
    hive_number: '',
    apiary_id: '',
    queen_id: '',
    queen_marked: false,
    queen_marking_color: '',
    queen_mated: false,
    queen_clipped: false,
    status: 'active',
    notes: '',
  })

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Auth error:', error)
      }
      console.log('Current session:', session ? 'Authenticated' : 'Not authenticated')
    }

    checkAuth()
    fetchHives()
    fetchApiaries()
    fetchQueens()
  }, [])

  const fetchHives = async () => {
    // Try without joins first to see if we can get basic hive data
    const { data, error } = await supabase
      .from('hives')
      .select('*')
      .order('hive_number')

    console.log('Fetch hives response:', { data, error })

    if (error) {
      console.error('Error fetching hives:', error)
      alert(`Error loading hives: ${error.message}`)
    } else {
      console.log('Hives data received:', data)
      console.log('Number of hives:', data?.length || 0)

      // If we have hives, try to enrich them with apiary and queen data
      if (data && data.length > 0) {
        const enrichedHives = await Promise.all(
          data.map(async (hive) => {
            let apiaryName = null
            let queenNumber = null

            // Fetch apiary if exists
            if (hive.apiary_id) {
              const { data: apiaryData } = await supabase
                .from('apiaries')
                .select('name')
                .eq('id', hive.apiary_id)
                .single()
              apiaryName = apiaryData?.name
            }

            // Fetch queen if exists
            if (hive.queen_id) {
              const { data: queenData } = await supabase
                .from('queens')
                .select('queen_number')
                .eq('id', hive.queen_id)
                .single()
              queenNumber = queenData?.queen_number
            }

            return {
              ...hive,
              apiaries: apiaryName ? { name: apiaryName } : undefined,
              queens: queenNumber ? { queen_number: queenNumber } : undefined,
            }
          })
        )
        console.log('Enriched hives:', enrichedHives)
        setHives(enrichedHives as Hive[])
      } else {
        setHives([])
      }
    }
    setLoading(false)
  }

  const fetchApiaries = async () => {
    const { data, error } = await supabase
      .from('apiaries')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('Error fetching apiaries:', error)
    } else if (data) {
      setApiaries(data as Apiary[])
    }
  }

  const fetchQueens = async () => {
    const { data, error } = await supabase
      .from('queens')
      .select('id, queen_number')
      .eq('status', 'active')
      .order('queen_number')

    if (error) {
      console.error('Error fetching queens:', error)
    } else if (data) {
      setQueens(data as Queen[])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const dataToSubmit = {
        ...formData,
        apiary_id: formData.apiary_id || null,
        queen_id: formData.queen_id || null,
      }

      if (editingHive) {
        const { error } = await supabase
          .from('hives')
          .update(dataToSubmit)
          .eq('id', editingHive.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('hives')
          .insert([dataToSubmit])

        if (error) throw error
      }

      fetchHives()
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      }
    }
  }

  const handleEdit = (hive: Hive) => {
    setEditingHive(hive)
    setFormData({
      hive_number: hive.hive_number,
      apiary_id: hive.apiary_id || '',
      queen_id: hive.queen_id || '',
      queen_marked: hive.queen_marked || false,
      queen_marking_color: hive.queen_marking_color || '',
      queen_mated: hive.queen_mated || false,
      queen_clipped: hive.queen_clipped || false,
      status: hive.status,
      notes: hive.notes || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this hive?')) {
      const { error } = await supabase
        .from('hives')
        .delete()
        .eq('id', id)

      if (!error) fetchHives()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingHive(null)
    setFormData({
      hive_number: '',
      apiary_id: '',
      queen_id: '',
      queen_marked: false,
      queen_marking_color: '',
      queen_mated: false,
      queen_clipped: false,
      status: 'active',
      notes: '',
    })
  }

  if (loading) return <LoadingSpinner text="Loading hives..." />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Hives 🐝</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium flex items-center gap-2"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Hive'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingHive ? 'Edit Hive' : 'Add New Hive'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hive Number *</label>
              <input
                type="text"
                value={formData.hive_number}
                onChange={(e) => setFormData({...formData, hive_number: e.target.value})}
                placeholder="e.g., A-1, B-3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apiary</label>
              <select
                value={formData.apiary_id}
                onChange={(e) => setFormData({...formData, apiary_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select apiary</option>
                {apiaries.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Queen</label>
              <select
                value={formData.queen_id}
                onChange={(e) => setFormData({...formData, queen_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Record manual</option>
                {queens.map((q) => (
                  <option key={q.id} value={q.id}>{q.queen_number}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="active">Active</option>
                <option value="queenless">Queenless</option>
                <option value="retired">Retired</option>
              </select>
            </div>

            {/* Show queen checkboxes only when no queen is assigned */}
            {!formData.queen_id && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Queen Status (if no specific queen assigned)</label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, queen_marked: !formData.queen_marked})}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                        formData.queen_marked
                          ? 'bg-amber-600 text-white shadow-md hover:bg-amber-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-lg">{formData.queen_marked ? '✓' : '○'}</span>
                      Queen Marked
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, queen_mated: !formData.queen_mated})}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                        formData.queen_mated
                          ? 'bg-green-600 text-white shadow-md hover:bg-green-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-lg">{formData.queen_mated ? '♥' : '○'}</span>
                      Queen Mated
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, queen_clipped: !formData.queen_clipped})}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                        formData.queen_clipped
                          ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-lg">{formData.queen_clipped ? '✂' : '○'}</span>
                      Queen Clipped
                    </button>
                  </div>
                </div>

                {/* Show marking color dropdown when Queen Marked is checked */}
                {formData.queen_marked && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Queen Marking Color</label>
                    <select
                      value={formData.queen_marking_color}
                      onChange={(e) => setFormData({...formData, queen_marking_color: e.target.value})}
                      className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select color</option>
                      <option value="White">White</option>
                      <option value="Yellow">Yellow</option>
                      <option value="Red">Red</option>
                      <option value="Green">Green</option>
                      <option value="Blue">Blue</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      International standard: White (1,6) | Yellow (2,7) | Red (3,8) | Green (4,9) | Blue (5,0)
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Special characteristics, equipment, etc..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                {editingHive ? 'Update' : 'Add'} Hive
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hives.map((hive) => (
          <div key={hive.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-bold text-gray-900">{hive.hive_number}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                hive.status === 'active' ? 'bg-green-100 text-green-800' :
                hive.status === 'queenless' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {hive.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">📍</span>
                <span>{hive.apiaries?.name || 'No apiary'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">👑</span>
                <span>{hive.queens?.queen_number || 'No queen'}</span>
              </div>
              {hive.notes && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-gray-700 text-xs">
                  {hive.notes}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(hive)}
                className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(hive.id)}
                className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {hives.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No hives found. Add your first hive!
        </div>
      )}
    </div>
  )
}