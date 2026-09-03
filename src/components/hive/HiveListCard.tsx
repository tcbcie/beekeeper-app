'use client'
import { useId, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, MoreVertical, ArchiveRestore, Archive, Trash2, Scale, Clock, QrCode, Syringe } from 'lucide-react'
import type { Hive } from '@/types/hive'
import { queenStatusBadgeClass } from '@/types/queen'
import Button from '@/components/ui/Button'
import { formatQueenlessLabel } from '@/lib/queenless'
import { formatRemovalLabel } from '@/lib/treatment-removal'
import { isQueenClipped } from '@/lib/queen-clipped'
import SuperFullnessGauge from '@/components/hive/SuperFullnessGauge'

interface HiveListCardProps {
 hive: Hive
 userId: string | null
 onEdit: (hive: Hive) => void
 onDelete: (id: string) => void
 onUnarchive: (hive: Hive) => void
 openMenuId: string | null
 setOpenMenuId: (id: string | null) => void
 selectionMode?: boolean
 selected?: boolean
 onToggleSelect?: (id: string) => void
 /** Briefly ringed after the list scrolls back to this hive. */
 highlighted?: boolean
 /** Called just before navigating to the hive, so the list can remember this position. */
 onOpen?: (id: string) => void
}

// Single source of truth for "did this super's fullness change vs the previous reading?".
// A super with no valid previous reading never counts as changed; an unrecorded current reading
// falls back to 0% (matching the gauge). Used by both the per-super note and the caption flag so
// the two can never disagree.
function superFullnessChangedAt(
  current: number[] | null | undefined,
  previous: number[] | null | undefined,
  index: number
): boolean {
  const rawPrev = previous?.[index]
  if (typeof rawPrev !== 'number' || !Number.isFinite(rawPrev)) return false
  const rawCur = current?.[index]
  const cur = typeof rawCur === 'number' && Number.isFinite(rawCur) ? rawCur : 0
  return rawPrev !== cur
}

export default function HiveListCard({ hive, userId, onEdit, onDelete, onUnarchive, openMenuId, setOpenMenuId, selectionMode = false, selected = false, onToggleSelect, highlighted = false, onOpen }: HiveListCardProps) {
 const router = useRouter()
 // Focus returns here when the overflow menu is closed with Escape.
 const menuTriggerRef = useRef<HTMLButtonElement>(null)
 const menuId = useId()

 // Bulk actions only ever write to the user's own hives (RLS rejects others'),
 // so the selection checkbox is shown for owned hives only.
 const isOwner = hive.user_id === userId

 // Days since last inspection badge. Must use last_inspection_date specifically —
 // last_record covers any record type (inspections, varroa treatments, feedings,
 // harvests), so a recent treatment would mask an older overdue inspection.
 const daysSinceInspection = hive.last_inspection_date
 ? Math.floor((Date.now() - new Date(hive.last_inspection_date).getTime()) / (1000 * 60 * 60 * 24))
 : null

 // Whether any super's fullness changed vs the previous recorded reading — drives the
 // "Previous readings" caption beneath the setup stack.
 const anySuperFullnessChanged = Array.from({ length: hive.configuration?.honey_supers || 0 }).some(
 (_, i) => superFullnessChangedAt(hive.last_super_fullness, hive.previous_super_fullness, i)
 )

 return (
 <div
 id={`hive-card-${hive.id}`}
 className={`bg-surface dark:bg-surface rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border min-h-[280px] ${
 selected
 ? 'border-forest-500 ring-2 ring-forest-500'
 : highlighted
 ? 'border-forest-500 ring-2 ring-forest-500/70'
 : 'border-border'
 }`}
 >
 {/* Selection checkbox (owner-only) - shown while in selection mode */}
 {selectionMode && isOwner && (
 <label className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-border bg-surface-secondary cursor-pointer min-h-[48px]">
 <input
 type="checkbox"
 checked={selected}
 onChange={() => onToggleSelect?.(hive.id)}
 className="w-5 h-5 rounded border-border text-forest-600 focus:ring-forest-500"
 />
 <span className="text-sm font-medium text-text-primary">
 {selected ? 'Selected' : 'Select this hive'}
 </span>
 </label>
 )}

 {/* Overview & Records Button - Top of Card */}
 <Button
 onClick={() => {
 onOpen?.(hive.id)
 router.push(`/dashboard/hives/${hive.id}`)
 }}
 className="w-full px-4 py-3 mb-4 text-sm bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 font-semibold shadow-sm min-h-[48px]"
 >
 Overview & Records
 </Button>

 <div className="flex justify-between items-start mb-3">
 <div className="flex flex-col gap-1">
 <h3 className="text-xl font-bold text-foreground whitespace-nowrap">
 {hive.hive_number}
 </h3>
 {(hive.beep_device_id || hive.wolf_scale_id || hive.qr_tag_code) && (
 <div className="flex flex-wrap items-center gap-2">
 {hive.beep_device_id && (
 <span title="BEEP scale connected" className="inline-flex">
 <Scale size={16} className="text-amber-600" />
 </span>
 )}
 {hive.wolf_scale_id && (
 <span title="Wolf Waagen scale connected" className="inline-flex">
 <Scale size={16} className="text-blue-600" />
 </span>
 )}
 {hive.qr_tag_code && (
 <span
 title={`QR tag ${hive.qr_tag_code}`}
 className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-semibold bg-surface-secondary text-text-primary border border-border max-w-full whitespace-nowrap"
 >
 <QrCode size={12} className="flex-shrink-0" />
 <span className="truncate">{hive.qr_tag_code}</span>
 </span>
 )}
 </div>
 )}
 {hive.is_shared && hive.team_name && (
 <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-medium rounded flex items-center gap-1 w-fit border border-blue-300 dark:border-blue-800">
 <span>👥</span>
 <span>Shared via {hive.team_name}</span>
 </span>
 )}
 {!hive.is_shared && hive.shared_with_team && (
 <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-sm font-medium rounded flex items-center gap-1 w-fit border border-purple-300 dark:border-purple-800">
 <span>📤</span>
 <span>Shared with {hive.shared_with_team}</span>
 </span>
 )}
 {hive.archived_at && (
 <span className="px-2 py-0.5 bg-surface dark:bg-surface-elevated text-text-primary text-sm font-medium rounded flex items-center gap-1 w-fit border border-border">
 <span>📦</span>
 <span>Archived {new Date(hive.archived_at).toLocaleDateString()}</span>
 </span>
 )}
 {hive.active_tasks_count !== undefined && hive.active_tasks_count > 0 && (
 <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-sm font-semibold rounded flex items-center gap-1 w-fit border border-amber-400 dark:border-amber-700">
 <span>📋</span>
 <span className="font-bold">{hive.active_tasks_count}</span>
 <span>Active Task{hive.active_tasks_count > 1 ? 's' : ''}</span>
 </span>
 )}
 {/*
   A treatment still on the hive. Unlike the status and sharing pills this one is
   transient: it appears only between applying a treatment and recording its
   removal, and disappears once the beekeeper does the thing it asks for. Sits
   with the descriptive pills rather than the status cluster because the label
   carries a product name and a date, and must be free to wrap.
 */}
 {!hive.archived_at && hive.active_treatment && (
 <span className={`px-2 py-0.5 text-sm font-semibold rounded flex items-start gap-1 w-fit max-w-full border ${
 hive.active_treatment.overdue
 ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-400 dark:border-red-700'
 : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-700'
 }`}>
 <Syringe size={14} className="flex-shrink-0 mt-0.5" />
 <span className="break-words">
 {formatRemovalLabel(hive.active_treatment.treatment_type, {
 planned_removal_date: hive.active_treatment.planned_removal_date,
 removed_date: null,
 })}
 </span>
 </span>
 )}
 </div>
 {/* Right-hand status cluster. justify-end keeps every wrapped row flush
     with the card edge — a long hive number pushes these onto two or three
     rows, and without it the shorter rows align to the left of a box sized by
     the widest pill, which reads as staggered. */}
 <div className="flex flex-wrap items-center justify-end gap-2">
 <span className={`px-2 py-1 rounded text-sm font-medium whitespace-nowrap ${
 hive.status === 'active' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800' :
 hive.status === 'archived' ? 'bg-surface dark:bg-surface-elevated text-text-primary border border-border' :
 'bg-surface dark:bg-surface-elevated text-text-primary border border-border'
 }`}>
 {hive.status}
 </span>
 {hive.is_queenless && !hive.archived_at && (
 <span className="px-2 py-1 rounded text-sm font-medium whitespace-nowrap bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
 {formatQueenlessLabel(hive.queenless_reason)}
 </span>
 )}
 {/* Days since inspection badge */}
 {!hive.archived_at && (
 daysSinceInspection !== null ? (
 <span className={`inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded border ${
 daysSinceInspection < 7
 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
 : daysSinceInspection < 14
 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
 : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
 }`}>
 <Clock size={10} />
 {daysSinceInspection}d
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded border bg-surface-secondary text-text-secondary border-border">
 <Clock size={10} />
 Never
 </span>
 )
 )}
 {isOwner && (
 <div
 className="relative context-menu-container"
 onKeyDown={(e) => {
 if (e.key !== 'Escape' || openMenuId !== hive.id) return
 e.stopPropagation()
 setOpenMenuId(null)
 menuTriggerRef.current?.focus()
 }}
 >
 <Button
 ref={menuTriggerRef}
 onClick={(e) => {
 e.stopPropagation()
 setOpenMenuId(openMenuId === hive.id ? null : hive.id)
 }}
 className="p-1 hover:bg-surface-secondary rounded transition-colors"
 aria-label={`More options for hive ${hive.hive_number}`}
 aria-expanded={openMenuId === hive.id}
 aria-controls={openMenuId === hive.id ? menuId : undefined}
 >
 <MoreVertical size={16} className="text-text-secondary" />
 </Button>
 {openMenuId === hive.id && (
 <div
 id={menuId}
 className="absolute right-0 top-full mt-1 bg-surface dark:bg-surface-elevated border border-border rounded-lg shadow-lg z-10 min-w-[210px] overflow-hidden"
 >
 {hive.archived_at ? (
 <Button
 onClick={(e) => {
 e.stopPropagation()
 onUnarchive(hive)
 }}
 className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 rounded-none justify-start text-forest-700 dark:text-forest-300 hover:bg-forest-100 dark:hover:bg-forest-900/50"
 >
 <ArchiveRestore size={16} />
 <span>Unarchive</span>
 </Button>
 ) : (
 <>
 {/* Archive keeps the history and can be undone, so it leads. It
     navigates to the archive form because archiving collects a reason
     and runs a cascade (scale disconnected, queen retired). */}
 <Link
 href={`/dashboard/records?hive=${hive.id}&type=archive`}
 onClick={(e) => {
 e.stopPropagation()
 setOpenMenuId(null)
 }}
 className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 rounded-none justify-start text-foreground hover:bg-surface-secondary"
 >
 <Archive size={16} />
 <span>Archive</span>
 </Link>
 <div className="border-t border-border" aria-hidden="true" />
 <Button
 onClick={(e) => {
 e.stopPropagation()
 setOpenMenuId(null)
 onDelete(hive.id)
 }}
 className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 rounded-none justify-start text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
 >
 <Trash2 size={16} />
 <span>Delete permanently</span>
 </Button>
 </>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 <div className="space-y-2 text-sm mb-4">
 <div className="flex items-center gap-2">
 <span className="text-text-tertiary">📍</span>
 <span className="font-medium text-text-primary">{hive.apiaries?.name || 'No apiary'}</span>
 {(hive.order_in_apiary || hive.row_in_apiary) && (
 <span className="text-sm text-text-tertiary ml-1">
 ({hive.row_in_apiary ? `Row ${hive.row_in_apiary}` : ''}{hive.row_in_apiary && hive.order_in_apiary ? ', ' : ''}{hive.order_in_apiary ? `Hive ${hive.order_in_apiary}` : ''})
 </span>
 )}
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <span className="text-text-tertiary">👑</span>
 {hive.queens?.id ? (
 <span className="flex items-center gap-1">
 {hive.queens.marking_color && (
 <span className={`px-2 py-0.5 rounded text-sm font-medium ${
 hive.queens.marking_color === 'White' ? 'bg-surface-secondary text-text-primary' :
 hive.queens.marking_color === 'Yellow' ? 'bg-yellow-200 text-yellow-900' :
 hive.queens.marking_color === 'Red' ? 'bg-red-200 text-red-900' :
 hive.queens.marking_color === 'Green' ? 'bg-green-200 text-green-900' :
 hive.queens.marking_color === 'Blue' ? 'bg-blue-200 text-blue-900' :
 'bg-surface-secondary text-text-primary'
 }`}>
 {hive.queens.marking_color}
 </span>
 )}
 <span className="font-medium text-text-primary">Queen</span>
 <Link
 href={`/dashboard/queens/${hive.queens.id}`}
 className="text-forest-600 dark:text-forest-400 hover:text-forest-700 dark:hover:text-forest-300 hover:underline flex items-center gap-1"
 >
 {hive.queens.queen_number}
 <ExternalLink size={12} />
 </Link>
 {(hive.queens.status === 'cell' || hive.queens.status === 'virgin') && (
 <span className={`px-1.5 py-0.5 rounded text-sm font-medium ${queenStatusBadgeClass(hive.queens.status)}`}>
 {hive.queens.status === 'virgin' ? 'Virgin' : 'Cell'}
 </span>
 )}
 </span>
 ) : hive.queen_marked ? (
 <span className="flex items-center gap-1">
 {hive.queen_marking_color && (
 <span className={`px-2 py-0.5 rounded text-sm font-medium ${
 hive.queen_marking_color === 'White' ? 'bg-surface-secondary text-text-primary' :
 hive.queen_marking_color === 'Yellow' ? 'bg-yellow-200 text-yellow-900' :
 hive.queen_marking_color === 'Red' ? 'bg-red-200 text-red-900' :
 hive.queen_marking_color === 'Green' ? 'bg-green-200 text-green-900' :
 hive.queen_marking_color === 'Blue' ? 'bg-blue-200 text-blue-900' :
 'bg-surface-secondary text-text-primary'
 }`}>
 {hive.queen_marking_color}
 </span>
 )}
 <span className="font-medium text-text-primary">Queen</span>
 </span>
 ) : (
 <span className="text-text-tertiary">No details</span>
 )}
 {/*
   Clipped status. Which column holds the truth depends on whether the hive has
   a linked queen, because that is what decides which form can edit it — see
   isQueenClipped. Sits outside the three queen branches so it shows either way.
   Rendered only when true; most hives are unclipped and a "Not clipped" chip on
   every card would be permanent chrome. The scissors matches the toggle in the
   hive Edit form so the indicator and its control read as the same thing.
 */}
 {isQueenClipped(hive) && (
 <span className="px-2 py-0.5 rounded text-sm font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 whitespace-nowrap">
 <span aria-hidden="true">✂ </span>Clipped
 </span>
 )}
 </div>
 {hive.last_record && (
 <div className="flex items-center gap-2">
 <span className="text-text-tertiary">📋</span>
 <span className="text-sm">
 <span className="font-medium text-text-secondary">{hive.last_record.type}</span>
 <span className="text-text-tertiary"> &bull; {new Date(hive.last_record.date).toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
 </span>
 </div>
 )}
 {hive.notes && (
 <div className="mt-3 p-2 bg-surface dark:bg-surface-elevated rounded text-text-primary text-sm border border-border">
 {hive.notes}
 </div>
 )}
 </div>

 {hive.configuration && (
 <div className="mb-4 p-3 bg-surface dark:bg-surface-elevated rounded border border-forest-200 dark:border-forest-900/50">
 <div className="flex items-center justify-between mb-3">
 <div className="text-sm font-semibold text-forest-600 dark:text-forest-400">Hive Setup</div>
 {hive.configuration.hive_size && (
 <span className={`px-2 py-0.5 rounded text-sm font-medium ${
 hive.configuration.hive_size === 'nuc'
 ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
 : 'bg-emerald-900/50 text-emerald-300 border border-emerald-800'
 }`}>
 {hive.configuration.hive_size === 'nuc' ? 'Nuc' : 'Full Size'}
 </span>
 )}
 </div>

 {/* Configuration Change Tracking - Only show for shared hives where user is not the owner */}
 {hive.is_shared && hive.user_id !== userId && hive.configuration_changed_at && (
 <div className="mb-3 pb-2 border-b border-border">
 <div className="text-sm text-text-tertiary">
 <span className="font-medium">Last changed:</span>{' '}
 {new Date(hive.configuration_changed_at).toLocaleDateString('en-IE', {
 day: '2-digit',
 month: '2-digit',
 year: 'numeric',
 hour: '2-digit',
 minute: '2-digit'
 })}
 {hive.configuration_changer && (
 <>
 {' by '}
 <span className="font-medium text-text-primary">
 {hive.configuration_changer.full_name || hive.configuration_changer.email}
 </span>
 </>
 )}
 </div>
 </div>
 )}

 {/* Visual Hive Stack */}
 <div className={`flex flex-col items-center gap-1 mb-3 ${hive.configuration.hive_size === 'nuc' ? 'w-1/2 mx-auto' : 'w-full'}`}>
 {/* Honey Supers — Super 1 is the bottom super (just above the queen
     excluder, closest to the brood); higher numbers stack above it, so
     render top-down from the highest number. Fullness index = number − 1. */}
 {Array.from({ length: hive.configuration.honey_supers || 0 }).map((_, row) => {
 const superNumber = (hive.configuration?.honey_supers || 0) - row
 const raw = hive.last_super_fullness?.[superNumber - 1]
 // A configured super with no recorded reading — a newly added super, or a hive not
 // yet inspected — reads as empty (0%) rather than showing no gauge at all.
 const fullness = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
 const prevRaw = hive.previous_super_fullness?.[superNumber - 1]
 const prevFullness = typeof prevRaw === 'number' && Number.isFinite(prevRaw) ? prevRaw : null
 const fullnessChanged = superFullnessChangedAt(hive.last_super_fullness, hive.previous_super_fullness, superNumber - 1)
 return (
 <div key={`super-${superNumber}`} className="w-full h-8 bg-yellow-300 border-2 border-yellow-500 rounded flex items-center justify-between px-2 text-sm font-semibold">
 <span>🍯 Super {superNumber}</span>
 <div className="flex items-center gap-1.5">
 {fullnessChanged && (
 <span className="text-sm font-normal text-yellow-900/80" title="Previous recorded reading">was {prevFullness}%</span>
 )}
 <SuperFullnessGauge value={fullness} />
 </div>
 </div>
 )
 })}

 {/* Queen Excluder */}
 {hive.configuration.queen_excluder && (
 <div className="w-full h-3 bg-surface-secondary border-2 border-border rounded flex items-center justify-center text-xs font-bold">
 ═══
 </div>
 )}

 {/* Half-Size Brood Boxes */}
 {Array.from({ length: hive.configuration.brood_boxes_half || 0 }).map((_, i) => (
 <div key={`brood-half-${i}`} className="w-full h-8 bg-amber-300 border-2 border-amber-600 rounded flex items-center justify-center text-sm font-semibold">
 🐝 Brood Half {i + 1}
 </div>
 ))}

 {/* Full-Size Brood Boxes */}
 {Array.from({ length: hive.configuration.brood_boxes_full || hive.configuration.brood_boxes || 0 }).map((_, i) => (
 <div key={`brood-full-${i}`} className="w-full h-10 bg-amber-200 border-2 border-amber-500 rounded flex items-center justify-center text-sm font-semibold relative">
 <span className="relative z-10">🐝 Brood Full {i + 1}</span>
 {/* Frame orientation visualization */}
 {i === (hive.configuration?.brood_boxes_full || hive.configuration?.brood_boxes || 1) - 1 && hive.configuration?.frame_orientation && (
 <div className="absolute bottom-1 left-1/2 -translate-x-1/2 pointer-events-none">
 {hive.configuration?.frame_orientation === 'warm' ? (
 <div className="flex flex-col gap-0.5">
 <div className="w-16 h-0.5 bg-amber-700 opacity-60"></div>
 <div className="w-16 h-0.5 bg-amber-700 opacity-60"></div>
 <div className="w-16 h-0.5 bg-amber-700 opacity-60"></div>
 </div>
 ) : (
 <div className="flex gap-0.5">
 <div className="w-0.5 h-4 bg-amber-700 opacity-60"></div>
 <div className="w-0.5 h-4 bg-amber-700 opacity-60"></div>
 <div className="w-0.5 h-4 bg-amber-700 opacity-60"></div>
 </div>
 )}
 </div>
 )}
 </div>
 ))}

 {/* Varroa Mesh Floor */}
 <div className="w-full relative">
 <div className={`w-full h-6 ${hive.configuration.varroa_mesh_floor === 'open' ? 'bg-surface-secondary' : 'bg-amber-700'} border-2 border-amber-900 rounded flex items-center justify-center text-xs font-semibold`}>
 {hive.configuration.varroa_mesh_floor === 'open' ? '▒▒▒' : '███'}
 </div>
 {/* Hive stand feet */}
 <div className="flex justify-between px-2 mt-0.5">
 <div className="w-3 h-2 bg-amber-900 rounded-sm"></div>
 <div className="w-3 h-2 bg-amber-900 rounded-sm"></div>
 <div className="w-3 h-2 bg-amber-900 rounded-sm"></div>
 <div className="w-3 h-2 bg-amber-900 rounded-sm"></div>
 </div>
 </div>
 </div>

 {/* Previous super readings — shared prior-inspection date for the "was X%" notes above */}
 {hive.previous_super_fullness_date && anySuperFullnessChanged && (
 <p className="mt-1 mb-2 text-sm text-text-tertiary">
 Previous readings: {new Date(hive.previous_super_fullness_date).toLocaleDateString('en-IE')}
 </p>
 )}

 {/* Configuration Details */}
 <div className="grid grid-cols-2 gap-2 text-sm text-text-primary">
 {hive.configuration.feeder_type && (
 <div className="flex items-center gap-1">
 <span>🍯</span>
 <span className="capitalize">{hive.configuration.feeder_type} feeder</span>
 </div>
 )}
 {hive.configuration.entrance_reducer && (
 <div className="flex items-center gap-1">
 <span>🚪</span>
 <span>Entrance reducer</span>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Edit is available to the owner and to team members of the shared apiary
     (matches hives RLS). Delete stays owner-only. */}
 {/* Edit is available to the owner and to team members of the shared apiary
     (matches hives RLS). Archive, Unarchive and Delete live in the overflow
     menu: Delete is irreversible and no longer sits beside a safe action. */}
 {(isOwner || hive.is_shared) && (
 <Button
 onClick={() => onEdit(hive)}
 className="w-full px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900"
 >
 Edit
 </Button>
 )}
 </div>
 )
}

