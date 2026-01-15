'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Scale, Thermometer, Droplets, RefreshCw, Clock, TrendingUp, TrendingDown, Flame, BatteryLow, BatteryMedium, BatteryFull } from 'lucide-react'
import type { WolfParsedReading } from '@/lib/wolf-waagen-api'

interface WolfSensorDisplayProps {
  scaleId: string
  scaleName?: string
  hiveId?: string
}

export default function WolfSensorDisplay({ scaleId, scaleName, hiveId }: WolfSensorDisplayProps) {
  const [sensorData, setSensorData] = useState<WolfParsedReading | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchSensorData = useCallback(async () => {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const url = hiveId
        ? `/api/wolf-waagen/data?scaleId=${scaleId}&hiveId=${hiveId}`
        : `/api/wolf-waagen/data?scaleId=${scaleId}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch data')
      }

      const data = await response.json()
      setSensorData(data.lastValues)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sensor data')
    } finally {
      setLoading(false)
    }
  }, [scaleId, hiveId])

  useEffect(() => {
    fetchSensorData()
    // Refresh every 5 minutes
    const interval = setInterval(fetchSensorData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchSensorData])

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-sage-200 dark:bg-slate-700 rounded w-1/2"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-sage-200 dark:bg-slate-700 rounded"></div>
          <div className="h-16 bg-sage-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={fetchSensorData}
          className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    )
  }

  if (!sensorData) {
    return (
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">No sensor data available yet</p>
      </div>
    )
  }

  const weight = sensorData.weight_kg
  const yieldKg = sensorData.yield_kg
  const temperature = sensorData.temperature_c
  const broodTemp = sensorData.brood_temp_c
  const humidity = sensorData.humidity_percent
  const batteryVoltage = sensorData.battery_voltage

  // Battery level helper: 4.2V = full, 3.2V = empty
  const getBatteryInfo = (voltage: number) => {
    const percent = Math.round(((voltage - 3.2) / (4.2 - 3.2)) * 100)
    const clampedPercent = Math.max(0, Math.min(100, percent))
    if (clampedPercent >= 70) return { Icon: BatteryFull, color: 'green', percent: clampedPercent }
    if (clampedPercent >= 30) return { Icon: BatteryMedium, color: 'yellow', percent: clampedPercent }
    return { Icon: BatteryLow, color: 'red', percent: clampedPercent }
  }

  return (
    <div className="space-y-3">
      {/* Header with scale name and refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">
          {scaleName || `Scale ${scaleId}`}
        </p>
        <button
          onClick={fetchSensorData}
          className="p-1 text-text-tertiary hover:text-foreground rounded"
          title="Refresh data"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Sensor readings grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weight */}
        {weight !== undefined && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <Scale size={16} className="text-blue-600" />
              <span className="text-xs text-blue-700 dark:text-blue-300">Weight</span>
            </div>
            <p className="text-xl font-bold text-blue-800 dark:text-blue-200">
              {weight.toFixed(1)} <span className="text-sm font-normal">kg</span>
            </p>
          </div>
        )}

        {/* Daily Yield/Change */}
        {yieldKg !== undefined && (
          <div className={`p-3 rounded-lg border ${
            yieldKg >= 0
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {yieldKg >= 0 ? (
                <TrendingUp size={16} className="text-green-600" />
              ) : (
                <TrendingDown size={16} className="text-red-600" />
              )}
              <span className={`text-xs ${yieldKg >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                Daily Change
              </span>
            </div>
            <p className={`text-xl font-bold ${yieldKg >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
              {yieldKg >= 0 ? '+' : ''}{yieldKg.toFixed(2)} <span className="text-sm font-normal">kg</span>
            </p>
          </div>
        )}

        {/* Temperature */}
        {temperature !== undefined && (
          <div className="p-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer size={16} className="text-sky-600" />
              <span className="text-xs text-sky-700 dark:text-sky-300">Temperature</span>
            </div>
            <p className="text-xl font-bold text-sky-800 dark:text-sky-200">
              {temperature.toFixed(1)} <span className="text-sm font-normal">°C</span>
            </p>
          </div>
        )}

        {/* Brood Temperature */}
        {broodTemp !== undefined && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={16} className="text-orange-600" />
              <span className="text-xs text-orange-700 dark:text-orange-300">Brood Temp</span>
            </div>
            <p className="text-xl font-bold text-orange-800 dark:text-orange-200">
              {broodTemp.toFixed(1)} <span className="text-sm font-normal">°C</span>
            </p>
          </div>
        )}

        {/* Humidity */}
        {humidity !== undefined && (
          <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
            <div className="flex items-center gap-2 mb-1">
              <Droplets size={16} className="text-cyan-600" />
              <span className="text-xs text-cyan-700 dark:text-cyan-300">Humidity</span>
            </div>
            <p className="text-xl font-bold text-cyan-800 dark:text-cyan-200">
              {humidity.toFixed(0)} <span className="text-sm font-normal">%</span>
            </p>
          </div>
        )}

        {/* Battery */}
        {typeof batteryVoltage === 'number' && (() => {
          const { Icon, color, percent } = getBatteryInfo(batteryVoltage)
          return (
            <div className={`p-3 rounded-lg border ${
              color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
              color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
              'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={
                  color === 'green' ? 'text-green-600' :
                  color === 'yellow' ? 'text-yellow-600' :
                  'text-red-600'
                } />
                <span className={`text-xs ${
                  color === 'green' ? 'text-green-700 dark:text-green-300' :
                  color === 'yellow' ? 'text-yellow-700 dark:text-yellow-300' :
                  'text-red-700 dark:text-red-300'
                }`}>Battery</span>
              </div>
              <p className={`text-xl font-bold ${
                color === 'green' ? 'text-green-800 dark:text-green-200' :
                color === 'yellow' ? 'text-yellow-800 dark:text-yellow-200' :
                'text-red-800 dark:text-red-200'
              }`}>
                {batteryVoltage.toFixed(1)} <span className="text-sm font-normal">V</span>
                <span className="text-sm font-normal ml-1">({percent}%)</span>
              </p>
            </div>
          )
        })()}
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <div className="flex items-center gap-1 text-xs text-text-tertiary">
          <Clock size={12} />
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
