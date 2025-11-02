'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, Edit2, Trash2, ArrowLeft, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Hive {
  id: string
  hive_number: string
  apiaries?: {
    eircode: string | null
  }
}

interface HiveQueryResult {
  id: string
  hive_number: string
  apiaries: {
    eircode: string | null
  } | {
    eircode: string | null
  }[] | null
}

interface VarroaTreatmentProduct {
  id: string
  product_name: string
  active_ingredients: string
  application_method: string
  treatment_duration: string
  temperature_range: string
  honey_flow_restrictions: string
  withdrawal_period_days: number
  notes: string | null
}

interface VarroaTreatment {
  id: string
  hive_id: string
  user_id: string
  treatment_date: string
  treatment_type: string
  product_name: string
  dosage: string
  temperature: number | null
  weather_conditions: string
  notes: string
  hives?: {
    hive_number: string
    apiary_id: string | null
  }
  profiles?: {
    full_name: string
    email: string
  }
}

interface FormData {
  hive_id: string
  treatment_date: string
  treatment_type: string
  product_name: string
  dosage: string
  temperature: number | null
  weather_conditions: string
  notes: string
}

export default function VarroaTreatmentPage() {
  const router = useRouter()
  const [treatments, setTreatments] = useState<VarroaTreatment[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [treatmentProducts, setTreatmentProducts] = useState<VarroaTreatmentProduct[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<VarroaTreatment | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [showIPMTips, setShowIPMTips] = useState(false)
  const [useManualTreatmentEntry, setUseManualTreatmentEntry] = useState(false)
  const [apiaries, setApiaries] = useState<Array<{id: string, name: string}>>([])
  const [filterApiaryId, setFilterApiaryId] = useState<string>('')
  const [formData, setFormData] = useState<FormData>({
    hive_id: '',
    treatment_date: new Date().toISOString().split('T')[0],
    treatment_type: '',
    product_name: '',
    dosage: '',
    temperature: null,
    weather_conditions: '',
    notes: '',
  })

  const fetchTreatments = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('varroa_treatments')
      .select('*, hives(hive_number, apiary_id), profiles(full_name, email)')
      .eq('user_id', currentUserId)
      .order('treatment_date', { ascending: false })

    // Fallback: If profiles data is missing, fetch it manually
    if (data && data.length > 0 && data[0] && !data[0].profiles) {
      const userIds = [...new Set(data.map(t => t.user_id).filter(Boolean))]
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds as string[])

        if (profilesData) {
          const profilesMap = new Map(profilesData.map(p => [p.id, p]))
          data.forEach((treatment: VarroaTreatment) => {
            if (treatment.user_id) {
              const profile = profilesMap.get(treatment.user_id)
              if (profile) {
                treatment.profiles = {
                  full_name: profile.full_name,
                  email: profile.email
                }
              }
            }
          })
        }
      }
    }

    if (data) setTreatments(data as VarroaTreatment[])
    setLoading(false)
  }, [userId])

  const fetchHives = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // Fetch user's own hives
    const { data: ownHives } = await supabase
      .from('hives')
      .select('id, hive_number, apiaries(eircode)')
      .eq('status', 'active')
      .eq('user_id', currentUserId)
      .order('hive_number')

    // Fetch team memberships to get shared hives
    const { data: teamMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', currentUserId)

    const teamIds = teamMemberships?.map(tm => tm.team_id) || []

    let sharedHives: HiveQueryResult[] = []
    if (teamIds.length > 0) {
      const { data: teamApiaryData } = await supabase
        .from('team_apiaries')
        .select('apiary_id')
        .in('team_id', teamIds)

      const sharedApiaryIds = teamApiaryData?.map(ta => ta.apiary_id) || []

      if (sharedApiaryIds.length > 0) {
        const { data: sharedHivesData } = await supabase
          .from('hives')
          .select('id, hive_number, apiaries(eircode)')
          .in('apiary_id', sharedApiaryIds)
          .eq('status', 'active')
          .order('hive_number')

        sharedHives = sharedHivesData as HiveQueryResult[] || []
      }
    }

    // Combine own and shared hives
    const allHives = [...(ownHives as HiveQueryResult[] || []), ...sharedHives]
    const uniqueHives = Array.from(
      new Map(allHives.map(h => [h.id, h])).values()
    )

    // Transform the data to match Hive interface
    const hivesData = uniqueHives.map((hive) => ({
      id: hive.id,
      hive_number: hive.hive_number,
      apiaries: hive.apiaries && !Array.isArray(hive.apiaries)
        ? hive.apiaries
        : (Array.isArray(hive.apiaries) && hive.apiaries[0])
          ? hive.apiaries[0]
          : undefined
    }))

    setHives(hivesData)
  }, [userId])

  const fetchApiaries = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // Fetch user's own apiaries
    const { data: ownApiaries } = await supabase
      .from('apiaries')
      .select('id, name')
      .eq('user_id', currentUserId)
      .order('name')

    // Fetch team memberships to get shared apiaries
    const { data: teamMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', currentUserId)

    const teamIds = teamMemberships?.map(tm => tm.team_id) || []

    let sharedApiaries: Array<{id: string, name: string}> = []
    if (teamIds.length > 0) {
      const { data: teamApiaryData } = await supabase
        .from('team_apiaries')
        .select('apiary_id, apiaries(id, name)')
        .in('team_id', teamIds)

      if (teamApiaryData) {
        sharedApiaries = teamApiaryData
          .filter(ta => ta.apiaries)
          .map(ta => {
            const apiary = Array.isArray(ta.apiaries) ? ta.apiaries[0] : ta.apiaries
            return {
              id: apiary!.id,
              name: apiary!.name
            }
          })
      }
    }

    // Combine own and shared apiaries, removing duplicates
    const allApiaries = [...(ownApiaries || []), ...sharedApiaries]
    const uniqueApiaries = Array.from(
      new Map(allApiaries.map(a => [a.id, a])).values()
    ).sort((a, b) => a.name.localeCompare(b.name))

    setApiaries(uniqueApiaries)
  }, [userId])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
      fetchTreatments(id)
      fetchHives(id)
      fetchApiaries(id)
      fetchTreatmentProducts()
    }
    initUser()
  }, [router, fetchTreatments, fetchHives, fetchApiaries])

  // Close IPM tips popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showIPMTips && !target.closest('.ipm-tips-container')) {
        setShowIPMTips(false)
      }
    }

    if (showIPMTips) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showIPMTips])

  const fetchTreatmentProducts = async () => {
    const { data } = await supabase
      .from('varroa_treatment_products')
      .select('*')
      .order('product_name')

    if (data) setTreatmentProducts(data as VarroaTreatmentProduct[])
  }

  const fetchWeatherData = async (eircode: string) => {
    try {
      // Remove spaces and encode the Eircode for the URL
      const cleanedEircode = eircode.trim().replace(/\s+/g, '').toUpperCase()
      console.log('Original Eircode:', eircode, 'Cleaned:', cleanedEircode)

      // Set User-Agent header for Nominatim (OpenStreetMap geocoding)
      const headers = {
        'User-Agent': 'HiveCraic-Beekeeping-App/1.0'
      }

      // First, try searching with just the Eircode and Ireland
      console.log('Trying to geocode:', cleanedEircode)
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedEircode)},Ireland&format=json&limit=1`,
        { headers }
      )
      let geoData = await geocodeResponse.json()

      if (!geoData || geoData.length === 0) {
        console.log('Could not find coordinates for Eircode:', eircode)

        // Try alternative search
        const altGeoResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedEircode + ' Ireland')}&format=json&limit=1`,
          { headers }
        )
        geoData = await altGeoResponse.json()

        if (!geoData || geoData.length === 0) {
          console.log('Geocoding failed completely for:', eircode)
          // Fallback to Dublin city center coordinates if Eircode lookup fails
          geoData = [{ lat: '53.3498', lon: '-6.2603' }]
          console.log('Using Dublin fallback coordinates')
        }
      }

      const { lat, lon } = geoData[0]
      console.log('Coordinates found:', { lat, lon })

      // Fetch weather data from Open-Meteo API
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      )
      const weatherData = await weatherResponse.json()
      console.log('Weather data received:', weatherData)

      if (weatherData.current_weather) {
        const temp = Math.round(weatherData.current_weather.temperature)
        const windSpeed = Math.round(weatherData.current_weather.windspeed)
        const weatherCode = weatherData.current_weather.weathercode

        // Map weather codes to descriptions
        const weatherDescriptions: { [key: number]: string } = {
          0: 'Clear sky',
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
          80: 'Slight rain showers',
          81: 'Moderate rain showers',
          82: 'Violent rain showers',
          95: 'Thunderstorm',
        }

        const weatherDescription = weatherDescriptions[weatherCode] || 'Unknown'
        const weatherConditions = `${weatherDescription}, Wind: ${windSpeed} km/h`

        return {
          temperature: temp,
          weather_conditions: weatherConditions
        }
      }

      return null
    } catch (error) {
      console.error('Error fetching weather:', error)
      return null
    }
  }

  const handleHiveChange = async (hiveId: string) => {
    setFormData({ ...formData, hive_id: hiveId })

    // Find the selected hive and fetch weather data
    const selectedHive = hives.find(h => h.id === hiveId)
    if (selectedHive?.apiaries?.eircode) {
      console.log('Fetching weather for Eircode:', selectedHive.apiaries.eircode)
      const weatherData = await fetchWeatherData(selectedHive.apiaries.eircode)

      if (weatherData) {
        setFormData(prev => ({
          ...prev,
          hive_id: hiveId,
          temperature: weatherData.temperature,
          weather_conditions: weatherData.weather_conditions
        }))
      }
    } else {
      console.log('No Eircode found for this hive\'s apiary')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    console.log('Submitting varroa treatment with data:', formData)

    try {
      if (editingTreatment) {
        const { data, error } = await supabase
          .from('varroa_treatments')
          .update(formData)
          .eq('id', editingTreatment.id)
          .eq('user_id', userId)
          .select()

        console.log('Update response:', { data, error })
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('varroa_treatments')
          .insert([{ ...formData, user_id: userId }])
          .select()

        console.log('Insert response:', { data, error })
        if (error) throw error
      }

      fetchTreatments()
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        // Log detailed error for debugging
        interface PostgrestError {
          message: string
          hint?: string
          details?: string
          code?: string
        }
        const errorDetails = {
          message: error.message,
          hint: (error as PostgrestError).hint,
          details: (error as PostgrestError).details,
          code: (error as PostgrestError).code
        }
        console.log('Error saving varroa treatment:', errorDetails)

        // Show user-friendly message
        let errorMessage = error.message

        // Check for common RLS errors
        if (error.message.includes('row-level security')) {
          errorMessage = 'Security Error: Unable to save. Please ensure:\n1. The varroa_checks table exists\n2. RLS is properly configured\n3. Your hives have user_id set\n\nSee console for details.'
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          errorMessage = 'Database Error: The varroa_treatments table does not exist.\n\nPlease run: sql/create_varroa_tables.sql in Supabase'
        }

        alert(`Error: ${errorMessage}`)
      } else {
        console.log('Unknown error:', error)
        alert('An unknown error occurred while saving')
      }
    }
  }

  const handleEdit = (treatment: VarroaTreatment) => {
    setEditingTreatment(treatment)
    setFormData({
      hive_id: treatment.hive_id,
      treatment_date: treatment.treatment_date,
      treatment_type: treatment.treatment_type || '',
      product_name: treatment.product_name || '',
      dosage: treatment.dosage || '',
      temperature: treatment.temperature || null,
      weather_conditions: treatment.weather_conditions || '',
      notes: treatment.notes || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this treatment record?')) {
      const { error } = await supabase
        .from('varroa_treatments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (!error) fetchTreatments()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingTreatment(null)
    setUseManualTreatmentEntry(false)
    setFormData({
      hive_id: '',
      treatment_date: new Date().toISOString().split('T')[0],
      treatment_type: '',
      product_name: '',
      dosage: '',
      temperature: null,
      weather_conditions: '',
      notes: '',
    })
  }

  if (loading) return <LoadingSpinner text="Loading treatments..." />

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/inspections')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Varroa Treatments</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative ipm-tips-container">
            <button
              onClick={() => setShowIPMTips(!showIPMTips)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="IPM Tips"
            >
              <Info size={20} />
            </button>

            {showIPMTips && (
              <div className="absolute right-0 top-12 w-96 bg-white border-2 border-blue-200 rounded-lg shadow-xl z-50 p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-blue-900">Integrated Pest Management (IPM) Tips</h3>
                  <button
                    onClick={() => setShowIPMTips(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Rotate treatments annually to prevent resistance development.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Monitor mite levels regularly using sugar shake or alcohol wash.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Apply treatments according to label instructions and seasonal timing.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Ensure adequate colony ventilation during treatment.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Avoid treating during honey flow unless product is approved for use.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Combine chemical treatments with biotechnical methods (e.g., drone brood removal).</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Maintain strong, healthy colonies through good nutrition and disease management.</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterApiaryId}
              onChange={(e) => setFilterApiaryId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
            >
              <option value="">All Apiaries</option>
              {apiaries.map((apiary) => (
                <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 justify-center"
            >
              <Plus size={16} />
              {showForm ? 'Cancel' : 'Record Treatment'}
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingTreatment ? 'Edit Treatment' : 'Record New Treatment'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hive *</label>
              <select
                value={formData.hive_id}
                onChange={(e) => handleHiveChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select hive</option>
                {hives.map((h) => (
                  <option key={h.id} value={h.id}>{h.hive_number}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Date *</label>
              <input
                type="date"
                value={formData.treatment_date}
                onChange={(e) => setFormData({...formData, treatment_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Treatment Type *</label>
                <button
                  type="button"
                  onClick={() => {
                    setUseManualTreatmentEntry(!useManualTreatmentEntry)
                    setFormData({...formData, treatment_type: ''})
                  }}
                  className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 hover:border-blue-400 active:bg-blue-200 transition-colors"
                >
                  {useManualTreatmentEntry ? 'Select from list' : 'Enter manually'}
                </button>
              </div>

              {useManualTreatmentEntry ? (
                <input
                  type="text"
                  value={formData.treatment_type}
                  onChange={(e) => setFormData({...formData, treatment_type: e.target.value})}
                  placeholder="e.g., Custom Treatment Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              ) : (
                <select
                  value={formData.treatment_type}
                  onChange={(e) => setFormData({...formData, treatment_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">── Select Treatment ──</option>

                  {/* Group by active ingredient type */}
                  {treatmentProducts.filter(p => p.active_ingredients.toLowerCase().includes('thymol')).length > 0 && (
                    <>
                      <option disabled>─── Thymol Based ───</option>
                      {treatmentProducts
                        .filter(p => p.active_ingredients.toLowerCase().includes('thymol'))
                        .map((product) => (
                          <option
                            key={product.id}
                            value={`${product.product_name} - ${product.active_ingredients} - ${product.application_method}`}
                          >
                            &nbsp;&nbsp;{product.product_name} ({product.active_ingredients})
                          </option>
                        ))}
                    </>
                  )}

                  {treatmentProducts.filter(p => p.active_ingredients.toLowerCase().includes('formic acid')).length > 0 && (
                    <>
                      <option disabled>─── Formic Acid ───</option>
                      {treatmentProducts
                        .filter(p => p.active_ingredients.toLowerCase().includes('formic acid') && !p.active_ingredients.toLowerCase().includes('oxalic'))
                        .map((product) => (
                          <option
                            key={product.id}
                            value={`${product.product_name} - ${product.active_ingredients} - ${product.application_method}`}
                          >
                            &nbsp;&nbsp;{product.product_name} ({product.active_ingredients})
                          </option>
                        ))}
                    </>
                  )}

                  {treatmentProducts.filter(p => p.active_ingredients.toLowerCase().includes('oxalic acid')).length > 0 && (
                    <>
                      <option disabled>─── Oxalic Acid ───</option>
                      {treatmentProducts
                        .filter(p => p.active_ingredients.toLowerCase().includes('oxalic acid'))
                        .map((product) => (
                          <option
                            key={product.id}
                            value={`${product.product_name} - ${product.active_ingredients} - ${product.application_method}`}
                          >
                            &nbsp;&nbsp;{product.product_name} ({product.active_ingredients})
                          </option>
                        ))}
                    </>
                  )}

                  {treatmentProducts.filter(p =>
                    !p.active_ingredients.toLowerCase().includes('thymol') &&
                    !p.active_ingredients.toLowerCase().includes('formic acid') &&
                    !p.active_ingredients.toLowerCase().includes('oxalic acid')
                  ).length > 0 && (
                    <>
                      <option disabled>─── Other Treatments ───</option>
                      {treatmentProducts
                        .filter(p =>
                          !p.active_ingredients.toLowerCase().includes('thymol') &&
                          !p.active_ingredients.toLowerCase().includes('formic acid') &&
                          !p.active_ingredients.toLowerCase().includes('oxalic acid')
                        )
                        .map((product) => (
                          <option
                            key={product.id}
                            value={`${product.product_name} - ${product.active_ingredients} - ${product.application_method}`}
                          >
                            &nbsp;&nbsp;{product.product_name} ({product.active_ingredients})
                          </option>
                        ))}
                    </>
                  )}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
              <input
                type="text"
                value={formData.dosage}
                onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                placeholder="e.g., 2.5ml per hive"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
              <input
                type="number"
                value={formData.temperature || ''}
                onChange={(e) => setFormData({...formData, temperature: e.target.value ? parseFloat(e.target.value) : null})}
                placeholder="e.g., 15"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Weather Conditions</label>
              <input
                type="text"
                value={formData.weather_conditions}
                onChange={(e) => setFormData({...formData, weather_conditions: e.target.value})}
                placeholder="e.g., Sunny, calm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                placeholder="Additional observations, follow-up treatment dates, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                {editingTreatment ? 'Update' : 'Save'} Treatment
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {treatments
          .filter(treatment => !filterApiaryId || treatment.hives?.apiary_id === filterApiaryId)
          .map((treatment) => (
          <div key={treatment.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">Hive: {treatment.hives?.hive_number || 'Unknown'}</h3>
                <p className="text-sm text-gray-500">{treatment.treatment_date}</p>
                {treatment.profiles && (
                  <p className="text-xs text-gray-500 mt-1">
                    Recorded by: <span className="font-medium text-gray-700">
                      {treatment.profiles.full_name || treatment.profiles.email}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(treatment)} className="text-blue-600 hover:text-blue-900">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(treatment.id)} className="text-red-600 hover:text-red-900">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="font-medium text-gray-700">Treatment Type: </span>
                <span className="text-indigo-600 font-semibold">{treatment.treatment_type}</span>
              </div>
              {treatment.product_name && (
                <div>
                  <span className="font-medium text-gray-700">Product: </span>
                  <span>{treatment.product_name}</span>
                </div>
              )}
              {treatment.dosage && (
                <div>
                  <span className="font-medium text-gray-700">Dosage: </span>
                  <span>{treatment.dosage}</span>
                </div>
              )}
              {treatment.temperature !== null && (
                <div>
                  <span className="font-medium text-gray-700">Temperature: </span>
                  <span>{treatment.temperature}°C</span>
                </div>
              )}
              {treatment.weather_conditions && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Weather: </span>
                  <span>{treatment.weather_conditions}</span>
                </div>
              )}
            </div>

            {treatment.notes && (
              <div className="p-3 bg-blue-50 rounded">
                <span className="text-sm font-medium text-gray-700">Notes: </span>
                <span className="text-sm text-gray-600">{treatment.notes}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {treatments.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No varroa treatments recorded yet. Start tracking your mite treatments!
        </div>
      )}
    </div>
  )
}
