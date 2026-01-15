'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Scale, Flame, Droplets, Battery, RefreshCw, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import type { BeepSensorReading } from '@/lib/beep-api'

interface ScaleSensorDisplayProps {
  deviceId: string
  deviceName?: string
  hiveId?: string
}

export default function ScaleSensorDisplay({ deviceId, deviceName, hiveId }: ScaleSensorDisplayProps) {
  const [sensorData, setSensorData] = useState<BeepSensorReading | null>(null)
  const [weightChange7d, setWeightChange7d] = useState<number | null>(null)
  const [weightChange30d, setWeightChange30d] = useState<number | null>(null)
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
        ? `/api/beep/data?deviceId=${deviceId}&hiveId=${hiveId}`
        : `/api/beep/data?deviceId=${deviceId}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch data')
      }

      const data = await response.json()
      setSensorData(data.lastValues)
      setWeightChange7d(data.weightChange7d ?? null)
      setWeightChange30d(data.weightChange30d ?? null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sensor data')
    } finally {
      setLoading(false)
    }
  }, [deviceId, hiveId])

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
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-sm text-amber-700 dark:text-amber-300">No sensor data available yet</p>
      </div>
    )
  }

  // Get the weight value (prefer corrected weight)
  const weight = sensorData.weight_kg_corrected ?? sensorData.weight_kg
  // Get temperature (prefer inside temp)
  const temperature = sensorData.t_i ?? sensorData.t ?? sensorData.t_0
  const humidity = sensorData.h
  const rawBattery = sensorData.bv

  // Calculate battery percentage
  // BEEP devices may use different battery types, using wider range 2.5V-4.2V
  // BEEP may return voltage in millivolts (e.g., 3900) or volts (e.g., 3.9)
  const getBatteryInfo = (bv: number | string | undefined | null): { percent: number; voltage: number } | null => {
    if (bv === undefined || bv === null || bv === '') return null
    const numValue = typeof bv === 'string' ? parseFloat(bv) : bv
    if (isNaN(numValue) || numValue <= 0) return null
    // If value > 100, assume millivolts and convert to volts
    const voltage = numValue > 100 ? numValue / 1000 : numValue
    // Calculate percentage: 2.5V = 0%, 4.2V = 100% (wider range for different battery types)
    const percent = Math.round(((voltage - 2.5) / 1.7) * 100)
    return { percent: Math.max(0, Math.min(100, percent)), voltage }
  }
  const batteryInfo = getBatteryInfo(rawBattery)

  return (
    <div className="space-y-2">
      {/* Header with device name and refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">
          {deviceName || `Device ${deviceId}`}
        </p>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-text-tertiary flex items-center gap-1">
              <Clock size={10} />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchSensorData}
            className="p-1 text-text-tertiary hover:text-foreground rounded"
            title="Refresh data"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Weight Section */}
      {(weight !== undefined || weightChange7d !== null || weightChange30d !== null) && (
        <div className="p-3 border border-sage-200 dark:border-slate-700 rounded-lg space-y-2">
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Weight</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Current Weight */}
            {weight !== undefined && (
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-1.5">
                  <Scale size={14} className="text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">Current</p>
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200 truncate">
                      {weight.toFixed(1)} kg
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 7-Day Change */}
            {weightChange7d !== null && (
              <div className={`p-2 rounded border ${
                weightChange7d >= 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-1.5">
                  {weightChange7d >= 0 ? (
                    <TrendingUp size={14} className="text-green-600 shrink-0" />
                  ) : (
                    <TrendingDown size={14} className="text-red-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-[10px] ${weightChange7d >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>7d</p>
                    <p className={`text-sm font-bold truncate ${weightChange7d >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                      {weightChange7d >= 0 ? '+' : ''}{weightChange7d.toFixed(2)} kg
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 30-Day Change */}
            {weightChange30d !== null && (
              <div className={`p-2 rounded border ${
                weightChange30d >= 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-1.5">
                  {weightChange30d >= 0 ? (
                    <TrendingUp size={14} className="text-green-600 shrink-0" />
                  ) : (
                    <TrendingDown size={14} className="text-red-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-[10px] ${weightChange30d >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>30d</p>
                    <p className={`text-sm font-bold truncate ${weightChange30d >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                      {weightChange30d >= 0 ? '+' : ''}{weightChange30d.toFixed(2)} kg
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Colony Section - Brood Temperature */}
      {temperature !== undefined && (
        <div className="p-3 border border-sage-200 dark:border-slate-700 rounded-lg space-y-2">
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Colony</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-1.5">
                <Flame size={14} className="text-orange-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-orange-600 dark:text-orange-400">Brood Temp</p>
                  <p className="text-sm font-bold text-orange-800 dark:text-orange-200 truncate">
                    {temperature.toFixed(1)}°C
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Environmental Section - Humidity */}
      {humidity !== undefined && (
        <div className="p-3 border border-sage-200 dark:border-slate-700 rounded-lg space-y-2">
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Environmental</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded border border-cyan-200 dark:border-cyan-800">
              <div className="flex items-center gap-1.5">
                <Droplets size={14} className="text-cyan-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-cyan-600 dark:text-cyan-400">Humidity</p>
                  <p className="text-sm font-bold text-cyan-800 dark:text-cyan-200 truncate">
                    {humidity.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technical Section - Battery */}
      {batteryInfo !== null && (
        <div className="p-3 border border-sage-200 dark:border-slate-700 rounded-lg space-y-2">
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Technical</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className={`p-2 rounded border ${
              batteryInfo.percent < 20
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="flex items-center gap-1.5">
                <Battery size={14} className={`shrink-0 ${batteryInfo.percent < 20 ? 'text-red-600' : 'text-green-600'}`} />
                <div className="min-w-0">
                  <p className={`text-[10px] ${batteryInfo.percent < 20 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>Battery</p>
                  <p className={`text-sm font-bold truncate ${batteryInfo.percent < 20 ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>
                    {batteryInfo.percent}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
