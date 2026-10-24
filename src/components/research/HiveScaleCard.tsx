'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Scale, RefreshCw, TrendingUp, TrendingDown, Flame, Thermometer, Droplets, Battery, ExternalLink, Sun, Cloud, CloudRain, CloudSnow, CloudFog, Sprout } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import { fetchCurrentYearGDD } from '@/lib/gdd'

interface HiveScaleCardProps {
 hive: {
 id: string
 hive_number: number
 beep_device_id: string | null
 beep_device_name: string | null
 wolf_scale_id: string | null
 wolf_scale_name: string | null
 apiaries: { id: string; name: string; latitude: number | null; longitude: number | null } | null
 }
}

interface WeatherData {
 temperature: number
 humidity: number
 weatherCode: number
}

// Get weather icon based on WMO weather code
function getWeatherIcon(code: number) {
 // Clear
 if (code === 0 || code === 1) return <Sun size={12} className="text-yellow-500" />
 // Partly cloudy
 if (code === 2 || code === 3) return <Cloud size={12} className="text-text-tertiary" />
 // Fog
 if (code >= 45 && code <= 48) return <CloudFog size={12} className="text-text-tertiary" />
 // Rain/Drizzle
 if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={12} className="text-blue-400" />
 // Snow
 if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <CloudSnow size={12} className="text-blue-200" />
 // Thunderstorm
 if (code >= 95) return <CloudRain size={12} className="text-purple-500" />
 return <Cloud size={12} className="text-text-tertiary" />
}

interface ScaleData {
 weight: number | null
 weightChange24h: number | null
 weightChange7d: number | null
 weightChange30d: number | null
 prevWeightChange24h: number | null
 prevWeightChange7d: number | null
 prevWeightChange30d: number | null
 temperature: number | null
 humidity: number | null
 battery: number | null
}

// One weather request per location, shared by every card in the same apiary for 30 minutes.
// Each card used to fetch its own, so hives in one apiary repeated identical calls (C7b-15).
const WEATHER_TTL_MS = 30 * 60 * 1000
const weatherCache = new Map<string, { promise: Promise<WeatherData | null>; at: number }>()

function fetchLocationWeather(lat: number, lon: number): Promise<WeatherData | null> {
 const key = `${lat},${lon}`
 const cached = weatherCache.get(key)
 if (cached && Date.now() - cached.at < WEATHER_TTL_MS) return cached.promise
 const promise = fetch(
 `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
 )
 .then(async (response) => {
 if (!response.ok) return null
 const json = await response.json()
 return json.current
 ? { temperature: json.current.temperature_2m, humidity: json.current.relative_humidity_2m, weatherCode: json.current.weather_code }
 : null
 })
 .catch((err) => {
 console.error('Failed to fetch weather:', err)
 return null
 })
 // A failure isn't kept, so the next card or refresh tries again
 promise.then(result => { if (!result) weatherCache.delete(key) })
 weatherCache.set(key, { promise, at: Date.now() })
 return promise
}

export default function HiveScaleCard({ hive }: HiveScaleCardProps) {
 const [data, setData] = useState<ScaleData | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [weather, setWeather] = useState<WeatherData | null>(null)
 const [gddValue, setGddValue] = useState<number | null>(null)

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
 prevWeightChange24h: null,
 prevWeightChange7d: null,
 prevWeightChange30d: null,
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
 result.prevWeightChange24h = json.prevWeightChange24h ?? null
 result.prevWeightChange7d = json.prevWeightChange7d ?? null
 result.prevWeightChange30d = json.prevWeightChange30d ?? null
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
 result.weightChange24h = json.weightChange24h ?? null
 result.weightChange7d = json.weightChange7d ?? null
 result.weightChange30d = json.weightChange30d ?? null
 result.prevWeightChange24h = json.prevWeightChange24h ?? null
 result.prevWeightChange7d = json.prevWeightChange7d ?? null
 result.prevWeightChange30d = json.prevWeightChange30d ?? null
 result.temperature = lv?.brood_temp_c ?? null
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
 // Refresh only while the page is visible: it used to poll in the background too (C7b-15)
 const interval = setInterval(() => { if (!document.hidden) fetchData() }, 5 * 60 * 1000)
 return () => clearInterval(interval)
 }, [fetchData])

 // Fetch weather for apiary location
 const apiaryLat = hive.apiaries?.latitude
 const apiaryLon = hive.apiaries?.longitude

 useEffect(() => {
 if (!apiaryLat || !apiaryLon) return

 let cancelled = false
 const fetchWeather = async () => {
 const result = await fetchLocationWeather(apiaryLat, apiaryLon)
 if (result && !cancelled) setWeather(result)
 }

 fetchWeather()
 // Refresh weather every 30 minutes, only while the page is visible
 const interval = setInterval(() => { if (!document.hidden) fetchWeather() }, 30 * 60 * 1000)
 return () => {
 cancelled = true
 clearInterval(interval)
 }
 }, [apiaryLat, apiaryLon])

 // GDD from 1 January to today, through the shared helper: one checked, timed-out, cached request
 // per location, and the same formula as the rest of the app (C7b-15, C7b-16)
 useEffect(() => {
 if (!apiaryLat || !apiaryLon) return
 let cancelled = false
 fetchCurrentYearGDD(apiaryLat, apiaryLon).then(value => {
 if (!cancelled && value !== null) setGddValue(value)
 })
 return () => { cancelled = true }
 }, [apiaryLat, apiaryLon])

 const borderColor = isBeep
 ? 'border-amber-300 dark:border-amber-700'
 : 'border-blue-300 dark:border-blue-700'

 const headerBg = isBeep
 ? 'bg-amber-50 dark:bg-amber-900/20'
 : 'bg-blue-50 dark:bg-blue-900/20'
 const headerTitleColour = isBeep
 ? 'text-amber-950 dark:text-amber-100'
 : 'text-blue-950 dark:text-blue-100'
 const headerMetaColour = isBeep
 ? 'text-amber-800 dark:text-amber-200'
 : 'text-blue-800 dark:text-blue-200'

 const scaleType = isBeep ? 'BEEP' : 'Wolf'
 const scaleName = isBeep ? hive.beep_device_name : hive.wolf_scale_name

 if (loading) {
 return (
 <div className={`bg-surface rounded-lg border-2 ${borderColor} overflow-hidden animate-pulse`}>
 <div className={`px-3 py-2 ${headerBg}`}>
 <div className="h-4 bg-surface-secondary rounded w-2/3"></div>
 </div>
 <div className="p-3 space-y-2">
 <div className="h-6 bg-surface-secondary rounded"></div>
 <div className="h-4 bg-surface-secondary rounded w-1/2"></div>
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
 <span className={`font-semibold ${headerTitleColour}`}>Hive #{hive.hive_number}</span>
 </div>
 </div>
 <div className="p-3">
 <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
 <Button
 onClick={fetchData}
 tone="neutral"
 size="xs"
 className="mt-2 inline-flex items-center gap-1"
 >
 <RefreshCw size={12} />
 Retry
 </Button>
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
 <span className={`font-semibold ${headerTitleColour}`}>Hive #{hive.hive_number}</span>
 {scaleName && (
 <span className={`ml-1 text-xs ${headerMetaColour}`}>({scaleName})</span>
 )}
 </div>
 </div>
 <div className="flex items-center gap-1">
 <span className={`text-sm px-1.5 py-0.5 rounded ${isBeep ? 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200' : 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'}`}>
 {scaleType}
 </span>
 <IconButton
 onClick={fetchData}
 size="xs"
 className="text-text-tertiary hover:text-foreground"
 title="Refresh"
 >
 <RefreshCw size={12} />
 </IconButton>
 <Link
 href={`/dashboard/hives/${hive.id}`}
 className="p-1 text-text-tertiary hover:text-foreground"
 title="View hive"
 >
 <ExternalLink size={12} />
 </Link>
 </div>
 </div>

 {/* Apiary + Weather */}
 {hive.apiaries?.name && (
 <div className="px-3 py-1 text-xs text-text-secondary border-b border-border flex items-center justify-between">
 <span>{hive.apiaries.name}</span>
 {weather && (
 <span className="flex items-center gap-2 text-text-tertiary">
 {getWeatherIcon(weather.weatherCode)}
 <span className="flex items-center gap-0.5">
 <Thermometer size={10} className="text-orange-400" />
 {Math.round(weather.temperature)}°C
 </span>
 <span className="flex items-center gap-0.5">
 <Droplets size={10} className="text-cyan-400" />
 {weather.humidity}%
 </span>
 </span>
 )}
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
 {data.prevWeightChange24h !== null && (
 <span className="text-text-tertiary ml-0.5">
 ({data.prevWeightChange24h >= 0 ? '+' : ''}{data.prevWeightChange24h.toFixed(2)})
 </span>
 )}
 </span>
 )}
 {data && data.weightChange7d !== null && (
 <span className={`text-xs flex items-center gap-0.5 ${data.weightChange7d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {data.weightChange7d >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
 {data.weightChange7d >= 0 ? '+' : ''}{data.weightChange7d.toFixed(2)} 7d
 {data.prevWeightChange7d !== null && (
 <span className="text-text-tertiary ml-0.5">
 ({data.prevWeightChange7d >= 0 ? '+' : ''}{data.prevWeightChange7d.toFixed(2)})
 </span>
 )}
 </span>
 )}
 {data && data.weightChange30d !== null && (
 <span className={`text-xs flex items-center gap-0.5 ${data.weightChange30d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {data.weightChange30d >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
 {data.weightChange30d >= 0 ? '+' : ''}{data.weightChange30d.toFixed(2)} 30d
 {data.prevWeightChange30d !== null && (
 <span className="text-text-tertiary ml-0.5">
 ({data.prevWeightChange30d >= 0 ? '+' : ''}{data.prevWeightChange30d.toFixed(2)})
 </span>
 )}
 </span>
 )}
 </div>

 {/* Sensor row */}
 <div className="flex items-center gap-3 text-xs text-text-secondary">
 {data && data.temperature !== null && (
 <span className="flex items-center gap-1" title="Brood temperature">
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
 {gddValue !== null && (
 <span className="flex items-center gap-1" title="Growing Degree Days (Jan 1 to today)">
 <Sprout size={12} className="text-green-500" />
 {gddValue}
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
