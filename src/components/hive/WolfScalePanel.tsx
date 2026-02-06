'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Scale, Thermometer, Droplets, RefreshCw, Clock, TrendingUp, TrendingDown, Flame, BatteryLow, BatteryMedium, BatteryFull, CloudRain, Wind, Compass, AlertCircle, Calendar } from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { Line } from 'react-chartjs-2'
import type { WolfParsedReading } from '@/lib/wolf-waagen-api'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

type Period = 'hour' | 'day' | 'week' | 'month' | 'year' | 'custom'

interface WolfScalePanelProps {
  scaleId: string
  scaleName?: string
  hiveId?: string
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
]

// Get date string in YYYY-MM-DD format for input[type="date"]
const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

// Convert wind direction degrees to cardinal direction
const getCardinalDirection = (degrees: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(((degrees % 360) / 45)) % 8
  return directions[index]
}

export default function WolfScalePanel({ scaleId, scaleName, hiveId }: WolfScalePanelProps) {
  const [period, setPeriod] = useState<Period>('week')
  const [history, setHistory] = useState<WolfParsedReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return formatDateForInput(date)
  })
  const [customEndDate, setCustomEndDate] = useState<string>(() => formatDateForInput(new Date()))

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      let url = `/api/wolf-waagen/data?scaleId=${scaleId}&period=${period}`
      if (hiveId) {
        url += `&hiveId=${hiveId}`
      }
      if (period === 'custom') {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch data')
      }

      const data = await response.json()
      setHistory(data.history || [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [scaleId, period, hiveId, customStartDate, customEndDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate stats from history
  const stats = useMemo(() => {
    if (history.length === 0) return null

    const latest = history[history.length - 1]
    const oldest = history[0]

    // Weight change over period
    let weightChange: number | null = null
    if (typeof latest.weight_kg === 'number' && typeof oldest.weight_kg === 'number') {
      weightChange = latest.weight_kg - oldest.weight_kg
    }

    // Sum of yields (natural weight change excluding interventions)
    let yieldSum: number | null = null
    const yields = history.filter(r => typeof r.yield_kg === 'number').map(r => r.yield_kg!)
    if (yields.length > 0) {
      yieldSum = yields.reduce((sum, y) => sum + y, 0)
    }

    // Averages for environmental data
    const temps = history.filter(r => typeof r.temperature_c === 'number').map(r => r.temperature_c!)
    const broodTemps = history.filter(r => typeof r.brood_temp_c === 'number').map(r => r.brood_temp_c!)
    const humidities = history.filter(r => typeof r.humidity_percent === 'number').map(r => r.humidity_percent!)
    const rains = history.filter(r => typeof r.rain_mm === 'number').map(r => r.rain_mm!)
    const winds = history.filter(r => typeof r.wind_speed_kmh === 'number').map(r => r.wind_speed_kmh!)

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null
    const sum = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) : null

    return {
      currentWeight: latest.weight_kg,
      weightChange,
      yieldSum,
      avgTemp: avg(temps),
      avgBroodTemp: avg(broodTemps),
      avgHumidity: avg(humidities),
      totalRain: sum(rains),
      avgWind: avg(winds),
      latestWindDirection: latest.wind_direction_deg,
      batteryVoltage: latest.battery_voltage,
    }
  }, [history])

  // Battery level helper
  const getBatteryInfo = (voltage: number) => {
    const percent = Math.round(((voltage - 3.2) / (4.2 - 3.2)) * 100)
    const clampedPercent = Math.max(0, Math.min(100, percent))
    if (clampedPercent >= 70) return { Icon: BatteryFull, color: 'green', percent: clampedPercent }
    if (clampedPercent >= 30) return { Icon: BatteryMedium, color: 'yellow', percent: clampedPercent }
    return { Icon: BatteryLow, color: 'red', percent: clampedPercent }
  }

  // Determine time unit for chart
  const getTimeUnit = (): 'minute' | 'hour' | 'day' | 'month' => {
    if (period === 'custom') {
      const start = new Date(customStartDate)
      const end = new Date(customEndDate)
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= 1) return 'hour'
      if (diffDays <= 14) return 'day'
      return 'month'
    }
    if (period === 'hour') return 'minute'
    if (period === 'day') return 'hour'
    if (period === 'week' || period === 'month') return 'day'
    return 'month'
  }

  // Detect dark mode
  const isDark = typeof window !== 'undefined' &&
    document.documentElement.classList.contains('dark')

  // Chart data
  const chartData = {
    labels: history.map(reading => new Date(reading.time)),
    datasets: [
      {
        label: 'Weight (kg)',
        data: history.map(reading => reading.weight_kg ?? null),
        borderColor: 'rgb(217, 119, 6)',
        backgroundColor: 'rgba(217, 119, 6, 0.1)',
        yAxisID: 'y',
        tension: 0.3,
        pointRadius: period === 'hour' || period === 'day' || period === 'custom' ? 2 : 0,
      },
      {
        label: 'Brood Temp (°C)',
        data: history.map(reading => reading.brood_temp_c ?? null),
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        yAxisID: 'y1',
        tension: 0.3,
        pointRadius: period === 'hour' || period === 'day' || period === 'custom' ? 2 : 0,
      },
    ],
  }

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: isDark ? '#9ca3af' : '#374151', usePointStyle: true },
      },
      tooltip: {
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        titleColor: isDark ? '#f3f4f6' : '#111827',
        bodyColor: isDark ? '#d1d5db' : '#374151',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
      },
      datalabels: { display: false },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: getTimeUnit(),
          displayFormats: { minute: 'HH:mm', hour: 'HH:mm', day: 'MMM dd', month: 'MMM yyyy' },
        },
        ticks: { color: isDark ? '#9ca3af' : '#374151', maxRotation: 0 },
        grid: { color: isDark ? '#374151' : '#e5e7eb' },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'Weight (kg)', color: 'rgb(217, 119, 6)' },
        ticks: { color: isDark ? '#9ca3af' : '#374151' },
        grid: { color: isDark ? '#374151' : '#e5e7eb' },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: { display: true, text: 'Brood Temp (°C)', color: 'rgb(37, 99, 235)' },
        ticks: { color: isDark ? '#9ca3af' : '#374151' },
        grid: { drawOnChartArea: false },
      },
    },
  }

  const periodLabel = PERIODS.find(p => p.value === period)?.label || period

  if (error && !history.length) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">
          {scaleName || scaleId}
        </p>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-text-tertiary flex items-center gap-1">
              <Clock size={10} />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1 text-text-tertiary hover:text-foreground rounded disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 flex-wrap">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              period === p.value
                ? 'bg-blue-600 text-white'
                : 'bg-sage-100 dark:bg-slate-700 text-text-secondary hover:bg-sage-200 dark:hover:bg-slate-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range picker */}
      {period === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={16} className="text-text-tertiary" />
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            className="px-2 py-1 text-sm rounded-lg border border-sage-200 dark:border-slate-600 bg-background text-foreground"
          />
          <span className="text-text-tertiary">to</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="px-2 py-1 text-sm rounded-lg border border-sage-200 dark:border-slate-600 bg-background text-foreground"
          />
        </div>
      )}

      {/* Stats Section */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-sage-200 dark:bg-slate-700 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-sage-200 dark:bg-slate-700 rounded"></div>
            <div className="h-16 bg-sage-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      ) : stats ? (
        <div className="space-y-2">
          {/* Weight Section */}
          {(stats.currentWeight !== undefined || stats.yieldSum !== null) && (
            <div className="p-3 border border-sage-200 dark:border-slate-700 rounded-lg space-y-2">
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Weight</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* Current Weight */}
                {stats.currentWeight !== undefined && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-1.5">
                      <Scale size={14} className="text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400">Current</p>
                        <p className="text-sm font-bold text-blue-800 dark:text-blue-200 truncate">
                          {stats.currentWeight.toFixed(1)} kg
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Period Yield (natural change) */}
                {stats.yieldSum !== null && (
                  <div className={`p-2 rounded border ${
                    stats.yieldSum >= 0
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {stats.yieldSum >= 0 ? (
                        <TrendingUp size={14} className="text-green-600 shrink-0" />
                      ) : (
                        <TrendingDown size={14} className="text-red-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className={`text-[10px] ${stats.yieldSum >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {periodLabel} Change
                        </p>
                        <p className={`text-sm font-bold truncate ${stats.yieldSum >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                          {stats.yieldSum >= 0 ? '+' : ''}{stats.yieldSum.toFixed(2)} kg
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Colony Section - Brood Temperature */}
          {stats.avgBroodTemp !== null && (
            <div className="p-3 border border-sage-200 dark:border-slate-700 rounded-lg space-y-2">
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Colony</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-1.5">
                    <Flame size={14} className="text-orange-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-orange-600 dark:text-orange-400">Avg Brood Temp</p>
                      <p className="text-sm font-bold text-orange-800 dark:text-orange-200 truncate">
                        {stats.avgBroodTemp.toFixed(1)}°C
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Environmental Section */}
          {(stats.avgTemp !== null || stats.avgHumidity !== null || stats.totalRain !== null || stats.avgWind !== null) && (
            <div className="p-3 border border-sage-200 dark:border-slate-700 rounded-lg space-y-2">
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Environmental</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Average Temperature */}
                {stats.avgTemp !== null && (
                  <div className="p-2 bg-sky-50 dark:bg-sky-900/20 rounded border border-sky-200 dark:border-sky-800">
                    <div className="flex items-center gap-1.5">
                      <Thermometer size={14} className="text-sky-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-sky-600 dark:text-sky-400">Avg Temp</p>
                        <p className="text-sm font-bold text-sky-800 dark:text-sky-200 truncate">
                          {stats.avgTemp.toFixed(1)}°C
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Average Humidity */}
                {stats.avgHumidity !== null && (
                  <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded border border-cyan-200 dark:border-cyan-800">
                    <div className="flex items-center gap-1.5">
                      <Droplets size={14} className="text-cyan-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-cyan-600 dark:text-cyan-400">Avg Humidity</p>
                        <p className="text-sm font-bold text-cyan-800 dark:text-cyan-200 truncate">
                          {stats.avgHumidity.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Rain */}
                {stats.totalRain !== null && (
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center gap-1.5">
                      <CloudRain size={14} className="text-indigo-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Total Rain</p>
                        <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200 truncate">
                          {stats.totalRain.toFixed(1)} mm
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Average Wind Speed */}
                {stats.avgWind !== null && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-900/20 rounded border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Wind size={14} className="text-slate-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-600 dark:text-slate-400">Avg Wind</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                          {stats.avgWind.toFixed(0)} km/h
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wind Direction */}
                {typeof stats.latestWindDirection === 'number' && (
                  <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded border border-violet-200 dark:border-violet-800">
                    <div className="flex items-center gap-1.5">
                      <Compass size={14} className="text-violet-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-violet-600 dark:text-violet-400">Direction</p>
                        <p className="text-sm font-bold text-violet-800 dark:text-violet-200 truncate">
                          {getCardinalDirection(stats.latestWindDirection)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Technical Section - Battery */}
          {typeof stats.batteryVoltage === 'number' && (() => {
            const { Icon, color, percent } = getBatteryInfo(stats.batteryVoltage)
            return (
              <div className="p-3 border border-sage-200 dark:border-slate-700 rounded-lg space-y-2">
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Technical</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className={`p-2 rounded border ${
                    color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                    color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Icon size={14} className={`shrink-0 ${
                        color === 'green' ? 'text-green-600' :
                        color === 'yellow' ? 'text-yellow-600' :
                        'text-red-600'
                      }`} />
                      <div className="min-w-0">
                        <p className={`text-[10px] ${
                          color === 'green' ? 'text-green-600 dark:text-green-400' :
                          color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>Battery</p>
                        <p className={`text-sm font-bold truncate ${
                          color === 'green' ? 'text-green-800 dark:text-green-200' :
                          color === 'yellow' ? 'text-yellow-800 dark:text-yellow-200' :
                          'text-red-800 dark:text-red-200'
                        }`}>
                          {percent}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      ) : (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">No data available for this period</p>
        </div>
      )}

      {/* Chart */}
      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium text-text-secondary mb-3">
          {scaleName ? `${scaleName} History` : 'History'}
        </p>
        <div className="h-64 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-sage-50 dark:bg-slate-800 rounded-lg">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-center p-4">
                <AlertCircle size={24} className="mx-auto mb-2 text-red-500" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                <button onClick={fetchData} className="mt-2 text-sm text-red-600 hover:text-red-700">
                  Retry
                </button>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-sage-50 dark:bg-slate-800 rounded-lg">
              <p className="text-text-tertiary">No data available for this period</p>
            </div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>
    </div>
  )
}
