'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import QueenLineageTree from '@/components/QueenLineageTree'
import { Queen, QueenFormData, Batch, getQueenColorFromYear, QUEEN_ROLE_OPTIONS } from '@/types/queen'
import { isValidEircode } from '@/lib/eircode'
import { buildLineageString, damLabelFromQueen, damLabelFromSnapshot, lineageYear, DRONE_SOURCE_OPTIONS, type DroneSourceType } from '@/lib/lineage'

interface QueenFormSectionProps {
 userId: string | null
 queens: Queen[]
 batches: Batch[]
 subspeciesOptions: string[]
 sourceOptions: string[]
 matingStationOptions: string[]
 /** Queen being edited, or null when adding a new queen. */
 editingQueen: Queen | null
 /** Called after a successful save so the parent can refresh the list. */
 onSaved: () => void
 /** Called when the form closes (save or cancel). */
 onClose: () => void
}

const getInvalidLineageParentIds = (queens: Queen[], queenId: string): Set<string> => {
 const invalidIds = new Set<string>([queenId])
 const queue = [queenId]

 // Walk down visible lineage links so descendants cannot be re-used as parents.
 while (queue.length > 0) {
 const currentId = queue.shift()
 if (!currentId) continue

 queens.forEach((queen) => {
 const isDescendant = queen.mother_id === currentId || queen.father_id === currentId
 if (isDescendant && !invalidIds.has(queen.id)) {
 invalidIds.add(queen.id)
 queue.push(queen.id)
 }
 })
 }

 return invalidIds
}

// Derive the canonical lineage string from the form's structured fields. The dam comes from
// the local mother queen when linked, else the distributed snapshot; the breeder is the
// distributing breeder for distributed queens (implicit owner otherwise).
const deriveLineage = (fd: QueenFormData, editingQueen: Queen | null, queens: Queen[]): string => {
 let damLabel = ''
 if (fd.mother_id) {
 const mother = queens.find((q) => q.id === fd.mother_id)
 if (mother) damLabel = damLabelFromQueen(mother.queen_number, mother.marking_color, mother.birth_date, mother.subspecies)
 }
 if (!damLabel && editingQueen?.distributed_mother_queen) {
 damLabel = damLabelFromSnapshot(editingQueen.distributed_mother_queen)
 }

 const droneSourceType = (fd.drone_source_type as DroneSourceType) || 'open'
 const droneLine = droneSourceType === 'ii' && fd.father_id
 ? queens.find((q) => q.id === fd.father_id)?.queen_number ?? null
 : null

 return buildLineageString({
 damLabel,
 droneSourceType,
 droneLine,
 matingStation: fd.mating_station,
 eircode: fd.mated_at_eircode,
 year: lineageYear(fd.mated_date, fd.birth_date),
 subspecies: fd.subspecies,
 breeder: editingQueen?.distributed_by_name ?? null,
 })
}

const emptyFormData = (): QueenFormData => ({
 queen_number: '',
 birth_date: '',
 marking_color: '',
 source: '',
 subspecies: '',
 lineage: '',
 queen_clipped: false,
 status: 'active',
 performance_notes: '',
 mated_at_eircode: '',
 mated_date: '',
 mother_id: '',
 father_id: '',
 batch_id: '',
 drone_source_type: 'open',
 mating_station: '',
 lineage_overridden: false,
 queen_role: 'production',
 origin_breeder_code: '',
})

// Mirrors the old handleEdit population logic: distributed queens auto-link
// the mother from the source batch (own queens only) and inherit subspecies
// from the maternal line when it was not captured at distribution.
const formDataFromQueen = (queen: Queen, queens: Queen[], batches: Batch[]): QueenFormData => {
 let motherId = queen.mother_id || ''
 if (queen.distributed_by_name && !motherId && queen.batch_id) {
 const batchMotherId = batches.find((b) => b.id === queen.batch_id)?.mother_queen_id
 if (batchMotherId && queens.some((q) => q.id === batchMotherId)) motherId = batchMotherId
 }

 let subspecies = queen.subspecies || ''
 if (!subspecies && motherId) {
 subspecies = queens.find((q) => q.id === motherId)?.subspecies || ''
 }

 return {
 queen_number: queen.queen_number,
 birth_date: queen.birth_date,
 marking_color: queen.marking_color,
 source: queen.source,
 subspecies,
 lineage: queen.lineage || '',
 queen_clipped: queen.queen_clipped || false,
 status: queen.status,
 performance_notes: queen.performance_notes,
 mated_at_eircode: queen.mated_at_eircode || '',
 mated_date: queen.mated_date || '',
 mother_id: motherId,
 father_id: queen.father_id || '',
 batch_id: queen.batch_id || '',
 drone_source_type: (queen.drone_source_type as DroneSourceType) || 'open',
 mating_station: queen.mating_station || '',
 lineage_overridden: queen.lineage_overridden ?? false,
 queen_role: queen.queen_role || 'production',
 origin_breeder_code: queen.origin_breeder_code || '',
 }
}

/**
 * Inline add/edit queen form incl. the lineage tree for the queen being
 * edited. Extracted verbatim from src/app/dashboard/queens/page.tsx
 * (Phase 6.4 decomposition).
 */
export default function QueenFormSection({ userId, queens, batches, subspeciesOptions, sourceOptions, matingStationOptions, editingQueen, onSaved, onClose }: QueenFormSectionProps) {
 const toast = useToast()
 const [showLineage, setShowLineage] = useState(false)
 const [formData, setFormData] = useState<QueenFormData>(() =>
 editingQueen ? formDataFromQueen(editingQueen, queens, batches) : emptyFormData()
 )

 // Re-populate when switching between add and edit (or editing another queen)
 useEffect(() => {
 setFormData(editingQueen ? formDataFromQueen(editingQueen, queens, batches) : emptyFormData())
 setShowLineage(false)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [editingQueen])

 const resetForm = () => {
 setShowLineage(false)
 setFormData(emptyFormData())
 onClose()
 }

 // Auto-calculate color when birth date changes (skip for distributed queens — preserve breeder data)
 useEffect(() => {
 if (formData.birth_date && !editingQueen?.distributed_by_name) {
 const calculatedColor = getQueenColorFromYear(formData.birth_date)
 if (calculatedColor && calculatedColor !== formData.marking_color) {
 setFormData(prev => ({ ...prev, marking_color: calculatedColor }))
 }
 }
 }, [formData.birth_date, formData.marking_color, editingQueen?.distributed_by_name])

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!userId) return

 // Lineage is derived from the structured fields unless the user has overridden it.
 const lineageToSave = formData.lineage_overridden
 ? formData.lineage
 : deriveLineage(formData, editingQueen, queens)

 // Convert empty strings to null for optional UUID fields
 const dataToSubmit = {
 ...formData,
 mother_id: formData.mother_id || null,
 father_id: formData.father_id || null,
 batch_id: formData.batch_id || null,
 mated_date: formData.mated_date || null,
 mating_station: formData.mating_station || null,
 origin_breeder_code: formData.origin_breeder_code ? formData.origin_breeder_code.trim().toUpperCase() : null,
 lineage: lineageToSave,
 }

 const invalidParentIds = editingQueen
 ? getInvalidLineageParentIds(queens, editingQueen.id)
 : new Set<string>()
 const selectedParentIds = [dataToSubmit.mother_id, dataToSubmit.father_id].filter(
 (parentId): parentId is string => Boolean(parentId)
 )

 if (selectedParentIds.some((parentId) => invalidParentIds.has(parentId))) {
 toast.error('A queen cannot use herself or one of her descendants as a parent.')
 return
 }

 // Eircode is optional, but reject malformed values rather than storing junk.
 if (formData.mated_at_eircode.trim() && !isValidEircode(formData.mated_at_eircode)) {
 toast.error('Enter a valid Eircode (e.g. H91 E6K2) or leave it blank.')
 return
 }

 try {
 if (editingQueen) {
 // For distributed queens, strip locked fields to preserve breeder provenance
 const updateData = editingQueen.distributed_by_name
 ? {
 queen_number: dataToSubmit.queen_number,
 lineage: dataToSubmit.lineage,
 queen_clipped: dataToSubmit.queen_clipped,
 status: dataToSubmit.status,
 performance_notes: dataToSubmit.performance_notes,
 mated_date: dataToSubmit.mated_date,
 // Editable for distributed queens: the recipient may mate elsewhere, the mother
 // link can be recovered from the source batch, and subspecies follows the dam.
 mated_at_eircode: dataToSubmit.mated_at_eircode || null,
 mother_id: dataToSubmit.mother_id,
 subspecies: dataToSubmit.subspecies || null,
 drone_source_type: dataToSubmit.drone_source_type,
 mating_station: dataToSubmit.mating_station,
 lineage_overridden: dataToSubmit.lineage_overridden,
 queen_role: dataToSubmit.queen_role,
 origin_breeder_code: dataToSubmit.origin_breeder_code,
 }
 : dataToSubmit

 const { error } = await supabase
 .from('queens')
 .update(updateData)
 .eq('id', editingQueen.id)
 .eq('user_id', userId)

 if (error) throw error
 } else {
 const { error } = await supabase.from('queens').insert([{ ...dataToSubmit, user_id: userId }])
 if (error) throw error
 }

 onSaved()
 resetForm()
 } catch (error) {
 if (error instanceof Error) {
 toast.error(error.message)
 }
 }
 }

 const invalidParentIds = editingQueen
 ? getInvalidLineageParentIds(queens, editingQueen.id)
 : new Set<string>()
 const availableParentQueens = queens.filter((q) => !invalidParentIds.has(q.id))

 // Live preview of the auto-generated lineage from the current form values.
 const derivedLineage = deriveLineage(formData, editingQueen, queens)

 const colorOptions = ['White', 'Yellow', 'Red', 'Green', 'Blue', 'None']

 return (
 <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
 <h3 className="text-xl font-semibold mb-4 text-foreground">
 {editingQueen ? 'Edit Queen' : 'Add New Queen'}
 </h3>
 {editingQueen?.distributed_by_name && (
 <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-200">
 <p className="font-medium">Distributed Queen — Provenance</p>
 <p>Breeder: {editingQueen.distributed_by_name}</p>
 {editingQueen.distributed_batch_name && (
 <p>Batch: {editingQueen.distributed_batch_name}</p>
 )}
 {editingQueen.distributed_mother_queen && (
 <p>Mother Queen: {editingQueen.distributed_mother_queen}</p>
 )}
 {editingQueen.distributed_drone_source && (
 <p>Drone Source: {editingQueen.distributed_drone_source}</p>
 )}
 <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
 Birth date, marking colour, source, father queen, and source batch are locked for distributed queens. Mother queen, subspecies, mated at, and lineage stay editable so you can record the queen&apos;s true line and where she was actually mated.
 </p>
 </div>
 )}
 <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Queen Number
 </label>
 <input
 type="text"
 value={formData.queen_number}
 onChange={(e) => setFormData({ ...formData, queen_number: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Birth Date</label>
 <input
 type="date"
 value={formData.birth_date}
 onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
 disabled={!!editingQueen?.distributed_by_name}
 className={`w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500 ${editingQueen?.distributed_by_name ? 'opacity-60 cursor-not-allowed' : ''}`}
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Marking Color
 {formData.birth_date && (
 <span className="ml-2 text-xs text-forest-600 dark:text-forest-400 font-normal">
 (Auto-set based on birth year)
 </span>
 )}
 </label>
 <select
 value={formData.marking_color}
 onChange={(e) => setFormData({ ...formData, marking_color: e.target.value })}
 disabled={!!editingQueen?.distributed_by_name}
 className={`w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500 ${editingQueen?.distributed_by_name ? 'opacity-60 cursor-not-allowed' : ''}`}
 >
 <option value="">Select color</option>
 {colorOptions.map((color) => (
 <option key={color} value={color}>
 {color}
 </option>
 ))}
 </select>
 <p className="text-xs text-text-tertiary mt-1">
 International standard: White (1,6) | Yellow (2,7) | Red (3,8) | Green (4,9) | Blue (5,0)
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Source</label>
 <select
 value={formData.source}
 onChange={(e) => setFormData({ ...formData, source: e.target.value })}
 disabled={!!editingQueen?.distributed_by_name}
 className={`w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500 ${editingQueen?.distributed_by_name ? 'opacity-60 cursor-not-allowed' : ''}`}
 >
 <option value="">Select source</option>
 {sourceOptions.map((source) => (
 <option key={source} value={source}>
 {source}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Queen Role</label>
 <select
 value={formData.queen_role}
 onChange={(e) => setFormData({ ...formData, queen_role: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 {QUEEN_ROLE_OPTIONS.map((opt) => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </select>
 <p className="text-xs text-text-tertiary mt-1">Breeder/reference queens are breeding stock, not production colonies; they&apos;re excluded from the active count.</p>
 </div>

 {formData.queen_role !== 'production' && (
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Origin Breeder Code</label>
 <input
 type="text"
 value={formData.origin_breeder_code}
 onChange={(e) => setFormData({ ...formData, origin_breeder_code: e.target.value.toUpperCase() })}
 placeholder="e.g. UG"
 maxLength={10}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary uppercase focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 <p className="text-xs text-text-tertiary mt-1">Originating line/breeder. Used in this queen&apos;s code (e.g. UG-{formData.queen_number || 'number'}-year) instead of your own.</p>
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Subspecies</label>
 <select
 value={formData.subspecies}
 onChange={(e) => setFormData({ ...formData, subspecies: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="">Select subspecies</option>
 {subspeciesOptions.map((subspecies) => (
 <option key={subspecies} value={subspecies}>
 {subspecies}
 </option>
 ))}
 </select>
 </div>

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-1">Lineage</label>
 <input
 type="text"
 value={formData.lineage_overridden ? formData.lineage : derivedLineage}
 onChange={(e) => setFormData({ ...formData, lineage: e.target.value })}
 readOnly={!formData.lineage_overridden}
 placeholder="Auto-generated from dam, drone source, mating site and year"
 className={`w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500 ${formData.lineage_overridden ? '' : 'opacity-70'}`}
 />
 <label className="flex items-center gap-2 mt-2 text-sm text-text-secondary cursor-pointer">
 <input
 type="checkbox"
 checked={formData.lineage_overridden}
 onChange={(e) => {
 const overridden = e.target.checked
 setFormData((prev) => ({
 ...prev,
 lineage_overridden: overridden,
 // Seed the editable text with the current derived value when switching to manual.
 lineage: overridden ? (prev.lineage || derivedLineage) : prev.lineage,
 }))
 }}
 className="w-4 h-4 text-forest-600 border-border rounded focus:ring-forest-500"
 />
 Edit manually
 </label>
 <p className="text-xs text-text-tertiary mt-1">
 Auto-generated as <span className="italic">Dam × drone-source @ station (year)</span>. Tick &quot;Edit manually&quot; to override.
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Mother Queen</label>
 <select
 value={formData.mother_id}
 onChange={(e) => setFormData({ ...formData, mother_id: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="">Select mother queen (optional)</option>
 {availableParentQueens
 .map((q) => (
 <option key={q.id} value={q.id}>
 {q.queen_number} {q.marking_color ? `(${q.marking_color})` : ''}
 </option>
 ))}
 </select>
 </div>

 {/* Father (drone-source) queen only applies to instrumental insemination; for open or
 station mating the sire is a drone population, not a single queen. */}
 {formData.drone_source_type === 'ii' && (
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Father (drone-line) Queen</label>
 <select
 value={formData.father_id}
 onChange={(e) => setFormData({ ...formData, father_id: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="">Select drone-line queen (optional)</option>
 {availableParentQueens
 .map((q) => (
 <option key={q.id} value={q.id}>
 {q.queen_number} {q.marking_color ? `(${q.marking_color})` : ''}
 </option>
 ))}
 </select>
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Source Batch</label>
 {editingQueen?.distributed_by_name ? (
 <input
 type="text"
 value={editingQueen.distributed_batch_name || ''}
 disabled
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground opacity-60 cursor-not-allowed"
 />
 ) : (
 <select
 value={formData.batch_id}
 onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="">Select source batch (optional)</option>
 {batches.map((b) => (
 <option key={b.id} value={b.id}>
 {b.batch_name}
 </option>
 ))}
 </select>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Drone Source</label>
 <select
 value={formData.drone_source_type}
 onChange={(e) => setFormData({ ...formData, drone_source_type: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 {DRONE_SOURCE_OPTIONS.map((opt) => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </select>
 <p className="text-xs text-text-tertiary mt-1">How she was mated — the sire side of the pedigree.</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Mating Station</label>
 <input
 type="text"
 list="mating-station-options"
 value={formData.mating_station}
 onChange={(e) => setFormData({ ...formData, mating_station: e.target.value })}
 placeholder="e.g., TBKA Kilcornan"
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 <datalist id="mating-station-options">
 {matingStationOptions.map((name) => (
 <option key={name} value={name} />
 ))}
 </datalist>
 <p className="text-xs text-text-tertiary mt-1">Pick a site or type a new one.</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Mated at (Eircode)
 </label>
 <input
 type="text"
 value={formData.mated_at_eircode}
 onChange={(e) => setFormData({ ...formData, mated_at_eircode: e.target.value.toUpperCase() })}
 placeholder="e.g., H91 E6K2"
 maxLength={8}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary uppercase focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 <p className="text-xs text-text-tertiary mt-1">
 Irish postcode where the queen was mated
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Mated Date</label>
 <input
 type="date"
 value={formData.mated_date}
 onChange={(e) => setFormData({ ...formData, mated_date: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
 <select
 value={formData.status}
 onChange={(e) => setFormData({ ...formData, status: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="active">Active</option>
 <option value="virgin">Virgin</option>
 <option value="cell">Cell</option>
 <option value="retired">Retired</option>
 <option value="dead">Dead</option>
 <option value="swarmed">Swarmed</option>
 <option value="superseded">Superseded</option>
 </select>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="queen_clipped"
 checked={formData.queen_clipped}
 onChange={(e) => setFormData({ ...formData, queen_clipped: e.target.checked })}
 className="w-4 h-4 text-forest-600 dark:text-emerald-600 border-border rounded focus:ring-forest-500 dark:focus:ring-emerald-500 bg-surface dark:bg-surface-elevated"
 />
 <label htmlFor="queen_clipped" className="ml-2 text-sm font-medium text-text-secondary">
 Queen Clipped
 </label>
 </div>

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Performance Notes
 </label>
 <textarea
 value={formData.performance_notes}
 onChange={(e) =>
 setFormData({ ...formData, performance_notes: e.target.value })
 }
 rows={3}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 </div>

 <div className="md:col-span-2 flex gap-3">
 <Button
 type="submit"
 className="px-6 py-2 bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 min-h-[48px]"
 >
 {editingQueen ? 'Update' : 'Add'} Queen
 </Button>
 <Button
 type="button"
 onClick={resetForm}
 className="px-6 py-2 bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated min-h-[48px]"
 >
 Cancel
 </Button>
 </div>
 </form>

 {/* Lineage tree. Distributed queens have no local mother FK, so we feed the
 mother snapshot as a fallback; the tree still shows any daughters bred locally. */}
 {editingQueen && (
 <QueenLineageTree
 queenId={editingQueen.id}
 expanded={showLineage}
 onToggle={() => setShowLineage(!showLineage)}
 motherFallback={editingQueen.distributed_mother_queen ?? undefined}
 />
 )}
 </div>
 )
}
