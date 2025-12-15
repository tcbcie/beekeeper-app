'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Thermometer, Plus, Trash2, Share2, Info, Loader2, RefreshCw, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Apiary {
  id: string
  name: string
  eircode: string | null
  latitude: number | null
  longitude: number | null
  is_uk_ni: boolean
}

interface VegetationType {
  id: string
  value: string
}

interface GDDRecord {
  id: string
  apiary_id: string
  vegetation_type_id: string
  year: number
  start_date: string
  end_date: string | null
  gdd_value: number | null
  is_shared: boolean
  notes: string | null
  apiaries?: { name: string; eircode: string | null }
  dropdown_values?: { value: string }
}

interface GDDTrackerProps {
  userId: string
}

// Base temperature for GDD calculation (6°C - standard for Irish phenology)
const BASE_TEMP = 6

export default function GDDTracker({ userId }: GDDTrackerProps) {
  const toast = useToast()
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [vegetationTypes, setVegetationTypes] = useState<VegetationType[]>([])
  const [records, setRecords] = useState<GDDRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [calculatingGDD, setCalculatingGDD] = useState<string | null>(null)

  // Form state
  const [selectedApiary, setSelectedApiary] = useState<string>('')
  const [selectedVegetation, setSelectedVegetation] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [isShared, setIsShared] = useState(false)
  const [notes, setNotes] = useState<string>('')
  const [showForm, setShowForm] = useState(false)

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch apiaries with coordinates
      const { data: apiaryData } = await supabase
        .from('apiaries')
        .select('id, name, eircode, latitude, longitude, is_uk_ni')
        .eq('user_id', userId)
        .order('name')

      // Fetch vegetation types from dropdown_values
      const { data: vegData } = await supabase
        .from('dropdown_values')
        .select('id, value, dropdown_categories!inner(category_key)')
        .eq('dropdown_categories.category_key', 'vegetation_type')
        .eq('is_active', true)
        .order('display_order')

      // Fetch user's GDD records
      const { data: recordData } = await supabase
        .from('gdd_records')
        .select(`
          *,
          apiaries(name, eircode),
          dropdown_values(value)
        `)
        .eq('user_id', userId)
        .order('year', { ascending: false })
        .order('start_date', { ascending: false })

      setApiaries(apiaryData || [])
      setVegetationTypes(vegData?.map(v => ({ id: v.id, value: v.value })) || [])
      setRecords(recordData || [])
    } catch (error) {
      console.error('Error fetching GDD data:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate GDD from historical weather data (from Jan 1st to start date)
  const calculateGDD = async (recordId: string, startDate: string, latitude: number, longitude: number) => {
    setCalculatingGDD(recordId)
    try {

      // Calculate from January 1st of the year to the start date (bloom observation)
      const year = new Date(startDate).getFullYear()
      const janFirst = `${year}-01-01`

      // Fetch historical weather data from Open-Meteo
      const response = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${janFirst}&end_date=${startDate}&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Dublin`
      )
      const data = await response.json()

      if (!data.daily || !data.daily.temperature_2m_max) {
        toast.error('Could not fetch weather data for the selected date range')
        return
      }

      // Calculate GDD: sum of max(0, (Tmax + Tmin) / 2 - Tbase)
      let totalGDD = 0
      for (let i = 0; i < data.daily.temperature_2m_max.length; i++) {
        const tMax = data.daily.temperature_2m_max[i]
        const tMin = data.daily.temperature_2m_min[i]
        if (tMax !== null && tMin !== null) {
          const avgTemp = (tMax + tMin) / 2
          const dailyGDD = Math.max(0, avgTemp - BASE_TEMP)
          totalGDD += dailyGDD
        }
      }

      // Update record with calculated GDD
      const { error } = await supabase
        .from('gdd_records')
        .update({ gdd_value: Math.round(totalGDD * 10) / 10, updated_at: new Date().toISOString() })
        .eq('id', recordId)

      if (error) throw error

      // Refresh records
      fetchData()
    } catch (error) {
      console.error('Error calculating GDD:', error)
      toast.error('Error calculating GDD. Please try again.')
    } finally {
      setCalculatingGDD(null)
    }
  }

  // Save new record
  const handleSave = async () => {
    if (!selectedApiary || !selectedVegetation || !startDate) {
      toast.warning('Please select an apiary, vegetation type, and start date')
      return
    }

    const apiary = apiaries.find(a => a.id === selectedApiary)
    if (!apiary?.latitude || !apiary?.longitude) {
      toast.warning('Selected apiary does not have GPS coordinates. Please add them in the Apiaries page.')
      return
    }

    setSaving(true)
    try {
      const year = new Date(startDate).getFullYear()

      const { data, error } = await supabase
        .from('gdd_records')
        .insert({
          user_id: userId,
          apiary_id: selectedApiary,
          vegetation_type_id: selectedVegetation,
          year,
          start_date: startDate,
          end_date: endDate || null,
          is_shared: isShared,
          notes: notes || null,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.warning('A record already exists for this apiary, vegetation type, and year.')
        } else {
          throw error
        }
        return
      }

      // Reset form
      setSelectedApiary('')
      setSelectedVegetation('')
      setStartDate('')
      setEndDate('')
      setIsShared(false)
      setNotes('')
      setShowForm(false)

      // Refresh and calculate GDD if end date is set
      await fetchData()

      // Calculate GDD from Jan 1st to start date
      if (data) {
        await calculateGDD(data.id, startDate, apiary.latitude, apiary.longitude)
      }
    } catch (error) {
      console.error('Error saving GDD record:', error)
      toast.error('Error saving record. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Delete record
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return

    try {
      const { error } = await supabase
        .from('gdd_records')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error deleting GDD record:', error)
    }
  }

  // Toggle sharing
  const toggleSharing = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('gdd_records')
        .update({ is_shared: !currentValue, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error toggling sharing:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-forest-600" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Thermometer size={24} className="text-forest-600 dark:text-forest-400" />
          GDD Tracker
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showForm
              ? 'bg-gray-500 hover:bg-gray-600 text-white'
              : 'bg-forest-600 hover:bg-forest-700 text-white'
          }`}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancel' : 'Add Record'}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">What is GDD (Growing Degree Days)?</p>
            <p>GDD measures accumulated heat units to predict plant development. Track when vegetation starts and ends blooming to compare with historical data and nearby beekeepers.</p>
          </div>
        </div>
      </div>

      {/* Add Record Form */}
      {showForm && (
        <div className="bg-surface dark:bg-surface-elevated border border-border rounded-lg p-6 space-y-4">
          <h4 className="font-semibold text-foreground">New GDD Record</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Apiary *</label>
              <select
                value={selectedApiary}
                onChange={(e) => setSelectedApiary(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
              >
                <option value="">Select apiary...</option>
                {apiaries.map(a => (
                  <option key={a.id} value={a.id} disabled={!a.latitude || !a.longitude}>
                    {a.name} {(!a.latitude || !a.longitude) && '(no coordinates)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Vegetation Type *</label>
              <select
                value={selectedVegetation}
                onChange={(e) => setSelectedVegetation(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
              >
                <option value="">Select vegetation...</option>
                {vegetationTypes.map(v => (
                  <option key={v.id} value={v.id}>{v.value}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Bloom Observed Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
              />
              <p className="text-xs text-text-tertiary mt-1">GDD calculated from Jan 1st to this date</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Bloom End Date (optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
              placeholder="Optional notes about this bloom period..."
            />
          </div>

          {/* Sharing Toggle */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <input
              type="checkbox"
              id="share-data"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="mt-1 h-4 w-4 text-forest-600 rounded border-gray-300"
            />
            <div>
              <label htmlFor="share-data" className="font-medium text-amber-900 dark:text-amber-100 cursor-pointer">
                Share this data with nearby beekeepers
              </label>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Data will be anonymized and only shown to users within 20km of your apiary.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Save Record
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-sage-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Records Table */}
      {records.length > 0 ? (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-lg border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-sage-100 dark:bg-slate-800 border-b border-border">
                <th className="text-left p-3 text-sm font-semibold text-foreground">Year</th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">Apiary</th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">Vegetation</th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">Bloom Date</th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">End</th>
                <th className="text-right p-3 text-sm font-semibold text-foreground">GDD</th>
                <th className="text-center p-3 text-sm font-semibold text-foreground">Shared</th>
                <th className="text-center p-3 text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-border hover:bg-sage-50 dark:hover:bg-slate-700/50">
                  <td className="p-3 text-foreground font-medium">{record.year}</td>
                  <td className="p-3 text-foreground">{record.apiaries?.name || '-'}</td>
                  <td className="p-3 text-foreground">{record.dropdown_values?.value || '-'}</td>
                  <td className="p-3 text-text-secondary">{new Date(record.start_date).toLocaleDateString()}</td>
                  <td className="p-3 text-text-secondary">
                    {record.end_date ? new Date(record.end_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-3 text-right">
                    {record.gdd_value !== null ? (
                      <span className="font-semibold text-forest-700 dark:text-forest-400">{record.gdd_value}</span>
                    ) : (
                      <button
                        onClick={() => {
                          const apiary = apiaries.find(a => a.id === record.apiary_id)
                          if (apiary?.latitude && apiary?.longitude) {
                            calculateGDD(record.id, record.start_date, apiary.latitude, apiary.longitude)
                          } else {
                            toast.warning('Apiary is missing GPS coordinates. Please add them in the Apiaries page.')
                          }
                        }}
                        disabled={calculatingGDD === record.id}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {calculatingGDD === record.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        Calculate
                      </button>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleSharing(record.id, record.is_shared)}
                      className={`p-1.5 rounded-full transition-colors ${
                        record.is_shared
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}
                      title={record.is_shared ? 'Sharing enabled' : 'Sharing disabled'}
                    >
                      <Share2 size={16} />
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                      title="Delete record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-text-secondary">
          <Thermometer size={48} className="mx-auto mb-3 opacity-30" />
          <p>No GDD records yet. Click &quot;Add Record&quot; to start tracking.</p>
        </div>
      )}

      {/* Legend */}
      <div className="text-xs text-text-tertiary">
        <p>Cumulative GDD from Jan 1st to bloom start date. Base temp: {BASE_TEMP}°C. Formula: GDD = Σ max(0, (T<sub>max</sub> + T<sub>min</sub>) / 2 - {BASE_TEMP})</p>
      </div>
    </div>
  )
}
