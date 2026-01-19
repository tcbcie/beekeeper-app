'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Thermometer, Share2, Loader2, ExternalLink, Filter, BarChart3, Table } from 'lucide-react'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels)

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
  apiaries?: { name: string }
  dropdown_values?: { value: string }
}

interface GDDDataTabProps {
  userId: string
}

type ViewMode = 'table' | 'chart'

// Colors for different years in chart
const YEAR_COLORS = [
  { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgb(34, 197, 94)' },   // green
  { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' }, // blue
  { bg: 'rgba(249, 115, 22, 0.7)', border: 'rgb(249, 115, 22)' }, // orange
  { bg: 'rgba(168, 85, 247, 0.7)', border: 'rgb(168, 85, 247)' }, // purple
  { bg: 'rgba(236, 72, 153, 0.7)', border: 'rgb(236, 72, 153)' }, // pink
]

export default function GDDDataTab({ userId }: GDDDataTabProps) {
  const [records, setRecords] = useState<GDDRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('chart')

  // Filters
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [selectedVegetation, setSelectedVegetation] = useState<string>('')
  const [selectedApiary, setSelectedApiary] = useState<string>('')

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('gdd_records')
        .select(`
          *,
          apiaries(name),
          dropdown_values(value)
        `)
        .eq('user_id', userId)
        .order('year', { ascending: false })
        .order('start_date', { ascending: false })

      setRecords(data || [])
    } catch (error) {
      console.error('Error fetching GDD records:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Extract unique values for filters
  const { years, vegetationTypes, apiaries } = useMemo(() => {
    const yearsSet = new Set<number>()
    const vegSet = new Set<string>()
    const apiarySet = new Set<string>()

    records.forEach(r => {
      yearsSet.add(r.year)
      if (r.dropdown_values?.value) vegSet.add(r.dropdown_values.value)
      if (r.apiaries?.name) apiarySet.add(r.apiaries.name)
    })

    return {
      years: Array.from(yearsSet).sort((a, b) => b - a),
      vegetationTypes: Array.from(vegSet).sort(),
      apiaries: Array.from(apiarySet).sort(),
    }
  }, [records])

  // Initialize selected years when data loads - select ALL years by default
  useEffect(() => {
    if (years.length > 0 && selectedYears.length === 0) {
      setSelectedYears([...years]) // Select all years for comparison
    }
  }, [years, selectedYears.length])

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedYears.length > 0 && !selectedYears.includes(r.year)) return false
      if (selectedVegetation && r.dropdown_values?.value !== selectedVegetation) return false
      if (selectedApiary && r.apiaries?.name !== selectedApiary) return false
      return true
    })
  }, [records, selectedYears, selectedVegetation, selectedApiary])

  // Prepare chart data - group by vegetation, compare years
  const chartData = useMemo(() => {
    // Get all vegetation types in filtered records
    const vegTypes = [...new Set(filteredRecords.map(r => r.dropdown_values?.value).filter(Boolean))] as string[]
    vegTypes.sort()

    // Get years present in filtered data (sort numerically)
    const chartYears = [...new Set(filteredRecords.map(r => r.year))].sort((a, b) => a - b)

    const datasets = chartYears.map((year, idx) => {
      const colorIdx = idx % YEAR_COLORS.length
      return {
        label: String(year),
        data: vegTypes.map(veg => {
          const record = filteredRecords.find(r => r.dropdown_values?.value === veg && r.year === year)
          // Parse gdd_value as number (comes as string from NUMERIC type)
          return record?.gdd_value !== null && record?.gdd_value !== undefined
            ? Number(record.gdd_value)
            : null
        }),
        backgroundColor: YEAR_COLORS[colorIdx].bg,
        borderColor: YEAR_COLORS[colorIdx].border,
        borderWidth: 1,
      }
    })

    return {
      labels: vegTypes,
      datasets,
    }
  }, [filteredRecords])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'GDD Values by Vegetation Type',
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const value = context.parsed.y
            return `${context.dataset.label}: ${value !== null ? value + ' GDD' : 'No data'}`
          },
        },
      },
      datalabels: {
        anchor: 'end' as const,
        align: 'top' as const,
        formatter: (value: number | null) => value !== null ? value.toFixed(1) : '',
        font: {
          size: 10,
          weight: 'bold' as const,
        },
        color: '#374151',
        display: 'auto' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'GDD (Growing Degree Days)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Vegetation Type',
        },
      },
    },
  }

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year]
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-forest-600" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Thermometer size={24} className="text-forest-600 dark:text-forest-400" />
          <h2 className="text-xl font-semibold text-foreground">GDD Data</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === 'chart'
                  ? 'bg-forest-600 text-white'
                  : 'bg-surface text-text-secondary hover:bg-sage-100 dark:hover:bg-slate-700'
              }`}
            >
              <BarChart3 size={16} />
              Chart
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-forest-600 text-white'
                  : 'bg-surface text-text-secondary hover:bg-sage-100 dark:hover:bg-slate-700'
              }`}
            >
              <Table size={16} />
              Table
            </button>
          </div>
          <Link
            href="/dashboard/tools?tool=gdd"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors"
          >
            <ExternalLink size={16} />
            Add Records
          </Link>
        </div>
      </div>

      {/* Filters */}
      {records.length > 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-text-secondary" />
            <span className="text-sm font-medium text-foreground">Filters</span>
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Year Filter - Multi-select chips */}
            <div className="space-y-1.5">
              <label className="text-xs text-text-secondary">Years (compare)</label>
              <div className="flex flex-wrap gap-1.5">
                {years.map(year => (
                  <button
                    key={year}
                    onClick={() => toggleYear(year)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedYears.includes(year)
                        ? 'bg-forest-600 text-white'
                        : 'bg-sage-100 dark:bg-slate-700 text-text-secondary hover:bg-sage-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Vegetation Filter */}
            <div className="space-y-1.5">
              <label className="text-xs text-text-secondary">Vegetation</label>
              <select
                value={selectedVegetation}
                onChange={(e) => setSelectedVegetation(e.target.value)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
              >
                <option value="">All vegetation</option>
                {vegetationTypes.map(veg => (
                  <option key={veg} value={veg}>{veg}</option>
                ))}
              </select>
            </div>

            {/* Apiary Filter */}
            <div className="space-y-1.5">
              <label className="text-xs text-text-secondary">Apiary</label>
              <select
                value={selectedApiary}
                onChange={(e) => setSelectedApiary(e.target.value)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
              >
                <option value="">All apiaries</option>
                {apiaries.map(api => (
                  <option key={api} value={api}>{api}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(selectedYears.length !== years.length || selectedVegetation || selectedApiary) && (
              <button
                onClick={() => {
                  setSelectedYears([...years]) // Reset to all years
                  setSelectedVegetation('')
                  setSelectedApiary('')
                }}
                className="self-end px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chart View */}
      {viewMode === 'chart' && filteredRecords.length > 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg border border-border p-4">
          <div className="h-80">
            <Bar data={chartData} options={chartOptions} />
          </div>
          <p className="text-xs text-text-tertiary mt-3 text-center">
            Compare GDD values across years to see how bloom timing varies. Lower GDD = earlier bloom.
          </p>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && filteredRecords.length > 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg border border-border overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-sage-100 dark:bg-slate-800 border-b border-border">
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Year</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Apiary</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Vegetation</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Bloom Date</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">End Date</th>
                  <th className="text-right p-3 text-sm font-semibold text-foreground">GDD</th>
                  <th className="text-center p-3 text-sm font-semibold text-foreground">Shared</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
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
                        <span className="text-text-tertiary">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex p-1.5 rounded-full ${
                          record.is_shared
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}
                        title={record.is_shared ? 'Shared with nearby beekeepers' : 'Not shared'}
                      >
                        <Share2 size={14} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {filteredRecords.map((record) => (
              <div key={record.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{record.dropdown_values?.value || 'Unknown'}</span>
                  <span className="text-sm text-text-secondary">{record.year}</span>
                </div>
                <div className="text-sm text-text-secondary">{record.apiaries?.name || '-'}</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">
                    {new Date(record.start_date).toLocaleDateString()}
                    {record.end_date && ` - ${new Date(record.end_date).toLocaleDateString()}`}
                  </span>
                  <div className="flex items-center gap-2">
                    {record.gdd_value !== null && (
                      <span className="font-semibold text-forest-700 dark:text-forest-400">{record.gdd_value} GDD</span>
                    )}
                    {record.is_shared && (
                      <Share2 size={14} className="text-green-600" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {records.length === 0 && (
        <div className="text-center py-12 bg-surface dark:bg-surface rounded-lg border border-border">
          <Thermometer size={48} className="mx-auto mb-3 text-text-tertiary opacity-50" />
          <p className="text-text-secondary mb-4">No GDD records yet.</p>
          <Link
            href="/dashboard/tools?tool=gdd"
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors"
          >
            <ExternalLink size={16} />
            Add Your First Record
          </Link>
        </div>
      )}

      {/* No Results After Filter */}
      {records.length > 0 && filteredRecords.length === 0 && (
        <div className="text-center py-12 bg-surface dark:bg-surface rounded-lg border border-border">
          <Filter size={48} className="mx-auto mb-3 text-text-tertiary opacity-50" />
          <p className="text-text-secondary">No records match your filters.</p>
        </div>
      )}

      {/* Legend */}
      <div className="text-xs text-text-tertiary">
        <p>GDD calculated from January 1st to bloom observation date. Base temperature: 6°C (Irish phenology standard).</p>
      </div>
    </div>
  )
}
