'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Bug, Syringe, Wheat, Droplet } from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface HiveConfiguration {
  brood_boxes?: number
  brood_boxes_full?: number
  brood_boxes_half?: number
  honey_supers?: number
  queen_excluder?: boolean
  feeder?: boolean
  feeder_type?: string
  entrance_reducer?: boolean
  varroa_mesh_floor?: string
  right_sized_broodbox?: boolean
}

interface Hive {
  id: string
  hive_number: string
  apiary_id: string | null
  queen_id: string | null
  queen_marked: boolean
  queen_marking_color: string | null
  queen_mated: boolean
  queen_clipped: boolean
  status: string
  notes: string | null
  colony_established_date: string | null
  queen_installed_date: string | null
  hive_type: string | null
  configuration: HiveConfiguration | null
  apiaries?: {
    name: string
  }
  queens?: {
    id: string
    queen_number: string
  }
}

interface InspectionAverages {
  brood_frames: number | null
  right_sized_frames: number | null
  brood_pattern: number | null
  temperament: number | null
  population: number | null
  inspection_count: number
}

interface Inspection {
  id: string
  inspection_date: string
  hive_id: string
  brood_frames: number | null
  right_sized_frames: number | null
  brood_pattern_rating: number | null
  temperament_rating: number | null
  population_strength: number | null
  queen_seen: boolean
  eggs_present: boolean
  notes: string | null
  weight: number | null
}

interface VarroaCheck {
  id: string
  check_date: string
  hive_id: string
  mite_count: number | null
  check_method: string | null
  notes: string | null
}

interface VarroaTreatment {
  id: string
  treatment_date: string
  hive_id: string
  treatment_type: string
  dosage: string | null
  notes: string | null
}

interface Feeding {
  id: string
  feeding_date: string
  hive_id: string
  feed_type: string
  amount: number | null
  notes: string | null
}

interface Harvest {
  id: string
  harvest_date: string
  hive_id: string
  frames_harvested: number | null
  honey_weight: number | null
  notes: string | null
}

export default function HiveDetailPage() {
  const params = useParams()
  const router = useRouter()
  const hiveId = params.id as string

  const [hive, setHive] = useState<Hive | null>(null)
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [varroaChecks, setVarroaChecks] = useState<VarroaCheck[]>([])
  const [varroaTreatments, setVarroaTreatments] = useState<VarroaTreatment[]>([])
  const [feedings, setFeedings] = useState<Feeding[]>([])
  const [harvests, setHarvests] = useState<Harvest[]>([])
  const [averages, setAverages] = useState<InspectionAverages | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchHiveData = useCallback(async (currentUserId: string) => {
    setLoading(true)
    try {
      // Fetch hive details
      const { data: hiveData, error: hiveError } = await supabase
        .from('hives')
        .select(`
          *,
          apiaries(name)
        `)
        .eq('id', hiveId)
        .single()

      if (hiveError) throw hiveError

      // Fetch queen separately if needed
      if (hiveData.queen_id) {
        const { data: queenData } = await supabase
          .from('queens')
          .select('id, queen_number')
          .eq('id', hiveData.queen_id)
          .single()

        if (queenData) {
          hiveData.queens = queenData
        }
      }

      setHive(hiveData)

      // Fetch all records for this hive
      const [
        { data: inspectionsData },
        { data: varroaChecksData },
        { data: varroaTreatmentsData },
        { data: feedingsData },
        { data: harvestsData }
      ] = await Promise.all([
        supabase
          .from('inspections')
          .select('*')
          .eq('hive_id', hiveId)
          .eq('user_id', currentUserId)
          .order('inspection_date', { ascending: false }),
        supabase
          .from('varroa_checks')
          .select('*')
          .eq('hive_id', hiveId)
          .eq('user_id', currentUserId)
          .order('check_date', { ascending: false }),
        supabase
          .from('varroa_treatments')
          .select('*')
          .eq('hive_id', hiveId)
          .eq('user_id', currentUserId)
          .order('treatment_date', { ascending: false }),
        supabase
          .from('feedings')
          .select('*')
          .eq('hive_id', hiveId)
          .eq('user_id', currentUserId)
          .order('feeding_date', { ascending: false }),
        supabase
          .from('harvests')
          .select('*')
          .eq('hive_id', hiveId)
          .eq('user_id', currentUserId)
          .order('harvest_date', { ascending: false })
      ])

      setInspections(inspectionsData || [])
      setVarroaChecks(varroaChecksData || [])
      setVarroaTreatments(varroaTreatmentsData || [])
      setFeedings(feedingsData || [])
      setHarvests(harvestsData || [])

      // Calculate inspection averages
      if (inspectionsData && inspectionsData.length > 0) {
        const broodFrames = inspectionsData.filter(i => i.brood_frames !== null && i.brood_frames > 0).map(i => i.brood_frames!)
        const rightSizedFrames = inspectionsData.filter(i => i.right_sized_frames !== null && i.right_sized_frames > 0).map(i => i.right_sized_frames!)
        const broodPatterns = inspectionsData.filter(i => i.brood_pattern_rating !== null && i.brood_pattern_rating > 0).map(i => i.brood_pattern_rating!)
        const temperaments = inspectionsData.filter(i => i.temperament_rating !== null && i.temperament_rating > 0).map(i => i.temperament_rating!)
        const populations = inspectionsData.filter(i => i.population_strength !== null && i.population_strength > 0).map(i => i.population_strength!)

        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null

        const inspectionsWithData = new Set<string>()
        inspectionsData.forEach(inspection => {
          if ((inspection.brood_frames !== null && inspection.brood_frames > 0) ||
              (inspection.right_sized_frames !== null && inspection.right_sized_frames > 0) ||
              (inspection.brood_pattern_rating !== null && inspection.brood_pattern_rating > 0) ||
              (inspection.temperament_rating !== null && inspection.temperament_rating > 0) ||
              (inspection.population_strength !== null && inspection.population_strength > 0)) {
            inspectionsWithData.add(inspection.inspection_date)
          }
        })

        setAverages({
          brood_frames: avg(broodFrames),
          right_sized_frames: avg(rightSizedFrames),
          brood_pattern: avg(broodPatterns),
          temperament: avg(temperaments),
          population: avg(populations),
          inspection_count: inspectionsWithData.size,
        })
      } else {
        setAverages(null)
      }
    } catch (error) {
      console.error('Error fetching hive data:', error)
      alert('Failed to load hive data')
    } finally {
      setLoading(false)
    }
  }, [hiveId])

  useEffect(() => {
    const initAuth = async () => {
      const id = await getCurrentUserId()
      if (id) {
        fetchHiveData(id)
      }
    }
    initAuth()
  }, [fetchHiveData])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!hive) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Hive not found
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Hives
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Hive {hive.hive_number}</h1>
        {hive.apiaries && (
          <p className="text-gray-600 mt-1">📍 {hive.apiaries.name}</p>
        )}
      </div>

      {/* Hive Details Card */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Hive Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium px-2 py-1 rounded ${
                  hive.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {hive.status}
                </span>
              </div>
              {hive.hive_type && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{hive.hive_type}</span>
                </div>
              )}
              {hive.colony_established_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Colony Established:</span>
                  <span className="font-medium">{new Date(hive.colony_established_date).toLocaleDateString()}</span>
                </div>
              )}
              {hive.queen_installed_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Queen Installed:</span>
                  <span className="font-medium">{new Date(hive.queen_installed_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Queen</h3>
            <div className="space-y-2 text-sm">
              {hive.queens ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Queen Number:</span>
                  <Link
                    href={`/dashboard/queens?id=${hive.queens.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {hive.queens.queen_number}
                  </Link>
                </div>
              ) : (
                <div className="text-gray-500">No queen assigned</div>
              )}
              {hive.queen_marking_color && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Mark Color:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    hive.queen_marking_color === 'White' ? 'bg-gray-200 text-gray-800' :
                    hive.queen_marking_color === 'Yellow' ? 'bg-yellow-200 text-yellow-900' :
                    hive.queen_marking_color === 'Red' ? 'bg-red-200 text-red-900' :
                    hive.queen_marking_color === 'Green' ? 'bg-green-200 text-green-900' :
                    hive.queen_marking_color === 'Blue' ? 'bg-blue-200 text-blue-900' :
                    'bg-gray-200 text-gray-800'
                  }`}>
                    {hive.queen_marking_color}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Queen Marked:</span>
                <span className="font-medium">{hive.queen_marked ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Queen Mated:</span>
                <span className="font-medium">{hive.queen_mated ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Queen Clipped:</span>
                <span className="font-medium">{hive.queen_clipped ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>

        {hive.configuration && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-700 mb-3">Hive Configuration</h3>
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-1 w-48">
                {/* Honey Supers */}
                {Array.from({ length: hive.configuration.honey_supers || 0 }).map((_, i) => (
                  <div key={`super-${i}`} className="w-full h-8 bg-yellow-300 border-2 border-yellow-500 rounded flex items-center justify-center text-xs font-semibold">
                    🍯 Super {i + 1}
                  </div>
                ))}

                {/* Queen Excluder */}
                {hive.configuration.queen_excluder && (
                  <div className="w-full h-3 bg-gray-400 border-2 border-gray-600 rounded flex items-center justify-center text-xs font-bold">
                    ═══
                  </div>
                )}

                {/* Half-Size Brood Boxes */}
                {Array.from({ length: hive.configuration.brood_boxes_half || 0 }).map((_, i) => (
                  <div key={`brood-half-${i}`} className="w-full h-8 bg-amber-300 border-2 border-amber-600 rounded flex items-center justify-center text-xs font-semibold">
                    🐝 Brood Half {i + 1}
                  </div>
                ))}

                {/* Full-Size Brood Boxes */}
                {Array.from({ length: hive.configuration.brood_boxes_full || hive.configuration.brood_boxes || 0 }).map((_, i) => (
                  <div key={`brood-full-${i}`} className="w-full h-10 bg-amber-200 border-2 border-amber-500 rounded flex items-center justify-center text-xs font-semibold">
                    🐝 Brood Full {i + 1}
                  </div>
                ))}

                {/* Varroa Mesh Floor */}
                <div className={`w-full h-6 ${hive.configuration.varroa_mesh_floor === 'open' ? 'bg-gray-200' : 'bg-amber-700'} border-2 border-amber-900 rounded flex items-center justify-center text-xs font-semibold`}>
                  {hive.configuration.varroa_mesh_floor === 'open' ? '▒▒▒' : '███'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
              {hive.configuration.feeder_type && (
                <div className="bg-amber-50 p-2 rounded text-center">
                  <span className="text-amber-800 font-medium capitalize">{hive.configuration.feeder_type} Feeder</span>
                </div>
              )}
              {hive.configuration.entrance_reducer && (
                <div className="bg-amber-50 p-2 rounded text-center">
                  <span className="text-amber-800 font-medium">Entrance Reducer</span>
                </div>
              )}
            </div>
          </div>
        )}

        {hive.notes && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{hive.notes}</p>
          </div>
        )}

        {/* Inspection Averages */}
        {averages && averages.inspection_count > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-700 mb-3">Inspection Averages ({averages.inspection_count} inspection{averages.inspection_count !== 1 ? 's' : ''})</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              {averages.brood_frames !== null && (
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-xs text-blue-600 mb-1">Frames with Brood</div>
                  <div className="text-lg font-semibold text-blue-900">{averages.brood_frames.toFixed(1)}</div>
                </div>
              )}
              {averages.right_sized_frames !== null && hive.configuration?.right_sized_broodbox && (
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-xs text-green-600 mb-1">Right-Sized Frames</div>
                  <div className="text-lg font-semibold text-green-900">{averages.right_sized_frames.toFixed(1)}</div>
                </div>
              )}
              {averages.brood_pattern !== null && (
                <div className="bg-purple-50 p-3 rounded">
                  <div className="text-xs text-purple-600 mb-1">Brood Pattern</div>
                  <div className="text-lg font-semibold text-purple-900">{'⭐'.repeat(Math.round(averages.brood_pattern))}</div>
                </div>
              )}
              {averages.temperament !== null && (
                <div className="bg-amber-50 p-3 rounded">
                  <div className="text-xs text-amber-600 mb-1">Temperament</div>
                  <div className="text-lg font-semibold text-amber-900">{'⭐'.repeat(Math.round(averages.temperament))}</div>
                </div>
              )}
              {averages.population !== null && (
                <div className="bg-orange-50 p-3 rounded">
                  <div className="text-xs text-orange-600 mb-1">Population</div>
                  <div className="text-lg font-semibold text-orange-900">{'⭐'.repeat(Math.round(averages.population))}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Link
          href={`/dashboard/records?hive=${hiveId}&type=inspection`}
          className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-center"
        >
          <Calendar className="mx-auto mb-2" size={24} />
          <div className="font-medium">New Inspection</div>
        </Link>
        <Link
          href={`/dashboard/records?hive=${hiveId}&type=varroa-check`}
          className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 text-center"
        >
          <Bug className="mx-auto mb-2" size={24} />
          <div className="font-medium">New Varroa Check</div>
        </Link>
        <Link
          href={`/dashboard/records?hive=${hiveId}&type=varroa-treatment`}
          className="bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 text-center"
        >
          <Syringe className="mx-auto mb-2" size={24} />
          <div className="font-medium">New Treatment</div>
        </Link>
        <Link
          href={`/dashboard/records?hive=${hiveId}&type=feeding`}
          className="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 text-center"
        >
          <Wheat className="mx-auto mb-2" size={24} />
          <div className="font-medium">New Feeding</div>
        </Link>
        <Link
          href={`/dashboard/records?hive=${hiveId}&type=harvest`}
          className="bg-yellow-600 text-white p-4 rounded-lg hover:bg-yellow-700 text-center"
        >
          <Droplet className="mx-auto mb-2" size={24} />
          <div className="font-medium">New Harvest</div>
        </Link>
      </div>

      {/* Records Sections */}
      <div className="space-y-6">
        {/* Inspections */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar size={24} className="text-blue-600" />
            Inspections ({inspections.length})
          </h2>
          {inspections.length > 0 ? (
            <div className="space-y-3">
              {inspections.map((inspection) => (
                <div key={inspection.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-900">
                      {new Date(inspection.inspection_date).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      {inspection.queen_seen && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">👑 Queen Seen</span>
                      )}
                      {inspection.eggs_present && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">🥚 Eggs</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                    {inspection.brood_frames !== null && (
                      <div className="text-gray-600">Brood Frames: <span className="font-medium">{inspection.brood_frames}</span></div>
                    )}
                    {inspection.brood_pattern_rating !== null && (
                      <div className="text-gray-600">Pattern: <span className="font-medium">{'⭐'.repeat(inspection.brood_pattern_rating)}</span></div>
                    )}
                    {inspection.temperament_rating !== null && (
                      <div className="text-gray-600">Temper: <span className="font-medium">{'⭐'.repeat(inspection.temperament_rating)}</span></div>
                    )}
                    {inspection.population_strength !== null && (
                      <div className="text-gray-600">Population: <span className="font-medium">{'⭐'.repeat(inspection.population_strength)}</span></div>
                    )}
                    {inspection.weight !== null && (
                      <div className="text-gray-600">Weight: <span className="font-medium">{inspection.weight} kg</span></div>
                    )}
                  </div>
                  {inspection.notes && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{inspection.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No inspections recorded yet</p>
          )}
        </div>

        {/* Varroa Checks */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bug size={24} className="text-purple-600" />
            Varroa Checks ({varroaChecks.length})
          </h2>
          {varroaChecks.length > 0 ? (
            <div className="space-y-3">
              {varroaChecks.map((check) => (
                <div key={check.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-gray-900">
                        {new Date(check.check_date).toLocaleDateString()}
                      </span>
                      {check.check_method && (
                        <span className="ml-3 text-sm text-gray-600">Method: {check.check_method}</span>
                      )}
                    </div>
                    {check.mite_count !== null && (
                      <span className={`px-3 py-1 rounded font-medium ${
                        check.mite_count > 10 ? 'bg-red-100 text-red-800' :
                        check.mite_count > 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {check.mite_count} mites
                      </span>
                    )}
                  </div>
                  {check.notes && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{check.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No varroa checks recorded yet</p>
          )}
        </div>

        {/* Varroa Treatments */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Syringe size={24} className="text-red-600" />
            Varroa Treatments ({varroaTreatments.length})
          </h2>
          {varroaTreatments.length > 0 ? (
            <div className="space-y-3">
              {varroaTreatments.map((treatment) => (
                <div key={treatment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-gray-900">
                        {new Date(treatment.treatment_date).toLocaleDateString()}
                      </span>
                      <span className="ml-3 text-sm font-medium text-red-700">{treatment.treatment_type}</span>
                    </div>
                    {treatment.dosage && (
                      <span className="text-sm text-gray-600">Dosage: {treatment.dosage}</span>
                    )}
                  </div>
                  {treatment.notes && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{treatment.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No treatments recorded yet</p>
          )}
        </div>

        {/* Feedings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Wheat size={24} className="text-orange-600" />
            Feedings ({feedings.length})
          </h2>
          {feedings.length > 0 ? (
            <div className="space-y-3">
              {feedings.map((feeding) => (
                <div key={feeding.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-gray-900">
                        {new Date(feeding.feeding_date).toLocaleDateString()}
                      </span>
                      <span className="ml-3 text-sm font-medium text-orange-700">{feeding.feed_type}</span>
                    </div>
                    {feeding.amount !== null && (
                      <span className="text-sm text-gray-600">{feeding.amount} kg</span>
                    )}
                  </div>
                  {feeding.notes && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{feeding.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No feedings recorded yet</p>
          )}
        </div>

        {/* Harvests */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Droplet size={24} className="text-yellow-600" />
            Harvests ({harvests.length})
          </h2>
          {harvests.length > 0 ? (
            <div className="space-y-3">
              {harvests.map((harvest) => (
                <div key={harvest.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-gray-900">
                      {new Date(harvest.harvest_date).toLocaleDateString()}
                    </span>
                    <div className="text-right">
                      {harvest.frames_harvested !== null && (
                        <div className="text-sm text-gray-600">{harvest.frames_harvested} frames</div>
                      )}
                      {harvest.honey_weight !== null && (
                        <div className="text-sm font-medium text-yellow-700">{harvest.honey_weight} kg</div>
                      )}
                    </div>
                  </div>
                  {harvest.notes && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{harvest.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No harvests recorded yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
