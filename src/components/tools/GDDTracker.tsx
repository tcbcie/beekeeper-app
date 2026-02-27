'use client'
import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { Thermometer, Plus, Trash2, Share2, Info, Loader2, RefreshCw, Pencil, Save, ChevronUp, ChevronDown, Layers } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import VegetationInfoModal from '@/components/shared/VegetationInfoModal'
import Button from '@/components/ui/Button'

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

// GDD seasonal multipliers to account for reduced growth contribution in winter
const getSeasonalMultiplier = (month: number): number => {
  if (month === 1) return 0.5
  if (month === 2) return 0.75
  return 1.0
}

type SortColumn = 'year' | 'start_date' | 'gdd_value'
type SortDirection = 'asc' | 'desc'

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [vegModalOpen, setVegModalOpen] = useState(false)
  const [vegModalName, setVegModalName] = useState('')
  const [vegModalTypeId, setVegModalTypeId] = useState('')

  // Sort state
  const [sortColumn, setSortColumn] = useState<SortColumn>('year')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Group by vegetation state
  const [groupByVegetation, setGroupByVegetation] = useState(false)

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

      if (!data.daily || !data.daily.temperature_2m_max || !data.daily.time) {
        toast.error('Could not fetch weather data for the selected date range')
        return
      }

      // GDD with seasonal multipliers (Jan: 0.5, Feb: 0.75, Mar-Dec: 1.0)
      let totalGDD = 0
      for (let i = 0; i < data.daily.temperature_2m_max.length; i++) {
        const tMax = data.daily.temperature_2m_max[i]
        const tMin = data.daily.temperature_2m_min[i]
        const dateStr = data.daily.time[i]
        if (tMax !== null && tMin !== null && dateStr) {
          const avgTemp = (tMax + tMin) / 2
          if (avgTemp > 0) {
            const month = new Date(dateStr).getMonth() + 1 // 1-12
            const multiplier = getSeasonalMultiplier(month)
            totalGDD += avgTemp * multiplier
          }
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

  // Save new or update existing record
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

      if (editingId) {
        // Update existing record
        const { error } = await supabase
          .from('gdd_records')
          .update({
            apiary_id: selectedApiary,
            vegetation_type_id: selectedVegetation,
            year,
            start_date: startDate,
            end_date: endDate || null,
            is_shared: isShared,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)

        if (error) {
          if (error.code === '23505') {
            toast.warning('A record already exists for this apiary, vegetation type, and year.')
          } else {
            throw error
          }
          return
        }

        toast.success('Record updated successfully')
        resetForm()
        await fetchData()

        // Recalculate GDD with new date
        await calculateGDD(editingId, startDate, apiary.latitude, apiary.longitude)
      } else {
        // Insert new record
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

        resetForm()
        await fetchData()

        // Calculate GDD from Jan 1st to start date
        if (data) {
          await calculateGDD(data.id, startDate, apiary.latitude, apiary.longitude)
        }
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

  // Reset form to initial state
  const resetForm = () => {
    setSelectedApiary('')
    setSelectedVegetation('')
    setStartDate('')
    setEndDate('')
    setIsShared(false)
    setNotes('')
    setShowForm(false)
    setEditingId(null)
  }

  // Edit a record - populate form with record data
  const handleEdit = (record: GDDRecord) => {
    setSelectedApiary(record.apiary_id)
    setSelectedVegetation(record.vegetation_type_id)
    setStartDate(record.start_date)
    setEndDate(record.end_date || '')
    setIsShared(record.is_shared)
    setNotes(record.notes || '')
    setEditingId(record.id)
    setShowForm(true)
  }

  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Sorted records
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case 'year':
          comparison = a.year - b.year
          break
        case 'start_date':
          comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          break
        case 'gdd_value':
          const aVal = a.gdd_value ?? -1
          const bVal = b.gdd_value ?? -1
          comparison = aVal - bVal
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [records, sortColumn, sortDirection])

  // Grouped records by vegetation
  const groupedRecords = useMemo(() => {
    if (!groupByVegetation) return null
    const groups: { name: string; records: GDDRecord[] }[] = []
    const groupMap = new Map<string, GDDRecord[]>()

    for (const record of sortedRecords) {
      const vegName = record.dropdown_values?.value || 'Unknown'
      if (!groupMap.has(vegName)) {
        groupMap.set(vegName, [])
      }
      groupMap.get(vegName)!.push(record)
    }

    // Sort groups alphabetically by vegetation name
    for (const [name, records] of [...groupMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      groups.push({ name, records })
    }

    return groups
  }, [sortedRecords, groupByVegetation])

  // Sort indicator component
  const SortIndicator = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ChevronUp size={14} className="opacity-0 group-hover:opacity-30" />
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-forest-600" />
      : <ChevronDown size={14} className="text-forest-600" />
  }

  // Render function (not a component) so React reconciles <tr> nodes via key, not via component identity
  const renderRecordRow = (record: GDDRecord) => (
    <tr key={record.id} className="border-b border-border hover:bg-surface-secondary">
      <td className="p-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <Button
            onClick={() => handleEdit(record)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
            title="Edit record"
          >
            <Pencil size={16} />
          </Button>
          <Button
            onClick={() => handleDelete(record.id)}
            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
            title="Delete record"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </td>
      <td className="p-3 text-foreground font-medium">{record.year}</td>
      <td className="p-3 text-foreground">{record.apiaries?.name || '-'}</td>
      <td className="p-3 text-foreground">
        {groupByVegetation ? (
          <span>{record.dropdown_values?.value || '-'}</span>
        ) : (
          <Button type="button" className="hover:text-green-700 dark:hover:text-green-400 hover:underline cursor-pointer text-left" onClick={() => { setVegModalName(record.dropdown_values?.value || ''); setVegModalTypeId(record.vegetation_type_id); setVegModalOpen(true) }}>{record.dropdown_values?.value || '-'}</Button>
        )}
      </td>
      <td className="p-3 text-text-secondary">{new Date(record.start_date).toLocaleDateString()}</td>
      <td className="p-3 text-text-secondary">
        {record.end_date ? new Date(record.end_date).toLocaleDateString() : '-'}
      </td>
      <td className="p-3 text-right">
        {record.gdd_value !== null ? (
          <span className="font-semibold text-forest-700 dark:text-forest-400">{record.gdd_value}</span>
        ) : (
          <Button
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
          </Button>
        )}
      </td>
      <td className="p-3 text-center">
        <Button
          onClick={() => toggleSharing(record.id, record.is_shared)}
          className={`p-1.5 rounded-full transition-colors ${
            record.is_shared
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-surface-secondary text-text-tertiary'
          }`}
          title={record.is_shared ? 'Sharing enabled' : 'Sharing disabled'}
        >
          <Share2 size={16} />
        </Button>
      </td>
    </tr>
  )

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
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setGroupByVegetation(prev => !prev)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border text-sm ${
              groupByVegetation
                ? 'bg-forest-100 dark:bg-forest-900/30 border-forest-300 dark:border-forest-700 text-forest-700 dark:text-forest-300'
                : 'bg-surface border-border text-text-secondary hover:bg-surface-elevated'
            }`}
            title="Group by vegetation"
          >
            <Layers size={16} />
            <span className="hidden sm:inline">Group by Vegetation</span>
          </Button>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors bg-forest-600 hover:bg-forest-700 text-white"
            >
              <Plus size={18} />
              Add Record
            </Button>
          )}
        </div>
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

      {/* Add/Edit Record Form */}
      {showForm && (
        <div className="bg-surface dark:bg-surface-elevated border border-border rounded-lg p-6 space-y-4">
          <h4 className="font-semibold text-foreground">{editingId ? 'Edit GDD Record' : 'New GDD Record'}</h4>

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
              className="mt-1 h-4 w-4 text-forest-600 rounded border-border"
            />
            <div>
              <label htmlFor="share-data" className="font-medium text-amber-900 dark:text-amber-100 cursor-pointer">
                Share this data with nearby beekeepers
              </label>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Data will be anonymised and only shown to users within 20km of your apiary.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : editingId ? <Save size={18} /> : <Plus size={18} />}
              {editingId ? 'Update Record' : 'Save Record'}
            </Button>
            <Button
              onClick={resetForm}
              className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-surface-elevated transition-colors"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Records Table */}
      {records.length > 0 ? (
        <div className="overflow-x-auto bg-surface-elevated rounded-lg border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-secondary border-b border-border">
                <th className="text-center p-3 text-sm font-semibold text-foreground w-20">Actions</th>
                <th
                  className="text-left p-3 text-sm font-semibold text-foreground cursor-pointer hover:bg-surface-elevated transition-colors group"
                  onClick={() => handleSort('year')}
                >
                  <span className="flex items-center gap-1">Year <SortIndicator column="year" /></span>
                </th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">Apiary</th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">Vegetation</th>
                <th
                  className="text-left p-3 text-sm font-semibold text-foreground cursor-pointer hover:bg-surface-elevated transition-colors group"
                  onClick={() => handleSort('start_date')}
                >
                  <span className="flex items-center gap-1">Bloom Date <SortIndicator column="start_date" /></span>
                </th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">End</th>
                <th
                  className="text-right p-3 text-sm font-semibold text-foreground cursor-pointer hover:bg-surface-elevated transition-colors group"
                  onClick={() => handleSort('gdd_value')}
                >
                  <span className="flex items-center justify-end gap-1">GDD <SortIndicator column="gdd_value" /></span>
                </th>
                <th className="text-center p-3 text-sm font-semibold text-foreground">Shared</th>
              </tr>
            </thead>
            <tbody>
              {groupByVegetation && groupedRecords ? (
                groupedRecords.map((group) => (
                  <Fragment key={`group-${group.name}`}>
                    <tr className="bg-forest-50 dark:bg-forest-900/20">
                      <td colSpan={8} className="p-3">
                        <Button
                          type="button"
                          className="font-semibold text-forest-700 dark:text-forest-300 hover:text-green-700 dark:hover:text-green-400 hover:underline cursor-pointer flex items-center gap-2"
                          onClick={() => {
                            const first = group.records[0]
                            if (first) {
                              setVegModalName(first.dropdown_values?.value || '')
                              setVegModalTypeId(first.vegetation_type_id)
                              setVegModalOpen(true)
                            }
                          }}
                        >
                          <Layers size={14} />
                          {group.name} ({group.records.length} {group.records.length === 1 ? 'record' : 'records'})
                        </Button>
                      </td>
                    </tr>
                    {group.records.map(renderRecordRow)}
                  </Fragment>
                ))
              ) : (
                sortedRecords.map(renderRecordRow)
              )}
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
        <p>GDD = Σ max(0, (T<sub>max</sub> + T<sub>min</sub>) / 2) × multiplier. Seasonal multipliers: Jan ×0.5, Feb ×0.75, Mar-Dec ×1.0.</p>
      </div>

      {/* Vegetation Info Modal */}
      <VegetationInfoModal
        isOpen={vegModalOpen}
        onClose={() => setVegModalOpen(false)}
        vegetationName={vegModalName}
        vegetationTypeId={vegModalTypeId}
      />
    </div>
  )
}

