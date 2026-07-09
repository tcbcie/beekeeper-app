'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, MoreVertical, ArchiveRestore, Scale, Clock, QrCode } from 'lucide-react'
import type { Hive } from '@/types/hive'
import { queenStatusBadgeClass } from '@/types/queen'
import Button from '@/components/ui/Button'
import { formatQueenlessLabel } from '@/lib/queenless'
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
}

export default function HiveListCard({ hive, userId, onEdit, onDelete, onUnarchive, openMenuId, setOpenMenuId, selectionMode = false, selected = false, onToggleSelect }: HiveListCardProps) {
 const router = useRouter()

 // Bulk actions only ever write to the user's own hives (RLS rejects others'),
 // so the selection checkbox is shown for owned hives only.
 const isOwner = hive.user_id === userId

 // Days since last inspection badge. Must use last_inspection_date specifically —
 // last_record covers any record type (inspections, varroa treatments, feedings,
 // harvests), so a recent treatment would mask an older overdue inspection.
 const daysSinceInspection = hive.last_inspection_date
 ? Math.floor((Date.now() - new Date(hive.last_inspection_date).getTime()) / (1000 * 60 * 60 * 24))
 : null

 return (
 <div className={`bg-surface dark:bg-surface rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border min-h-[280px] ${selected ? 'border-forest-500 ring-2 ring-forest-500' : 'border-border'}`}>
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
 onClick={() => router.push(`/dashboard/hives/${hive.id}`)}
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
 className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-surface-secondary text-text-primary border border-border max-w-full whitespace-nowrap"
 >
 <QrCode size={12} className="flex-shrink-0" />
 <span className="truncate">{hive.qr_tag_code}</span>
 </span>
 )}
 </div>
 )}
 {hive.is_shared && hive.team_name && (
 <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-medium rounded flex items-center gap-1 w-fit border border-blue-300 dark:border-blue-800">
 <span>👥</span>
 <span>Shared via {hive.team_name}</span>
 </span>
 )}
 {!hive.is_shared && hive.shared_with_team && (
 <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs font-medium rounded flex items-center gap-1 w-fit border border-purple-300 dark:border-purple-800">
 <span>📤</span>
 <span>Shared with {hive.shared_with_team}</span>
 </span>
 )}
 {hive.archived_at && (
 <span className="px-2 py-0.5 bg-surface dark:bg-surface-elevated text-text-primary text-xs font-medium rounded flex items-center gap-1 w-fit border border-border">
 <span>📦</span>
 <span>Archived {new Date(hive.archived_at).toLocaleDateString()}</span>
 </span>
 )}
 {hive.active_tasks_count !== undefined && hive.active_tasks_count > 0 && (
 <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded flex items-center gap-1 w-fit border border-amber-400 dark:border-amber-700">
 <span>📋</span>
 <span className="font-bold">{hive.active_tasks_count}</span>
 <span>Active Task{hive.active_tasks_count > 1 ? 's' : ''}</span>
 </span>
 )}
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
 hive.status === 'active' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800' :
 hive.status === 'archived' ? 'bg-surface dark:bg-surface-elevated text-text-primary border border-border' :
 'bg-surface dark:bg-surface-elevated text-text-primary border border-border'
 }`}>
 {hive.status}
 </span>
 {hive.is_queenless && !hive.archived_at && (
 <span className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
 {formatQueenlessLabel(hive.queenless_reason)}
 </span>
 )}
 {/* Days since inspection badge */}
 {!hive.archived_at && (
 daysSinceInspection !== null ? (
 <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border ${
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
 <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border bg-surface-secondary text-text-secondary border-border">
 <Clock size={10} />
 Never
 </span>
 )
 )}
 {hive.archived_at && (
 <div className="relative context-menu-container">
 <Button
 onClick={(e) => {
 e.stopPropagation()
 setOpenMenuId(openMenuId === hive.id ? null : hive.id)
 }}
 className="p-1 hover:bg-surface-secondary rounded transition-colors"
 aria-label="More options"
 >
 <MoreVertical size={16} className="text-text-secondary" />
 </Button>
 {openMenuId === hive.id && (
 <div className="absolute right-0 top-full mt-1 bg-surface dark:bg-surface-elevated border border-border rounded-lg shadow-lg z-10 min-w-[160px]">
 <Button
 onClick={(e) => {
 e.stopPropagation()
 onUnarchive(hive)
 }}
 className="w-full px-4 py-2 text-left text-sm hover:bg-forest-100 dark:hover:bg-forest-900/50 text-forest-600 dark:text-forest-400 flex items-center gap-2 rounded-lg transition-colors"
 >
 <ArchiveRestore size={16} />
 <span>Unarchive</span>
 </Button>
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
 <span className="text-xs text-text-tertiary ml-1">
 ({hive.row_in_apiary ? `Row ${hive.row_in_apiary}` : ''}{hive.row_in_apiary && hive.order_in_apiary ? ', ' : ''}{hive.order_in_apiary ? `Hive ${hive.order_in_apiary}` : ''})
 </span>
 )}
 </div>
 <div className="flex items-center gap-2">
 <span className="text-text-tertiary">👑</span>
 {hive.queens?.id ? (
 <span className="flex items-center gap-1">
 {hive.queens.marking_color && (
 <span className={`px-2 py-0.5 rounded text-xs font-medium ${
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
 <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${queenStatusBadgeClass(hive.queens.status)}`}>
 {hive.queens.status === 'virgin' ? 'Virgin' : 'Cell'}
 </span>
 )}
 </span>
 ) : hive.queen_marked ? (
 <span className="flex items-center gap-1">
 {hive.queen_marking_color && (
 <span className={`px-2 py-0.5 rounded text-xs font-medium ${
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
 </div>
 {hive.last_record && (
 <div className="flex items-center gap-2">
 <span className="text-text-tertiary">📋</span>
 <span className="text-xs">
 <span className="font-medium text-text-secondary">{hive.last_record.type}</span>
 <span className="text-text-tertiary"> &bull; {new Date(hive.last_record.date).toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
 </span>
 </div>
 )}
 {hive.notes && (
 <div className="mt-3 p-2 bg-surface dark:bg-surface-elevated rounded text-text-primary text-xs border border-border">
 {hive.notes}
 </div>
 )}
 </div>

 {hive.configuration && (
 <div className="mb-4 p-3 bg-surface dark:bg-surface-elevated rounded border border-forest-200 dark:border-forest-900/50">
 <div className="flex items-center justify-between mb-3">
 <div className="text-xs font-semibold text-forest-600 dark:text-forest-400">Hive Setup</div>
 {hive.configuration.hive_size && (
 <span className={`px-2 py-0.5 rounded text-xs font-medium ${
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
 <div className="text-xs text-text-tertiary">
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
 {/* Honey Supers */}
 {Array.from({ length: hive.configuration.honey_supers || 0 }).map((_, i) => {
 const fullness = hive.last_super_fullness?.[i]
 const hasFullness = typeof fullness === 'number' && Number.isFinite(fullness)
 return (
 <div key={`super-${i}`} className={`w-full h-8 bg-yellow-300 border-2 border-yellow-500 rounded flex items-center text-xs font-semibold ${hasFullness ? 'justify-between px-2' : 'justify-center'}`}>
 <span>🍯 Super {i + 1}</span>
 {hasFullness && <SuperFullnessGauge value={fullness} />}
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
 <div key={`brood-half-${i}`} className="w-full h-8 bg-amber-300 border-2 border-amber-600 rounded flex items-center justify-center text-xs font-semibold">
 🐝 Brood Half {i + 1}
 </div>
 ))}

 {/* Full-Size Brood Boxes */}
 {Array.from({ length: hive.configuration.brood_boxes_full || hive.configuration.brood_boxes || 0 }).map((_, i) => (
 <div key={`brood-full-${i}`} className="w-full h-10 bg-amber-200 border-2 border-amber-500 rounded flex items-center justify-center text-xs font-semibold relative">
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

 {/* Configuration Details */}
 <div className="grid grid-cols-2 gap-2 text-xs text-text-primary">
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

 {/* Edit/Delete are owner-only; team members can view shared hives but not modify them (matches hives RLS). */}
 {hive.user_id === userId && (
 <div className="flex gap-2">
 <Button
 onClick={() => onEdit(hive)}
 className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/70 border border-blue-300 dark:border-blue-800 min-h-[44px]"
 >
 Edit
 </Button>
 <Button
 onClick={() => onDelete(hive.id)}
 className="flex-1 px-3 py-2 text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/70 border border-red-300 dark:border-red-800 min-h-[44px]"
 >
 Delete
 </Button>
 </div>
 )}
 </div>
 )
}

