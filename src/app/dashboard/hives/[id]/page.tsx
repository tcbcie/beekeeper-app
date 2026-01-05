'use client'
import { useEffect, useState, useCallback } from 'react'
import { getCurrentUserId } from '@/lib/auth'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Bug, Syringe, Wheat, Droplet, ListTodo, Plus, CheckCircle2, Archive, ArchiveRestore, Scale } from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import HiveConfigurationHistory from '@/components/HiveConfigurationHistory'
import { RecordSection } from '@/components/hive/RecordSection'
import ScaleSensorDisplay from '@/components/hive/ScaleSensorDisplay'
import ScaleSelectionModal from '@/components/hive/ScaleSelectionModal'
import { useHiveDetail } from '@/hooks'
import { supabase } from '@/lib/supabase'
import type { Hive, HiveInspection, HiveVarroaCheck, HiveVarroaTreatment, HiveFeeding, HiveHarvest, InspectionAverages, HiveTask } from '@/types/hive'

export default function HiveDetailPage() {
  const params = useParams()
  const router = useRouter()
  const hiveId = params.id as string

  const {
    hive,
    inspections,
    varroaChecks,
    varroaTreatments,
    feedings,
    harvests,
    tasks,
    averages,
    loading,
    isOwner,
    fetchHiveData,
    handleCompleteTask,
    handleUnarchive,
  } = useHiveDetail(hiveId)

  // Scale selection state
  const [showScaleModal, setShowScaleModal] = useState(false)
  const [beepConnected, setBeepConnected] = useState(false)

  // Check if user has BEEP connected
  const checkBeepConnection = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('beep_api_token')
        .eq('id', session.user.id)
        .single()

      setBeepConnected(!!profile?.beep_api_token)
    } catch (error) {
      console.error('Error checking BEEP connection:', error)
    }
  }, [])

  const handleDeviceSelect = useCallback(async (deviceId: string | null, deviceName: string | null) => {
    const { error } = await supabase
      .from('hives')
      .update({
        beep_device_id: deviceId,
        beep_device_name: deviceName,
      })
      .eq('id', hiveId)

    if (error) throw error

    // Refresh hive data
    const id = await getCurrentUserId()
    if (id) fetchHiveData(id)
  }, [hiveId, fetchHiveData])

  useEffect(() => {
    checkBeepConnection()
  }, [checkBeepConnection])

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
        <div className="bg-red-900/50 border border-red-800 rounded-lg p-4 text-red-300">
          Hive not found
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-tertiary hover:text-foreground"
          >
            <ArrowLeft size={20} />
            Back to Hives
          </button>
          <Link
            href={`/dashboard/records?hive=${hiveId}`}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium flex items-center gap-2"
          >
            <Calendar size={18} />
            View Records
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Hive {hive.hive_number}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {hive.apiaries && (
            <p className="text-text-tertiary">📍 {hive.apiaries.name}</p>
          )}
          {hive.is_shared && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-medium rounded flex items-center gap-1 border border-blue-300 dark:border-blue-800">
              <span>👥</span>
              <span>Shared with SensibleTeam</span>
            </span>
          )}
          {!hive.is_shared && hive.shared_with_team && (
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs font-medium rounded flex items-center gap-1 border border-purple-300 dark:border-purple-800">
              <span>📤</span>
              <span>Shared with {hive.shared_with_team}</span>
            </span>
          )}
        </div>
      </div>

      {/* Hive Details Card */}
      <HiveInfoCard
        hive={hive}
        inspections={inspections}
        averages={averages}
        tasks={tasks}
        hiveId={hiveId}
        onCompleteTask={handleCompleteTask}
      />

      {/* Scale Data Card */}
      {beepConnected && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 mb-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Scale size={20} className="text-amber-600" />
              Hive Scale
            </h2>
            {isOwner && (
              <button
                onClick={() => setShowScaleModal(true)}
                className="px-3 py-1.5 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 font-medium"
              >
                {hive.beep_device_id ? 'Change Scale' : 'Connect Scale'}
              </button>
            )}
          </div>

          {hive.beep_device_id ? (
            <ScaleSensorDisplay
              deviceId={hive.beep_device_id}
              deviceName={hive.beep_device_name || undefined}
            />
          ) : (
            <div className="text-center py-6">
              <Scale size={32} className="mx-auto mb-2 text-text-tertiary" />
              <p className="text-text-secondary">No scale connected to this hive</p>
              {isOwner && (
                <button
                  onClick={() => setShowScaleModal(true)}
                  className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  Connect a scale from your BEEP account
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Scale Selection Modal */}
      {hive && (
        <ScaleSelectionModal
          isOpen={showScaleModal}
          onClose={() => setShowScaleModal(false)}
          hiveId={hiveId}
          hiveNumber={hive.hive_number}
          currentDeviceId={hive.beep_device_id || null}
          onDeviceSelect={handleDeviceSelect}
        />
      )}

      {/* Configuration History - Separate Card */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 mb-6 border border-border">
        <HiveConfigurationHistory hiveId={hiveId} />
      </div>

      {/* Quick Actions */}
      <QuickActionsGrid hiveId={hiveId} isOwner={isOwner} isArchived={!!hive.archived_at} onUnarchive={handleUnarchive} />

      {/* Records Sections */}
      <div className="space-y-6">
        <RecordSection<HiveInspection>
          title="Inspections"
          icon={Calendar}
          iconColor="text-blue-400"
          records={inspections}
          emptyMessage="No inspections recorded yet"
          renderRecord={(inspection) => (
            <div key={inspection.id} className="border border-border rounded-lg p-4 hover:bg-sage-50 dark:hover:bg-slate-800/50">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-foreground">
                  {new Date(inspection.inspection_date).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  {inspection.queen_seen && (
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded border border-green-800">👑 Queen Seen</span>
                  )}
                  {inspection.eggs_present && (
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded border border-blue-800">🥚 Eggs</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                {inspection.brood_frames !== null && (
                  <div className="text-text-tertiary">Brood Frames: <span className="font-medium text-text-primary">{inspection.brood_frames}</span></div>
                )}
                {inspection.brood_pattern_rating !== null && (
                  <div className="text-text-tertiary">Pattern: <span className="font-medium text-text-primary">{'⭐'.repeat(inspection.brood_pattern_rating)}</span></div>
                )}
                {inspection.temperament_rating !== null && (
                  <div className="text-text-tertiary">Temper: <span className="font-medium text-text-primary">{'⭐'.repeat(inspection.temperament_rating)}</span></div>
                )}
                {inspection.population_strength !== null && (
                  <div className="text-text-tertiary">Population: <span className="font-medium text-text-primary">{'⭐'.repeat(inspection.population_strength)}</span></div>
                )}
                {inspection.weight !== null && (
                  <div className="text-text-tertiary">Weight: <span className="font-medium text-text-primary">{inspection.weight} kg</span></div>
                )}
              </div>
              {inspection.notes && (
                <p className="text-sm text-text-secondary mt-2 bg-sage-50 dark:bg-slate-800 p-2 rounded">{inspection.notes}</p>
              )}
            </div>
          )}
        />

        <RecordSection<HiveVarroaCheck>
          title="Varroa Checks"
          icon={Bug}
          iconColor="text-purple-400"
          records={varroaChecks}
          emptyMessage="No varroa checks recorded yet"
          renderRecord={(check) => (
            <div key={check.id} className="border border-border rounded-lg p-4 hover:bg-sage-50 dark:hover:bg-slate-800/50">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-foreground">
                    {new Date(check.check_date).toLocaleDateString()}
                  </span>
                  {check.check_method && (
                    <span className="ml-3 text-sm text-text-tertiary">Method: {check.check_method}</span>
                  )}
                </div>
                {check.mite_count !== null && (
                  <span className={`px-3 py-1 rounded font-medium ${
                    check.mite_count > 10 ? 'bg-red-900/50 text-red-300 border border-red-800' :
                    check.mite_count > 5 ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-800' :
                    'bg-green-900/50 text-green-300 border border-green-800'
                  }`}>
                    {check.mite_count} mites
                  </span>
                )}
              </div>
              {check.notes && (
                <p className="text-sm text-text-secondary mt-2 bg-sage-50 dark:bg-slate-800 p-2 rounded">{check.notes}</p>
              )}
            </div>
          )}
        />

        <RecordSection<HiveVarroaTreatment>
          title="Varroa Treatments"
          icon={Syringe}
          iconColor="text-red-400"
          records={varroaTreatments}
          emptyMessage="No treatments recorded yet"
          renderRecord={(treatment) => (
            <div key={treatment.id} className="border border-border rounded-lg p-4 hover:bg-sage-50 dark:hover:bg-slate-800/50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                  <span className="font-medium text-foreground">
                    {new Date(treatment.treatment_date).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-medium text-red-400">{treatment.treatment_type}</span>
                </div>
                {treatment.dosage && (
                  <span className="text-sm text-text-tertiary">Dosage: {treatment.dosage}</span>
                )}
              </div>
              {treatment.notes && (
                <p className="text-sm text-text-secondary mt-2 bg-sage-50 dark:bg-slate-800 p-2 rounded">{treatment.notes}</p>
              )}
            </div>
          )}
        />

        <RecordSection<HiveFeeding>
          title="Feedings"
          icon={Wheat}
          iconColor="text-orange-400"
          records={feedings}
          emptyMessage="No feedings recorded yet"
          renderRecord={(feeding) => (
            <div key={feeding.id} className="border border-border rounded-lg p-4 hover:bg-sage-50 dark:hover:bg-slate-800/50">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-foreground">
                    {new Date(feeding.feed_date).toLocaleDateString()}
                  </span>
                  <span className="ml-3 text-sm font-medium text-orange-400">{feeding.feed_type}</span>
                </div>
                {feeding.amount !== null && (
                  <span className="text-sm text-text-tertiary">{feeding.amount} kg</span>
                )}
              </div>
              {feeding.notes && (
                <p className="text-sm text-text-secondary mt-2 bg-sage-50 dark:bg-slate-800 p-2 rounded">{feeding.notes}</p>
              )}
            </div>
          )}
        />

        <RecordSection<HiveHarvest>
          title="Harvests"
          icon={Droplet}
          iconColor="text-yellow-400"
          records={harvests}
          emptyMessage="No harvests recorded yet"
          renderRecord={(harvest) => (
            <div key={harvest.id} className="border border-border rounded-lg p-4 hover:bg-sage-50 dark:hover:bg-slate-800/50">
              <div className="flex justify-between items-start">
                <span className="font-medium text-foreground">
                  {new Date(harvest.harvest_date).toLocaleDateString()}
                </span>
                <div className="text-right">
                  {harvest.frames_harvested !== null && (
                    <div className="text-sm text-text-tertiary">{harvest.frames_harvested} frames</div>
                  )}
                  {harvest.honey_weight !== null && (
                    <div className="text-sm font-medium text-yellow-400">{harvest.honey_weight} kg</div>
                  )}
                </div>
              </div>
              {harvest.notes && (
                <p className="text-sm text-text-secondary mt-2 bg-sage-50 dark:bg-slate-800 p-2 rounded">{harvest.notes}</p>
              )}
            </div>
          )}
        />
      </div>
    </div>
  )
}

// Sub-components

interface HiveInfoCardProps {
  hive: Hive
  inspections: HiveInspection[]
  averages: InspectionAverages | null
  tasks: HiveTask[]
  hiveId: string
  onCompleteTask: (taskId: string) => void
}

function HiveInfoCard({ hive, inspections, averages, tasks, hiveId, onCompleteTask }: HiveInfoCardProps) {
  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 mb-6 border border-border">
      <h2 className="text-xl font-semibold mb-4 text-foreground">Hive Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Details */}
        <div>
          <h3 className="font-semibold text-text-tertiary mb-3 text-sm uppercase tracking-wide">Hive Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-text-tertiary">Status:</span>
              <span className={`font-medium px-2 py-1 rounded text-xs ${
                hive.status === 'active' ? 'bg-green-900/50 text-green-300 border border-green-800' :
                hive.status === 'queenless' ? 'bg-red-900/50 text-red-300 border border-red-800' :
                hive.status === 'archived' ? 'bg-sage-100 dark:bg-slate-700 text-text-primary' :
                'bg-sage-100 dark:bg-slate-700 text-text-primary'
              }`}>
                {hive.status}
              </span>
            </div>
            {hive.hive_type && (
              <div className="flex justify-between">
                <span className="text-text-tertiary">Type:</span>
                <span className="font-medium text-text-primary">{hive.hive_type}</span>
              </div>
            )}
            {hive.colony_established_date && (
              <div className="flex justify-between">
                <span className="text-text-tertiary">Colony Established:</span>
                <span className="font-medium text-xs text-text-primary">{new Date(hive.colony_established_date).toLocaleDateString()}</span>
              </div>
            )}
            {hive.configuration?.right_sized_broodbox && (
              <div className="flex justify-between">
                <span className="text-text-tertiary">Right-Sized Brood Area:</span>
                <span className="font-medium text-text-primary">
                  {(() => {
                    const lastInspectionWithFrames = inspections.find(i => i.right_sized_frames !== null && i.right_sized_frames > 0)
                    return lastInspectionWithFrames
                      ? `${lastInspectionWithFrames.right_sized_frames} frames`
                      : 'Yes'
                  })()}
                </span>
              </div>
            )}
            {hive.archived_at && (
              <div className="flex justify-between">
                <span className="text-text-tertiary">Archived:</span>
                <span className="font-medium text-xs text-text-primary">{new Date(hive.archived_at).toLocaleDateString()}</span>
              </div>
            )}
            {hive.archived_at && hive.archive_reason_value?.value && (
              <div className="flex justify-between">
                <span className="text-text-tertiary">Archive Reason:</span>
                <span className="font-medium text-xs text-text-primary">{hive.archive_reason_value.value}</span>
              </div>
            )}
            {hive.archived_at && hive.archive_notes && (
              <div className="pt-2">
                <span className="text-text-tertiary block mb-1 text-xs">Archive Notes:</span>
                <span className="text-text-secondary text-xs italic">{hive.archive_notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Queen Information */}
        <div>
          <h3 className="font-semibold text-text-tertiary mb-3 text-sm uppercase tracking-wide">Queen</h3>
          <div className="space-y-2 text-sm">
            {hive.queens ? (
              <>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Number:</span>
                  <Link
                    href={`/dashboard/queens?id=${hive.queens.id}`}
                    className="text-forest-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    {hive.queens.queen_number}
                  </Link>
                </div>
                {hive.queens.marking_color && (
                  <div className="flex justify-between items-center">
                    <span className="text-text-tertiary">Marked Colour:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      hive.queens.marking_color === 'White' ? 'bg-slate-100 dark:bg-slate-700 text-text-primary' :
                      hive.queens.marking_color === 'Yellow' ? 'bg-yellow-200 text-yellow-900' :
                      hive.queens.marking_color === 'Red' ? 'bg-red-200 text-red-900' :
                      hive.queens.marking_color === 'Green' ? 'bg-green-200 text-green-900' :
                      hive.queens.marking_color === 'Blue' ? 'bg-blue-200 text-blue-900' :
                      'bg-slate-100 dark:bg-slate-700 text-text-primary'
                    }`}>
                      {hive.queens.marking_color}
                    </span>
                  </div>
                )}
                {hive.queens.birth_date && (
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Birth Date:</span>
                    <span className="font-medium text-xs text-text-primary">{new Date(hive.queens.birth_date).toLocaleDateString()}</span>
                  </div>
                )}
                {hive.queen_installed_date && (
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Installed:</span>
                    <span className="font-medium text-xs text-text-primary">{new Date(hive.queen_installed_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Clipped:</span>
                  <span className="font-medium text-text-primary">{hive.queens.queen_clipped ? 'Yes' : 'No'}</span>
                </div>
              </>
            ) : (
              <>
                {hive.queen_marking_color && (
                  <div className="flex justify-between items-center">
                    <span className="text-text-tertiary">Marked Colour:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      hive.queen_marking_color === 'White' ? 'bg-slate-100 dark:bg-slate-700 text-text-primary' :
                      hive.queen_marking_color === 'Yellow' ? 'bg-yellow-200 text-yellow-900' :
                      hive.queen_marking_color === 'Red' ? 'bg-red-200 text-red-900' :
                      hive.queen_marking_color === 'Green' ? 'bg-green-200 text-green-900' :
                      hive.queen_marking_color === 'Blue' ? 'bg-blue-200 text-blue-900' :
                      'bg-slate-100 dark:bg-slate-700 text-text-primary'
                    }`}>
                      {hive.queen_marking_color}
                    </span>
                  </div>
                )}
                {hive.queen_installed_date && (
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Installed:</span>
                    <span className="font-medium text-xs text-text-primary">{new Date(hive.queen_installed_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Marked:</span>
                  <span className="font-medium text-text-primary">{hive.queen_marked ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Mated:</span>
                  <span className="font-medium text-text-primary">{hive.queen_mated ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Clipped:</span>
                  <span className="font-medium text-text-primary">{hive.queen_clipped ? 'Yes' : 'No'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Observations */}
        <div>
          <h3 className="font-semibold text-text-tertiary mb-3 text-sm uppercase tracking-wide">Recent Observations</h3>
          <div className="space-y-2 text-sm">
            {hive.queen_last_seen ? (
              <div className="flex justify-between">
                <span className="text-text-tertiary">Queen Last Seen:</span>
                <span className="font-medium text-xs text-text-primary">{new Date(hive.queen_last_seen).toLocaleDateString()}</span>
              </div>
            ) : (
              <div className="text-text-tertiary italic text-xs">Queen not seen yet</div>
            )}
            {hive.eggs_last_present ? (
              <div className="flex justify-between">
                <span className="text-text-tertiary">Eggs Last Present:</span>
                <span className="font-medium text-xs text-text-primary">{new Date(hive.eggs_last_present).toLocaleDateString()}</span>
              </div>
            ) : (
              <div className="text-text-tertiary italic text-xs">No eggs recorded yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Inspection Averages */}
      {averages && averages.inspection_count > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="font-semibold text-text-tertiary mb-3 text-sm uppercase tracking-wide">
            Inspection Averages ({averages.inspection_count} inspection{averages.inspection_count !== 1 ? 's' : ''})
          </h3>
          <div className="space-y-2 text-sm">
            {averages.brood_frames !== null && averages.brood_frames > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-text-tertiary">Frames with Brood:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{averages.brood_frames.toFixed(1)}</span>
              </div>
            )}
            {averages.brood_pattern !== null && averages.brood_pattern > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-text-tertiary">Brood Pattern:</span>
                <span className="font-medium text-purple-600 dark:text-purple-400">{'⭐'.repeat(Math.round(averages.brood_pattern))}</span>
              </div>
            )}
            {averages.temperament !== null && averages.temperament > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-text-tertiary">Temperament:</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">{'⭐'.repeat(Math.round(averages.temperament))}</span>
              </div>
            )}
            {averages.population !== null && averages.population > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-text-tertiary">Population:</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{'⭐'.repeat(Math.round(averages.population))}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Open Tasks */}
      {tasks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-tertiary text-sm uppercase tracking-wide flex items-center gap-2">
              <ListTodo size={16} />
              Open Tasks ({tasks.length})
            </h3>
            <Link
              href={`/dashboard/tasks?hive=${hiveId}`}
              className="text-xs text-forest-600 dark:text-emerald-400 hover:text-emerald-300"
            >
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {tasks.slice(0, 3).map(task => {
              const priorityColor =
                task.priority === 'urgent' ? 'border-red-500 bg-red-100 dark:bg-red-900/30' :
                task.priority === 'high' ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/30' :
                task.priority === 'normal' ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30' :
                'border-slate-500 bg-sage-100 dark:bg-slate-800'

              return (
                <div key={task.id} className={`border-l-4 ${priorityColor} p-3 rounded-r`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-text-tertiary mt-1 line-clamp-1">{task.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                        <Calendar size={12} />
                        <span>{new Date(task.start_date).toLocaleDateString()}</span>
                        {task.category && (
                          <span className="px-1.5 py-0.5 bg-sage-100 dark:bg-slate-700 rounded border border-border text-text-secondary">
                            {task.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        task.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800' :
                        task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800' :
                        task.priority === 'normal' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800' :
                        'bg-sage-100 dark:bg-slate-700 text-text-primary border border-border'
                      }`}>
                        {task.priority}
                      </span>
                      <button
                        onClick={() => onCompleteTask(task.id)}
                        className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 rounded transition-colors"
                        title="Mark as complete"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {hive.notes && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="font-semibold text-text-tertiary mb-2 text-sm uppercase tracking-wide">Notes</h3>
          <p className="text-sm text-text-secondary bg-sage-50 dark:bg-slate-800 p-3 rounded">{hive.notes}</p>
        </div>
      )}
    </div>
  )
}

interface QuickActionsGridProps {
  hiveId: string
  isOwner: boolean
  isArchived: boolean
  onUnarchive: () => void
}

function QuickActionsGrid({ hiveId, isOwner, isArchived, onUnarchive }: QuickActionsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
      <Link
        href={`/dashboard/records?hive=${hiveId}&type=inspection`}
        className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-center"
      >
        <Calendar className="mx-auto mb-2" size={24} />
        <div className="font-medium text-sm">New Inspection</div>
      </Link>
      <Link
        href={`/dashboard/records?hive=${hiveId}&type=varroa-check`}
        className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 text-center"
      >
        <Bug className="mx-auto mb-2" size={24} />
        <div className="font-medium text-sm">Varroa Check</div>
      </Link>
      <Link
        href={`/dashboard/records?hive=${hiveId}&type=varroa-treatment`}
        className="bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 text-center"
      >
        <Syringe className="mx-auto mb-2" size={24} />
        <div className="font-medium text-sm">Treatment</div>
      </Link>
      <Link
        href={`/dashboard/records?hive=${hiveId}&type=feeding`}
        className="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 text-center"
      >
        <Wheat className="mx-auto mb-2" size={24} />
        <div className="font-medium text-sm">Feeding</div>
      </Link>
      <Link
        href={`/dashboard/records?hive=${hiveId}&type=harvest`}
        className="bg-yellow-600 text-white p-4 rounded-lg hover:bg-yellow-700 text-center"
      >
        <Droplet className="mx-auto mb-2" size={24} />
        <div className="font-medium text-sm">Harvest</div>
      </Link>
      <Link
        href={`/dashboard/tasks?create=true&hive=${hiveId}`}
        className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 text-center"
      >
        <Plus className="mx-auto mb-2" size={24} />
        <div className="font-medium text-sm">Create Task</div>
      </Link>
      {isOwner && (
        <>
          {isArchived ? (
            <button
              onClick={onUnarchive}
              className="bg-emerald-600 text-white p-4 rounded-lg hover:bg-emerald-700 text-center border-2 border-emerald-400"
            >
              <ArchiveRestore className="mx-auto mb-2" size={24} />
              <div className="font-medium text-sm">Unarchive Hive</div>
            </button>
          ) : (
            <Link
              href={`/dashboard/records?hive=${hiveId}&type=archive`}
              className="bg-sage-200 dark:bg-slate-700 text-foreground p-4 rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 text-center border-2 border-border"
            >
              <Archive className="mx-auto mb-2" size={24} />
              <div className="font-medium text-sm">Archive Hive</div>
            </Link>
          )}
        </>
      )}
    </div>
  )
}
