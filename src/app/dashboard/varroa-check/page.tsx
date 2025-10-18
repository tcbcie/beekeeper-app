'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Hive {
  id: string
  hive_number: string
}

interface VarroaCheck {
  id: string
  hive_id: string
  check_date: string
  method: string
  mites_count: number | null
  sample_size: number | null
  infestation_rate: number | null
  action_threshold_reached: boolean
  notes: string
  hives?: {
    hive_number: string
  }
}

interface FormData {
  hive_id: string
  check_date: string
  method: string
  mites_count: number | null
  sample_size: number | null
  infestation_rate: number | null
  action_threshold_reached: boolean
  notes: string
}

export default function VarroaCheckPage() {
  const router = useRouter()
  const [checks, setChecks] = useState<VarroaCheck[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingCheck, setEditingCheck] = useState<VarroaCheck | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<FormData>({
    hive_id: '',
    check_date: new Date().toISOString().split('T')[0],
    method: '',
    mites_count: null,
    sample_size: null,
    infestation_rate: null,
    action_threshold_reached: false,
    notes: '',
  })

  useEffect(() => {
    fetchChecks()
    fetchHives()
  }, [])

  useEffect(() => {
    // Auto-calculate infestation rate if both counts are provided
    if (formData.mites_count !== null && formData.sample_size !== null && formData.sample_size > 0) {
      const rate = (formData.mites_count / formData.sample_size) * 100
      setFormData(prev => ({...prev, infestation_rate: parseFloat(rate.toFixed(2))}))
    }
  }, [formData.mites_count, formData.sample_size])

  const fetchChecks = async () => {
    const { data } = await supabase
      .from('varroa_checks')
      .select('*, hives(hive_number)')
      .order('check_date', { ascending: false })

    if (data) setChecks(data as VarroaCheck[])
    setLoading(false)
  }

  const fetchHives = async () => {
    const { data } = await supabase
      .from('hives')
      .select('id, hive_number')
      .eq('status', 'active')
      .order('hive_number')

    if (data) setHives(data as Hive[])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('Submitting varroa check with data:', formData)

    try {
      if (editingCheck) {
        const { data, error } = await supabase
          .from('varroa_checks')
          .update(formData)
          .eq('id', editingCheck.id)
          .select()

        console.log('Update response:', { data, error })
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('varroa_checks')
          .insert([formData])
          .select()

        console.log('Insert response:', { data, error })
        if (error) throw error
      }

      fetchChecks()
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        // Log detailed error for debugging
        const errorDetails = {
          message: error.message,
          hint: (error as any).hint,
          details: (error as any).details,
          code: (error as any).code
        }
        console.log('Error saving varroa check:', errorDetails)

        // Show user-friendly message
        let errorMessage = error.message

        // Check for common RLS errors
        if (error.message.includes('row-level security')) {
          errorMessage = 'Security Error: Unable to save. Please ensure:\n1. The varroa_checks table exists\n2. RLS is properly configured\n3. Your hives have user_id set\n\nSee console for details.'
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          errorMessage = 'Database Error: The varroa_checks table does not exist.\n\nPlease run: sql/create_varroa_tables.sql in Supabase'
        }

        alert(`Error: ${errorMessage}`)
      } else {
        console.log('Unknown error:', error)
        alert('An unknown error occurred while saving')
      }
    }
  }

  const handleEdit = (check: VarroaCheck) => {
    setEditingCheck(check)
    setFormData({
      hive_id: check.hive_id,
      check_date: check.check_date,
      method: check.method || '',
      mites_count: check.mites_count || null,
      sample_size: check.sample_size || null,
      infestation_rate: check.infestation_rate || null,
      action_threshold_reached: check.action_threshold_reached || false,
      notes: check.notes || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this varroa check?')) {
      const { error } = await supabase
        .from('varroa_checks')
        .delete()
        .eq('id', id)

      if (!error) fetchChecks()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingCheck(null)
    setFormData({
      hive_id: '',
      check_date: new Date().toISOString().split('T')[0],
      method: '',
      mites_count: null,
      sample_size: null,
      infestation_rate: null,
      action_threshold_reached: false,
      notes: '',
    })
  }

  const getInfestationLevel = (rate: number | null) => {
    if (rate === null) return { text: 'N/A', color: 'text-gray-500', bg: 'bg-gray-100' }
    if (rate < 1) return { text: 'Low', color: 'text-green-700', bg: 'bg-green-100' }
    if (rate < 3) return { text: 'Moderate', color: 'text-yellow-700', bg: 'bg-yellow-100' }
    if (rate < 5) return { text: 'High', color: 'text-orange-700', bg: 'bg-orange-100' }
    return { text: 'Critical', color: 'text-red-700', bg: 'bg-red-100' }
  }

  if (loading) return <LoadingSpinner text="Loading varroa checks..." />

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/inspections')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Varroa Checks</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 justify-center"
        >
          <Plus size={16} />
          {showForm ? 'Cancel' : 'Record Check'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingCheck ? 'Edit Varroa Check' : 'Record New Varroa Check'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hive *</label>
              <select
                value={formData.hive_id}
                onChange={(e) => setFormData({...formData, hive_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select hive</option>
                {hives.map((h) => (
                  <option key={h.id} value={h.id}>{h.hive_number}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check Date *</label>
              <input
                type="date"
                value={formData.check_date}
                onChange={(e) => setFormData({...formData, check_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Method *</label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({...formData, method: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select method</option>
                <option value="Alcohol Wash">Alcohol Wash</option>
                <option value="Sugar Shake">Sugar Shake</option>
                <option value="Sticky Board">Sticky Board (24h count)</option>
                <option value="Drone Brood Inspection">Drone Brood Inspection</option>
                <option value="Visual Count">Visual Count</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mites Count</label>
              <input
                type="number"
                value={formData.mites_count || ''}
                onChange={(e) => setFormData({...formData, mites_count: e.target.value ? parseInt(e.target.value) : null})}
                placeholder="Number of mites found"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sample Size</label>
              <input
                type="number"
                value={formData.sample_size || ''}
                onChange={(e) => setFormData({...formData, sample_size: e.target.value ? parseInt(e.target.value) : null})}
                placeholder="e.g., 300 bees or 24 hours"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Infestation Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.infestation_rate || ''}
                onChange={(e) => setFormData({...formData, infestation_rate: e.target.value ? parseFloat(e.target.value) : null})}
                placeholder="Auto-calculated or enter manually"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-calculated from mites count and sample size
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.action_threshold_reached}
                onChange={(e) => setFormData({...formData, action_threshold_reached: e.target.checked})}
                className="mr-2 h-4 w-4"
              />
              <label className="text-sm font-medium text-gray-700">Action Threshold Reached</label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                placeholder="Observations, treatment recommendations, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                {editingCheck ? 'Update' : 'Save'} Check
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {checks.map((check) => {
          const infestationLevel = getInfestationLevel(check.infestation_rate)
          return (
            <div key={check.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">Hive: {check.hives?.hive_number || 'Unknown'}</h3>
                  <p className="text-sm text-gray-500">{check.check_date}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(check)} className="text-blue-600 hover:text-blue-900">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(check.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="font-medium text-gray-700">Method: </span>
                  <span className="text-indigo-600 font-semibold">{check.method}</span>
                </div>
                {check.mites_count !== null && (
                  <div>
                    <span className="font-medium text-gray-700">Mites Found: </span>
                    <span className="font-semibold">{check.mites_count}</span>
                  </div>
                )}
                {check.sample_size !== null && (
                  <div>
                    <span className="font-medium text-gray-700">Sample Size: </span>
                    <span>{check.sample_size}</span>
                  </div>
                )}
                {check.infestation_rate !== null && (
                  <div>
                    <span className="font-medium text-gray-700">Infestation Rate: </span>
                    <span className={`font-bold ${infestationLevel.color}`}>
                      {check.infestation_rate}%
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${infestationLevel.bg} ${infestationLevel.color}`}>
                  {infestationLevel.text} Infestation
                </span>
                {check.action_threshold_reached && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                    Treatment Recommended
                  </span>
                )}
              </div>

              {check.notes && (
                <div className="p-3 bg-blue-50 rounded">
                  <span className="text-sm font-medium text-gray-700">Notes: </span>
                  <span className="text-sm text-gray-600">{check.notes}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {checks.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No varroa checks recorded yet. Start monitoring your mite levels!
        </div>
      )}
    </div>
  )
}
