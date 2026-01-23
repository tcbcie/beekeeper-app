'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Thermometer, Share2, Loader2, ExternalLink, Filter, BarChart3, Table, TrendingUp, Flower2 } from 'lucide-react'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import annotationPlugin from 'chartjs-plugin-annotation'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ChartDataLabels, annotationPlugin)

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
type ChartType = 'vegetation' | 'accumulation'

interface AccumulationDataPoint {
  date: string
  dayOfYear: number
  gdd: number
}

interface YearlyAccumulation {
  year: number
  data: AccumulationDataPoint[]
}

// Colors for different years in chart - ordered for maximum contrast between adjacent years
const YEAR_COLORS = [
  { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgb(22, 163, 74)' },   // green
  { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgb(234, 88, 12)' },  // orange
  { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgb(37, 99, 235)' },  // blue
  { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgb(147, 51, 234)' }, // purple
  { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgb(219, 39, 119)' }, // pink
]

export default function GDDDataTab({ userId }: GDDDataTabProps) {
  const [records, setRecords] = useState<GDDRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [chartType, setChartType] = useState<ChartType>('accumulation')
  const [currentGDD, setCurrentGDD] = useState<number | null>(null)
  const [accumulationData, setAccumulationData] = useState<YearlyAccumulation[]>([])
  const [accumulationLoading, setAccumulationLoading] = useState(false)
  const [apiaryCoords, setApiaryCoords] = useState<{ latitude: number; longitude: number } | null>(null)

  // Filters
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [selectedVegetation, setSelectedVegetation] = useState<string>('')
  const [selectedApiary, setSelectedApiary] = useState<string>('')

  // Accumulation chart year selection (default: current year + 2 previous years)
  const currentYear = new Date().getFullYear()
  const availableAccumulationYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4]
  const [selectedAccumulationYears, setSelectedAccumulationYears] = useState<number[]>([currentYear, currentYear - 1])

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

  // Fetch apiary coordinates
  const fetchApiaryCoords = useCallback(async () => {
    try {
      const { data: apiaries } = await supabase
        .from('apiaries')
        .select('latitude, longitude')
        .eq('user_id', userId)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(1)

      if (apiaries && apiaries.length > 0 && apiaries[0].latitude && apiaries[0].longitude) {
        setApiaryCoords({ latitude: apiaries[0].latitude, longitude: apiaries[0].longitude })
      }
    } catch (err) {
      console.error('Failed to fetch apiary coordinates:', err)
    }
  }, [userId])

  useEffect(() => {
    fetchApiaryCoords()
  }, [fetchApiaryCoords])

  // Fetch current GDD when we have coordinates
  useEffect(() => {
    if (!apiaryCoords) return

    const fetchCurrentGDD = async () => {
      try {
        const { latitude, longitude } = apiaryCoords
        const today = new Date()
        const year = today.getFullYear()
        const janFirst = `${year}-01-01`
        const todayStr = today.toISOString().split('T')[0]

        const response = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${janFirst}&end_date=${todayStr}&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Dublin`
        )

        if (response.ok) {
          const data = await response.json()
          if (data.daily?.temperature_2m_max && data.daily?.time) {
            let totalGDD = 0
            for (let i = 0; i < data.daily.temperature_2m_max.length; i++) {
              const tMax = data.daily.temperature_2m_max[i]
              const tMin = data.daily.temperature_2m_min[i]
              const dateStr = data.daily.time[i]
              if (tMax !== null && tMin !== null && dateStr) {
                const avgTemp = (tMax + tMin) / 2
                if (avgTemp > 0) {
                  const month = new Date(dateStr).getMonth() + 1
                  let multiplier = 1.0
                  if (month === 1) multiplier = 0.5
                  else if (month === 2) multiplier = 0.75
                  totalGDD += avgTemp * multiplier
                }
              }
            }
            setCurrentGDD(Math.round(totalGDD * 10) / 10)
          }
        }
      } catch (err) {
        console.error('Failed to calculate current GDD:', err)
      }
    }

    fetchCurrentGDD()
  }, [apiaryCoords])

  // Fetch accumulation data for multiple years
  const fetchAccumulationData = useCallback(async (yearsToFetch: number[]) => {
    if (!apiaryCoords || yearsToFetch.length === 0) return

    setAccumulationLoading(true)
    try {
      const { latitude, longitude } = apiaryCoords
      const currentYear = new Date().getFullYear()
      const todayDayOfYear = Math.floor((new Date().getTime() - new Date(currentYear, 0, 0).getTime()) / 86400000)

      const results: YearlyAccumulation[] = []

      for (const year of yearsToFetch) {
        const isCurrentYear = year === currentYear
        const startDate = `${year}-01-01`
        const endDate = isCurrentYear
          ? new Date().toISOString().split('T')[0]
          : `${year}-12-31`

        const response = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Dublin`
        )

        if (response.ok) {
          const data = await response.json()
          if (data.daily?.temperature_2m_max && data.daily?.time) {
            let cumulativeGDD = 0
            const dataPoints: AccumulationDataPoint[] = []

            for (let i = 0; i < data.daily.temperature_2m_max.length; i++) {
              const tMax = data.daily.temperature_2m_max[i]
              const tMin = data.daily.temperature_2m_min[i]
              const dateStr = data.daily.time[i]

              if (tMax !== null && tMin !== null && dateStr) {
                const avgTemp = (tMax + tMin) / 2
                if (avgTemp > 0) {
                  const month = new Date(dateStr).getMonth() + 1
                  let multiplier = 1.0
                  if (month === 1) multiplier = 0.5
                  else if (month === 2) multiplier = 0.75
                  cumulativeGDD += avgTemp * multiplier
                }

                const dayOfYear = Math.floor((new Date(dateStr).getTime() - new Date(year, 0, 0).getTime()) / 86400000)

                // For past years, only include up to same day as current year for fair comparison
                if (!isCurrentYear && dayOfYear > todayDayOfYear) continue

                dataPoints.push({
                  date: dateStr,
                  dayOfYear,
                  gdd: Math.round(cumulativeGDD * 10) / 10,
                })
              }
            }

            results.push({ year, data: dataPoints })
          }
        }
      }

      setAccumulationData(results.sort((a, b) => a.year - b.year))
    } catch (err) {
      console.error('Failed to fetch accumulation data:', err)
    } finally {
      setAccumulationLoading(false)
    }
  }, [apiaryCoords])

  // Fetch accumulation data when years change or chart type switches
  useEffect(() => {
    if (chartType === 'accumulation' && apiaryCoords && selectedAccumulationYears.length > 0) {
      fetchAccumulationData(selectedAccumulationYears)
    }
  }, [chartType, apiaryCoords, selectedAccumulationYears, fetchAccumulationData])

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
  const { chartData, dateMap } = useMemo(() => {
    // Get all vegetation types in filtered records
    const vegTypes = [...new Set(filteredRecords.map(r => r.dropdown_values?.value).filter(Boolean))] as string[]

    // Sort vegetation types by their minimum GDD value (lowest first = earliest bloom)
    vegTypes.sort((a, b) => {
      const aRecords = filteredRecords.filter(r => r.dropdown_values?.value === a && r.gdd_value !== null)
      const bRecords = filteredRecords.filter(r => r.dropdown_values?.value === b && r.gdd_value !== null)
      const aMin = aRecords.length > 0 ? Math.min(...aRecords.map(r => Number(r.gdd_value))) : Infinity
      const bMin = bRecords.length > 0 ? Math.min(...bRecords.map(r => Number(r.gdd_value))) : Infinity
      return aMin - bMin
    })

    // Get years present in filtered data (sort numerically)
    const chartYears = [...new Set(filteredRecords.map(r => r.year))].sort((a, b) => a - b)

    // Create a map of datasetIndex-vegIndex -> date for the datalabels formatter
    // Build dates map first by iterating all records
    const dates: Record<string, string> = {}

    filteredRecords.forEach(record => {
      if (record.start_date && record.dropdown_values?.value) {
        const yearIdx = chartYears.indexOf(Number(record.year))
        const vegIdx = vegTypes.indexOf(record.dropdown_values.value)
        if (yearIdx !== -1 && vegIdx !== -1) {
          const date = new Date(record.start_date)
          const day = date.getDate()
          const month = date.toLocaleDateString('en-GB', { month: 'short' })
          dates[`${yearIdx}-${vegIdx}`] = `${day} ${month}`
        }
      }
    })

    const datasets = chartYears.map((year, idx) => {
      const colorIdx = idx % YEAR_COLORS.length
      return {
        label: String(year),
        data: vegTypes.map((veg) => {
          const record = filteredRecords.find(r => r.dropdown_values?.value === veg && Number(r.year) === year)
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
      chartData: {
        labels: vegTypes,
        datasets,
      },
      dateMap: dates,
    }
  }, [filteredRecords])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Phenology - GDD at First Bloom',
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
        formatter: (value: number | null, context: { datasetIndex: number; dataIndex: number }) => {
          if (value === null) return ''
          const date = dateMap[`${context.datasetIndex}-${context.dataIndex}`]
          return date ? `${value.toFixed(1)}\n${date}` : value.toFixed(1)
        },
        font: {
          size: 9,
          weight: 'bold' as const,
        },
        color: '#374151',
        display: 'auto' as const,
        textAlign: 'center' as const,
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
  }), [dateMap])

  // Accumulation chart data
  const accumulationChartData = useMemo(() => {
    // Create labels for days of year (simplified to show months)
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Create x-axis labels based on day of year (1-365)
    // We'll use every 15th day for cleaner display
    const labels: string[] = []
    const dayNumbers: number[] = []
    for (let day = 1; day <= 365; day += 7) {
      const date = new Date(2024, 0, day) // Use 2024 as reference year
      const month = date.getMonth()
      const dayOfMonth = date.getDate()
      labels.push(dayOfMonth === 1 || day === 1 ? monthLabels[month] : '')
      dayNumbers.push(day)
    }

    const datasets = accumulationData.map((yearData, idx) => {
      const colorIdx = idx % YEAR_COLORS.length
      const isCurrentYear = yearData.year === currentYear

      // Get the max day of year in this dataset
      const maxDayInData = yearData.data.length > 0
        ? Math.max(...yearData.data.map(d => d.dayOfYear))
        : 0

      // Map data points to chart x-axis positions
      const chartData = dayNumbers.map(dayNum => {
        // Don't show data beyond what we have
        if (dayNum > maxDayInData) return null

        const point = yearData.data.find(d => d.dayOfYear === dayNum)
        if (point) return point.gdd

        // Only interpolate within the data range
        const nearest = yearData.data.reduce((prev, curr) =>
          Math.abs(curr.dayOfYear - dayNum) < Math.abs(prev.dayOfYear - dayNum) ? curr : prev
        , yearData.data[0])
        return nearest?.gdd ?? null
      })

      return {
        label: `${yearData.year}${isCurrentYear ? ' (Current)' : ''}`,
        data: chartData,
        borderColor: YEAR_COLORS[colorIdx].border,
        backgroundColor: YEAR_COLORS[colorIdx].bg,
        borderWidth: isCurrentYear ? 3 : 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: false,
        spanGaps: false,
      }
    })

    return {
      labels,
      datasets,
    }
  }, [accumulationData, currentYear])

  const accumulationChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'GDD Accumulation Over Time',
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const value = context.parsed.y
            return `${context.dataset.label}: ${value !== null ? Math.round(value) + ' GDD' : 'No data'}`
          },
        },
      },
      datalabels: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Accumulated GDD',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Month',
        },
        ticks: {
          maxRotation: 0,
        },
      },
    },
  }), [])

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year]
    )
  }

  const toggleAccumulationYear = (year: number) => {
    setSelectedAccumulationYears(prev =>
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

      {/* Filters - only show for vegetation chart and table views */}
      {records.length > 0 && (viewMode === 'table' || (viewMode === 'chart' && chartType === 'vegetation')) && (
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
      {viewMode === 'chart' && (
        <div className="bg-surface dark:bg-surface rounded-lg border border-border p-4">
          {/* Chart Type Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setChartType('accumulation')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  chartType === 'accumulation'
                    ? 'bg-forest-600 text-white'
                    : 'bg-surface text-text-secondary hover:bg-sage-100 dark:hover:bg-slate-700'
                }`}
              >
                <TrendingUp size={16} />
                Accumulation
              </button>
              <button
                onClick={() => setChartType('vegetation')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  chartType === 'vegetation'
                    ? 'bg-forest-600 text-white'
                    : 'bg-surface text-text-secondary hover:bg-sage-100 dark:hover:bg-slate-700'
                }`}
              >
                <Flower2 size={16} />
                Phenology
              </button>
            </div>

            {/* Year selector for accumulation chart */}
            {chartType === 'accumulation' && apiaryCoords && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-text-secondary">Years:</span>
                {availableAccumulationYears.map(year => (
                  <button
                    key={year}
                    onClick={() => toggleAccumulationYear(year)}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                      selectedAccumulationYears.includes(year)
                        ? 'bg-forest-600 text-white'
                        : 'bg-sage-100 dark:bg-slate-700 text-text-secondary hover:bg-sage-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Accumulation Chart */}
          {chartType === 'accumulation' && (
            <>
              {!apiaryCoords ? (
                <div className="h-80 flex items-center justify-center text-text-secondary">
                  <p>No apiary with GPS coordinates found. Add coordinates to an apiary to see GDD accumulation.</p>
                </div>
              ) : accumulationLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <Loader2 className="animate-spin text-forest-600" size={32} />
                </div>
              ) : accumulationData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-text-secondary">
                  <p>Select at least one year to compare</p>
                </div>
              ) : (
                <div className="h-80">
                  <Line data={accumulationChartData} options={accumulationChartOptions} />
                </div>
              )}
              <div className="mt-3 text-center">
                <p className="text-xs text-text-tertiary">
                  Compare how GDD accumulates throughout the year. Each line shows cumulative GDD from Jan 1.
                  {currentGDD !== null && ` Current year: ${currentGDD} GDD as of today.`}
                </p>
              </div>
            </>
          )}

          {/* Vegetation Bar Chart */}
          {chartType === 'vegetation' && (
            <>
              {filteredRecords.length > 0 ? (
                <div className="h-80">
                  <Bar data={chartData} options={chartOptions} />
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-text-secondary">
                  <p>No bloom GDD records found. Add records in the GDD Tracker tool.</p>
                </div>
              )}
              <div className="mt-3 text-center">
                <p className="text-xs text-text-tertiary">
                  Compare GDD values across years to see how bloom timing varies. Lower GDD = earlier bloom.
                </p>
              </div>
            </>
          )}
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
        <p>GDD = Σ max(0, (T<sub>max</sub> + T<sub>min</sub>) / 2) × multiplier. Seasonal multipliers: Jan ×0.5, Feb ×0.75, Mar-Dec ×1.0.</p>
      </div>
    </div>
  )
}
