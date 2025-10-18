'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Hive {
  id: string
  hive_number: string
}

interface Inspection {
  id: string
  hive_id: string
  inspection_date: string
  queen_seen: boolean
  eggs_present: boolean
  brood_frames: number | null
  brood_pattern_rating: number
  temperament_rating: number
  population_strength: number
  honey_stores: string
  disease_issues: string
  notes: string
  hives?: {
    hive_number: string
  }
}

interface FormData {
  hive_id: string
  inspection_date: string
  queen_seen: boolean
  eggs_present: boolean
  brood_frames: number | null
  brood_pattern_rating: number
  temperament_rating: number
  population_strength: number
  honey_stores: string
  disease_issues: string
  notes: string
}

export default function InspectionsPage() {
  const router = useRouter()
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterHiveId, setFilterHiveId] = useState<string>('')
  const [timePeriod, setTimePeriod] = useState<string>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    hive_id: '',
    inspection_date: new Date().toISOString().split('T')[0],
    queen_seen: false,
    eggs_present: false,
    brood_frames: null,
    brood_pattern_rating: 3,
    temperament_rating: 3,
    population_strength: 3,
    honey_stores: '',
    disease_issues: '',
    notes: '',
  })

  useEffect(() => {
    fetchInspections()
    fetchHives()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showDropdown && !target.closest('.dropdown-container')) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  const fetchInspections = async () => {
    const { data } = await supabase
      .from('inspections')
      .select('*, hives(hive_number)')
      .order('inspection_date', { ascending: false })
    
    if (data) setInspections(data as Inspection[])
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

    try {
      if (editingInspection) {
        const { error } = await supabase
          .from('inspections')
          .update(formData)
          .eq('id', editingInspection.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('inspections')
          .insert([formData])

        if (error) throw error
      }

      fetchInspections()
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      }
    }
  }

  const handleEdit = (inspection: Inspection) => {
    setEditingInspection(inspection)
    setFormData({
      hive_id: inspection.hive_id,
      inspection_date: inspection.inspection_date,
      queen_seen: inspection.queen_seen || false,
      eggs_present: inspection.eggs_present || false,
      brood_frames: inspection.brood_frames || null,
      brood_pattern_rating: inspection.brood_pattern_rating || 3,
      temperament_rating: inspection.temperament_rating || 3,
      population_strength: inspection.population_strength || 3,
      honey_stores: inspection.honey_stores || '',
      disease_issues: inspection.disease_issues || '',
      notes: inspection.notes || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this inspection?')) {
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', id)

      if (!error) fetchInspections()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingInspection(null)
    setFormData({
      hive_id: '',
      inspection_date: new Date().toISOString().split('T')[0],
      queen_seen: false,
      eggs_present: false,
      brood_frames: null,
      brood_pattern_rating: 3,
      temperament_rating: 3,
      population_strength: 3,
      honey_stores: '',
      disease_issues: '',
      notes: '',
    })
  }

  const renderStars = (rating: number) => '⭐'.repeat(rating || 0)

  // Calculate date range based on time period
  const getDateRange = () => {
    const today = new Date()
    let startDate: Date | null = null

    switch (timePeriod) {
      case '3months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
        break
      case '6months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
        break
      case '1year':
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
        break
      case 'custom':
        if (customStartDate) startDate = new Date(customStartDate)
        break
      case 'all':
      default:
        return null
    }

    return startDate
  }

  // Filter inspections based on selected hive and time period
  const filteredInspections = inspections.filter(inspection => {
    // Filter by hive
    if (filterHiveId && inspection.hive_id !== filterHiveId) {
      return false
    }

    // Filter by time period
    const startDate = getDateRange()
    if (startDate) {
      const inspectionDate = new Date(inspection.inspection_date)

      // For custom range, check both start and end dates
      if (timePeriod === 'custom') {
        if (customStartDate && inspectionDate < new Date(customStartDate)) {
          return false
        }
        if (customEndDate && inspectionDate > new Date(customEndDate)) {
          return false
        }
      } else {
        // For preset ranges, just check start date
        if (inspectionDate < startDate) {
          return false
        }
      }
    }

    return true
  })

  if (loading) return <LoadingSpinner text="Loading inspections..." />

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Inspections 📋</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select
            value={filterHiveId}
            onChange={(e) => setFilterHiveId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          >
            <option value="">All Hives</option>
            {hives.map((hive) => (
              <option key={hive.id} value={hive.id}>{hive.hive_number}</option>
            ))}
          </select>
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 justify-center"
            >
              <Plus size={16} />
              New Record
              <ChevronDown size={16} />
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={() => {
                    setShowForm(true)
                    setShowDropdown(false)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-2 rounded-t-lg transition-colors"
                >
                  <Plus size={16} />
                  Record Inspection
                </button>
                <button
                  onClick={() => {
                    router.push('/dashboard/varroa-treatment')
                    setShowDropdown(false)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  Varroa Treatment
                </button>
                <button
                  onClick={() => {
                    router.push('/dashboard/varroa-check')
                    setShowDropdown(false)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-2 rounded-b-lg transition-colors"
                >
                  <Plus size={16} />
                  Varroa Check
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Time Period Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Time Period:</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTimePeriod('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timePeriod === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setTimePeriod('3months')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timePeriod === '3months'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 3 Months
              </button>
              <button
                onClick={() => setTimePeriod('6months')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timePeriod === '6months'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 6 Months
              </button>
              <button
                onClick={() => setTimePeriod('1year')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timePeriod === '1year'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last Year
              </button>
              <button
                onClick={() => setTimePeriod('custom')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timePeriod === 'custom'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Custom Date Range Inputs */}
          {timePeriod === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 pl-0 md:pl-28">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <button
                onClick={() => {
                  setCustomStartDate('')
                  setCustomEndDate('')
                }}
                className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Clear Dates
              </button>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingInspection ? 'Edit Inspection' : 'Record New Inspection'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.inspection_date}
                onChange={(e) => setFormData({...formData, inspection_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.queen_seen}
                onChange={(e) => setFormData({...formData, queen_seen: e.target.checked})}
                className="mr-2 h-4 w-4"
              />
              <label className="text-sm font-medium text-gray-700">Queen Seen</label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.eggs_present}
                onChange={(e) => setFormData({...formData, eggs_present: e.target.checked})}
                className="mr-2 h-4 w-4"
              />
              <label className="text-sm font-medium text-gray-700">Eggs Present</label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frames with Brood {formData.brood_frames !== null ? `(${formData.brood_frames})` : ''}
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFormData({...formData, brood_frames: num})}
                    className={`w-12 h-12 rounded-lg font-semibold transition-all ${
                      formData.brood_frames === num
                        ? 'bg-indigo-600 text-white shadow-lg scale-110'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({...formData, brood_frames: null})}
                  className={`px-4 h-12 rounded-lg font-medium transition-all ${
                    formData.brood_frames === null
                      ? 'bg-gray-400 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Clear
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brood Pattern: {renderStars(formData.brood_pattern_rating)}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.brood_pattern_rating}
                onChange={(e) => setFormData({...formData, brood_pattern_rating: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperament: {renderStars(formData.temperament_rating)}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.temperament_rating}
                onChange={(e) => setFormData({...formData, temperament_rating: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Population: {renderStars(formData.population_strength)}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.population_strength}
                onChange={(e) => setFormData({...formData, population_strength: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Honey Stores</label>
              <select
                value={formData.honey_stores}
                onChange={(e) => setFormData({...formData, honey_stores: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select level</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="Good">Good</option>
                <option value="Excellent">Excellent</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Disease Issues</label>
              <input
                type="text"
                value={formData.disease_issues}
                onChange={(e) => setFormData({...formData, disease_issues: e.target.value})}
                placeholder="e.g., Varroa, AFB, EFB, Nosema"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                placeholder="General observations, actions taken, tasks for next inspection..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                {editingInspection ? 'Update' : 'Save'} Inspection
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {filteredInspections.map((inspection) => (
          <div key={inspection.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">Hive: {inspection.hives?.hive_number || 'Unknown'}</h3>
                <p className="text-sm text-gray-500">{inspection.inspection_date}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(inspection)} className="text-blue-600 hover:text-blue-900">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(inspection.id)} className="text-red-600 hover:text-red-900">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 mb-1">Queen Seen</div>
                <div className="text-2xl">{inspection.queen_seen ? '✅' : '❌'}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 mb-1">Eggs</div>
                <div className="text-2xl">{inspection.eggs_present ? '✅' : '❌'}</div>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded">
                <div className="text-xs text-gray-500 mb-1">Brood Frames</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {inspection.brood_frames ?? '-'}
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 mb-1">Brood Pattern</div>
                <div className="text-sm">{renderStars(inspection.brood_pattern_rating)}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 mb-1">Temperament</div>
                <div className="text-sm">{renderStars(inspection.temperament_rating)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Population: </span>
                <span>{renderStars(inspection.population_strength)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Honey: </span>
                <span>{inspection.honey_stores || 'N/A'}</span>
              </div>
            </div>

            {inspection.disease_issues && (
              <div className="mb-4 p-3 bg-red-50 rounded">
                <span className="text-sm font-medium text-red-700">Disease: </span>
                <span className="text-sm text-red-600">{inspection.disease_issues}</span>
              </div>
            )}

            {inspection.notes && (
              <div className="p-3 bg-blue-50 rounded">
                <span className="text-sm font-medium text-gray-700">Notes: </span>
                <span className="text-sm text-gray-600">{inspection.notes}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredInspections.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          {filterHiveId
            ? `No inspections found for this hive. Select "All Hives" or record a new inspection.`
            : 'No inspections recorded yet. Start tracking your hive inspections!'}
        </div>
      )}
    </div>
  )
}