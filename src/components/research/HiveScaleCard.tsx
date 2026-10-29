'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Scale, RefreshCw, TrendingUp, TrendingDown, Flame, Thermometer, Droplets, Battery, ExternalLink, Sun, Cloud, CloudRain, CloudSnow, CloudFog, Sprout, MapPin } from 'lucide-react'
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
 `/api/beep/data?deviceId=${encodeURIComponent(hive.beep_device_id)}&hiveId=${hive.id}`,
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
 `/api/wolf-waagen/data?scaleId=${encodeURIComponent(hive.wolf_scale_id)}&hiveId=${hive.id}`,
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
 // The parsed Wolf reading names it humidity_percent; reading `humidity` left it always empty
 result.humidity = lv?.humidity_percent ?? null
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

 // Wolf has a brood-nest sensor; BEEP's reading is the inside temperature measured by the scale base
 const temperatureLabel = isBeep ? 'Inside temp.' : 'Brood temp.'
 const temperatureTitle = isBeep ? 'Temperature inside the hive, measured by the scale' : 'Brood-nest temperature'

 // Each period's change, with the change over the period of the same length before it for comparison
 const changes = data
 ? [
 { label: '24 hours', now: data.weightChange24h, before: data.prevWeightChange24h },
 { label: '7 days', now: data.weightChange7d, before: data.prevWeightChange7d },
 { label: '30 days', now: data.weightChange30d, before: data.prevWeightChange30d },
 ]
 : []
 const hasChanges = changes.some(c => c.now !== null)
 const hasPreviousChanges = changes.some(c => c.before !== null)
 const formatChange = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`

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
 <div className={`px-3 py-2 ${headerBg} flex items-center justify-between gap-2`}>
 <div className="flex items-center gap-2 min-w-0">
 <Scale size={16} className={isBeep ? 'text-amber-600' : 'text-blue-600'} aria-hidden="true" />
 <div className="min-w-0">
 <div className={`font-semibold text-base ${headerTitleColour}`}>Hive #{hive.hive_number}</div>
 {scaleName && (
 <div className={`text-sm break-words ${headerMetaColour}`}>Scale {scaleName}</div>
 )}
 </div>
 </div>
 <div className="flex items-center gap-1 flex-shrink-0">
 <span className={`text-sm px-1.5 py-0.5 rounded ${isBeep ? 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200' : 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'}`}>
 {scaleType}
 </span>
 <IconButton
 onClick={fetchData}
 size="xs"
 className="text-text-tertiary hover:text-foreground"
 title="Refresh"
 aria-label="Refresh scale readings"
 >
 <RefreshCw size={16} />
 </IconButton>
 <Link
 href={`/dashboard/hives/${hive.id}`}
 className="inline-flex min-h-12 min-w-12 items-center justify-center p-1 text-text-tertiary hover:text-foreground"
 title="View hive"
 aria-label="View hive"
 >
 <ExternalLink size={16} />
 </Link>
 </div>
 </div>

 {/* Apiary + Weather */}
 {hive.apiaries?.name && (
 <div className="px-3 py-1.5 text-sm text-text-secondary border-b border-border flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
 <span className="flex items-center gap-1">
 <MapPin size={14} className="text-text-tertiary" aria-hidden="true" />
 {hive.apiaries.name}
 </span>
 {weather && (
 <span className="flex items-center gap-2" title="Current weather at the apiary, from the forecast service">
 <span>Outside now:</span>
 {getWeatherIcon(weather.weatherCode)}
 <span className="flex items-center gap-0.5">
 <Thermometer size={14} className="text-orange-400" aria-hidden="true" />
 {Math.round(weather.temperature)}°C
 </span>
 <span className="flex items-center gap-0.5">
 <Droplets size={14} className="text-cyan-400" aria-hidden="true" />
 {weather.humidity}%
 </span>
 </span>
 )}
 </div>
 )}

 {/* Data */}
 <div className="p-3 space-y-3">
 {data && data.weight !== null && (
 <div>
 <div className="text-2xl font-bold text-foreground tabular-nums">{data.weight.toFixed(1)} kg</div>
 <div className="text-sm text-text-secondary">Total weight</div>
 </div>
 )}

 {/* Weight changes: this period against the period of the same length before it */}
 {hasChanges && (
 <table className="w-full tabular-nums">
 <thead>
 <tr className="text-sm text-text-secondary">
 <th scope="col" className="text-left font-normal pb-1">Change (kg)</th>
 {changes.map(c => (
 <th key={c.label} scope="col" className="text-right font-normal pb-1">{c.label}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 <tr>
 <th scope="row" className="text-left text-sm font-normal text-text-secondary">This period</th>
 {changes.map(c => (
 <td key={c.label} className="text-right text-base font-semibold">
 {c.now === null ? (
 <span className="text-text-tertiary">–</span>
 ) : (
 <span className={`inline-flex items-center justify-end gap-0.5 ${c.now >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
 {c.now >= 0 ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
 {formatChange(c.now)}
 </span>
 )}
 </td>
 ))}
 </tr>
 {hasPreviousChanges && (
 <tr className="text-sm text-text-secondary">
 <th scope="row" className="text-left font-normal">Period before</th>
 {changes.map(c => (
 <td key={c.label} className="text-right">{c.before === null ? '–' : formatChange(c.before)}</td>
 ))}
 </tr>
 )}
 </tbody>
 </table>
 )}

 {/* Readings, each with its label underneath */}
 {data && (data.temperature !== null || data.humidity !== null || data.battery !== null || gddValue !== null) && (
 <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3">
 {data.temperature !== null && (
 <div title={temperatureTitle}>
 <div className="flex items-center gap-1 text-lg font-semibold text-foreground tabular-nums">
 <Flame size={16} className="text-orange-500" aria-hidden="true" />
 {data.temperature.toFixed(1)}°C
 </div>
 <div className="text-sm text-text-secondary">{temperatureLabel}</div>
 </div>
 )}
 {data.humidity !== null && (
 <div title="Measured by the scale, not the weather forecast">
 <div className="flex items-center gap-1 text-lg font-semibold text-foreground tabular-nums">
 <Droplets size={16} className="text-cyan-500" aria-hidden="true" />
 {data.humidity.toFixed(0)}%
 </div>
 <div className="text-sm text-text-secondary">Scale humidity</div>
 </div>
 )}
 {data.battery !== null && (
 <div>
 <div className={`flex items-center gap-1 text-lg font-semibold tabular-nums ${data.battery < 20 ? 'text-red-700 dark:text-red-400' : 'text-foreground'}`}>
 <Battery size={16} className={data.battery < 20 ? 'text-red-500' : 'text-green-500'} aria-hidden="true" />
 {data.battery}%
 </div>
 <div className="text-sm text-text-secondary">Battery</div>
 </div>
 )}
 {gddValue !== null && (
 <div title="Growing degree days since 1 January (Wolf calls this GTS)">
 <div className="flex items-center gap-1 text-lg font-semibold text-foreground tabular-nums">
 <Sprout size={16} className="text-green-500" aria-hidden="true" />
 {Math.round(gddValue)}
 </div>
 <div className="text-sm text-text-secondary">GDD since 1 Jan</div>
 </div>
 )}
 </div>
 )}

 {/* No data state */}
 {data && data.weight === null && data.temperature === null && (
 <p className="text-sm text-text-tertiary">No data available</p>
 )}
 </div>
 </div>
 )
}
