'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useRouter } from 'next/navigation'

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
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    location: '',
    city: '',
    eircode: '',
    notes: '',
  })

  const fetchApiaries = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('apiaries')
      .select('*')
      .eq('user_id', currentUserId)
      .order('name')

    if (data) setApiaries(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
      fetchApiaries(id)
    }
    initUser()
  }, [router, fetchApiaries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      if (editingApiary) {
        const { error } = await supabase
          .from('apiaries')
          .update(formData)
          .eq('id', editingApiary.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('apiaries')
          .insert([{ ...formData, user_id: userId }])

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
    if (!userId) return
    if (confirm('Delete this apiary? Associated hives will lose their location.')) {
      const { error } = await supabase
        .from('apiaries')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

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
        <h1 className="text-3xl font-bold text-foreground">Apiaries 📍</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 font-medium flex items-center gap-2 min-h-[48px]"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Apiary'}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
          <h3 className="text-xl font-semibold mb-4 text-foreground">
            {editingApiary ? 'Edit Apiary' : 'Add New Apiary'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Apiary Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Home Garden, North Field"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., North Field, Back Garden"
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="e.g., Dublin, Cork"
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Eircode *</label>
              <input
                type="text"
                value={formData.eircode}
                onChange={(e) => setFormData({...formData, eircode: e.target.value.toUpperCase()})}
                placeholder="e.g., D02 XY45"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary uppercase focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                required
              />
              <p className="text-xs text-text-tertiary mt-1">Required for automatic weather data on inspections</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Access instructions, nearby forage, etc..."
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2 bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 min-h-[48px]">
                {editingApiary ? 'Update' : 'Add'} Apiary
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-sage-200 dark:bg-slate-700 text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 min-h-[48px]">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {apiaries.map((apiary: Apiary) => {
          return (
            <div key={apiary.id} className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-border">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">{apiary.name}</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    {apiary.city && apiary.location ? `${apiary.city} - ${apiary.location}` :
                     apiary.city || apiary.location || 'No location specified'}
                  </p>
                  {apiary.eircode && (
                    <p className="text-sm text-forest-600 dark:text-forest-400 font-medium mt-1">
                      Eircode: {apiary.eircode}
                    </p>
                  )}
                </div>
              </div>

              {apiary.notes && (
                <div className="mb-4 p-3 bg-sage-50 dark:bg-slate-800/50 rounded text-sm text-text-primary border border-sage-200 dark:border-slate-700">
                  {apiary.notes}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(apiary)}
                  className="flex-1 px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 font-medium flex items-center justify-center gap-2 border border-blue-300 dark:border-blue-800 min-h-[48px]"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(apiary.id)}
                  className="flex-1 px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 font-medium flex items-center justify-center gap-2 border border-red-300 dark:border-red-800 min-h-[48px]"
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
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-12 text-center text-text-secondary border border-border">
          No apiaries found. Add your first location!
        </div>
      )}
    </div>
  )
}