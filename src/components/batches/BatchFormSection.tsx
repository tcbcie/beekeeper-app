'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import NotificationStatusCard from '@/components/NotificationStatusCard'
import BatchGraftsSection from '@/components/batches/BatchGraftsSection'
import { ChevronDown, ChevronUp, Loader2, MessageCircle, Mic, Minus, Plus, Square } from 'lucide-react'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import type { useRearingGroups } from '@/hooks/useRearingGroups'
import { getDayName, toLocalDateString } from '@/hooks/useBatchesList'
import type { Queen, Apiary, Hive, Batch, FormData } from '@/hooks/useBatchesList'

type RearingGroupLists = ReturnType<typeof useRearingGroups>

interface BatchFormSectionProps {
 userId: string | null
 queens: Queen[]
 apiaries: Apiary[]
 hives: Hive[]
 sealedCellCounts: Record<string, number>
 userHasActiveSubscription: boolean
 ownedRearingGroups: RearingGroupLists['ownedRearingGroups']
 memberRearingGroups: RearingGroupLists['memberRearingGroups']
 /** Batch being edited, or null when creating a new batch. */
 editingBatch: Batch | null
 /** Called after a successful save so the parent can refresh the list. */
 onSaved: () => void
 /** Called when the form closes (save, cancel, or failed edit load). */
 onClose: () => void
}

const stepperButtonClassName = 'w-10 h-10 shrink-0 border border-border bg-surface dark:bg-surface-elevated'
const stepperRowClassName = 'grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2'
const stepperInputClassName = 'w-full min-w-0 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground text-center'

const emptyFormData = (): FormData => ({
 batch_name: '',
 mother_queen_id: '',
 multiple_breeders: false,
 breeder_queen_ids: [],
 starter_apiary_id: '',
 starter_colony_hive_id: '',
 graft_date: toLocalDateString(new Date()),
 cell_count: '',
 frame_rows: '',
 cells_per_row: '',
 grafts_accepted: '',
 queens_hatched: '',
 queens_mated: '',
 acceptance_check_date: '',
 first_option_to_cage_date: '',
 second_option_to_cage_date: '',
 emergence_date: '',
 notes: '',
 mating_apiary_id: '',
 rearing_group_id: '',
 enable_browser_notifications: false,
 enable_email_digest: false,
 enable_batch_event_reminders: false,
 batch_reminder_minutes_before: '60',
})

/**
 * Create/edit batch form incl. voice notes and the grafts section for an
 * existing batch. Extracted verbatim from src/app/dashboard/batches/page.tsx
 * (Phase 6.5 decomposition).
 */
export default function BatchFormSection({ userId, queens, apiaries, hives, sealedCellCounts, userHasActiveSubscription, ownedRearingGroups, memberRearingGroups, editingBatch, onSaved, onClose }: BatchFormSectionProps) {
 const toast = useToast()
 const [formData, setFormData] = useState<FormData>(emptyFormData)
 const [filteredHives, setFilteredHives] = useState<Hive[]>([])
 const [quantitiesOpen, setQuantitiesOpen] = useState(true)
 const [notificationPrefsOpen, setNotificationPrefsOpen] = useState(false)
 const [editingBatchHasGrafts, setEditingBatchHasGrafts] = useState(false)
 const editFetchGenRef = useRef(0)

 const {
 isRecording: isVoiceRecording,
 isSupported: isVoiceSupported,
 error: voiceRecorderError,
 startRecording: startVoiceRecording,
 stopRecording: stopVoiceRecording,
 reset: resetVoiceRecorder
 } = useVoiceRecorder()
 const [voiceProcessing, setVoiceProcessing] = useState(false)
 const [voiceError, setVoiceError] = useState<string | null>(null)
 const voiceAbortRef = useRef<AbortController | null>(null)

 const allRearingGroups = [...ownedRearingGroups, ...memberRearingGroups]
 const isInRearingGroup = allRearingGroups.length > 0
 const isGroupBatch = formData.rearing_group_id !== ''

 // Abort any in-flight voice transcription on unmount
 useEffect(() => {
 return () => {
 voiceAbortRef.current?.abort()
 voiceAbortRef.current = null
 }
 }, [])

 // Populate the form when a batch is opened for editing. Loads the breeder
 // queen set and whether grafts already exist (locks the breeder inputs).
 // Stale-fetch guard: if the user clicks Edit on another batch before this
 // resolves, the result is discarded so the form never shows the wrong batch.
 useEffect(() => {
 if (!editingBatch) return
 const batch = editingBatch
 // Find the apiary_id from the hive if it exists
 const hive = hives.find(h => h.id === batch.starter_colony_hive_id)

 const gen = ++editFetchGenRef.current
 ;(async () => {
 let breederIds: string[] = []
 let hasGrafts = false
 try {
 const [breederRes, graftCountRes] = await Promise.all([
 supabase.from('batch_breeder_queens').select('queen_id').eq('batch_id', batch.id),
 supabase.from('batch_grafts').select('id', { count: 'exact', head: true }).eq('batch_id', batch.id),
 ])
 if (gen !== editFetchGenRef.current) return
 if (breederRes.error) throw breederRes.error
 if (graftCountRes.error) throw graftCountRes.error
 breederIds = (breederRes.data || []).map(r => r.queen_id as string)
 hasGrafts = (graftCountRes.count ?? 0) > 0
 } catch (err) {
 if (gen !== editFetchGenRef.current) return
 console.error('Error loading batch edit data:', err)
 toast.error('Failed to load batch data. Please try again.')
 onClose()
 return
 }
 setEditingBatchHasGrafts(hasGrafts)

 setFormData({
 batch_name: batch.batch_name,
 mother_queen_id: batch.mother_queen_id || '',
 multiple_breeders: breederIds.length > 0,
 breeder_queen_ids: breederIds,
 starter_apiary_id: hive?.apiary_id || '',
 starter_colony_hive_id: batch.starter_colony_hive_id || '',
 graft_date: batch.graft_date,
 cell_count: batch.cell_count?.toString() || '',
 frame_rows: batch.frame_rows?.toString() || '',
 cells_per_row: batch.cells_per_row?.toString() || '',
 grafts_accepted: batch.grafts_accepted?.toString() || '',
 queens_hatched: batch.queens_hatched?.toString() || '',
 queens_mated: batch.queens_mated?.toString() || '',
 acceptance_check_date: batch.acceptance_check_date || '',
 first_option_to_cage_date: batch.first_option_to_cage_date || '',
 second_option_to_cage_date: batch.second_option_to_cage_date || '',
 emergence_date: batch.emergence_date || '',
 notes: batch.notes || '',
 mating_apiary_id: batch.mating_apiary_id || '',
 rearing_group_id: batch.rearing_group_id || '',
 enable_browser_notifications: batch.enable_browser_notifications || false,
 enable_email_digest: batch.enable_email_digest || false,
 enable_batch_event_reminders: batch.enable_batch_event_reminders || false,
 batch_reminder_minutes_before: batch.batch_reminder_minutes_before?.toString() || '60',
 })
 setQuantitiesOpen(false)
 })()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [editingBatch])

 const resetForm = () => {
 setEditingBatchHasGrafts(false)
 voiceAbortRef.current?.abort()
 voiceAbortRef.current = null
 resetVoiceRecorder()
 setVoiceError(null)
 setVoiceProcessing(false)
 setFormData(emptyFormData())
 onClose()
 }

 useEffect(() => {
 if (formData.starter_apiary_id) {
 const filtered = hives.filter(h => h.apiary_id === formData.starter_apiary_id)
 setFilteredHives(filtered)
 } else {
 setFilteredHives([])
 }
 }, [formData.starter_apiary_id, hives])

 // Auto-calculate all timeline dates from graft_date
 useEffect(() => {
 if (!formData.graft_date) return

 const graft = new Date(formData.graft_date + 'T00:00:00')

 const addDays = (d: Date, days: number): string => {
 const result = new Date(d)
 result.setDate(result.getDate() + days)
 return toLocalDateString(result)
 }

 const acceptance = addDays(graft, 1)
 const firstCage = addDays(graft, 5)
 const secondCage = addDays(graft, 10)
 const emergence = addDays(graft, 12)

 // Only update if any date differs to prevent unnecessary re-renders
 if (
 formData.acceptance_check_date !== acceptance ||
 formData.first_option_to_cage_date !== firstCage ||
 formData.second_option_to_cage_date !== secondCage ||
 formData.emergence_date !== emergence
 ) {
 setFormData(prev => ({
 ...prev,
 acceptance_check_date: acceptance,
 first_option_to_cage_date: firstCage,
 second_option_to_cage_date: secondCage,
 emergence_date: emergence,
 }))
 }
 }, [formData.graft_date, formData.acceptance_check_date, formData.first_option_to_cage_date, formData.second_option_to_cage_date, formData.emergence_date])

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!userId) return

 if (isGroupBatch && !formData.mating_apiary_id) {
 toast.error('Mating Location (Apiary) is required for group batches.')
 return
 }

 // Multi-breeder intent + empty selection: don't silently save a no-breeder batch.
 if (formData.multiple_breeders && formData.breeder_queen_ids.length === 0) {
 toast.error('Select at least one breeder queen, or uncheck "Graft from multiple breeder queens".')
 return
 }

 // Batch-name uniqueness: solo batches unique per user, group batches unique within
 // the group (both case-insensitive). DB has matching partial unique indexes — this
 // pre-check just turns the violation into a friendly toast before the round trip.
 try {
 const groupIdForScope = formData.rearing_group_id || null
 // Escape LIKE wildcards so '%' or '_' in a name are matched literally.
 const escapedName = formData.batch_name.replace(/([\\%_])/g, '\\$1')
 let dupQuery = supabase
 .from('rearing_batches')
 .select('id', { count: 'exact', head: true })
 .ilike('batch_name', escapedName)
 if (groupIdForScope) {
 dupQuery = dupQuery.eq('rearing_group_id', groupIdForScope)
 } else {
 dupQuery = dupQuery.is('rearing_group_id', null).eq('user_id', userId)
 }
 if (editingBatch) {
 dupQuery = dupQuery.neq('id', editingBatch.id)
 }
 const { count: dupCount, error: dupErr } = await dupQuery
 if (dupErr) throw dupErr
 if ((dupCount ?? 0) > 0) {
 toast.error(
 groupIdForScope
 ? `A batch named "${formData.batch_name}" already exists in this rearing group. Choose a different name.`
 : `You already have a batch named "${formData.batch_name}". Choose a different name.`
 )
 return
 }
 } catch (preCheckError) {
 console.error('Batch-name uniqueness pre-check failed:', preCheckError)
 // Fall through to the insert/update — the DB unique index is the authoritative check.
 }

 try {
 const isMulti = formData.multiple_breeders && formData.breeder_queen_ids.length > 0
 const dataToSubmit = {
 batch_name: formData.batch_name,
 mother_queen_id: isMulti ? null : (formData.mother_queen_id || null),
 starter_colony_hive_id: formData.starter_colony_hive_id || null,
 graft_date: formData.graft_date,
 cell_count: formData.cell_count ? parseInt(formData.cell_count, 10) || null : null,
 frame_rows: formData.frame_rows ? parseInt(formData.frame_rows, 10) || null : null,
 cells_per_row: formData.cells_per_row ? parseInt(formData.cells_per_row, 10) || null : null,
 grafts_accepted: formData.grafts_accepted ? parseInt(formData.grafts_accepted, 10) || null : null,
 queens_hatched: formData.queens_hatched ? parseInt(formData.queens_hatched, 10) || null : null,
 queens_mated: formData.queens_mated ? parseInt(formData.queens_mated, 10) || null : null,
 acceptance_check_date: formData.acceptance_check_date || null,
 first_option_to_cage_date: formData.first_option_to_cage_date || null,
 second_option_to_cage_date: formData.second_option_to_cage_date || null,
 emergence_date: formData.emergence_date || null,
 notes: formData.notes || null,
 mating_apiary_id: formData.mating_apiary_id || null,
 rearing_group_id: formData.rearing_group_id || null,
 enable_browser_notifications: formData.enable_browser_notifications,
 enable_email_digest: formData.enable_email_digest,
 enable_batch_event_reminders: formData.enable_batch_event_reminders,
 batch_reminder_minutes_before: formData.batch_reminder_minutes_before ? parseInt(formData.batch_reminder_minutes_before, 10) || 60 : 60,
 }

 let batchId: string
 if (editingBatch) {
 const { error } = await supabase
 .from('rearing_batches')
 .update(dataToSubmit)
 .eq('id', editingBatch.id)
 .eq('user_id', userId)

 if (error) throw error
 batchId = editingBatch.id
 } else {
 const { data: inserted, error } = await supabase
 .from('rearing_batches')
 .insert([{ ...dataToSubmit, user_id: userId }])
 .select('id')
 .single()

 if (error) throw error
 if (!inserted?.id) throw new Error('Batch was created but no id was returned')
 batchId = inserted.id
 }

 // Breeder-queen junction: only writable while no grafts exist (UI locks the inputs;
 // we skip the write when locked rather than letting a stray submit clear the set).
 // Uses an RPC so DELETE+INSERT happen in one transaction — see audit C1.
 if (!(editingBatch && editingBatchHasGrafts)) {
 const { error: rpcErr } = await supabase.rpc('replace_batch_breeder_queens', {
 p_batch_id: batchId,
 p_breeder_queen_ids: isMulti ? formData.breeder_queen_ids : [],
 })
 if (rpcErr) throw rpcErr
 }

 onSaved()
 resetForm()
 } catch (error) {
 // Surfaces from Supabase carry the Postgres SQLSTATE in `code`. 23505 =
 // unique_violation. Our only unique constraints on rearing_batches besides
 // the primary key are the two batch_name partial indexes, so any 23505 here
 // means the user's chosen name collides with an existing batch in scope.
 const pgError = error as { code?: string; message?: string }
 if (pgError?.code === '23505') {
 toast.error(
 formData.rearing_group_id
 ? `A batch named "${formData.batch_name}" already exists in this rearing group. Choose a different name.`
 : `You already have a batch named "${formData.batch_name}". Choose a different name.`
 )
 } else {
 const errorMessage = error instanceof Error ? error.message : 'An error occurred'
 toast.error(errorMessage)
 }
 }
 }

 const appendVoiceTranscript = useCallback((cleaned: string) => {
 if (!cleaned) return
 setFormData(prev => {
 const existing = (prev.notes || '').trimEnd()
 const merged = existing ? `${existing}\n\n${cleaned}` : cleaned
 return { ...prev, notes: merged }
 })
 }, [])

 const handleToggleVoice = useCallback(async () => {
 if (voiceProcessing) return
 if (isVoiceRecording) {
 const blob = await stopVoiceRecording()
 if (!blob) {
 setVoiceError('Recording was empty. Please try again.')
 return
 }
 voiceAbortRef.current?.abort()
 const controller = new AbortController()
 voiceAbortRef.current = controller
 setVoiceProcessing(true)
 setVoiceError(null)
 try {
 const { data: { session } } = await supabase.auth.getSession()
 const token = session?.access_token
 if (!token) {
 setVoiceError('You need to be signed in to transcribe voice notes.')
 return
 }
 const fd = new FormData()
 const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'
 fd.append('audio', blob, `voice-note.${ext}`)
 const res = await fetch('/api/voice-notes-transcribe', {
 method: 'POST',
 headers: { Authorization: `Bearer ${token}` },
 body: fd,
 signal: controller.signal
 })
 if (!res.ok) {
 const body = await res.json().catch(() => ({})) as { error?: string; code?: string }
 if (controller.signal.aborted) return
 if (body.code === 'SUBSCRIPTION_REQUIRED') {
 setVoiceError('An active subscription is required to use voice notes.')
 } else {
 setVoiceError(body.error || 'Could not transcribe the recording.')
 }
 return
 }
 const { cleaned } = await res.json() as { transcript: string; cleaned: string }
 if (controller.signal.aborted) return
 if (!cleaned) {
 setVoiceError('Nothing was transcribed. Please try recording again.')
 return
 }
 appendVoiceTranscript(cleaned)
 } catch (err) {
 if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) {
 return
 }
 console.error('Voice transcription failed:', err)
 setVoiceError('Could not transcribe the recording. Please try again.')
 } finally {
 if (voiceAbortRef.current === controller) {
 voiceAbortRef.current = null
 }
 if (!controller.signal.aborted) {
 setVoiceProcessing(false)
 }
 }
 } else {
 setVoiceError(null)
 await startVoiceRecording()
 }
 }, [appendVoiceTranscript, isVoiceRecording, startVoiceRecording, stopVoiceRecording, voiceProcessing])

 return (
 <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-4 sm:p-6 border border-border overflow-hidden">
 <h3 className="text-xl font-semibold mb-4 text-foreground">
 {editingBatch ? 'Edit Batch' : 'Create New Batch'}
 </h3>
 <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Batch Name *</label>
 <input
 type="text"
 value={formData.batch_name}
 onChange={(e) => setFormData({...formData, batch_name: e.target.value})}
 placeholder="e.g., Spring 2024 - Batch 1"
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
 required
 />
 </div>

 <div>
 <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
 <label className="block text-sm font-medium text-text-secondary">Breeder Queen</label>
 <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
 <input
 type="checkbox"
 checked={formData.multiple_breeders}
 disabled={!!editingBatch && editingBatchHasGrafts}
 onChange={(e) => {
 const checked = e.target.checked
 setFormData(prev => ({
 ...prev,
 multiple_breeders: checked,
 mother_queen_id: checked ? '' : prev.mother_queen_id,
 breeder_queen_ids: checked ? prev.breeder_queen_ids : [],
 }))
 }}
 className="h-4 w-4"
 />
 <span>Graft from multiple breeder queens</span>
 </label>
 </div>
 {!formData.multiple_breeders ? (
 <select
 value={formData.mother_queen_id}
 onChange={(e) => setFormData({...formData, mother_queen_id: e.target.value})}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
 >
 <option value="">Select breeder queen (optional)</option>
 {queens.map((q: Queen) => {
 const hive = q.hives && q.hives.length > 0 ? q.hives[0] : null
 const apiary = hive?.apiaries?.name || ''
 const hiveNumber = hive?.hive_number || ''
 const location = apiary && hiveNumber ? ` (${apiary} - ${hiveNumber})` : ''
 return (
 <option key={q.id} value={q.id}>
 {q.queen_number}{location}
 </option>
 )
 })}
 </select>
 ) : (
 <div className="border border-border rounded-md max-h-48 overflow-y-auto bg-surface dark:bg-surface">
 {queens.length === 0 ? (
 <p className="text-sm text-text-tertiary p-3">No active queens available</p>
 ) : (
 queens.map((q: Queen) => {
 const hive = q.hives && q.hives.length > 0 ? q.hives[0] : null
 const apiary = hive?.apiaries?.name || ''
 const hiveNumber = hive?.hive_number || ''
 const location = apiary && hiveNumber ? ` (${apiary} - ${hiveNumber})` : ''
 const isSelected = formData.breeder_queen_ids.includes(q.id)
 const locked = !!editingBatch && editingBatchHasGrafts
 return (
 <label key={q.id} className={`flex items-center gap-2 px-3 py-2 border-b border-border last:border-b-0 ${locked ? 'opacity-60' : 'cursor-pointer hover:bg-surface-elevated'}`}>
 <input
 type="checkbox"
 checked={isSelected}
 disabled={locked}
 onChange={(e) => {
 const checked = e.target.checked
 setFormData(prev => ({
 ...prev,
 breeder_queen_ids: checked
 ? [...prev.breeder_queen_ids, q.id]
 : prev.breeder_queen_ids.filter(id => id !== q.id),
 }))
 }}
 className="h-4 w-4"
 />
 <span className="text-foreground">{q.queen_number}{location}</span>
 </label>
 )
 })
 )}
 </div>
 )}
 {!!editingBatch && editingBatchHasGrafts && (
 <p className="text-sm text-text-tertiary mt-1">Cell records exist — breeder queens are locked. Edit per-cell on the frame.</p>
 )}
 </div>

 {/* Timeline Dates - Grouped */}
 <div className="md:col-span-2 bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
 <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3">Timeline</h4>
 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Graft Date *
 </label>
 <input
 type="date"
 value={formData.graft_date}
 onChange={(e) => setFormData({...formData, graft_date: e.target.value})}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
 required
 />
 {formData.graft_date && <p className="text-sm text-text-tertiary mt-1">{getDayName(formData.graft_date)}</p>}
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Acceptance Check</label>
 <input
 type="date"
 value={formData.acceptance_check_date}
 onChange={(e) => setFormData({...formData, acceptance_check_date: e.target.value})}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
 />
 <p className="text-sm text-text-tertiary mt-1">Graft + 1 day{formData.acceptance_check_date ? ` · ${getDayName(formData.acceptance_check_date)}` : ''}</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">1st Option to Cage</label>
 <input
 type="date"
 value={formData.first_option_to_cage_date}
 onChange={(e) => setFormData({...formData, first_option_to_cage_date: e.target.value})}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
 />
 <p className="text-sm text-text-tertiary mt-1">Graft + 5 days{formData.first_option_to_cage_date ? ` · ${getDayName(formData.first_option_to_cage_date)}` : ''}</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">2nd Option to Cage</label>
 <input
 type="date"
 value={formData.second_option_to_cage_date}
 onChange={(e) => setFormData({...formData, second_option_to_cage_date: e.target.value})}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
 />
 <p className="text-sm text-text-tertiary mt-1">Graft + 10 days{formData.second_option_to_cage_date ? ` · ${getDayName(formData.second_option_to_cage_date)}` : ''}</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Expected Hatch
 <div className="group relative inline-block ml-1 align-middle">
 <MessageCircle size={14} className="text-purple-600 dark:text-purple-300 cursor-help" />
 <div className="invisible group-hover:visible absolute right-0 top-6 w-64 p-2 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded shadow-lg z-10">
 Assuming the larvae are approximately four days after the egg was laid, they should all be of the same age and ideally no more than 12 hours old at the time of grafting.
 </div>
 </div>
 </label>
 <input
 type="date"
 value={formData.emergence_date}
 onChange={(e) => setFormData({...formData, emergence_date: e.target.value})}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
 />
 <p className="text-sm text-text-tertiary mt-1">Graft + 12 days{formData.emergence_date ? ` · ${getDayName(formData.emergence_date)}` : ''}</p>
 </div>
 </div>
 </div>

 {/* Starter Colony Selection - Grouped */}
 <div className="md:col-span-2 bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
 <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-3">Starter Colony</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Apiary</label>
 <select
 value={formData.starter_apiary_id}
 onChange={(e) => {
 setFormData({...formData, starter_apiary_id: e.target.value, starter_colony_hive_id: ''})
 }}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
 >
 <option value="">Select apiary (optional)</option>
 {apiaries.map((apiary) => (
 <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Hive</label>
 <select
 value={formData.starter_colony_hive_id}
 onChange={(e) => setFormData({...formData, starter_colony_hive_id: e.target.value})}
 className="w-full fj-control disabled:bg-surface-secondary disabled:cursor-not-allowed"
 disabled={!formData.starter_apiary_id}
 >
 <option value="">Select hive (optional)</option>
 {filteredHives.map((hive) => (
 <option key={hive.id} value={hive.id}>{hive.hive_number}</option>
 ))}
 </select>
 {!formData.starter_apiary_id && (
 <p className="text-sm text-text-tertiary mt-1">Select an apiary first</p>
 )}
 </div>
 </div>
 </div>

 {/* Rearing Group Toggle */}
 {isInRearingGroup && (
 <div className="md:col-span-2 bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-sm font-semibold text-foreground">Group Batch</h4>
 <p className="text-sm text-text-tertiary">Link this batch to a rearing group</p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={isGroupBatch}
 onChange={(e) => {
 if (e.target.checked) {
 // Default to first group
 setFormData({...formData, rearing_group_id: allRearingGroups[0]?.id || ''})
 } else {
 setFormData({...formData, rearing_group_id: '', mating_apiary_id: ''})
 }
 }}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-surface-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
 </label>
 </div>

 {/* Group Selector - only if 2+ groups */}
 {isGroupBatch && allRearingGroups.length > 1 && (
 <div className="mt-3">
 <label className="block text-sm font-medium text-text-secondary mb-1">Rearing Group</label>
 <select
 value={formData.rearing_group_id}
 onChange={(e) => setFormData({...formData, rearing_group_id: e.target.value})}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
 >
 {allRearingGroups.map((group) => (
 <option key={group.id} value={group.id}>{group.name}</option>
 ))}
 </select>
 </div>
 )}
 </div>
 )}

 {/* Mating Location (Apiary) - shown when group batch toggle is ON, or always if not in any group */}
 {(isGroupBatch || !isInRearingGroup) && (
 <div className="md:col-span-2 bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
 <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">Mating Location (Apiary)</h4>
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Apiary</label>
 <select
 value={formData.mating_apiary_id}
 onChange={(e) => setFormData({...formData, mating_apiary_id: e.target.value})}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
 >
 <option value="">{isGroupBatch ? 'Select mating location (required)' : 'Select mating location (optional)'}</option>
 {apiaries.map((apiary) => (
 <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
 ))}
 </select>
 <p className="text-sm text-text-tertiary mt-1">If your mating location (apiary) is not listed, please set one up in the Apiary section.</p>
 <p className="text-sm text-text-tertiary mt-1">This is the intended mating location and will be used as the default for the NIHBS report unless the location is overwritten by the location at the time of distribution.</p>
 </div>
 </div>
 )}

 {/* Batch Quantities - Grouped Vertically */}
 <div className="md:col-span-2 bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border overflow-hidden">
 <div className="flex items-center justify-between">
 <h4 className="text-sm font-semibold text-foreground">Batch Quantities</h4>
 <button type="button" onClick={() => setQuantitiesOpen(!quantitiesOpen)} className="flex items-center gap-1 px-2 py-1.5 text-sm text-text-tertiary hover:text-foreground rounded">
 {quantitiesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
 {quantitiesOpen ? 'Hide' : 'Show'}
 </button>
 </div>
 {quantitiesOpen && <div className="space-y-3 mt-3">
 {/* Frame Layout: Rows × Cells per Row */}
 <div className="p-3 rounded-lg border-2 border-amber-600 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 space-y-3">
 <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Grafting Frame Layout</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Rows</label>
 <div className={stepperRowClassName}>
 <IconButton
 type="button"
 onClick={() => {
 const val = parseInt(formData.frame_rows || '0')
 if (val > 0) {
 const newRows = (val - 1).toString()
 const total = (val - 1) * (parseInt(formData.cells_per_row || '0'))
 setFormData({...formData, frame_rows: newRows, cell_count: total > 0 ? total.toString() : ''})
 }
 }}
 className={stepperButtonClassName}
 aria-label="Decrease frame rows"
 >
 <Minus size={16} />
 </IconButton>
 <input
 type="number"
 value={formData.frame_rows}
 onChange={(e) => {
 const rows = Math.max(0, parseInt(e.target.value) || 0)
 const cols = Math.max(0, parseInt(formData.cells_per_row) || 0)
 const total = rows * cols
 setFormData({...formData, frame_rows: rows.toString(), cell_count: total > 0 ? total.toString() : ''})
 }}
 className={stepperInputClassName}
 min="0"
 placeholder="0"
 />
 <IconButton
 type="button"
 onClick={() => {
 const val = parseInt(formData.frame_rows || '0')
 const newRows = (val + 1).toString()
 const total = (val + 1) * (parseInt(formData.cells_per_row || '0'))
 setFormData({...formData, frame_rows: newRows, cell_count: total > 0 ? total.toString() : ''})
 }}
 className={stepperButtonClassName}
 aria-label="Increase frame rows"
 >
 <Plus size={16} />
 </IconButton>
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Cells per Row</label>
 <div className={stepperRowClassName}>
 <IconButton
 type="button"
 onClick={() => {
 const val = parseInt(formData.cells_per_row || '0')
 if (val > 0) {
 const newCols = (val - 1).toString()
 const total = (parseInt(formData.frame_rows || '0')) * (val - 1)
 setFormData({...formData, cells_per_row: newCols, cell_count: total > 0 ? total.toString() : ''})
 }
 }}
 className={stepperButtonClassName}
 aria-label="Decrease cells per row"
 >
 <Minus size={16} />
 </IconButton>
 <input
 type="number"
 value={formData.cells_per_row}
 onChange={(e) => {
 const cols = Math.max(0, parseInt(e.target.value) || 0)
 const rows = Math.max(0, parseInt(formData.frame_rows) || 0)
 const total = rows * cols
 setFormData({...formData, cells_per_row: cols.toString(), cell_count: total > 0 ? total.toString() : ''})
 }}
 className={stepperInputClassName}
 min="0"
 placeholder="0"
 />
 <IconButton
 type="button"
 onClick={() => {
 const val = parseInt(formData.cells_per_row || '0')
 const newCols = (val + 1).toString()
 const total = (parseInt(formData.frame_rows || '0')) * (val + 1)
 setFormData({...formData, cells_per_row: newCols, cell_count: total > 0 ? total.toString() : ''})
 }}
 className={stepperButtonClassName}
 aria-label="Increase cells per row"
 >
 <Plus size={16} />
 </IconButton>
 </div>
 </div>
 </div>
 {/* Total Grafts (auto-calculated but editable) */}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Total Grafts</label>
 <div className={stepperRowClassName}>
 <IconButton
 type="button"
 onClick={() => {
 const val = parseInt(formData.cell_count || '0')
 if (val > 0) setFormData({...formData, cell_count: (val - 1).toString()})
 }}
 className={stepperButtonClassName}
 aria-label="Decrease total grafts"
 >
 <Minus size={16} />
 </IconButton>
 <input
 type="number"
 value={formData.cell_count}
 onChange={(e) => setFormData({...formData, cell_count: e.target.value})}
 className={stepperInputClassName}
 min="0"
 placeholder="0"
 />
 <IconButton
 type="button"
 onClick={() => {
 const val = parseInt(formData.cell_count || '0')
 setFormData({...formData, cell_count: (val + 1).toString()})
 }}
 className={stepperButtonClassName}
 aria-label="Increase total grafts"
 >
 <Plus size={16} />
 </IconButton>
 </div>
 </div>
 </div>

 {/* Grafts Accepted */}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Grafts Accepted</label>
 <div className={stepperRowClassName}>
 <IconButton
 type="button"
 onClick={() => {
 const val = parseInt(formData.grafts_accepted || '0')
 if (val > 0) setFormData({...formData, grafts_accepted: (val - 1).toString()})
 }}
 className={stepperButtonClassName}
 aria-label="Decrease grafts accepted"
 >
 <Minus size={16} />
 </IconButton>
 <input
 type="number"
 value={formData.grafts_accepted}
 onChange={(e) => setFormData({...formData, grafts_accepted: e.target.value})}
 className={stepperInputClassName}
 min="0"
 placeholder="0"
 />
 <IconButton
 type="button"
 onClick={() => {
 const val = parseInt(formData.grafts_accepted || '0')
 setFormData({...formData, grafts_accepted: (val + 1).toString()})
 }}
 className={stepperButtonClassName}
 aria-label="Increase grafts accepted"
 >
 <Plus size={16} />
 </IconButton>
 </div>
 </div>

 {/* Queens Hatched */}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Queens Hatched</label>
 <div className={stepperRowClassName}>
 <IconButton
 type="button"
 onClick={() => {
 const val = parseInt(formData.queens_hatched || '0')
 if (val > 0) setFormData({...formData, queens_hatched: (val - 1).toString()})
 }}
 className={stepperButtonClassName}
 aria-label="Decrease queens hatched"
 >
 <Minus size={16} />
 </IconButton>
 <input
 type="number"
 value={formData.queens_hatched}
 onChange={(e) => setFormData({...formData, queens_hatched: e.target.value})}
 className={stepperInputClassName}
 min="0"
 placeholder="0"
 />
 <IconButton
 type="button"
 onClick={() => {
 const val = parseInt(formData.queens_hatched || '0')
 setFormData({...formData, queens_hatched: (val + 1).toString()})
 }}
 className={stepperButtonClassName}
 aria-label="Increase queens hatched"
 >
 <Plus size={16} />
 </IconButton>
 </div>
 </div>

 {/* Queens Mated */}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Queens Mated</label>
 <div className={stepperRowClassName}>
 <IconButton
 type="button"
 onClick={() => {
 const val = parseInt(formData.queens_mated || '0')
 if (val > 0) setFormData({...formData, queens_mated: (val - 1).toString()})
 }}
 className={stepperButtonClassName}
 aria-label="Decrease queens mated"
 >
 <Minus size={16} />
 </IconButton>
 <input
 type="number"
 value={formData.queens_mated}
 onChange={(e) => setFormData({...formData, queens_mated: e.target.value})}
 className={stepperInputClassName}
 min="0"
 placeholder="0"
 />
 <IconButton
 type="button"
 onClick={() => {
 const val = parseInt(formData.queens_mated || '0')
 setFormData({...formData, queens_mated: (val + 1).toString()})
 }}
 className={stepperButtonClassName}
 aria-label="Increase queens mated"
 >
 <Plus size={16} />
 </IconButton>
 </div>
 </div>

 {/* Sealed Cells Distributed - read-only */}
 {editingBatch && sealedCellCounts[editingBatch.id] > 0 && (
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Sealed Cells Distributed</label>
 <div className="text-sm text-foreground font-medium">{sealedCellCounts[editingBatch.id]}</div>
 <p className="text-sm text-text-tertiary italic mt-1">Excluded from NIHBS report hatched/mated counts</p>
 </div>
 )}
 </div>
 }
 </div>

 {/* Individual Grafts Section - Only show when editing existing batch */}
 {editingBatch && userId && (
 <div className="md:col-span-2 rounded-xl border border-border bg-surface-secondary/70 p-4 shadow-sm dark:bg-surface/40">
 <BatchGraftsSection
 batchId={editingBatch.id}
 userId={userId}
 cellCount={formData.cell_count ? parseInt(formData.cell_count) : null}
 frameRows={formData.frame_rows ? parseInt(formData.frame_rows) : null}
 cellsPerRow={formData.cells_per_row ? parseInt(formData.cells_per_row) : null}
 groupId={editingBatch.rearing_group_id}
 emergenceDate={editingBatch.emergence_date}
 graftDate={formData.graft_date || null}
 matingApiaryName={apiaries.find(a => a.id === formData.mating_apiary_id)?.name || null}
 onCountsChange={(counts) => setFormData(prev => ({
 ...prev,
 grafts_accepted: counts.grafts_accepted.toString(),
 queens_hatched: counts.queens_hatched.toString(),
 queens_mated: counts.queens_mated.toString(),
 }))}
 />
 </div>
 )}

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({...formData, notes: e.target.value})}
 rows={3}
 placeholder="Weather conditions, acceptance rate, observations..."
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
 />
 {userHasActiveSubscription && isVoiceSupported && (
 <div className="mt-2 flex flex-col gap-2">
 <Button
 unstyled
 type="button"
 onClick={handleToggleVoice}
 disabled={voiceProcessing}
 aria-label={isVoiceRecording ? 'Stop voice recording' : 'Record voice note'}
 className={`inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-white font-medium transition-all touch-manipulation disabled:cursor-not-allowed ${
 voiceProcessing
 ? 'bg-purple-400 dark:bg-purple-500'
 : isVoiceRecording
 ? 'bg-red-600 hover:bg-red-700 animate-pulse'
 : 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600'
 }`}
 >
 {voiceProcessing ? (
 <>
 <Loader2 size={18} className="animate-spin" />
 <span>Transcribing...</span>
 </>
 ) : isVoiceRecording ? (
 <>
 <Square size={18} />
 <span>Stop recording</span>
 </>
 ) : (
 <>
 <Mic size={18} />
 <span>Record voice note</span>
 </>
 )}
 </Button>
 {(voiceError || voiceRecorderError) && (
 <p className="text-sm text-red-600 dark:text-red-400">
 {voiceError || voiceRecorderError}
 </p>
 )}
 </div>
 )}
 </div>

 {/* Notification Preferences - Grouped */}
 <div className="md:col-span-2 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
 <div className="flex items-center justify-between">
 <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Notification Preferences</h4>
 <button
 type="button"
 onClick={() => setNotificationPrefsOpen(!notificationPrefsOpen)}
 className="flex items-center gap-1 px-2 py-1.5 text-sm text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-amber-100 rounded"
 aria-expanded={notificationPrefsOpen}
 >
 {notificationPrefsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
 {notificationPrefsOpen ? 'Hide' : 'Show'}
 </button>
 </div>

 {notificationPrefsOpen && (
 <>
 {/* Notification Status Card */}
 <div className="mt-3 mb-4">
 <NotificationStatusCard />
 </div>

 <div className="space-y-3">
 <div className="flex items-center">
 <input
 type="checkbox"
 id="browser-notifications"
 checked={formData.enable_browser_notifications}
 onChange={(e) => setFormData({...formData, enable_browser_notifications: e.target.checked})}
 className="w-4 h-4 text-blue-600 border-border rounded focus:ring-blue-500"
 />
 <label htmlFor="browser-notifications" className="ml-2 text-sm text-amber-900 dark:text-amber-200">
 Send Browser Notifications for This Batch
 <span className="block text-sm text-amber-700 dark:text-amber-300 mt-0.5">
 Get notified on the day of important dates (acceptance check, cage dates, hatch date)
 </span>
 </label>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="email-digest"
 checked={formData.enable_email_digest}
 onChange={(e) => setFormData({...formData, enable_email_digest: e.target.checked})}
 className="w-4 h-4 text-blue-600 border-border rounded focus:ring-blue-500"
 />
 <label htmlFor="email-digest" className="ml-2 text-sm text-amber-900 dark:text-amber-200">
 Include This Batch in Weekly Email Digest
 <span className="block text-sm text-amber-700 dark:text-amber-300 mt-0.5">
 Receive a weekly summary of upcoming dates for this batch
 </span>
 </label>
 </div>

 <div className="space-y-2">
 <div className="flex items-center">
 <input
 type="checkbox"
 id="batch-event-reminders"
 checked={formData.enable_batch_event_reminders}
 onChange={(e) => setFormData({...formData, enable_batch_event_reminders: e.target.checked})}
 className="w-4 h-4 text-blue-600 border-border rounded focus:ring-blue-500"
 />
 <label htmlFor="batch-event-reminders" className="ml-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
 Enable Email Reminders for Batch Events
 <span className="block text-sm font-normal text-amber-700 dark:text-amber-300 mt-0.5">
 Send individual email reminders for all auto-created batch events (acceptance check, cage dates, emergence)
 </span>
 </label>
 </div>

 {formData.enable_batch_event_reminders && (
 <div className="ml-6 flex items-center gap-2">
 <label htmlFor="batch-reminder-minutes" className="text-sm text-amber-900 dark:text-amber-200">
 Remind me (minutes before):
 </label>
 <input
 type="number"
 id="batch-reminder-minutes"
 value={formData.batch_reminder_minutes_before}
 onChange={(e) => setFormData({...formData, batch_reminder_minutes_before: e.target.value})}
 min="0"
 step="15"
 className="w-24 px-3 py-1 border border-border rounded-lg bg-surface-elevated text-foreground"
 />
 </div>
 )}
 </div>
 </div>
 </>
 )}
 </div>

 <div className="md:col-span-2 flex gap-3">
 <Button type="submit" tone="blue">
 {editingBatch ? 'Update' : 'Create'} Batch
 </Button>
 <Button type="button" onClick={resetForm} tone="neutral">
 Cancel
 </Button>
 </div>
 </form>
 </div>
 )
}
