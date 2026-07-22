'use client'
import { useEffect, useState, useCallback } from 'react'
import { formatDateForInput } from '@/lib/date-utils'
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
import type { BeepSensorReading } from '@/lib/beep-api'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'

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

interface ScaleHistoryChartProps {
  deviceId: string
  deviceName?: string
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

export default function ScaleHistoryChart({ deviceId, deviceName, hiveId }: ScaleHistoryChartProps) {
  const [period, setPeriod] = useState<Period>('day')
  const [history, setHistory] = useState<BeepSensorReading[]>([])
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

      let url = `/api/beep/data?deviceId=${deviceId}&period=${period}`
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
  }, [deviceId, period, hiveId, customStartDate, customEndDate])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Detect dark mode
  const isDark = typeof window !== 'undefined' &&
    document.documentElement.classList.contains('dark')

  // Read theme colours from CSS variables
  const getCssVar = (name: string) =>
    typeof window !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      : ''
  const hexWithAlpha = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  const weightColor = getCssVar('--viz-warning') || '#f59e0b'
  const tempColor = getCssVar('--viz-info') || '#3b82f6'

  // Prepare chart data
  const chartData = {
    labels: history.map(reading => new Date(reading.time)),
    datasets: [
      {
        label: 'Weight (kg)',
        data: history.map(reading => reading.weight_kg_corrected ?? reading.weight_kg ?? null),
        borderColor: weightColor,
        backgroundColor: hexWithAlpha(weightColor, 0.1),
        yAxisID: 'y',
        tension: 0.3,
        pointRadius: period === 'hour' || period === 'day' || period === 'custom' ? 2 : 0,
      },
      {
        label: 'Temperature (°C)',
        data: history.map(reading => reading.t_i ?? reading.t ?? reading.t_0 ?? null),
        borderColor: tempColor,
        backgroundColor: hexWithAlpha(tempColor, 0.1),
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
    font: {
      family: "'DM Sans', sans-serif",
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
      datalabels: {
        display: false,
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
          color: weightColor,
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
          color: tempColor,
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
          {deviceName ? `${deviceName} History` : 'Scale History'}
        </p>
        <IconButton
          onClick={fetchHistory}
          disabled={loading}
          size="xs"
          className="text-text-tertiary hover:text-foreground disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </IconButton>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 flex-wrap">
        {PERIODS.map(p => (
          <Button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            tone={period === p.value ? 'amber' : 'neutral'}
            size="xs"
            className={`${
              period === p.value
                ? ''
                : 'bg-surface-secondary text-text-secondary hover:bg-surface-elevated'
            }`}
          >
            {p.label}
          </Button>
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
            className="px-2 py-1 text-sm rounded-lg border border-border bg-background text-foreground"
          />
          <span className="text-text-tertiary">to</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="px-2 py-1 text-sm rounded-lg border border-border bg-background text-foreground"
          />
        </div>
      )}

      {/* Chart container */}
      <div className="h-64 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-secondary rounded-lg">
            <div className="animate-spin h-8 w-8 border-2 border-amber-600 border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-center p-4">
              <AlertCircle size={24} className="mx-auto mb-2 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <Button
                onClick={fetchHistory}
                tone="danger"
                size="xs"
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-secondary rounded-lg">
            <p className="text-text-tertiary">No data available for this period</p>
          </div>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  )
}
