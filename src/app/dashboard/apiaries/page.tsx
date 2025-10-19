'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Apiary {
  id: string
  name: string
  location: string | null
  city: string | null
  eircode: string | null
  notes: string | null
  created_at?: string
}

interface FormData {
  name: string
  location: string
  city: string
  eircode: string
  notes: string
}

export default function ApiariesPage() {
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingApiary, setEditingApiary] = useState<Apiary | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    location: '',
    city: '',
    eircode: '',
    notes: '',
  })

  useEffect(() => {
    fetchApiaries()
  }, [])

  const fetchApiaries = async () => {
    const { data } = await supabase
      .from('apiaries')
      .select('*')
      .order('name')
    
    if (data) setApiaries(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingApiary) {
        const { error } = await supabase
          .from('apiaries')
          .update(formData)
          .eq('id', editingApiary.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('apiaries')
          .insert([formData])

        if (error) throw error
      }

      fetchApiaries()
      resetForm()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      alert(errorMessage)
    }
  }

  const handleEdit = (apiary: Apiary) => {
    setEditingApiary(apiary)
    setFormData({
      name: apiary.name,
      location: apiary.location || '',
      city: apiary.city || '',
      eircode: apiary.eircode || '',
      notes: apiary.notes || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this apiary? Associated hives will lose their location.')) {
      const { error } = await supabase
        .from('apiaries')
        .delete()
        .eq('id', id)

      if (!error) fetchApiaries()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingApiary(null)
    setFormData({
      name: '',
      location: '',
      city: '',
      eircode: '',
      notes: '',
    })
  }

  if (loading) return <LoadingSpinner text="Loading apiaries..." />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Apiaries 📍</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Apiary'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingApiary ? 'Edit Apiary' : 'Add New Apiary'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apiary Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Home Garden, North Field"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., North Field, Back Garden"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="e.g., Dublin, Cork"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eircode *</label>
              <input
                type="text"
                value={formData.eircode}
                onChange={(e) => setFormData({...formData, eircode: e.target.value})}
                placeholder="e.g., D02 XY45"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Required for automatic weather data on inspections</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Access instructions, nearby forage, etc..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                {editingApiary ? 'Update' : 'Add'} Apiary
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {apiaries.map((apiary: Apiary) => {
          return (
            <div key={apiary.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{apiary.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {apiary.city && apiary.location ? `${apiary.city} - ${apiary.location}` :
                     apiary.city || apiary.location || 'No location specified'}
                  </p>
                  {apiary.eircode && (
                    <p className="text-sm text-indigo-600 font-medium mt-1">
                      Eircode: {apiary.eircode}
                    </p>
                  )}
                </div>
              </div>

              {apiary.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
                  {apiary.notes}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(apiary)}
                  className="flex-1 px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-medium flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(apiary.id)}
                  className="flex-1 px-4 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {apiaries.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No apiaries found. Add your first location!
        </div>
      )}
    </div>
  )
}