'use client'

import Link from 'next/link'
import { Archive, ArchiveRestore, ChevronRight, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import type { Hive } from '@/types/hive'
import IconButton from '@/components/ui/IconButton'
import ModalShell from '@/components/ui/ModalShell'
import { formatQueenlessLabel } from '@/lib/queenless'
import { formatRemovalLabel } from '@/lib/treatment-removal'
import { daysSince, getCurrentDate } from '@/lib/date-utils'
import { inspectedAgoText, inspectionAgeTone, type InspectionAgeTone } from '@/lib/inspection-age'
import { formatStoresDate, STORES_BAND_TEXT_CLASSES, storesBand, storesSeasonStart, storesWord } from '@/lib/stores-level'

interface HiveListRowProps {
  hive: Hive
  userId: string | null
  onEdit: (hive: Hive) => void
  onDelete: (id: string) => void
  onUnarchive: (hive: Hive) => void
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  selectionMode: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
  highlighted: boolean
  onOpen: (id: string) => void
}

const SHEET_ACTION = 'flex min-h-[56px] w-full items-center gap-3 px-4 text-left text-base font-medium'

const INSPECTION_TEXT_CLASSES: Record<InspectionAgeTone, string> = {
  recent: 'text-green-800 dark:text-green-300',
  'due-soon': 'text-amber-800 dark:text-amber-300',
  overdue: 'text-red-800 dark:text-red-300',
  neutral: 'text-text-secondary',
}

/**
 * A hive as one row on a phone, showing only what decides whether it needs a visit. The whole row
 * opens the hive; everything else is on the hive's own screen. Same permissions as HiveListCard.
 */
export default function HiveListRow({
  hive, userId, onEdit, onDelete, onUnarchive, openMenuId, setOpenMenuId,
  selectionMode, selected, onToggleSelect, highlighted, onOpen,
}: HiveListRowProps) {
  const isOwner = hive.user_id === userId
  const canEdit = isOwner || Boolean(hive.is_shared)
  const menuOpen = openMenuId === hive.id

  // last_inspection_date specifically: last_record covers any record type, so a recent
  // treatment would mask an overdue inspection.
  const days = daysSince(hive.last_inspection_date)

  const storesSince = hive.archived_at ? null : storesSeasonStart(getCurrentDate())
  const storesLevel = storesSince && hive.last_stores_date && hive.last_stores_date >= storesSince
    ? hive.last_stores_level ?? null
    : null
  const storesDate = formatStoresDate(hive.last_stores_date)
  const queenName = hive.queens?.queen_number
  const details = [hive.apiaries?.name, queenName && `Queen ${queenName}`].filter(Boolean).join(' · ')

  const body = (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 break-words text-lg font-bold text-foreground">{hive.hive_number}</span>
        {!hive.archived_at && (
          <span className={`flex-shrink-0 text-sm font-semibold ${INSPECTION_TEXT_CLASSES[inspectionAgeTone(days)]}`}>
            {inspectedAgoText(days)}
          </span>
        )}
      </span>
      {details && <span className="block truncate text-sm text-text-secondary">{details}</span>}
      <span className="flex flex-wrap gap-x-3 text-sm font-semibold empty:hidden">
        {hive.archived_at && <span className="text-text-secondary">Archived</span>}
        {hive.is_queenless && !hive.archived_at && (
          <span className="text-red-800 dark:text-red-300">{formatQueenlessLabel(hive.queenless_reason)}</span>
        )}
        {!hive.archived_at && hive.active_treatment && (
          <span className={hive.active_treatment.overdue ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}>
            {formatRemovalLabel(hive.active_treatment.treatment_type, {
              planned_removal_date: hive.active_treatment.planned_removal_date,
              removed_date: null,
            })}
          </span>
        )}
        {(hive.active_tasks_count ?? 0) > 0 && (
          <span className="text-amber-800 dark:text-amber-300">
            {hive.active_tasks_count} {hive.active_tasks_count === 1 ? 'task' : 'tasks'}
          </span>
        )}
        {storesLevel !== null && storesBand(storesLevel) !== 'enough' && (
          <span className={STORES_BAND_TEXT_CLASSES[storesBand(storesLevel)]}>
            Stores: {storesWord(storesLevel)}{storesDate && `, ${storesDate}`}
          </span>
        )}
      </span>
    </>
  )

  return (
    <div
      id={`hive-card-${hive.id}`}
      className={`flex items-center bg-surface ${selected || highlighted ? 'ring-2 ring-inset ring-forest-500' : ''}`}
    >
      {selectionMode ? (
        isOwner ? (
          <label className="flex min-h-[72px] min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(hive.id)}
              aria-label={`Select hive ${hive.hive_number}`}
              className="h-6 w-6 flex-shrink-0 rounded border-border text-forest-600 focus:ring-forest-500"
            />
            <span className="block min-w-0 flex-1">{body}</span>
          </label>
        ) : (
          <div className="min-h-[72px] min-w-0 flex-1 px-3 py-2 opacity-70">{body}</div>
        )
      ) : (
        <Link
          href={`/dashboard/hives/${hive.id}`}
          onClick={() => onOpen(hive.id)}
          className="flex min-h-[72px] min-w-0 flex-1 items-center gap-1 py-2 pl-3"
        >
          <span className="block min-w-0 flex-1">{body}</span>
          <ChevronRight size={20} className="flex-shrink-0 text-text-tertiary" aria-hidden="true" />
        </Link>
      )}

      {canEdit && !selectionMode && (
        <div className="flex-shrink-0 context-menu-container">
          <IconButton
            onClick={() => setOpenMenuId(menuOpen ? null : hive.id)}
            aria-label={`More options for hive ${hive.hive_number}`}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={20} />
          </IconButton>
          {menuOpen && (
            <ModalShell
              title={`Hive ${hive.hive_number}`}
              onClose={() => setOpenMenuId(null)}
              closeOnBackdrop
              bodyClassName="py-1 context-menu-container"
            >
              <button
                type="button"
                className={`${SHEET_ACTION} text-foreground`}
                onClick={() => {
                  setOpenMenuId(null)
                  onEdit(hive)
                }}
              >
                <Pencil size={20} aria-hidden="true" />
                Edit
              </button>
              {isOwner && (hive.archived_at ? (
                <button
                  type="button"
                  className={`${SHEET_ACTION} text-forest-800 dark:text-forest-300`}
                  onClick={() => {
                    setOpenMenuId(null)
                    onUnarchive(hive)
                  }}
                >
                  <ArchiveRestore size={20} aria-hidden="true" />
                  Unarchive
                </button>
              ) : (
                <>
                  {/* Archive keeps the history and can be undone, so it leads. It goes to the
                      archive form because archiving collects a reason and runs a cascade. */}
                  <Link
                    href={`/dashboard/records?hive=${hive.id}&type=archive`}
                    onClick={() => setOpenMenuId(null)}
                    className={`${SHEET_ACTION} text-foreground`}
                  >
                    <Archive size={20} aria-hidden="true" />
                    Archive
                  </Link>
                  <div className="my-1 border-t border-border" aria-hidden="true" />
                  <button
                    type="button"
                    className={`${SHEET_ACTION} text-red-700 dark:text-red-300`}
                    onClick={() => {
                      setOpenMenuId(null)
                      onDelete(hive.id)
                    }}
                  >
                    <Trash2 size={20} aria-hidden="true" />
                    Delete permanently
                  </button>
                </>
              ))}
            </ModalShell>
          )}
        </div>
      )}
    </div>
  )
}
