'use client'
/**
 * PublicGDDTab — slimmed-down clone of src/components/research/GDDDataTab.tsx
 * for unauthenticated iframe embedding on tcbc.ie.
 *
 * Differences from the in-app GDDDataTab:
 *   - No userId prop. Reads exclusively from the `public_galway_gdd` view
 *     (anon-granted, region-scoped, no user_id exposure).
 *   - No "Add Records", "Apiary" filter, "Nearby Data" toggle,
 *     "Events" overlay, or Share column (all require auth).
 *   - Hard-coded region centroid for Open-Meteo calls instead of apiary GPS.
 *
 * Keeps everything else: years/vegetation/period filters, chart/table toggle,
 * accumulation chart, phenology bar chart, temperature overlay, avg monthly
 * temps chart, VegetationInfoModal, formula footnote.
 *
 * See: docs/features/tcbc-wordpress-research-widget.md
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Thermometer, Loader2, Filter, BarChart3, Table, TrendingUp, Flower2 } from 'lucide-react'
import VegetationInfoModal from '@/components/shared/VegetationInfoModal'
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

// Row shape returned by the public_galway_gdd view
interface PublicGDDRow {
  id: string
  vegetation_type_id: string
  vegetation_name: string | null
  year: number
  start_date: string
  end_date: string | null
  gdd_value: number | string | null
  city: string | null
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

interface MonthlyTemperature {
  month: string
  avgTemp: number | null
}

interface YearlyMonthlyTemps {
  [year: number]: MonthlyTemperature[]
}

// Colour palette (must stay in sync with GDDDataTab.tsx:82-88)
const YEAR_COLORS = [
  { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgb(22, 163, 74)' },
  { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgb(234, 88, 12)' },
  { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgb(37, 99, 235)' },
  { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgb(147, 51, 234)' },
  { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgb(219, 39, 119)' },
]

interface PublicGDDTabProps {
  /** Supabase view name to query (e.g. 'public_galway_gdd') */
  viewName: string
  /** Region centroid used for Open-Meteo temperature fetches */
  regionCoords: { latitude: number; longitude: number }
  /** Display label for the region (shown in the header) */
  regionLabel: string
}

export default function PublicGDDTab({ viewName, regionCoords, regionLabel }: PublicGDDTabProps) {
  const [records, setRecords] = useState<PublicGDDRow[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [chartType, setChartType] = useState<ChartType>('accumulation')
  const [currentGDD, setCurrentGDD] = useState<number | null>(null)
  const [accumulationData, setAccumulationData] = useState<YearlyAccumulation[]>([])
  const [accumulationLoading, setAccumulationLoading] = useState(false)
  const [monthlyTemps, setMonthlyTemps] = useState<YearlyMonthlyTemps>({})
  const [showTemperature, setShowTemperature] = useState(true)

  // Vegetation info modal
  const [vegModalOpen, setVegModalOpen] = useState(false)
  const [vegModalName, setVegModalName] = useState('')
  const [vegModalTypeId, setVegModalTypeId] = useState('')

  // Filters
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [selectedVegetation, setSelectedVegetation] = useState<string>('')
  const [periodFilter, setPeriodFilter] = useState<'all' | 'q1' | 'q2' | 'q3' | 'q4' | 'custom'>('all')
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])

  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const allowedMonths = useMemo(() => {
    const quarterMonths: Record<string, number[]> = {
      q1: [1, 2, 3],
      q2: [4, 5, 6],
      q3: [7, 8, 9],
      q4: [10, 11, 12],
    }
    if (periodFilter === 'all') return null
    if (periodFilter === 'custom') return selectedMonths.length > 0 ? selectedMonths : null
    return quarterMonths[periodFilter] || null
  }, [periodFilter, selectedMonths])

  // Accumulation chart year selection
  const currentYear = new Date().getFullYear()
  const availableAccumulationYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4]
  const [selectedAccumulationYears, setSelectedAccumulationYears] = useState<number[]>([currentYear, currentYear - 1])

  // Fetch public records for the region
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(viewName)
        .select('id, vegetation_type_id, vegetation_name, year, start_date, end_date, gdd_value, city')
        .order('year', { ascending: false })
        .order('start_date', { ascending: false })

      if (error) {
        console.error('Error fetching public GDD records:', error)
        setRecords([])
      } else {
        setRecords((data as PublicGDDRow[]) || [])
      }
    } finally {
      setLoading(false)
    }
  }, [viewName])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Current-year GDD from Open-Meteo (for annotation line on accumulation chart)
  useEffect(() => {
    const fetchCurrentGDD = async () => {
      try {
        const { latitude, longitude } = regionCoords
        const today = new Date()
        const year = today.getFullYear()
        const janFirst = `${year}-01-01`
        const todayStr = today.toISOString().split('T')[0]

        const response = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${janFirst}&end_date=${todayStr}&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Dublin`
        )
        if (!response.ok) return
        const data = await response.json()
        if (!data.daily?.temperature_2m_max || !data.daily?.time) return

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
      } catch (err) {
        console.error('Failed to calculate current GDD:', err)
      }
    }

    fetchCurrentGDD()
  }, [regionCoords])

  // Multi-year accumulation data from Open-Meteo
  const fetchAccumulationData = useCallback(async (yearsToFetch: number[]) => {
    if (yearsToFetch.length === 0) return
    setAccumulationLoading(true)
    try {
      const { latitude, longitude } = regionCoords
      const cyear = new Date().getFullYear()
      const todayDayOfYear = Math.floor((new Date().getTime() - new Date(cyear, 0, 0).getTime()) / 86400000)
      const results: YearlyAccumulation[] = []

      for (const year of yearsToFetch) {
        const isCurrentYear = year === cyear
        const startDate = `${year}-01-01`
        const endDate = isCurrentYear
          ? new Date().toISOString().split('T')[0]
          : `${year}-12-31`

        const response = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Dublin`
        )
        if (!response.ok) continue
        const data = await response.json()
        if (!data.daily?.temperature_2m_max || !data.daily?.time) continue

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
      setAccumulationData(results.sort((a, b) => a.year - b.year))
    } catch (err) {
      console.error('Failed to fetch accumulation data:', err)
    } finally {
      setAccumulationLoading(false)
    }
  }, [regionCoords])

  useEffect(() => {
    if (chartType === 'accumulation' && selectedAccumulationYears.length > 0) {
      fetchAccumulationData(selectedAccumulationYears)
    }
  }, [chartType, selectedAccumulationYears, fetchAccumulationData])

  // Monthly temperatures
  const fetchMonthlyTemps = useCallback(async (yearsToFetch: number[]) => {
    if (yearsToFetch.length === 0) return
    try {
      const { latitude, longitude } = regionCoords
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const today = new Date()
      const cyear = today.getFullYear()
      const results: YearlyMonthlyTemps = {}

      for (const year of yearsToFetch) {
        const isCurrentYear = year === cyear
        const startDate = `${year}-01-01`
        const endDateStr = isCurrentYear
          ? today.toISOString().split('T')[0]
          : `${year}-12-31`

        const tempResponse = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDateStr}&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Dublin`
        )
        if (!tempResponse.ok) continue
        const tempData = await tempResponse.json()
        if (!tempData.daily?.temperature_2m_max) continue

        const monthlyData: { sum: number; count: number }[] = Array(12).fill(null).map(() => ({ sum: 0, count: 0 }))
        for (let i = 0; i < tempData.daily.time.length; i++) {
          const date = new Date(tempData.daily.time[i])
          const month = date.getMonth()
          const avgTemp = (tempData.daily.temperature_2m_max[i] + tempData.daily.temperature_2m_min[i]) / 2
          monthlyData[month].sum += avgTemp
          monthlyData[month].count++
        }
        results[year] = monthlyData.map((data, idx) => ({
          month: monthNames[idx],
          avgTemp: data.count > 0 ? Math.round((data.sum / data.count) * 10) / 10 : null,
        }))
      }
      setMonthlyTemps(results)
    } catch (err) {
      console.error('Failed to fetch monthly temps:', err)
    }
  }, [regionCoords])

  useEffect(() => {
    const allYears = [...new Set([...selectedYears, ...selectedAccumulationYears])]
    if (allYears.length > 0) {
      fetchMonthlyTemps(allYears)
    }
  }, [selectedYears, selectedAccumulationYears, fetchMonthlyTemps])

  // Extract unique values for filters
  const { years, vegetationTypes } = useMemo(() => {
    const yearsSet = new Set<number>()
    const vegSet = new Set<string>()
    records.forEach(r => {
      yearsSet.add(r.year)
      if (r.vegetation_name) vegSet.add(r.vegetation_name)
    })
    return {
      years: Array.from(yearsSet).sort((a, b) => b - a),
      vegetationTypes: Array.from(vegSet).sort(),
    }
  }, [records])

  // Initialize selected years to all available
  useEffect(() => {
    if (years.length > 0 && selectedYears.length === 0) {
      setSelectedYears([...years])
    }
  }, [years, selectedYears.length])

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedYears.length > 0 && !selectedYears.includes(r.year)) return false
      if (selectedVegetation && r.vegetation_name !== selectedVegetation) return false
      if (allowedMonths && r.start_date) {
        const month = new Date(r.start_date).getMonth() + 1
        if (!allowedMonths.includes(month)) return false
      }
      return true
    })
  }, [records, selectedYears, selectedVegetation, allowedMonths])

  // Phenology chart data — group by vegetation, compare years
  const { chartData, dateMap } = useMemo(() => {
    const vegTypes = [...new Set(filteredRecords.map(r => r.vegetation_name).filter(Boolean))] as string[]

    // Sort by minimum GDD (earliest bloom first)
    vegTypes.sort((a, b) => {
      const aGdd = filteredRecords
        .filter(r => r.vegetation_name === a && r.gdd_value !== null)
        .map(r => Number(r.gdd_value))
      const bGdd = filteredRecords
        .filter(r => r.vegetation_name === b && r.gdd_value !== null)
        .map(r => Number(r.gdd_value))
      const aMin = aGdd.length > 0 ? Math.min(...aGdd) : Infinity
      const bMin = bGdd.length > 0 ? Math.min(...bGdd) : Infinity
      return aMin - bMin
    })

    const chartYears = [...new Set(filteredRecords.map(r => r.year))].sort((a, b) => a - b)

    const dates: Record<string, string> = {}
    filteredRecords.forEach(record => {
      if (record.start_date && record.vegetation_name) {
        const yearIdx = chartYears.indexOf(Number(record.year))
        const vegIdx = vegTypes.indexOf(record.vegetation_name)
        if (yearIdx !== -1 && vegIdx !== -1) {
          const d = new Date(record.start_date)
          const day = d.getDate()
          const month = d.toLocaleDateString('en-GB', { month: 'short' })
          dates[`${yearIdx}-${vegIdx}`] = `${day} ${month}`
        }
      }
    })

    const datasets = chartYears.map((year, idx) => {
      const colorIdx = idx % YEAR_COLORS.length
      return {
        label: String(year),
        data: vegTypes.map(veg => {
          const record = filteredRecords.find(r => r.vegetation_name === veg && Number(r.year) === year)
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
      chartData: { labels: vegTypes, datasets },
      dateMap: dates,
    }
  }, [filteredRecords])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Phenology - GDD at First Bloom' },
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
        font: { size: 9, weight: 'bold' as const },
        color: '#374151',
        display: true,
        textAlign: 'center' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'GDD (Growing Degree Days)' },
      },
      x: {
        title: { display: !showTemperature, text: 'Vegetation Type' },
      },
    },
  }), [dateMap, showTemperature])

  // Accumulation chart data
  const accumulationChartData = useMemo(() => {
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const labels: string[] = []
    const dayNumbers: number[] = []
    for (let day = 1; day <= 365; day += 7) {
      const date = new Date(2024, 0, day)
      const month = date.getMonth()
      const dayOfMonth = date.getDate()
      labels.push(dayOfMonth === 1 || day === 1 ? monthLabels[month] : '')
      dayNumbers.push(day)
    }

    const datasets = accumulationData.map((yearData, idx) => {
      const colorIdx = idx % YEAR_COLORS.length
      const isCurrentYear = yearData.year === currentYear
      const maxDayInData = yearData.data.length > 0
        ? Math.max(...yearData.data.map(d => d.dayOfYear))
        : 0

      const chartDataPoints = dayNumbers.map(dayNum => {
        if (dayNum > maxDayInData) return null
        const point = yearData.data.find(d => d.dayOfYear === dayNum)
        if (point) return point.gdd
        const nearest = yearData.data.reduce((prev, curr) =>
          Math.abs(curr.dayOfYear - dayNum) < Math.abs(prev.dayOfYear - dayNum) ? curr : prev
        , yearData.data[0])
        return nearest?.gdd ?? null
      })

      return {
        label: `${yearData.year}${isCurrentYear ? ' (Current)' : ''}`,
        data: chartDataPoints,
        borderColor: YEAR_COLORS[colorIdx].border,
        backgroundColor: YEAR_COLORS[colorIdx].bg,
        borderWidth: isCurrentYear ? 3 : 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: false,
        spanGaps: false,
        yAxisID: 'y',
      }
    })

    // Add temperature overlay for the current year
    const currentYearTemps = monthlyTemps[currentYear] || []
    if (showTemperature && currentYearTemps.length > 0) {
      const tempData: Array<number | null> = Array(dayNumbers.length).fill(null)
      currentYearTemps.forEach((temp, monthIdx) => {
        if (temp.avgTemp === null) return
        let targetIndex = -1
        let bestDistance = Number.POSITIVE_INFINITY
        dayNumbers.forEach((dayNum, idx) => {
          const date = new Date(2024, 0, dayNum)
          if (date.getMonth() !== monthIdx) return
          const distanceToMidMonth = Math.abs(date.getDate() - 15)
          if (distanceToMidMonth < bestDistance) {
            bestDistance = distanceToMidMonth
            targetIndex = idx
          }
        })
        if (targetIndex >= 0) {
          tempData[targetIndex] = temp.avgTemp
        }
      })

      datasets.push({
        label: 'Avg Temp (°C)',
        data: tempData,
        borderColor: 'rgba(239, 68, 68, 0.8)',
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        borderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
        fill: false,
        spanGaps: true,
        yAxisID: 'y1',
      } as typeof datasets[0])
    }

    return { labels, datasets }
  }, [accumulationData, currentYear, showTemperature, monthlyTemps])

  const hasMonthlyTemps = Object.keys(monthlyTemps).length > 0

  const accumulationChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'GDD Accumulation Over Time' },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string; yAxisID?: string }; parsed: { y: number | null } }) => {
            const value = context.parsed.y
            if (context.dataset.yAxisID === 'y1') {
              return `${context.dataset.label}: ${value !== null ? value.toFixed(1) + '°C' : 'No data'}`
            }
            return `${context.dataset.label}: ${value !== null ? Math.round(value) + ' GDD' : 'No data'}`
          },
        },
      },
      datalabels: { display: false },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        title: { display: true, text: 'Accumulated GDD' },
      },
      y1: {
        type: 'linear' as const,
        display: showTemperature && hasMonthlyTemps,
        position: 'right' as const,
        title: { display: true, text: 'Avg Temp (°C)', color: 'rgb(239, 68, 68)' },
        grid: { drawOnChartArea: false },
        ticks: { color: 'rgb(239, 68, 68)' },
      },
      x: {
        title: { display: true, text: 'Month' },
        ticks: { maxRotation: 0 },
      },
    },
  }), [showTemperature, hasMonthlyTemps])

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    )
  }

  const toggleAccumulationYear = (year: number) => {
    setSelectedAccumulationYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
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
          <h2 className="text-xl font-semibold text-foreground">GDD Data — {regionLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === 'chart'
                  ? 'bg-forest-600 text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-elevated'
              }`}
            >
              <BarChart3 size={16} />
              Chart
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-forest-600 text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-elevated'
              }`}
            >
              <Table size={16} />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Filters — only relevant to vegetation chart & table */}
      {records.length > 0 && (viewMode === 'table' || (viewMode === 'chart' && chartType === 'vegetation')) && (
        <div className="bg-surface dark:bg-surface rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-text-secondary" />
            <span className="text-sm font-medium text-foreground">Filters</span>
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Year chips */}
            <div className="space-y-1.5">
              <label className="text-xs text-text-secondary">Years (compare)</label>
              <div className="flex flex-wrap gap-1.5">
                {years.map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => toggleYear(year)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedYears.includes(year)
                        ? 'bg-forest-600 text-white'
                        : 'bg-surface-secondary text-text-secondary hover:bg-surface-elevated'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Vegetation */}
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

            {/* Period filter */}
            {viewMode === 'chart' && chartType === 'vegetation' && (
              <div className="space-y-1.5">
                <label className="text-xs text-text-secondary">Period</label>
                <div className="flex flex-wrap gap-1.5">
                  {([['all', 'All'], ['q1', 'Q1'], ['q2', 'Q2'], ['q3', 'Q3'], ['q4', 'Q4'], ['custom', 'Custom']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPeriodFilter(key)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        periodFilter === key
                          ? 'bg-forest-600 text-white'
                          : 'bg-surface-secondary text-text-secondary hover:bg-surface-elevated'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {periodFilter === 'custom' && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {MONTH_LABELS.map((label, idx) => {
                      const month = idx + 1
                      return (
                        <button
                          key={month}
                          type="button"
                          onClick={() => setSelectedMonths(prev =>
                            prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
                          )}
                          className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                            selectedMonths.includes(month)
                              ? 'bg-forest-600 text-white'
                              : 'bg-surface-secondary text-text-secondary hover:bg-surface-elevated'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {(selectedYears.length !== years.length || selectedVegetation || periodFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedYears([...years])
                  setSelectedVegetation('')
                  setPeriodFilter('all')
                  setSelectedMonths([])
                }}
                className="self-end px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chart view */}
      {viewMode === 'chart' && (
        <div className="bg-surface dark:bg-surface rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setChartType('accumulation')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  chartType === 'accumulation'
                    ? 'bg-forest-600 text-white'
                    : 'bg-surface text-text-secondary hover:bg-surface-elevated'
                }`}
              >
                <TrendingUp size={16} />
                Accumulation
              </button>
              <button
                type="button"
                onClick={() => setChartType('vegetation')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  chartType === 'vegetation'
                    ? 'bg-forest-600 text-white'
                    : 'bg-surface text-text-secondary hover:bg-surface-elevated'
                }`}
              >
                <Flower2 size={16} />
                Phenology
              </button>
            </div>

            {/* Temperature toggle for phenology */}
            {chartType === 'vegetation' && (
              <button
                type="button"
                onClick={() => setShowTemperature(!showTemperature)}
                className={`px-2 py-0.5 text-xs rounded-full transition-colors flex items-center gap-1 ${
                  showTemperature
                    ? 'bg-red-500 text-white'
                    : 'bg-surface-secondary text-text-secondary hover:bg-surface-elevated'
                }`}
                title="Toggle monthly temperature chart"
              >
                <Thermometer size={12} />
                Temp
              </button>
            )}

            {/* Year selector + temperature for accumulation */}
            {chartType === 'accumulation' && (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-text-secondary">Years:</span>
                  {availableAccumulationYears.map(year => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => toggleAccumulationYear(year)}
                      className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                        selectedAccumulationYears.includes(year)
                          ? 'bg-forest-600 text-white'
                          : 'bg-surface-secondary text-text-secondary hover:bg-surface-elevated'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemperature(!showTemperature)}
                  className={`px-2 py-0.5 text-xs rounded-full transition-colors flex items-center gap-1 ${
                    showTemperature
                      ? 'bg-red-500 text-white'
                      : 'bg-surface-secondary text-text-secondary hover:bg-surface-elevated'
                  }`}
                  title="Toggle average monthly temperature"
                >
                  <Thermometer size={12} />
                  Temp
                </button>
              </div>
            )}
          </div>

          {/* Accumulation chart body */}
          {chartType === 'accumulation' && (
            <>
              {accumulationLoading ? (
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

          {/* Phenology chart body */}
          {chartType === 'vegetation' && (
            <>
              {filteredRecords.length > 0 ? (
                <div className="h-80">
                  <Bar data={chartData} options={chartOptions} />
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-text-secondary">
                  <p>No bloom GDD records found for this region yet.</p>
                </div>
              )}
              {!showTemperature && (
                <div className="mt-3 text-center">
                  <p className="text-xs text-text-tertiary">
                    Compare GDD values across years to see how bloom timing varies. Lower GDD = earlier bloom.
                  </p>
                </div>
              )}

              {/* Monthly temps mini-chart */}
              {showTemperature && hasMonthlyTemps && (
                <div className="mt-2 pt-2 border-t border-border">
                  <h4 className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                    <Thermometer size={14} className="text-red-500" />
                    Avg Monthly Temps ({selectedYears.slice().sort((a, b) => a - b).join(', ')})
                  </h4>
                  <div className="h-32">
                    <Bar
                      data={{
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                        datasets: selectedYears.slice().sort((a, b) => a - b).map((year, idx) => {
                          const yearTemps = monthlyTemps[year] || []
                          const colorIdx = idx % YEAR_COLORS.length
                          return {
                            label: String(year),
                            data: yearTemps.map(t => t.avgTemp),
                            backgroundColor: YEAR_COLORS[colorIdx].bg,
                            borderColor: YEAR_COLORS[colorIdx].border,
                            borderWidth: 1,
                          }
                        }),
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: selectedYears.length > 1, position: 'top' as const },
                          datalabels: {
                            display: selectedYears.length === 1,
                            anchor: 'end' as const,
                            align: 'top' as const,
                            formatter: (value: number | null) => value !== null ? `${value}°` : '',
                            font: { size: 9 },
                            color: '#6b7280',
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: { display: true, text: '°C' },
                            ticks: { font: { size: 10 } },
                          },
                          x: { ticks: { font: { size: 10 } } },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' && filteredRecords.length > 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg border border-border overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-secondary border-b border-border">
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Year</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Location</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Vegetation</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">Bloom Date</th>
                  <th className="text-left p-3 text-sm font-semibold text-foreground">End Date</th>
                  <th className="text-right p-3 text-sm font-semibold text-foreground">GDD</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(record => (
                  <tr key={record.id} className="border-b border-border hover:bg-surface-secondary">
                    <td className="p-3 text-foreground font-medium">{record.year}</td>
                    <td className="p-3 text-text-secondary text-sm">{record.city || '—'}</td>
                    <td className="p-3 text-foreground">
                      <button
                        type="button"
                        className="font-normal hover:text-green-700 dark:hover:text-green-400 hover:underline text-left bg-transparent border-0 p-0"
                        onClick={() => {
                          setVegModalName(record.vegetation_name || '')
                          setVegModalTypeId(record.vegetation_type_id)
                          setVegModalOpen(true)
                        }}
                      >
                        {record.vegetation_name || '—'}
                      </button>
                    </td>
                    <td className="p-3 text-text-secondary">{new Date(record.start_date).toLocaleDateString()}</td>
                    <td className="p-3 text-text-secondary">
                      {record.end_date ? new Date(record.end_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3 text-right">
                      {record.gdd_value !== null ? (
                        <span className="font-semibold text-forest-700 dark:text-forest-400">{record.gdd_value}</span>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {filteredRecords.map(record => (
              <div key={record.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-left font-semibold text-foreground hover:text-green-700 dark:hover:text-green-400 hover:underline bg-transparent border-0 p-0"
                    onClick={() => {
                      setVegModalName(record.vegetation_name || '')
                      setVegModalTypeId(record.vegetation_type_id)
                      setVegModalOpen(true)
                    }}
                  >
                    {record.vegetation_name || 'Unknown'}
                  </button>
                  <span className="text-sm text-text-secondary">{record.year}</span>
                </div>
                <div className="text-sm text-text-secondary">{record.city || '—'}</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">
                    {new Date(record.start_date).toLocaleDateString()}
                    {record.end_date && ` - ${new Date(record.end_date).toLocaleDateString()}`}
                  </span>
                  {record.gdd_value !== null && (
                    <span className="font-semibold text-forest-700 dark:text-forest-400">{record.gdd_value} GDD</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {records.length === 0 && !loading && (
        <div className="text-center py-12 bg-surface dark:bg-surface rounded-lg border border-border">
          <Thermometer size={48} className="mx-auto mb-3 text-text-tertiary opacity-50" />
          <p className="text-text-secondary">No shared GDD records for {regionLabel} yet.</p>
        </div>
      )}

      {records.length > 0 && filteredRecords.length === 0 && viewMode === 'table' && (
        <div className="text-center py-12 bg-surface dark:bg-surface rounded-lg border border-border">
          <Filter size={48} className="mx-auto mb-3 text-text-tertiary opacity-50" />
          <p className="text-text-secondary">No records match your filters.</p>
        </div>
      )}

      {/* Formula footnote */}
      <div className="text-xs text-text-tertiary">
        <p>GDD = Σ max(0, (T<sub>max</sub> + T<sub>min</sub>) / 2) × multiplier. Seasonal multipliers: Jan ×0.5, Feb ×0.75, Mar-Dec ×1.0.</p>
      </div>

      {/* Vegetation info modal */}
      <VegetationInfoModal
        isOpen={vegModalOpen}
        onClose={() => setVegModalOpen(false)}
        vegetationName={vegModalName}
        vegetationTypeId={vegModalTypeId}
      />
    </div>
  )
}
