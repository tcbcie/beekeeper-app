'use client'

import { Edit2, Trash2, Calendar, Crown, Egg } from 'lucide-react'

interface NucInspection {
  id: string
  nuc_id: string
  inspection_date: string
  queen_seen: boolean
  queen_status: string | null
  eggs_present: boolean
  larvae_present: boolean
  population: string | null
  temperament: string | null
  notes: string | null
  created_at: string
}

interface NucInspectionCardProps {
  inspection: NucInspection
  onEdit: () => void
  onDelete: () => void
}

const getQueenStatusBadge = (status: string | null) => {
  if (!status) return null
  const styles: Record<string, string> = {
    virgin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    mated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    laying: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    missing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    dead: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  }
  return styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
}

const getPopulationBadge = (population: string | null) => {
  if (!population) return null
  const styles: Record<string, string> = {
    strong: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    moderate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    weak: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  }
  return styles[population] || 'bg-gray-100 text-gray-800'
}

const getTemperamentBadge = (temperament: string | null) => {
  if (!temperament) return null
  const styles: Record<string, string> = {
    calm: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    nervous: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    aggressive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  }
  return styles[temperament] || 'bg-gray-100 text-gray-800'
}

export default function NucInspectionCard({ inspection, onEdit, onDelete }: NucInspectionCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-border p-3 md:p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2 md:gap-3">
        {/* Left Side: Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Calendar size={14} />
              <span className="font-medium">{formatDate(inspection.inspection_date)}</span>
            </div>
            {inspection.queen_status && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getQueenStatusBadge(inspection.queen_status)}`}>
                {inspection.queen_status.charAt(0).toUpperCase() + inspection.queen_status.slice(1)}
              </span>
            )}
          </div>

          {/* Queen & Brood Indicators */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {inspection.queen_seen && (
              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded flex items-center gap-1">
                <Crown size={12} /> Queen Seen
              </span>
            )}
            {inspection.eggs_present && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded flex items-center gap-1">
                <Egg size={12} /> Eggs
              </span>
            )}
            {inspection.larvae_present && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                Larvae
              </span>
            )}
          </div>

          {/* Population & Temperament */}
          <div className="flex flex-wrap gap-2 text-sm">
            {inspection.population && (
              <div className="flex items-center gap-1">
                <span className="text-text-tertiary text-xs">Pop:</span>
                <span className={`px-2 py-0.5 text-xs rounded ${getPopulationBadge(inspection.population)}`}>
                  {inspection.population.charAt(0).toUpperCase() + inspection.population.slice(1)}
                </span>
              </div>
            )}
            {inspection.temperament && (
              <div className="flex items-center gap-1">
                <span className="text-text-tertiary text-xs">Temp:</span>
                <span className={`px-2 py-0.5 text-xs rounded ${getTemperamentBadge(inspection.temperament)}`}>
                  {inspection.temperament.charAt(0).toUpperCase() + inspection.temperament.slice(1)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {inspection.notes && (
            <div className="mt-2 p-2 bg-sage-50 dark:bg-slate-700/50 rounded text-sm text-text-secondary">
              {inspection.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
