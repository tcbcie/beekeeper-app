'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Scale, Thermometer, Droplets, RefreshCw, Clock, TrendingUp, TrendingDown, Flame, BatteryLow, BatteryMedium, BatteryFull, CloudRain, Wind, Compass } from 'lucide-react'
import type { WolfParsedReading } from '@/lib/wolf-waagen-api'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'

interface WolfSensorDisplayProps {
  scaleId: string
  scaleName?: string
  hiveId?: string
}

// Convert wind direction degrees to cardinal direction
const getCardinalDirection = (degrees: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(((degrees % 360) / 45)) % 8
  return directions[index]
}

export default function WolfSensorDisplay({ scaleId, scaleName, hiveId }: WolfSensorDisplayProps) {
  const [sensorData, setSensorData] = useState<WolfParsedReading | null>(null)
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
      setWeightChange7d(data.weightChange7d ?? null)
      setWeightChange30d(data.weightChange30d ?? null)
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
        <div className="h-4 bg-surface-secondary rounded w-1/2"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-surface-secondary rounded"></div>
          <div className="h-16 bg-surface-secondary rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        <Button
          onClick={fetchSensorData}
          tone="danger"
          size="xs"
          className="mt-2 inline-flex items-center gap-1"
        >
          <RefreshCw size={14} />
          Retry
        </Button>
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
  const rain = sensorData.rain_mm
  const windSpeed = sensorData.wind_speed_kmh
  const windDirection = sensorData.wind_direction_deg

  // Battery level helper: 4.2V = full, 3.2V = empty
  const getBatteryInfo = (voltage: number) => {
    const percent = Math.round(((voltage - 3.2) / (4.2 - 3.2)) * 100)
    const clampedPercent = Math.max(0, Math.min(100, percent))
    if (clampedPercent >= 70) return { Icon: BatteryFull, color: 'green', percent: clampedPercent }
    if (clampedPercent >= 30) return { Icon: BatteryMedium, color: 'yellow', percent: clampedPercent }
    return { Icon: BatteryLow, color: 'red', percent: clampedPercent }
  }

  return (
    <div className="space-y-2">
      {/* Header with scale name and refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">
          {scaleName || `Scale ${scaleId}`}
        </p>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-text-tertiary flex items-center gap-1">
              <Clock size={10} />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <IconButton
            onClick={fetchSensorData}
            size="xs"
            className="text-text-tertiary hover:text-foreground"
            title="Refresh data"
          >
            <RefreshCw size={14} />
          </IconButton>
        </div>
      </div>

      {/* Weight Section */}
      {(weight !== undefined || yieldKg !== undefined || weightChange7d !== null || weightChange30d !== null) && (
        <div className="p-3 border border-border rounded-lg space-y-2">
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Weight</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Weight */}
            {weight !== undefined && (
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-1.5">
                  <Scale size={14} className="text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-blue-600 dark:text-blue-400">Current</p>
                    <p className="text-sm font-bold text-blue-800 dark:text-blue-200 truncate">
                      {weight.toFixed(1)} kg
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Yield/Change */}
            {yieldKg !== undefined && (
              <div className={`p-2 rounded border ${
                yieldKg >= 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-1.5">
                  {yieldKg >= 0 ? (
                    <TrendingUp size={14} className="text-green-600 shrink-0" />
                  ) : (
                    <TrendingDown size={14} className="text-red-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-[10px] ${yieldKg >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>24h</p>
                    <p className={`text-sm font-bold truncate ${yieldKg >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                      {yieldKg >= 0 ? '+' : ''}{yieldKg.toFixed(2)} kg
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
      {broodTemp !== undefined && (
        <div className="p-3 border border-border rounded-lg space-y-2">
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Colony</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-1.5">
                <Flame size={14} className="text-orange-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-orange-600 dark:text-orange-400">Brood Temp</p>
                  <p className="text-sm font-bold text-orange-800 dark:text-orange-200 truncate">
                    {broodTemp.toFixed(1)}°C
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Environmental Section - Weather Data */}
      {(temperature !== undefined || humidity !== undefined || typeof rain === 'number' || typeof windSpeed === 'number' || typeof windDirection === 'number') && (
        <div className="p-3 border border-border rounded-lg space-y-2">
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Environmental</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Temperature */}
            {temperature !== undefined && (
              <div className="p-2 bg-sky-50 dark:bg-sky-900/20 rounded border border-sky-200 dark:border-sky-800">
                <div className="flex items-center gap-1.5">
                  <Thermometer size={14} className="text-sky-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-sky-600 dark:text-sky-400">Temp</p>
                    <p className="text-sm font-bold text-sky-800 dark:text-sky-200 truncate">
                      {temperature.toFixed(1)}°C
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Humidity */}
            {humidity !== undefined && (
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
            )}

            {/* Rain */}
            {typeof rain === 'number' && (
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-1.5">
                  <CloudRain size={14} className="text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Rain</p>
                    <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200 truncate">
                      {rain.toFixed(1)} mm
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Wind Speed */}
            {typeof windSpeed === 'number' && (
              <div className="p-2 bg-surface-secondary rounded border border-border">
                <div className="flex items-center gap-1.5">
                  <Wind size={14} className="text-text-secondary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-text-secondary">Wind</p>
                    <p className="text-sm font-bold text-foreground truncate">
                      {windSpeed.toFixed(0)} km/h
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Wind Direction */}
            {typeof windDirection === 'number' && (
              <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded border border-violet-200 dark:border-violet-800">
                <div className="flex items-center gap-1.5">
                  <Compass size={14} className="text-violet-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-violet-600 dark:text-violet-400">Direction</p>
                    <p className="text-sm font-bold text-violet-800 dark:text-violet-200 truncate">
                      {getCardinalDirection(windDirection)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Technical Section - Battery */}
      {typeof batteryVoltage === 'number' && (() => {
        const { Icon, color, percent } = getBatteryInfo(batteryVoltage)
        return (
          <div className="p-3 border border-border rounded-lg space-y-2">
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
  )
}
