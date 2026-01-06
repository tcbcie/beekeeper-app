'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { RefreshCw, AlertCircle, Calendar } from 'lucide-react'
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

interface WolfHistoryChartProps {
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

export default function WolfHistoryChart({ scaleId, scaleName, hiveId }: WolfHistoryChartProps) {
  const [period, setPeriod] = useState<Period>('day')
  const [history, setHistory] = useState<WolfParsedReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7) // Default to 7 days ago
    return formatDateForInput(date)
  })
  const [customEndDate, setCustomEndDate] = useState<string>(() => formatDateForInput(new Date()))

  const fetchHistory = useCallback(async () => {
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
        throw new Error(data.error || 'Failed to fetch history')
      }

      const data = await response.json()
      setHistory(data.history || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [scaleId, period, hiveId, customStartDate, customEndDate])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Detect dark mode
  const isDark = typeof window !== 'undefined' &&
    document.documentElement.classList.contains('dark')

  // Prepare chart data
  const chartData = {
    labels: history.map(reading => new Date(reading.time)),
    datasets: [
      {
        label: 'Weight (kg)',
        data: history.map(reading => reading.weight_kg ?? null),
        borderColor: 'rgb(37, 99, 235)', // blue-600
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        yAxisID: 'y',
        tension: 0.3,
        pointRadius: period === 'hour' || period === 'day' || period === 'custom' ? 2 : 0,
      },
      {
        label: 'Temperature (°C)',
        data: history.map(reading => reading.temperature_c ?? null),
        borderColor: 'rgb(14, 165, 233)', // sky-500
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        yAxisID: 'y1',
        tension: 0.3,
        pointRadius: period === 'hour' || period === 'day' || period === 'custom' ? 2 : 0,
      },
    ],
  }

  // Determine time unit for custom range based on date span
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

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDark ? '#9ca3af' : '#374151',
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        titleColor: isDark ? '#f3f4f6' : '#111827',
        bodyColor: isDark ? '#d1d5db' : '#374151',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: getTimeUnit(),
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'MMM dd',
            month: 'MMM yyyy',
          },
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#374151',
          maxRotation: 0,
        },
        grid: {
          color: isDark ? '#374151' : '#e5e7eb',
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Weight (kg)',
          color: 'rgb(37, 99, 235)',
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#374151',
        },
        grid: {
          color: isDark ? '#374151' : '#e5e7eb',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Temp (°C)',
          color: 'rgb(14, 165, 233)',
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#374151',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  }

  return (
    <div className="space-y-4">
      {/* Header with title and refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">
          {scaleName ? `${scaleName} History` : 'Scale History'}
        </p>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="p-1 text-text-tertiary hover:text-foreground rounded disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
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

      {/* Chart container */}
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
              <button
                onClick={fetchHistory}
                className="mt-2 text-sm text-red-600 hover:text-red-700"
              >
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
  )
}
