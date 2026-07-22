'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import { Hive, HiveFormData } from '@/types/hive'
import { QUEENLESS_REASONS, mapReasonToQueenStatus } from '@/lib/queenless'
import { HiveListApiary, HiveListQueen } from '@/hooks/useHivesList'

interface HiveFormSectionProps {
 userId: string | null
 apiaries: HiveListApiary[]
 queens: HiveListQueen[]
 /** Hive being edited, or null when adding a new hive. */
 editingHive: Hive | null
 /** Called after a successful save so the parent can refresh its list. */
 onSaved: () => void
 /** Called when the form closes (save or cancel). */
 onClose: () => void
}

const emptyFormData = (): HiveFormData => ({
 hive_number: '',
 apiary_id: '',
 order_in_apiary: null,
 row_in_apiary: null,
 order_direction: 'entrances',
 queen_id: '',
 queen_marked: false,
 queen_marking_color: '',
 queen_mated: false,
 queen_clipped: false,
 is_queenless: false,
 queenless_reason: '',
 status: 'active',
 notes: '',
 colony_established_date: new Date().toISOString().split('T')[0],
 queen_installed_date: new Date().toISOString().split('T')[0],
 hive_type: '',
 configuration: {
 brood_boxes: 1, // Legacy field
 brood_boxes_full: 1,
 brood_boxes_half: 0,
 frames_per_full_box: 10,
 frames_per_half_box: 10,
 honey_supers: 0,
 queen_excluder: false,
 feeder: false,
 feeder_type: '',
 entrance_reducer: false,
 varroa_mesh_floor: 'closed',
 right_sized_broodbox: false,
 frame_orientation: null,
 hive_size: 'full' as 'full' | 'nuc',
 },

})

const formDataFromHive = (hive: Hive): HiveFormData => ({
 hive_number: hive.hive_number,
 apiary_id: hive.apiary_id || '',
 order_in_apiary: hive.order_in_apiary ?? null,
 row_in_apiary: hive.row_in_apiary ?? null,
 order_direction: hive.order_direction || 'entrances',
 queen_id: hive.queen_id || '',
 queen_marked: hive.queen_marked || false,
 queen_marking_color: hive.queen_marking_color || '',
 queen_mated: hive.queen_mated || false,
 queen_clipped: hive.queen_clipped || false,
 is_queenless: hive.is_queenless || false,
 queenless_reason: hive.queenless_reason || '',
 status: hive.status,
 notes: hive.notes || '',
 colony_established_date: hive.colony_established_date || '',
 queen_installed_date: hive.queen_installed_date || '',
 hive_type: hive.hive_type || '',
 configuration: {
 brood_boxes: hive.configuration?.brood_boxes || 1, // Legacy field
 brood_boxes_full: hive.configuration?.brood_boxes_full ?? (hive.configuration?.brood_boxes || 1),
 brood_boxes_half: hive.configuration?.brood_boxes_half ?? 0,
 frames_per_full_box: hive.configuration?.frames_per_full_box ?? 10,
 frames_per_half_box: hive.configuration?.frames_per_half_box ?? 10,
 honey_supers: hive.configuration?.honey_supers || 0,
 queen_excluder: hive.configuration?.queen_excluder || false,
 feeder: hive.configuration?.feeder || false,
 feeder_type: hive.configuration?.feeder_type || '',
 entrance_reducer: hive.configuration?.entrance_reducer || false,
 varroa_mesh_floor: hive.configuration?.varroa_mesh_floor || 'closed',
 right_sized_broodbox: hive.configuration?.right_sized_broodbox || false,
 frame_orientation: hive.configuration?.frame_orientation || null,
 hive_size: (hive.configuration?.hive_size as 'full' | 'nuc') || 'full',
 },
})

/**
 * Inline add/edit hive form. Extracted verbatim from
 * src/app/dashboard/hives/page.tsx (Phase 6.3 decomposition); owns its form
 * state and the multi-step save (validation RPC, insert/update, history
 * seed, queenless queen-status sync).
 */
export default function HiveFormSection({ userId, apiaries, queens, editingHive, onSaved, onClose }: HiveFormSectionProps) {
 const toast = useToast()
 const [formData, setFormData] = useState<HiveFormData>(() =>
 editingHive ? formDataFromHive(editingHive) : emptyFormData()
 )

 // Re-populate when switching between add and edit (or editing another hive)
 useEffect(() => {
 setFormData(editingHive ? formDataFromHive(editingHive) : emptyFormData())
 }, [editingHive])

 const resetForm = () => {
 setFormData(emptyFormData())
 onClose()
 }

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!userId) return

 // Validate: hive number must not be blank once trimmed (the input's
 // `required` attribute still accepts whitespace-only values).
 const trimmedHiveNumber = formData.hive_number.trim()
 if (!trimmedHiveNumber) {
 toast.warning('Please enter a hive number.')
 return
 }

 // Validate: queenless requires a reason
 if (formData.is_queenless && !formData.queenless_reason) {
 toast.warning('Please select a reason for the queenless status before saving.')
 return
 }

 // The queen the workflow needs to "send off" on this save. We only do
 // the queen-status update when we are TRANSITIONING into queenless on
 // this save — re-editing an already-queenless hive (queen_id was cleared
 // on the previous save) must not re-touch the queen.
 const queenIdToReassign =
 formData.is_queenless && !editingHive?.is_queenless
 ? (editingHive?.queen_id || formData.queen_id || null)
 : null

 try {
 type HiveSubmitData = Omit<typeof formData, 'apiary_id' | 'queen_id' | 'queenless_reason'> & {
 apiary_id: string | null
 queen_id: string | null
 queenless_reason: string | null
 configuration_changed_at?: string
 configuration_changed_by?: string
 }

 let dataToSubmit: HiveSubmitData = {
 ...formData,
 // Trim so stray whitespace never reaches the DB (labels, history
 // snapshots and duplicate checks all compare on the exact string).
 hive_number: trimmedHiveNumber,
 apiary_id: formData.apiary_id || null,
 // When queenless, the hive has no current queen — clear the link.
 queen_id: formData.is_queenless ? null : (formData.queen_id || null),
 // Reason only persists when queenless; null it out otherwise so the
 // column never carries a stale value from a prior queenless period.
 queenless_reason: formData.is_queenless ? formData.queenless_reason : null,
 }

 // Check if configuration has changed (for existing hives)
 if (editingHive) {
 const configChanged = JSON.stringify(editingHive.configuration) !== JSON.stringify(formData.configuration)

 if (configChanged) {
 dataToSubmit = {
 ...dataToSubmit,
 configuration_changed_at: new Date().toISOString(),
 configuration_changed_by: userId,
 }
 }
 } else {
 // New hive - set initial configuration tracking
 dataToSubmit = {
 ...dataToSubmit,
 configuration_changed_at: new Date().toISOString(),
 configuration_changed_by: userId,
 }
 }

 // Validate queen assignment: check if queen is already assigned to another active hive (including shared hives)
 // Use RPC function to bypass RLS and check ALL hives in the system
 if (dataToSubmit.queen_id) {
 const { data: assignedHive, error: checkError } = await supabase
 .rpc('check_queen_assignment', {
 p_queen_id: dataToSubmit.queen_id,
 p_exclude_hive_id: editingHive?.id || null
 })

 if (checkError) {
 console.error('Queen assignment check error:', checkError)
 throw new Error('Failed to validate queen assignment')
 }

 // If the function returns a row, the queen is already assigned
 if (assignedHive && assignedHive.length > 0) {
 const hive = assignedHive[0]
 const apiaryText = hive.apiary_name || 'Unknown apiary'
 const selectedQueen = queens.find(q => q.id === dataToSubmit.queen_id)
 const queenName = selectedQueen?.queen_number || 'this queen'
 const ownership = hive.hive_owner_id === userId ? 'your' : 'a team member\'s'

 toast.warning(`Cannot assign queen: ${queenName} is already assigned to ${ownership} active hive "${hive.hive_number}" at ${apiaryText}. A queen can only be in one active hive at a time.`)
 return
 }
 }

 // Validate row + order combination: check if this combination is already used in the same apiary
 if (dataToSubmit.apiary_id && dataToSubmit.row_in_apiary !== null && dataToSubmit.order_in_apiary !== null) {
 let query = supabase
 .from('hives')
 .select('id, hive_number')
 .eq('apiary_id', dataToSubmit.apiary_id)
 .eq('row_in_apiary', dataToSubmit.row_in_apiary)
 .eq('order_in_apiary', dataToSubmit.order_in_apiary)

 // Only exclude current hive when editing (not when creating new)
 if (editingHive?.id) {
 query = query.neq('id', editingHive.id)
 }

 const { data: existingPosition, error: positionError } = await query

 if (positionError) {
 throw new Error('Failed to validate position assignment')
 }

 if (existingPosition && existingPosition.length > 0) {
 toast.warning(`Row ${dataToSubmit.row_in_apiary}, Position ${dataToSubmit.order_in_apiary} is already used by hive "${existingPosition[0].hive_number}" in this apiary. Each hive must have a unique row and order combination within the apiary.`)
 return
 }
 }

 if (editingHive) {
 // Update hive. Hives RLS permits UPDATE for the hive owner only, so this path
 // is reached only for the user's own hives (Edit is hidden for others' hives).
 // Note: The database trigger will automatically create a history entry if configuration changes
 const { error } = await supabase
 .from('hives')
 .update(dataToSubmit)
 .eq('id', editingHive.id)

 if (error) throw error

 // History tracking is handled by database trigger - no manual insert needed
 } else {
 // Verify the user can place a hive in the selected apiary.
 // Allowed: an apiary they own, or one shared with a team they belong to.
 // `apiaries` already holds exactly that set (own + team-shared), matching the dropdown options.
 if (dataToSubmit.apiary_id && !apiaries.some(a => a.id === dataToSubmit.apiary_id)) {
 throw new Error('Cannot create hive: you do not have access to the selected apiary.')
 }

 // Insert with user_id for RLS policy compliance
 const insertData = { ...dataToSubmit, user_id: userId }

 // Verify the session is valid
 const { data: { session }, error: sessionError } = await supabase.auth.getSession()

 if (sessionError) {
 console.error('Session error:', sessionError)
 }

 if (!session) {
 throw new Error('No active session found. Please refresh the page and try again.')
 }

 const { data: newHive, error } = await supabase
 .from('hives')
 .insert([insertData])
 .select('id')
 .single()

 if (error) {
 console.error('Hive insert error:', error)
 console.error('Error code:', error.code)
 console.error('Error details:', error.details)
 console.error('Error hint:', error.hint)
 throw error
 }

 // Record initial configuration in history for new hive
 // (INSERT trigger doesn't exist, only UPDATE trigger)
 if (newHive) {
 const { error: historyError } = await supabase
 .from('hive_configuration_history')
 .insert([{
 hive_id: newHive.id,
 changed_at: new Date().toISOString(),
 changed_by: userId,
 configuration: formData.configuration,
 apiary_id: formData.apiary_id || null,
 row_in_apiary: formData.row_in_apiary,
 order_in_apiary: formData.order_in_apiary,
 queen_id: formData.queen_id || null,
 queen_marked: formData.queen_marked,
 queen_marking_color: formData.queen_marking_color || null,
 queen_mated: formData.queen_mated,
 queen_clipped: formData.queen_clipped,
 is_queenless: formData.is_queenless
 }])

 if (historyError) {
 console.error('Failed to record initial configuration history:', historyError)
 // Don't throw - hive was created successfully, history is supplementary
 }
 }
 }

 // If the hive just transitioned to queenless and had a linked queen,
 // update that queen's record so her status matches the reason. Lineage
 // queries depend on each queen's own status being truthful.
 if (queenIdToReassign && formData.queenless_reason) {
 const nextQueenStatus = mapReasonToQueenStatus(formData.queenless_reason)

 const { error: queenUpdateError } = await supabase
 .from('queens')
 .update({ status: nextQueenStatus })
 .eq('id', queenIdToReassign)

 if (queenUpdateError) {
 console.error('Failed to update queen status after queenless transition:', queenUpdateError)
 toast.warning('Hive saved, but the linked queen\'s status could not be updated. Open Queens to set it manually.')
 }
 }

 onSaved()
 resetForm()
 } catch (error) {
 // Supabase rejections (e.g. RLS denials) throw PostgrestError objects, which are
 // NOT Error instances. Extract a message defensively so a failed save can never
 // be swallowed silently, leaving the form looking stuck.
 const message =
 error instanceof Error
 ? error.message
 : error && typeof error === 'object' && 'message' in error
 ? String((error as { message: unknown }).message)
 : 'An unexpected error occurred.'
 toast.error(`Failed to save hive: ${message}`)
 }
 }

 return (
 <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
 <h3 className="text-xl font-semibold text-foreground">
 {editingHive ? 'Edit Hive' : 'Add New Hive'}
 </h3>
 <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
 <Button
 type="submit"
 form="hive-form"
 className="px-6 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 active:bg-forest-800 dark:active:bg-forest-700 touch-manipulation font-medium"
 >
 {editingHive ? 'Update' : 'Add'} Hive
 </Button>
 <Button
 type="button"
 onClick={resetForm}
 className="px-6 py-3 sm:py-2 min-h-[48px] bg-surface dark:bg-surface-elevated text-text-primary rounded-lg hover:bg-surface-elevated active:bg-surface-elevated touch-manipulation font-medium"
 >
 Cancel
 </Button>
 </div>
 </div>
 <form id="hive-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Hive Number *</label>
 <input
 type="text"
 value={formData.hive_number}
 onChange={(e) => setFormData({...formData, hive_number: e.target.value})}
 placeholder="e.g., A-1, B-3"
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Apiary *
 <span className="block text-xs font-normal text-text-tertiary mt-0.5">
 Required for weather data in inspection records
 </span>
 </label>
 <select
 value={formData.apiary_id}
 onChange={(e) => setFormData({...formData, apiary_id: e.target.value})}
 className="w-full fj-control"
 required
 >
 <option value="">Select apiary</option>
 {apiaries.map((a) => (
 <option key={a.id} value={a.id}>
 {a.name}{a.is_shared ? ' (Shared)' : ''}
 </option>
 ))}
 </select>
 {apiaries.length === 0 && (
 <p className="mt-1 text-xs text-amber-400">
 No apiaries available. Please create an apiary first to enable weather data for inspections.
 </p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Row in Apiary
 <span className="block text-xs font-normal text-text-tertiary mt-0.5 invisible">Placeholder for alignment</span>
 </label>
 <div className="flex gap-2 mb-2 invisible">
 <label className="flex items-center gap-2">
 <input type="radio" className="w-4 h-4" />
 <span className="text-sm">Placeholder</span>
 </label>
 <label className="flex items-center gap-2">
 <input type="radio" className="w-4 h-4" />
 <span className="text-sm">Placeholder</span>
 </label>
 </div>
 <div className="flex gap-2">
 <Button
 type="button"
 onClick={() => setFormData({...formData, row_in_apiary: Math.max(1, (formData.row_in_apiary ?? 1) - 1)})}
 className="px-3 sm:px-4 py-2 font-bold text-lg flex-shrink-0"
 >
 −
 </Button>
 <input
 type="number"
 value={formData.row_in_apiary ?? ''}
 onChange={(e) => setFormData({...formData, row_in_apiary: e.target.value ? parseInt(e.target.value) : null})}
 placeholder="Optional"
 className="flex-1 min-w-0 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-center placeholder-text-tertiary"
 min="1"
 />
 <Button
 type="button"
 onClick={() => setFormData({...formData, row_in_apiary: (formData.row_in_apiary ?? 0) + 1})}
 className="px-3 sm:px-4 py-2 font-bold text-lg flex-shrink-0"
 >
 +
 </Button>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Hive in Row
 <span className="block text-xs font-normal text-text-tertiary mt-0.5">
 For looking left to right choose option
 </span>
 </label>
 <div className="flex gap-2 mb-2">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="radio"
 name="order_direction"
 value="entrances"
 checked={formData.order_direction === 'entrances'}
 onChange={(e) => setFormData({...formData, order_direction: e.target.value as 'entrances' | 'backs'})}
 className="w-4 h-4 text-forest-600 dark:text-forest-400"
 />
 <span className="text-sm text-text-secondary">Entrances</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="radio"
 name="order_direction"
 value="backs"
 checked={formData.order_direction === 'backs'}
 onChange={(e) => setFormData({...formData, order_direction: e.target.value as 'entrances' | 'backs'})}
 className="w-4 h-4 text-forest-600 dark:text-forest-400"
 />
 <span className="text-sm text-text-secondary">Backs</span>
 </label>
 </div>
 <div className="flex gap-2">
 <Button
 type="button"
 onClick={() => setFormData({...formData, order_in_apiary: Math.max(1, (formData.order_in_apiary ?? 1) - 1)})}
 className="px-3 sm:px-4 py-2 font-bold text-lg flex-shrink-0"
 >
 −
 </Button>
 <input
 type="number"
 value={formData.order_in_apiary ?? ''}
 onChange={(e) => setFormData({...formData, order_in_apiary: e.target.value ? parseInt(e.target.value) : null})}
 placeholder="Optional"
 className="flex-1 min-w-0 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-center placeholder-text-tertiary"
 min="1"
 />
 <Button
 type="button"
 onClick={() => setFormData({...formData, order_in_apiary: (formData.order_in_apiary ?? 0) + 1})}
 className="px-3 sm:px-4 py-2 font-bold text-lg flex-shrink-0"
 >
 +
 </Button>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Queen</label>
 <select
 value={formData.queen_id}
 onChange={(e) => {
 const newQueenId = e.target.value
 // Installing a different queen resets the install date to today so it can never
 // carry over (and predate) from a previously housed queen.
 const changedQueen = !!newQueenId && newQueenId !== (editingHive?.queen_id || '')
 setFormData({
 ...formData,
 queen_id: newQueenId,
 ...(changedQueen ? { queen_installed_date: new Date().toISOString().split('T')[0] } : {}),
 })
 }}
 className="w-full fj-control"
 >
 <option value="">Record manual</option>
 {queens
 .filter(q => {
 // Show unassigned queens OR the queen currently assigned to this hive (if editing)
 if (!q.assigned_hive_id) {
 return true // Unassigned queen - always show
 }
 // If editing, show the queen if it's assigned to THIS hive
 return editingHive && q.assigned_hive_id === editingHive.id
 })
 .map((q) => (
 <option key={q.id} value={q.id}>{q.queen_number}{q.status === 'cell' ? ' (Cell)' : ''}</option>
 ))
 }
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
 <select
 value={formData.status}
 onChange={(e) => setFormData({...formData, status: e.target.value})}
 className="w-full fj-control"
 >
 <option value="active">Active</option>
 <option value="retired">Retired</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
 <select
 value={formData.hive_type}
 onChange={(e) => setFormData({...formData, hive_type: e.target.value})}
 className="w-full fj-control"
 >
 <option value="">Select type</option>
 <option value="Production">Production</option>
 <option value="Bee production">Bee production</option>
 <option value="Split">Split</option>
 <option value="Swarm">Swarm</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Colony Established Date</label>
 <input
 type="date"
 value={formData.colony_established_date}
 onChange={(e) => setFormData({...formData, colony_established_date: e.target.value})}
 className="w-full fj-control"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Queen Installed Date</label>
 <input
 type="date"
 value={formData.queen_installed_date}
 onChange={(e) => setFormData({...formData, queen_installed_date: e.target.value})}
 className="w-full fj-control"
 />
 </div>

 <div className="md:col-span-2">
 <Button
 type="button"
 onClick={() => {
 const next = !formData.is_queenless
 setFormData({
 ...formData,
 is_queenless: next,
 // Clear the reason when toggling off; preserve any previous reason when toggling back on
 queenless_reason: next ? formData.queenless_reason : '',
 })
 }}
 className={`w-full px-4 py-3 min-h-[48px] rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-2 touch-manipulation ${
 formData.is_queenless
 ? 'bg-red-600 dark:bg-red-700 text-white shadow-md hover:bg-red-700 dark:hover:bg-red-800 active:bg-red-800 dark:active:bg-red-900'
 : 'bg-surface dark:bg-surface-elevated text-text-primary hover:bg-surface-elevated active:bg-surface-elevated border border-border'
 }`}
 >
 <span className="text-lg">{formData.is_queenless ? '✓' : '○'}</span>
 Confirmed Queenless
 </Button>
 <p className="mt-1 text-xs text-text-tertiary">
 Tick this if the colony has no queen (for example, after a swarm). The hive will display a red Queenless badge.
 </p>
 {formData.is_queenless && (
 <div className="mt-3">
 <label htmlFor="queenless-reason" className="block text-sm font-medium text-text-secondary mb-1">
 Reason <span className="text-red-600">*</span>
 </label>
 <select
 id="queenless-reason"
 value={formData.queenless_reason}
 onChange={(e) => setFormData({ ...formData, queenless_reason: e.target.value })}
 required
 className="w-full fj-control"
 >
 <option value="">Select a reason...</option>
 {QUEENLESS_REASONS.map((r) => (
 <option key={r.value} value={r.value}>{r.formLabel}</option>
 ))}
 </select>
 {formData.queen_id && (
 <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
 The linked queen will be updated to reflect this outcome and removed from this hive on save.
 </p>
 )}
 </div>
 )}
 </div>

 {/* Show queen attribute toggles only when there is a queen to describe */}
 {!formData.queen_id && !formData.is_queenless && (
 <>
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-3">Queen Status (if no specific queen assigned)</label>
 <div className="flex flex-col sm:flex-row gap-3">
 <Button
 type="button"
 onClick={() => setFormData({
 ...formData,
 queen_marked: !formData.queen_marked,
 queen_marking_color: !formData.queen_marked ? formData.queen_marking_color : ''
 })}
 className={`px-4 py-3 min-h-[48px] rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-2 touch-manipulation ${
 formData.queen_marked
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md hover:bg-forest-700 dark:hover:bg-forest-600 active:bg-forest-800 dark:active:bg-forest-700'
 : 'bg-surface dark:bg-surface-elevated text-text-primary hover:bg-surface-elevated active:bg-surface-elevated'
 }`}
 >
 <span className="text-lg">{formData.queen_marked ? '✓' : '○'}</span>
 Queen Marked
 </Button>
 <Button
 type="button"
 onClick={() => setFormData({...formData, queen_mated: !formData.queen_mated})}
 className={`px-4 py-3 min-h-[48px] rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-2 touch-manipulation ${
 formData.queen_mated
 ? 'bg-green-600 text-white shadow-md hover:bg-green-700 active:bg-green-800'
 : 'bg-surface dark:bg-surface-elevated text-text-primary hover:bg-surface-elevated active:bg-surface-elevated'
 }`}
 >
 <span className="text-lg">{formData.queen_mated ? '♥' : '○'}</span>
 Queen Mated
 </Button>
 <Button
 type="button"
 onClick={() => setFormData({...formData, queen_clipped: !formData.queen_clipped})}
 className={`px-4 py-3 min-h-[48px] rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-2 touch-manipulation ${
 formData.queen_clipped
 ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:bg-blue-800'
 : 'bg-surface dark:bg-surface-elevated text-text-primary hover:bg-surface-elevated active:bg-surface-elevated'
 }`}
 >
 <span className="text-lg">{formData.queen_clipped ? '✂' : '○'}</span>
 Queen Clipped
 </Button>
 </div>
 </div>

 {/* Show marking color dropdown when Queen Marked is checked */}
 {formData.queen_marked && (
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-1">Queen Marking Color</label>
 <select
 value={formData.queen_marking_color}
 onChange={(e) => setFormData({...formData, queen_marking_color: e.target.value})}
 className="w-full md:w-1/2 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
 >
 <option value="">Select color</option>
 <option value="White">White</option>
 <option value="Yellow">Yellow</option>
 <option value="Red">Red</option>
 <option value="Green">Green</option>
 <option value="Blue">Blue</option>
 </select>
 <p className="text-xs text-text-tertiary mt-1">
 International standard: White (1,6) | Yellow (2,7) | Red (3,8) | Green (4,9) | Blue (5,0)
 </p>
 </div>
 )}
 </>
 )}

 {/* Hive Configuration Section */}
 <div className="md:col-span-2 p-4 bg-surface dark:bg-surface-elevated rounded-lg border-2 border-forest-200 dark:border-forest-900/50">
 <h4 className="text-md font-semibold text-forest-600 dark:text-forest-400 mb-4">Hive Configuration</h4>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2">
 Full-Size Brood Boxes: {formData.configuration.brood_boxes_full}
 </label>
 <div className="flex gap-2">
 {[0, 1, 2, 3, 4].map((num) => (
 <Button
 key={num}
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, brood_boxes_full: num}})}
 className={`px-4 py-2 rounded-lg font-semibold transition-all ${
 formData.configuration.brood_boxes_full === num
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
 : 'fj-btn-neutral'
 }`}
 >
 {num}
 </Button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2">
 Half-Size Brood Boxes: {formData.configuration.brood_boxes_half}
 </label>
 <div className="flex gap-2">
 {[0, 1, 2, 3, 4].map((num) => (
 <Button
 key={num}
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, brood_boxes_half: num}})}
 className={`px-4 py-2 rounded-lg font-semibold transition-all ${
 formData.configuration.brood_boxes_half === num
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
 : 'fj-btn-neutral'
 }`}
 >
 {num}
 </Button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2">
 Frames per Full-Size Box: {formData.configuration.frames_per_full_box ?? 10}
 </label>
 <div className="flex items-center gap-3">
 <Button
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, frames_per_full_box: Math.max(1, (formData.configuration.frames_per_full_box ?? 10) - 1)}})}
 className="min-h-[48px] min-w-[48px] rounded-lg text-2xl font-semibold fj-btn-neutral"
 aria-label="Decrease frames per full-size box"
 >
 −
 </Button>
 <span className="min-w-[2.5rem] text-center text-lg font-semibold text-foreground">
 {formData.configuration.frames_per_full_box ?? 10}
 </span>
 <Button
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, frames_per_full_box: Math.min(20, (formData.configuration.frames_per_full_box ?? 10) + 1)}})}
 className="min-h-[48px] min-w-[48px] rounded-lg text-2xl font-semibold fj-btn-neutral"
 aria-label="Increase frames per full-size box"
 >
 +
 </Button>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2">
 Frames per Half-Size Box: {formData.configuration.frames_per_half_box ?? 10}
 </label>
 <div className="flex items-center gap-3">
 <Button
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, frames_per_half_box: Math.max(1, (formData.configuration.frames_per_half_box ?? 10) - 1)}})}
 className="min-h-[48px] min-w-[48px] rounded-lg text-2xl font-semibold fj-btn-neutral"
 aria-label="Decrease frames per half-size box"
 >
 −
 </Button>
 <span className="min-w-[2.5rem] text-center text-lg font-semibold text-foreground">
 {formData.configuration.frames_per_half_box ?? 10}
 </span>
 <Button
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, frames_per_half_box: Math.min(20, (formData.configuration.frames_per_half_box ?? 10) + 1)}})}
 className="min-h-[48px] min-w-[48px] rounded-lg text-2xl font-semibold fj-btn-neutral"
 aria-label="Increase frames per half-size box"
 >
 +
 </Button>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2">
 Honey Supers: {formData.configuration.honey_supers}
 </label>
 <div className="flex gap-2">
 {[0, 1, 2, 3, 4].map((num) => (
 <Button
 key={num}
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, honey_supers: num}})}
 className={`px-4 py-2 rounded-lg font-semibold transition-all ${
 formData.configuration.honey_supers === num
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
 : 'fj-btn-neutral'
 }`}
 >
 {num}
 </Button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Varroa Mesh Floor</label>
 <select
 value={formData.configuration.varroa_mesh_floor}
 onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, varroa_mesh_floor: e.target.value}})}
 className="w-full fj-control"
 >
 <option value="closed">Closed</option>
 <option value="open">Open</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Feeder Type</label>
 <select
 value={formData.configuration.feeder_type}
 onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, feeder_type: e.target.value, feeder: e.target.value !== ''}})}
 className="w-full fj-control"
 >
 <option value="">None</option>
 <option value="top">Top Feeder</option>
 <option value="frame">Frame Feeder</option>
 <option value="entrance">Entrance Feeder</option>
 <option value="boardman">Boardman Feeder</option>
 </select>
 </div>

 <div className="md:col-span-2 flex flex-wrap gap-3">
 <Button
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, queen_excluder: !formData.configuration.queen_excluder}})}
 className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
 formData.configuration.queen_excluder
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
 : 'fj-btn-neutral'
 }`}
 >
 {formData.configuration.queen_excluder ? '✓' : '○'} Queen Excluder
 </Button>

 <Button
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, entrance_reducer: !formData.configuration.entrance_reducer}})}
 className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
 formData.configuration.entrance_reducer
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
 : 'fj-btn-neutral'
 }`}
 >
 {formData.configuration.entrance_reducer ? '✓' : '○'} Entrance Reducer
 </Button>

 <Button
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, right_sized_broodbox: !formData.configuration.right_sized_broodbox}})}
 className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
 formData.configuration.right_sized_broodbox
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
 : 'fj-btn-neutral'
 }`}
 >
 {formData.configuration.right_sized_broodbox ? '✓' : '○'} Right-Sized Brood Area
 </Button>
 </div>

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-2">
 Frame Orientation
 <span className="ml-2 text-xs text-text-tertiary font-normal">
 (Warm way: frames parallel to entrance, Cold way: frames perpendicular to entrance)
 </span>
 </label>
 <select
 value={formData.configuration.frame_orientation ?? ''}
 onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, frame_orientation: e.target.value || null}})}
 className="w-full fj-control"
 >
 <option value="">Not specified</option>
 <option value="warm">Warm Way</option>
 <option value="cold">Cold Way</option>
 </select>
 </div>

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-2">
 Hive Size
 </label>
 <select
 value={formData.configuration.hive_size}
 onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, hive_size: e.target.value as 'full' | 'nuc'}})}
 className="w-full fj-control"
 >
 <option value="full">Full Size Hive</option>
 <option value="nuc">Nucleus Colony (Nuc)</option>
 </select>
 </div>
 </div>
 </div>

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({...formData, notes: e.target.value})}
 rows={3}
 placeholder="Special characteristics, equipment, etc..."
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 </div>

 <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
 <Button
 type="submit"
 className="px-6 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 active:bg-forest-800 dark:active:bg-forest-700 touch-manipulation font-medium"
 >
 {editingHive ? 'Update' : 'Add'} Hive
 </Button>
 <Button
 type="button"
 onClick={resetForm}
 className="px-6 py-3 sm:py-2 min-h-[48px] bg-surface dark:bg-surface-elevated text-text-primary rounded-lg hover:bg-surface-elevated active:bg-surface-elevated touch-manipulation font-medium"
 >
 Cancel
 </Button>
 </div>
 </form>
 </div>
 )
}
