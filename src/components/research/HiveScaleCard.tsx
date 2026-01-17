'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Scale, RefreshCw, TrendingUp, TrendingDown, Flame, Droplets, Battery, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface HiveScaleCardProps {
  hive: {
    id: string
    hive_number: number
    beep_device_id: string | null
    beep_device_name: string | null
    wolf_scale_id: string | null
    wolf_scale_name: string | null
    apiaries: { id: string; name: string } | null
  }
}

interface ScaleData {
  weight: number | null
  weightChange24h: number | null
  weightChange7d: number | null
  weightChange30d: number | null
  temperature: number | null
  humidity: number | null
  battery: number | null
}

export default function HiveScaleCard({ hive }: HiveScaleCardProps) {
  const [data, setData] = useState<ScaleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isBeep = !!hive.beep_device_id
  const isWolf = !!hive.wolf_scale_id

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const result: ScaleData = {
        weight: null,
        weightChange24h: null,
        weightChange7d: null,
        weightChange30d: null,
        temperature: null,
        humidity: null,
        battery: null
      }

      if (isBeep && hive.beep_device_id) {
        const response = await fetch(
          `/api/beep/data?deviceId=${hive.beep_device_id}&hiveId=${hive.id}`,
          { headers: { 'Authorization': `Bearer ${session.access_token}` } }
        )
        if (response.ok) {
          const json = await response.json()
          const lv = json.lastValues
          result.weight = lv?.weight_kg_corrected ?? lv?.weight_kg ?? null
          result.weightChange24h = json.weightChange24h ?? null
          result.weightChange7d = json.weightChange7d ?? null
          result.weightChange30d = json.weightChange30d ?? null
          result.temperature = lv?.t_i ?? lv?.t ?? lv?.t_0 ?? null
          result.humidity = lv?.h ?? null
          // Calculate battery percentage from voltage
          if (lv?.bv) {
            const bv = typeof lv.bv === 'string' ? parseFloat(lv.bv) : lv.bv
            if (!isNaN(bv) && bv > 0) {
              const voltage = bv > 100 ? bv / 1000 : bv
              result.battery = Math.max(0, Math.min(100, Math.round(((voltage - 2.5) / 1.7) * 100)))
            }
          }
        } else {
          const json = await response.json()
          throw new Error(json.error || 'Failed to fetch BEEP data')
        }
      } else if (isWolf && hive.wolf_scale_id) {
        const response = await fetch(
          `/api/wolf-waagen/data?scaleId=${hive.wolf_scale_id}&hiveId=${hive.id}`,
          { headers: { 'Authorization': `Bearer ${session.access_token}` } }
        )
        if (response.ok) {
          const json = await response.json()
          const lv = json.lastValues
          result.weight = lv?.weight_kg ?? null
          result.weightChange7d = json.weightChange7d ?? null
          result.weightChange30d = json.weightChange30d ?? null
          result.temperature = lv?.temperature_c ?? null
          result.humidity = lv?.humidity ?? null
          // Wolf battery voltage to percentage
          if (lv?.battery_voltage) {
            const voltage = lv.battery_voltage
            result.battery = Math.max(0, Math.min(100, Math.round(((voltage - 2.5) / 1.7) * 100)))
          }
        } else {
          const json = await response.json()
          throw new Error(json.error || 'Failed to fetch Wolf data')
        }
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [hive.id, hive.beep_device_id, hive.wolf_scale_id, isBeep, isWolf])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  const borderColor = isBeep
    ? 'border-amber-300 dark:border-amber-700'
    : 'border-blue-300 dark:border-blue-700'

  const headerBg = isBeep
    ? 'bg-amber-50 dark:bg-amber-900/20'
    : 'bg-blue-50 dark:bg-blue-900/20'

  const scaleType = isBeep ? 'BEEP' : 'Wolf'
  const scaleName = isBeep ? hive.beep_device_name : hive.wolf_scale_name

  if (loading) {
    return (
      <div className={`bg-surface rounded-lg border-2 ${borderColor} overflow-hidden animate-pulse`}>
        <div className={`px-3 py-2 ${headerBg}`}>
          <div className="h-4 bg-sage-200 dark:bg-slate-700 rounded w-2/3"></div>
        </div>
        <div className="p-3 space-y-2">
          <div className="h-6 bg-sage-200 dark:bg-slate-700 rounded"></div>
          <div className="h-4 bg-sage-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-surface rounded-lg border-2 ${borderColor} overflow-hidden`}>
        <div className={`px-3 py-2 ${headerBg} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Scale size={16} className={isBeep ? 'text-amber-600' : 'text-blue-600'} />
            <span className="font-medium text-foreground">Hive #{hive.hive_number}</span>
          </div>
        </div>
        <div className="p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-xs text-text-secondary hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-surface rounded-lg border-2 ${borderColor} overflow-hidden`}>
      {/* Header */}
      <div className={`px-3 py-2 ${headerBg} flex items-center justify-between`}>
        <div className="flex items-center gap-2 min-w-0">
          <Scale size={16} className={isBeep ? 'text-amber-600' : 'text-blue-600'} />
          <div className="min-w-0">
            <span className="font-medium text-foreground">Hive #{hive.hive_number}</span>
            {scaleName && (
              <span className="text-xs text-text-tertiary ml-1">({scaleName})</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isBeep ? 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200' : 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'}`}>
            {scaleType}
          </span>
          <button
            onClick={fetchData}
            className="p-1 text-text-tertiary hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw size={12} />
          </button>
          <Link
            href={`/dashboard/hives/${hive.id}`}
            className="p-1 text-text-tertiary hover:text-foreground"
            title="View hive"
          >
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Apiary */}
      {hive.apiaries?.name && (
        <div className="px-3 py-1 text-xs text-text-secondary border-b border-border">
          {hive.apiaries.name}
        </div>
      )}

      {/* Data */}
      <div className="p-3 space-y-2">
        {/* Weight row */}
        <div className="flex items-center gap-2 flex-wrap">
          {data && data.weight !== null && (
            <span className="font-bold text-lg text-foreground">
              {data.weight.toFixed(1)} kg
            </span>
          )}
          {data && data.weightChange24h !== null && (
            <span className={`text-xs flex items-center gap-0.5 ${data.weightChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.weightChange24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {data.weightChange24h >= 0 ? '+' : ''}{data.weightChange24h.toFixed(2)} 24h
            </span>
          )}
          {data && data.weightChange7d !== null && (
            <span className={`text-xs flex items-center gap-0.5 ${data.weightChange7d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.weightChange7d >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {data.weightChange7d >= 0 ? '+' : ''}{data.weightChange7d.toFixed(2)} 7d
            </span>
          )}
        </div>

        {/* Sensor row */}
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          {data && data.temperature !== null && (
            <span className="flex items-center gap-1">
              <Flame size={12} className="text-orange-500" />
              {data.temperature.toFixed(1)}°C
            </span>
          )}
          {data && data.humidity !== null && (
            <span className="flex items-center gap-1">
              <Droplets size={12} className="text-cyan-500" />
              {data.humidity.toFixed(0)}%
            </span>
          )}
          {data && data.battery !== null && (
            <span className={`flex items-center gap-1 ${data.battery < 20 ? 'text-red-500' : ''}`}>
              <Battery size={12} className={data.battery < 20 ? 'text-red-500' : 'text-green-500'} />
              {data.battery}%
            </span>
          )}
        </div>

        {/* No data state */}
        {data && data.weight === null && data.temperature === null && (
          <p className="text-xs text-text-tertiary">No data available</p>
        )}
      </div>
    </div>
  )
}
