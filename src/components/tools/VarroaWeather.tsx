'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Cloud, Loader2, MapPin, Info, Droplets, Wind, Thermometer, ArrowDown, ArrowUp, Plus, Circle, Minus, Ban } from 'lucide-react'

interface Apiary {
  id: string
  name: string
  latitude: number | null
  longitude: number | null
}

interface Treatment {
  id: string
  product_name: string
  active_ingredients: string
  temperature_range: string
  notes: string
}

interface DailyForecast {
  date: string
  dayName: string
  tempMin: number
  tempMax: number
  tempAvg: number
  humidity: number
  precipitation: number
  precipProbability: number
  windSpeed: number
  weatherCode: number
}

interface VarroaWeatherProps {
  userId: string
}

type BroodStatus = 'brood' | 'broodless'

// Treatments that are only effective during broodless period
const BROODLESS_ONLY_TREATMENTS = ['Apibioxal', 'Oxybee']

// Treatments that need active bees (less effective when broodless/cold)
const ACTIVE_BEES_TREATMENTS = ['Apiguard', 'ApiLife Var']

// Check if treatment is suitable for the current brood status
function isTreatmentSuitableForBroodStatus(
  productName: string,
  broodStatus: BroodStatus
): 'suitable' | 'not_recommended' | 'less_effective' {
  const isBroodlessOnly = BROODLESS_ONLY_TREATMENTS.some(t =>
    productName.toLowerCase().includes(t.toLowerCase())
  )
  const needsActiveBees = ACTIVE_BEES_TREATMENTS.some(t =>
    productName.toLowerCase().includes(t.toLowerCase())
  )

  if (broodStatus === 'brood') {
    // Colony has brood
    if (isBroodlessOnly) {
      return 'not_recommended' // Oxalic acid ineffective with brood
    }
    return 'suitable'
  } else {
    // Broodless colony
    if (needsActiveBees) {
      return 'less_effective' // Thymol needs active bees to spread
    }
    return 'suitable'
  }
}

// Parse temperature range string like "15-30°C" or "10-29°C"
function parseTemperatureRange(range: string): { min: number; max: number } | null {
  const match = range.match(/(\d+)\s*-\s*(\d+)/)
  if (match) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) }
  }
  return null
}

// Get suitability indicator for a treatment on a given day
function getSuitability(
  treatment: Treatment,
  tempMin: number,
  tempMax: number,
  broodStatus: BroodStatus
): 'optimal' | 'favorable' | 'too_cold' | 'too_hot' | 'na' | 'not_recommended' | 'less_effective' {
  // First check if treatment is suitable for brood status
  const broodSuitability = isTreatmentSuitableForBroodStatus(treatment.product_name, broodStatus)

  if (broodSuitability === 'not_recommended') {
    return 'not_recommended'
  }

  const range = parseTemperatureRange(treatment.temperature_range)

  // Treatments without specific temp requirements (broodless period treatments)
  // For broodless colonies, show temp-based recommendation for oxalic treatments
  if (!range || treatment.temperature_range.toLowerCase().includes('any')) {
    if (broodStatus === 'broodless') {
      // Oxalic acid works best in cool/cold weather (0-10°C ideal)
      const avgTemp = (tempMin + tempMax) / 2
      if (avgTemp >= 0 && avgTemp <= 10) {
        return 'optimal'
      } else if (avgTemp > 10 && avgTemp <= 15) {
        return 'favorable'
      } else if (avgTemp < 0) {
        return 'too_cold'
      }
      return 'favorable' // Still works but less ideal
    }
    return 'na'
  }

  const avgTemp = (tempMin + tempMax) / 2

  // Too cold
  if (avgTemp < range.min) {
    return 'too_cold'
  }

  // Too hot
  if (avgTemp > range.max) {
    return 'too_hot'
  }

  // Optimal: within a narrower "sweet spot" (middle 60% of range)
  const rangeSize = range.max - range.min
  const optimalMin = range.min + rangeSize * 0.2
  const optimalMax = range.max - rangeSize * 0.2

  if (avgTemp >= optimalMin && avgTemp <= optimalMax) {
    // If less effective due to brood status, downgrade to favorable
    if (broodSuitability === 'less_effective') {
      return 'less_effective'
    }
    return 'optimal'
  }

  // Favorable: within manufacturer range but not optimal
  if (broodSuitability === 'less_effective') {
    return 'less_effective'
  }
  return 'favorable'
}

// Weather code to description (WMO codes)
function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight showers',
    81: 'Moderate showers',
    82: 'Violent showers',
    95: 'Thunderstorm',
  }
  return descriptions[code] || 'Unknown'
}

export default function VarroaWeather({ userId }: VarroaWeatherProps) {
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [selectedApiary, setSelectedApiary] = useState<string>('')
  const [forecast, setForecast] = useState<DailyForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingForecast, setLoadingForecast] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [broodStatus, setBroodStatus] = useState<BroodStatus>('brood')

  // Fetch apiaries and treatments
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch apiaries with coordinates
      const { data: apiaryData } = await supabase
        .from('apiaries')
        .select('id, name, latitude, longitude')
        .eq('user_id', userId)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('name')

      // Fetch treatments from database
      const { data: treatmentData } = await supabase
        .from('varroa_treatment_products')
        .select('id, product_name, active_ingredients, temperature_range, notes')
        .order('product_name')

      setApiaries(apiaryData || [])
      setTreatments(treatmentData || [])

      // Auto-select first apiary if available
      if (apiaryData && apiaryData.length > 0 && !selectedApiary) {
        setSelectedApiary(apiaryData[0].id)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [userId, selectedApiary])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch weather forecast when apiary changes
  const fetchForecast = useCallback(async () => {
    const apiary = apiaries.find(a => a.id === selectedApiary)
    if (!apiary?.latitude || !apiary?.longitude) {
      setForecast([])
      return
    }

    setLoadingForecast(true)
    setError(null)

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${apiary.latitude}&longitude=${apiary.longitude}&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=Europe/Dublin&forecast_days=7`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch weather data')
      }

      const data = await response.json()

      if (!data.daily) {
        throw new Error('Invalid weather data')
      }

      const days: DailyForecast[] = data.daily.time.map((date: string, i: number) => {
        const tempMin = data.daily.temperature_2m_min[i]
        const tempMax = data.daily.temperature_2m_max[i]
        return {
          date,
          dayName: new Date(date).toLocaleDateString('en-IE', { weekday: 'short' }),
          tempMin,
          tempMax,
          tempAvg: (tempMin + tempMax) / 2,
          humidity: data.daily.relative_humidity_2m_max[i] || 0,
          precipitation: data.daily.precipitation_sum[i] || 0,
          precipProbability: data.daily.precipitation_probability_max[i] || 0,
          windSpeed: data.daily.wind_speed_10m_max[i] || 0,
          weatherCode: data.daily.weather_code[i] || 0,
        }
      })

      setForecast(days)
    } catch (err) {
      console.error('Error fetching forecast:', err)
      setError('Failed to fetch weather forecast')
      setForecast([])
    } finally {
      setLoadingForecast(false)
    }
  }, [apiaries, selectedApiary])

  useEffect(() => {
    if (selectedApiary && apiaries.length > 0) {
      fetchForecast()
    }
  }, [selectedApiary, apiaries, fetchForecast])

  // Render suitability indicator
  const renderSuitability = (suitability: 'optimal' | 'favorable' | 'too_cold' | 'too_hot' | 'na' | 'not_recommended' | 'less_effective') => {
    switch (suitability) {
      case 'optimal':
        return (
          <div className="flex items-center justify-center" title="Optimal conditions">
            <Plus className="text-green-600 dark:text-green-400" size={20} strokeWidth={3} />
          </div>
        )
      case 'favorable':
        return (
          <div className="flex items-center justify-center" title="Favorable conditions">
            <Circle className="text-green-600 dark:text-green-400 fill-green-600 dark:fill-green-400" size={12} />
          </div>
        )
      case 'less_effective':
        return (
          <div className="flex items-center justify-center" title="Less effective (needs active bees)">
            <Circle className="text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" size={12} />
          </div>
        )
      case 'too_cold':
        return (
          <div className="flex items-center justify-center" title="Temperature too low">
            <ArrowDown className="text-blue-600 dark:text-blue-400" size={20} strokeWidth={3} />
          </div>
        )
      case 'too_hot':
        return (
          <div className="flex items-center justify-center" title="Temperature too high">
            <ArrowUp className="text-red-600 dark:text-red-400" size={20} strokeWidth={3} />
          </div>
        )
      case 'not_recommended':
        return (
          <div className="flex items-center justify-center" title="Not recommended (ineffective with brood)">
            <Ban className="text-gray-400 dark:text-gray-500" size={16} />
          </div>
        )
      case 'na':
      default:
        return (
          <div className="flex items-center justify-center" title="Select broodless for winter treatments">
            <Minus className="text-gray-400" size={16} />
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-forest-600" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Cloud size={24} className="text-forest-600 dark:text-forest-400" />
        <h3 className="text-xl font-semibold text-foreground">Varroa Weather</h3>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Treatment Weather Forecast</p>
            <p>See which varroa treatments are suitable for the coming week based on weather conditions at your apiary location. Temperature is the key factor for most treatments.</p>
          </div>
        </div>
      </div>

      {/* Apiary Selector */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          <MapPin size={16} className="inline mr-1" />
          Select Apiary
        </label>
        {apiaries.length > 0 ? (
          <select
            value={selectedApiary}
            onChange={(e) => setSelectedApiary(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border bg-surface dark:bg-surface-elevated text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500"
          >
            {apiaries.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        ) : (
          <p className="text-amber-700 dark:text-amber-400 text-sm">
            No apiaries with GPS coordinates found. Please add coordinates to your apiaries first.
          </p>
        )}
      </div>

      {/* Colony Status Toggle */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Colony Status
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setBroodStatus('brood')}
            className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
              broodStatus === 'brood'
                ? 'border-forest-500 bg-forest-50 dark:bg-forest-900/30 text-forest-700 dark:text-forest-300'
                : 'border-border bg-surface dark:bg-surface-elevated text-text-secondary hover:border-forest-300'
            }`}
          >
            <div className="font-semibold">Brood Present</div>
            <div className="text-xs mt-1 opacity-75">Active season</div>
          </button>
          <button
            onClick={() => setBroodStatus('broodless')}
            className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
              broodStatus === 'broodless'
                ? 'border-forest-500 bg-forest-50 dark:bg-forest-900/30 text-forest-700 dark:text-forest-300'
                : 'border-border bg-surface dark:bg-surface-elevated text-text-secondary hover:border-forest-300'
            }`}
          >
            <div className="font-semibold">Broodless</div>
            <div className="text-xs mt-1 opacity-75">Winter cluster</div>
          </button>
        </div>
        <p className="text-xs text-text-secondary mt-2">
          {broodStatus === 'brood'
            ? 'Showing treatments effective when brood is present. Oxalic acid treatments are not recommended.'
            : 'Showing treatments for broodless winter colonies. Oxalic acid is most effective now.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {loadingForecast && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-forest-600" size={24} />
          <span className="ml-2 text-text-secondary">Loading forecast...</span>
        </div>
      )}

      {/* Treatment Suitability Matrix */}
      {forecast.length > 0 && treatments.length > 0 && !loadingForecast && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white dark:bg-slate-900 rounded-lg border border-border">
              <thead>
                <tr className="bg-sage-100 dark:bg-slate-700">
                  <th className="text-left p-3 text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-border min-w-[160px]">
                    Treatment
                  </th>
                  {forecast.map((day) => (
                    <th key={day.date} className="text-center p-2 text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-border min-w-[60px]">
                      <div>{day.dayName}</div>
                      <div className="text-xs font-normal text-gray-600 dark:text-gray-300">
                        {new Date(day.date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {treatments.map((treatment) => (
                  <tr key={treatment.id} className="border-b border-border bg-white dark:bg-slate-900 hover:bg-sage-50 dark:hover:bg-slate-700/50">
                    <td className="p-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{treatment.product_name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{treatment.temperature_range}</div>
                    </td>
                    {forecast.map((day) => (
                      <td key={`${treatment.id}-${day.date}`} className="p-2 text-center">
                        {renderSuitability(getSuitability(treatment, day.tempMin, day.tempMax, broodStatus))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Weather Details Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white dark:bg-slate-900 rounded-lg border border-border">
              <thead>
                <tr className="bg-sage-100 dark:bg-slate-700">
                  <th className="text-left p-3 text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-border min-w-[120px]">
                    Weather
                  </th>
                  {forecast.map((day) => (
                    <th key={day.date} className="text-center p-2 text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-border min-w-[60px]">
                      {day.dayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Conditions */}
                <tr className="border-b border-border bg-white dark:bg-slate-900">
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                    <Cloud size={14} className="inline mr-1" />
                    Conditions
                  </td>
                  {forecast.map((day) => (
                    <td key={day.date} className="p-2 text-center text-xs text-gray-900 dark:text-gray-100">
                      {getWeatherDescription(day.weatherCode)}
                    </td>
                  ))}
                </tr>
                {/* Temperature */}
                <tr className="border-b border-border bg-white dark:bg-slate-900">
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                    <Thermometer size={14} className="inline mr-1" />
                    Temp (°C)
                  </td>
                  {forecast.map((day) => (
                    <td key={day.date} className="p-2 text-center text-sm">
                      <span className="text-blue-600 dark:text-blue-400">{Math.round(day.tempMin)}</span>
                      <span className="text-gray-500 dark:text-gray-400 mx-1">/</span>
                      <span className="text-red-600 dark:text-red-400">{Math.round(day.tempMax)}</span>
                    </td>
                  ))}
                </tr>
                {/* Humidity */}
                <tr className="border-b border-border bg-white dark:bg-slate-900">
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                    <Droplets size={14} className="inline mr-1" />
                    Humidity (%)
                  </td>
                  {forecast.map((day) => (
                    <td key={day.date} className="p-2 text-center text-sm text-gray-900 dark:text-gray-100">
                      {Math.round(day.humidity)}%
                    </td>
                  ))}
                </tr>
                {/* Precipitation */}
                <tr className="border-b border-border bg-white dark:bg-slate-900">
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                    <Droplets size={14} className="inline mr-1" />
                    Rain (mm)
                  </td>
                  {forecast.map((day) => (
                    <td key={day.date} className="p-2 text-center text-sm text-gray-900 dark:text-gray-100">
                      {day.precipitation.toFixed(1)}
                    </td>
                  ))}
                </tr>
                {/* Wind */}
                <tr className="border-b border-border bg-white dark:bg-slate-900">
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                    <Wind size={14} className="inline mr-1" />
                    Wind (km/h)
                  </td>
                  {forecast.map((day) => (
                    <td key={day.date} className="p-2 text-center text-sm text-gray-900 dark:text-gray-100">
                      {Math.round(day.windSpeed)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="bg-sage-50 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Legend</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Plus className="text-green-600 dark:text-green-400" size={18} strokeWidth={3} />
                <span className="text-gray-900 dark:text-gray-100">Optimal conditions</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="text-green-600 dark:text-green-400 fill-green-600 dark:fill-green-400" size={10} />
                <span className="text-gray-900 dark:text-gray-100">Favorable conditions</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" size={10} />
                <span className="text-gray-900 dark:text-gray-100">Less effective</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowDown className="text-blue-600 dark:text-blue-400" size={18} strokeWidth={3} />
                <span className="text-gray-900 dark:text-gray-100">Too cold</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUp className="text-red-600 dark:text-red-400" size={18} strokeWidth={3} />
                <span className="text-gray-900 dark:text-gray-100">Too hot</span>
              </div>
              <div className="flex items-center gap-2">
                <Ban className="text-gray-400 dark:text-gray-500" size={16} />
                <span className="text-gray-900 dark:text-gray-100">Not recommended</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-3">
              Recommendations vary based on colony status. Oxalic acid is most effective during broodless periods. Thymol treatments need active bees to spread the product.
            </p>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loadingForecast && forecast.length === 0 && selectedApiary && (
        <div className="text-center py-8 text-text-secondary">
          <Cloud size={48} className="mx-auto mb-3 opacity-30" />
          <p>Select an apiary with GPS coordinates to see the weather forecast.</p>
        </div>
      )}
    </div>
  )
}
