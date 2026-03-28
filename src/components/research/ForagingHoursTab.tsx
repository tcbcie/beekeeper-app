'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Sun, Loader2, TrendingUp, BarChart3, Filter, CalendarDays } from 'lucide-react'
import Button from '@/components/ui/Button'
import { calculateForagingHours } from '@/lib/gdd'
import { useKeyEvents } from '@/components/research/KeyEventsOverlay'
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

interface ForagingHoursTabProps {
  userId: string
}

type ChartType = 'accumulation' | 'monthly'

interface AccumulationDataPoint {
  date: string
  dayOfYear: number
  hours: number
}

interface YearlyAccumulation {
  year: number
  data: AccumulationDataPoint[]
}

interface MonthlyHours {
  month: string
  hours: number | null
}

interface YearlyMonthlyHours {
  [year: number]: MonthlyHours[]
}

interface ApiaryOption {
  id: string
  name: string
  latitude: number
  longitude: number
}

// Colours for different years — matches GDD Data tab
const YEAR_COLORS = [
  { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgb(22, 163, 74)' },   // green
  { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgb(234, 88, 12)' },  // orange
  { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgb(37, 99, 235)' },  // blue
  { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgb(147, 51, 234)' }, // purple
  { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgb(219, 39, 119)' }, // pink
]

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function ForagingHoursTab({ userId }: ForagingHoursTabProps) {
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<ChartType>('accumulation')
  const [showEvents, setShowEvents] = useState(false)

  // Apiary selection
  const [apiaries, setApiaries] = useState<ApiaryOption[]>([])
  const [selectedApiaryId, setSelectedApiaryId] = useState<string>('')

  // Data
  const [accumulationData, setAccumulationData] = useState<YearlyAccumulation[]>([])
  const [monthlyHoursData, setMonthlyHoursData] = useState<YearlyMonthlyHours>({})
  const [currentYearTotal, setCurrentYearTotal] = useState<number | null>(null)
  const [dataLoading, setDataLoading] = useState(false)

  // Year selection — stable across renders
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const availableYears = useMemo(() => [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4], [currentYear])
  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear, currentYear - 1])

  // Period filter
  const [periodFilter, setPeriodFilter] = useState<'all' | 'q1' | 'q2' | 'q3' | 'q4' | 'custom'>('all')
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])

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

  // Selected apiary coordinates
  const selectedApiary = useMemo(() => {
    if (selectedApiaryId) return apiaries.find(a => a.id === selectedApiaryId)
    return apiaries[0] || null
  }, [apiaries, selectedApiaryId])

  // Fetch apiaries with coordinates
  useEffect(() => {
    const fetchApiaries = async () => {
      try {
        const { data, error } = await supabase
          .from('apiaries')
          .select('id, name, latitude, longitude')
          .eq('user_id', userId)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)

        if (error) {
          console.error('Supabase apiary query failed:', error.message)
          return
        }

        if (data && data.length > 0) {
          const valid = data
            .filter(a => a.latitude && a.longitude)
            .map(a => ({ id: a.id, name: a.name, latitude: a.latitude!, longitude: a.longitude! }))
          setApiaries(valid)
        }
      } catch (err) {
        console.error('Failed to fetch apiaries:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchApiaries()
  }, [userId])

  // Fetch daily weather data and compute foraging hours for selected years
  const fetchForagingData = useCallback(async (yearsToFetch: number[], signal: AbortSignal) => {
    if (!selectedApiary || yearsToFetch.length === 0) return

    setDataLoading(true)
    try {
      const { latitude, longitude } = selectedApiary
      const today = new Date()
      const todayDayOfYear = Math.floor((today.getTime() - new Date(currentYear, 0, 0).getTime()) / 86400000)

      // Fetch all years in parallel
      const settled = await Promise.allSettled(yearsToFetch.map(async (year) => {
        const isCurrentYear = year === currentYear
        const startDate = `${year}-01-01`
        const endDate = isCurrentYear
          ? today.toISOString().split('T')[0]
          : `${year}-12-31`

        const response = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,sunshine_duration,precipitation_sum&timezone=Europe/Dublin`,
          { signal }
        )

        if (!response.ok) return null

        const data = await response.json()
        if (!data.daily?.temperature_2m_max || !data.daily?.time) return null

        let cumulativeHours = 0
        const dataPoints: AccumulationDataPoint[] = []
        const monthlyBuckets: { hours: number; count: number }[] = Array(12).fill(null).map(() => ({ hours: 0, count: 0 }))

        for (let i = 0; i < data.daily.time.length; i++) {
          const tMax = data.daily.temperature_2m_max[i]
          const tMin = data.daily.temperature_2m_min[i]
          const sunshine = data.daily.sunshine_duration[i] ?? 0
          const precip = data.daily.precipitation_sum[i] ?? 0
          const dateStr = data.daily.time[i]

          if (tMax === null || tMin === null || !dateStr) continue

          const dayHours = calculateForagingHours(tMin, tMax, sunshine, precip)
          cumulativeHours += dayHours

          const dateObj = new Date(dateStr)
          const month = dateObj.getMonth()
          const dayOfYear = Math.floor((dateObj.getTime() - new Date(year, 0, 0).getTime()) / 86400000)

          monthlyBuckets[month].hours += dayHours
          monthlyBuckets[month].count++

          // For past years, only include up to same day as current year for fair comparison
          if (!isCurrentYear && dayOfYear > todayDayOfYear) continue

          dataPoints.push({
            date: dateStr,
            dayOfYear,
            hours: Math.round(cumulativeHours * 10) / 10,
          })
        }

        return {
          year,
          isCurrentYear,
          cumulativeHours,
          dataPoints,
          monthlyData: monthlyBuckets.map((bucket, idx) => ({
            month: MONTH_LABELS[idx],
            hours: bucket.count > 0 ? Math.round(bucket.hours * 10) / 10 : null,
          })),
        }
      }))

      // Don't update state if aborted (component unmounted or newer fetch superseded this one)
      if (signal.aborted) return

      const accResults: YearlyAccumulation[] = []
      const monthlyResults: YearlyMonthlyHours = {}
      let currentTotal: number | null = null

      for (const result of settled) {
        if (result.status !== 'fulfilled' || !result.value) continue
        const { year, isCurrentYear, cumulativeHours, dataPoints, monthlyData } = result.value
        accResults.push({ year, data: dataPoints })
        monthlyResults[year] = monthlyData
        if (isCurrentYear) {
          currentTotal = Math.round(cumulativeHours * 10) / 10
        }
      }

      setAccumulationData(accResults.sort((a, b) => a.year - b.year))
      setMonthlyHoursData(monthlyResults)
      setCurrentYearTotal(currentTotal)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('Failed to fetch foraging data:', err)
    } finally {
      if (!signal.aborted) setDataLoading(false)
    }
  }, [selectedApiary, currentYear])

  // Refetch when years or apiary changes; abort previous in-flight request
  useEffect(() => {
    if (!selectedApiary || selectedYears.length === 0) return
    const controller = new AbortController()
    fetchForagingData(selectedYears, controller.signal)
    return () => controller.abort()
  }, [selectedApiary, selectedYears, fetchForagingData])

  // Chart year order (sorted) — needed for colour matching in event annotations
  const chartYearOrder = useMemo(() =>
    [...selectedYears].sort((a, b) => a - b),
    [selectedYears]
  )

  // Key events overlay (hook must be called unconditionally)
  const keyEvents = useKeyEvents({ userId, apiaryId: selectedApiary?.id, selectedYears, chartYearOrder })

  // Accumulation chart data
  const accumulationChartData = useMemo(() => {
    const labels: string[] = []
    const dayNumbers: number[] = []
    for (let day = 1; day <= 365; day += 7) {
      const date = new Date(2024, 0, day)
      const month = date.getMonth()
      const dayOfMonth = date.getDate()
      labels.push(dayOfMonth === 1 || day === 1 ? MONTH_LABELS[month] : '')
      dayNumbers.push(day)
    }

    const datasets = accumulationData.map((yearData, idx) => {
      const colorIdx = idx % YEAR_COLORS.length
      const isCurrentYear = yearData.year === currentYear

      const maxDayInData = yearData.data.length > 0
        ? Math.max(...yearData.data.map(d => d.dayOfYear))
        : 0

      const chartData = dayNumbers.map(dayNum => {
        if (dayNum > maxDayInData) return null
        const point = yearData.data.find(d => d.dayOfYear === dayNum)
        if (point) return point.hours
        const nearest = yearData.data.reduce((prev, curr) =>
          Math.abs(curr.dayOfYear - dayNum) < Math.abs(prev.dayOfYear - dayNum) ? curr : prev
        , yearData.data[0])
        return nearest?.hours ?? null
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
        yAxisID: 'y',
      }
    })

    return { labels, datasets }
  }, [accumulationData, currentYear])

  const accumulationChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: 'Foraging Hours Accumulation Over Time',
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const value = context.parsed.y
            return `${context.dataset.label}: ${value !== null ? value.toFixed(1) + ' hrs' : 'No data'}`
          },
        },
      },
      datalabels: { display: false },
      annotation: {
        annotations: {
          ...(currentYearTotal !== null ? {
            currentLine: {
              type: 'line' as const,
              yMin: currentYearTotal,
              yMax: currentYearTotal,
              borderColor: 'rgba(239, 68, 68, 0.8)',
              borderWidth: 2,
              borderDash: [6, 4],
              label: {
                display: true,
                content: `Current: ${currentYearTotal} hrs`,
                position: 'end' as const,
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                color: '#fff',
                font: { size: 10 },
              },
            },
          } : {}),
          ...(showEvents ? keyEvents.annotations : {}),
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cumulative Foraging Hours',
        },
      },
      x: {
        title: { display: true, text: 'Month' },
        ticks: { maxRotation: 0 },
      },
    },
  }), [currentYearTotal, showEvents, keyEvents.annotations])

  // Monthly bar chart data
  const monthlyChartData = useMemo(() => {
    // Filter months based on period selection
    const monthIndices = allowedMonths
      ? MONTH_LABELS.map((_, idx) => idx).filter(idx => allowedMonths.includes(idx + 1))
      : MONTH_LABELS.map((_, idx) => idx)

    const labels = monthIndices.map(idx => MONTH_LABELS[idx])

    const sortedYears = [...selectedYears].sort((a, b) => a - b)
    const datasets = sortedYears.map((year, idx) => {
      const colorIdx = idx % YEAR_COLORS.length
      const yearData = monthlyHoursData[year] || []

      return {
        label: `${year}${year === currentYear ? ' (Current)' : ''}`,
        data: monthIndices.map(monthIdx => yearData[monthIdx]?.hours ?? null),
        backgroundColor: YEAR_COLORS[colorIdx].bg,
        borderColor: YEAR_COLORS[colorIdx].border,
        borderWidth: 1,
      }
    })

    return { labels, datasets }
  }, [monthlyHoursData, selectedYears, currentYear, allowedMonths])

  const monthlyChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: 'Monthly Foraging Hours Comparison',
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const value = context.parsed.y
            return `${context.dataset.label}: ${value !== null ? value.toFixed(1) + ' hrs' : 'No data'}`
          },
        },
      },
      datalabels: {
        anchor: 'end' as const,
        align: 'top' as const,
        formatter: (value: number | null) => {
          if (value === null || value === 0) return ''
          return value.toFixed(1)
        },
        font: { size: 9, weight: 'bold' as const },
        color: '#374151',
        display: selectedYears.length <= 2,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Foraging Hours' },
      },
      x: {
        title: { display: true, text: 'Month' },
      },
    },
  }), [selectedYears.length])

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
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
          <Sun size={24} className="text-amber-500 dark:text-amber-400" />
          <h2 className="text-xl font-semibold text-foreground">Foraging Hours</h2>
        </div>

        {/* Apiary selector (when multiple) */}
        {apiaries.length > 1 && (
          <select
            value={selectedApiaryId || apiaries[0]?.id || ''}
            onChange={(e) => setSelectedApiaryId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
          >
            {apiaries.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* No coordinates message */}
      {apiaries.length === 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg border border-border p-8 text-center">
          <Sun size={48} className="mx-auto text-text-tertiary mb-3" />
          <p className="text-text-secondary">
            No apiary with GPS coordinates found. Add coordinates to an apiary to see foraging hours data.
          </p>
        </div>
      )}

      {apiaries.length > 0 && (
        <>
          {/* Filters */}
          {chartType === 'monthly' && (
            <div className="bg-surface dark:bg-surface rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={16} className="text-text-secondary" />
                <span className="text-sm font-medium text-foreground">Filters</span>
              </div>
              <div className="flex flex-wrap gap-4">
                {/* Period Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">Period</label>
                  <div className="flex flex-wrap gap-1.5">
                    {([['all', 'All'], ['q1', 'Q1'], ['q2', 'Q2'], ['q3', 'Q3'], ['q4', 'Q4'], ['custom', 'Custom']] as const).map(([key, label]) => (
                      <Button
                        key={key}
                        onClick={() => setPeriodFilter(key)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          periodFilter === key
                            ? 'bg-forest-600 text-white'
                            : 'bg-surface-secondary text-text-secondary hover:bg-surface-elevated'
                        }`}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  {periodFilter === 'custom' && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {MONTH_LABELS.map((label, idx) => {
                        const month = idx + 1
                        return (
                          <Button
                            key={month}
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
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Reset */}
                {periodFilter !== 'all' && (
                  <Button
                    onClick={() => {
                      setPeriodFilter('all')
                      setSelectedMonths([])
                    }}
                    className="self-end px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Chart Area */}
          <div className="bg-surface dark:bg-surface rounded-lg border border-border p-4">
            {/* Chart Type Toggle + Year Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex rounded-lg border border-border overflow-hidden">
                <Button
                  onClick={() => setChartType('accumulation')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                    chartType === 'accumulation'
                      ? 'bg-forest-600 text-white'
                      : 'bg-surface text-text-secondary hover:bg-surface-elevated'
                  }`}
                >
                  <TrendingUp size={16} />
                  Accumulation
                </Button>
                <Button
                  onClick={() => setChartType('monthly')}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                    chartType === 'monthly'
                      ? 'bg-forest-600 text-white'
                      : 'bg-surface text-text-secondary hover:bg-surface-elevated'
                  }`}
                >
                  <BarChart3 size={16} />
                  Monthly
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-text-secondary">Years:</span>
                  {availableYears.map(year => (
                    <Button
                      key={year}
                      onClick={() => toggleYear(year)}
                      className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                        selectedYears.includes(year)
                          ? 'bg-forest-600 text-white'
                          : 'bg-surface-secondary text-text-secondary hover:bg-surface-elevated'
                      }`}
                    >
                      {year}
                    </Button>
                  ))}
                </div>

                {/* Events overlay toggle (accumulation only) */}
                {chartType === 'accumulation' && selectedApiary && (
                  <Button
                    onClick={() => setShowEvents(!showEvents)}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors flex items-center gap-1 ${
                      showEvents
                        ? 'bg-amber-500 text-white'
                        : 'bg-surface-secondary text-text-secondary hover:bg-surface-elevated'
                    }`}
                    title="Toggle key events overlay"
                  >
                    <CalendarDays size={12} />
                    Events
                  </Button>
                )}
              </div>
            </div>

            {/* Accumulation Chart */}
            {chartType === 'accumulation' && (
              <>
                {dataLoading ? (
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
                    Compare how foraging hours accumulate throughout the year. Each line shows cumulative hours from 1 Jan.
                    {currentYearTotal !== null && ` Current year: ${currentYearTotal} hrs as of today.`}
                  </p>
                </div>

                {/* Key events panel */}
                {showEvents && (
                  <div className="mt-4 pt-4 border-t border-border">
                    {keyEvents.panel}
                  </div>
                )}
              </>
            )}

            {/* Monthly Bar Chart */}
            {chartType === 'monthly' && (
              <>
                {dataLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <Loader2 className="animate-spin text-forest-600" size={32} />
                  </div>
                ) : Object.keys(monthlyHoursData).length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-text-secondary">
                    <p>Select at least one year to compare</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <Bar data={monthlyChartData} options={monthlyChartOptions} />
                  </div>
                )}
                <div className="mt-3 text-center">
                  <p className="text-xs text-text-tertiary">
                    Compare monthly foraging hours across years. Hours are calculated from temperature, sunshine, and rainfall data.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Formula legend */}
          <div className="text-xs text-text-tertiary space-y-0.5">
            <p>F<sub>day</sub> = S<sub>hrs</sub> × W<sub>frac</sub> × R<sub>pen</sub>, where S<sub>hrs</sub> = sunshine duration (hours), W<sub>frac</sub> = acos((2T<sub>thresh</sub> − T<sub>max</sub> − T<sub>min</sub>) / (T<sub>max</sub> − T<sub>min</sub>)) / π, T<sub>thresh</sub> = 12°C.</p>
            <p>Rain penalty R<sub>pen</sub>: {'<'} 1 mm → 1.0, 1–5 mm → 0.75, {'>'} 5 mm → 0.50. Returns 0 if T<sub>max</sub> {'<'} 12°C or S<sub>hrs</sub> = 0.</p>
          </div>
        </>
      )}
    </div>
  )
}
