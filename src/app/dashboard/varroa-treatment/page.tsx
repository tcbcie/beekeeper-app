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

interface DropdownValue {
  id: string
  value: string
  display_order: number
  is_active: boolean
}

interface VarroaTreatment {
  id: string
  hive_id: string
  treatment_date: string
  treatment_type: string
  product_name: string
  dosage: string
  temperature: number | null
  weather_conditions: string
  notes: string
  hives?: {
    hive_number: string
  }
}

interface FormData {
  hive_id: string
  treatment_date: string
  treatment_type: string
  product_name: string
  dosage: string
  temperature: number | null
  weather_conditions: string
  notes: string
}

export default function VarroaTreatmentPage() {
  const router = useRouter()
  const [treatments, setTreatments] = useState<VarroaTreatment[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [productNames, setProductNames] = useState<DropdownValue[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<VarroaTreatment | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<FormData>({
    hive_id: '',
    treatment_date: new Date().toISOString().split('T')[0],
    treatment_type: '',
    product_name: '',
    dosage: '',
    temperature: null,
    weather_conditions: '',
    notes: '',
  })

  useEffect(() => {
    fetchTreatments()
    fetchHives()
    fetchProductNames()
  }, [])

  const fetchTreatments = async () => {
    const { data } = await supabase
      .from('varroa_treatments')
      .select('*, hives(hive_number)')
      .order('treatment_date', { ascending: false })

    if (data) setTreatments(data as VarroaTreatment[])
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

  const fetchProductNames = async () => {
    const { data: category } = await supabase
      .from('dropdown_categories')
      .select('id')
      .eq('category_key', 'varroa_treatment_product')
      .single()

    if (category) {
      const { data } = await supabase
        .from('dropdown_values')
        .select('id, value, display_order, is_active')
        .eq('category_id', category.id)
        .eq('is_active', true)
        .order('display_order')

      if (data) setProductNames(data as DropdownValue[])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('Submitting varroa treatment with data:', formData)

    try {
      if (editingTreatment) {
        const { data, error } = await supabase
          .from('varroa_treatments')
          .update(formData)
          .eq('id', editingTreatment.id)
          .select()

        console.log('Update response:', { data, error })
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('varroa_treatments')
          .insert([formData])
          .select()

        console.log('Insert response:', { data, error })
        if (error) throw error
      }

      fetchTreatments()
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
        console.log('Error saving varroa treatment:', errorDetails)

        // Show user-friendly message
        let errorMessage = error.message

        // Check for common RLS errors
        if (error.message.includes('row-level security')) {
          errorMessage = 'Security Error: Unable to save. Please ensure:\n1. The varroa_checks table exists\n2. RLS is properly configured\n3. Your hives have user_id set\n\nSee console for details.'
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          errorMessage = 'Database Error: The varroa_treatments table does not exist.\n\nPlease run: sql/create_varroa_tables.sql in Supabase'
        }

        alert(`Error: ${errorMessage}`)
      } else {
        console.log('Unknown error:', error)
        alert('An unknown error occurred while saving')
      }
    }
  }

  const handleEdit = (treatment: VarroaTreatment) => {
    setEditingTreatment(treatment)
    setFormData({
      hive_id: treatment.hive_id,
      treatment_date: treatment.treatment_date,
      treatment_type: treatment.treatment_type || '',
      product_name: treatment.product_name || '',
      dosage: treatment.dosage || '',
      temperature: treatment.temperature || null,
      weather_conditions: treatment.weather_conditions || '',
      notes: treatment.notes || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this treatment record?')) {
      const { error } = await supabase
        .from('varroa_treatments')
        .delete()
        .eq('id', id)

      if (!error) fetchTreatments()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingTreatment(null)
    setFormData({
      hive_id: '',
      treatment_date: new Date().toISOString().split('T')[0],
      treatment_type: '',
      product_name: '',
      dosage: '',
      temperature: null,
      weather_conditions: '',
      notes: '',
    })
  }

  if (loading) return <LoadingSpinner text="Loading treatments..." />

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
          <h1 className="text-3xl font-bold text-gray-900">Varroa Treatments</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 justify-center"
        >
          <Plus size={16} />
          {showForm ? 'Cancel' : 'Record Treatment'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingTreatment ? 'Edit Treatment' : 'Record New Treatment'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Date *</label>
              <input
                type="date"
                value={formData.treatment_date}
                onChange={(e) => setFormData({...formData, treatment_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Type *</label>
              <select
                value={formData.treatment_type}
                onChange={(e) => setFormData({...formData, treatment_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select type</option>
                <option value="Oxalic Acid">Oxalic Acid</option>
                <option value="Formic Acid">Formic Acid</option>
                <option value="Apiguard">Apiguard (Thymol)</option>
                <option value="Apivar">Apivar (Amitraz)</option>
                <option value="Apistan">Apistan (Fluvalinate)</option>
                <option value="Checkmite+">Checkmite+ (Coumaphos)</option>
                <option value="Mite Away Quick Strips">Mite Away Quick Strips</option>
                <option value="Hopguard">Hopguard</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <select
                value={formData.product_name}
                onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select product</option>
                {productNames.map((product) => (
                  <option key={product.id} value={product.value}>
                    {product.value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
              <input
                type="text"
                value={formData.dosage}
                onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                placeholder="e.g., 2.5ml per hive"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
              <input
                type="number"
                value={formData.temperature || ''}
                onChange={(e) => setFormData({...formData, temperature: e.target.value ? parseFloat(e.target.value) : null})}
                placeholder="e.g., 15"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Weather Conditions</label>
              <input
                type="text"
                value={formData.weather_conditions}
                onChange={(e) => setFormData({...formData, weather_conditions: e.target.value})}
                placeholder="e.g., Sunny, calm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                placeholder="Additional observations, follow-up treatment dates, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                {editingTreatment ? 'Update' : 'Save'} Treatment
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {treatments.map((treatment) => (
          <div key={treatment.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">Hive: {treatment.hives?.hive_number || 'Unknown'}</h3>
                <p className="text-sm text-gray-500">{treatment.treatment_date}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(treatment)} className="text-blue-600 hover:text-blue-900">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(treatment.id)} className="text-red-600 hover:text-red-900">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="font-medium text-gray-700">Treatment Type: </span>
                <span className="text-indigo-600 font-semibold">{treatment.treatment_type}</span>
              </div>
              {treatment.product_name && (
                <div>
                  <span className="font-medium text-gray-700">Product: </span>
                  <span>{treatment.product_name}</span>
                </div>
              )}
              {treatment.dosage && (
                <div>
                  <span className="font-medium text-gray-700">Dosage: </span>
                  <span>{treatment.dosage}</span>
                </div>
              )}
              {treatment.temperature !== null && (
                <div>
                  <span className="font-medium text-gray-700">Temperature: </span>
                  <span>{treatment.temperature}°C</span>
                </div>
              )}
              {treatment.weather_conditions && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Weather: </span>
                  <span>{treatment.weather_conditions}</span>
                </div>
              )}
            </div>

            {treatment.notes && (
              <div className="p-3 bg-blue-50 rounded">
                <span className="text-sm font-medium text-gray-700">Notes: </span>
                <span className="text-sm text-gray-600">{treatment.notes}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {treatments.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No varroa treatments recorded yet. Start tracking your mite treatments!
        </div>
      )}
    </div>
  )
}
