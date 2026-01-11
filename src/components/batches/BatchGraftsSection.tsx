'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Graft {
  id: string
  batch_id: string
  cell_number: number
  status: string
  notes: string | null
}

interface BatchGraftsSectionProps {
  batchId: string
  userId: string
  cellCount: number | null
}

const GRAFT_STATUSES = [
  { value: 'grafted', label: 'Grafted', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'caged', label: 'Caged', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'emerged', label: 'Emerged', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'in_nuc', label: 'In Nuc', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { value: 'mated', label: 'Mated', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  { value: 'sold', label: 'Sold', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
]

export default function BatchGraftsSection({ batchId, userId, cellCount }: BatchGraftsSectionProps) {
  const toast = useToast()
  const [grafts, setGrafts] = useState<Graft[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGrafts = useCallback(async () => {
    const { data, error } = await supabase
      .from('batch_grafts')
      .select('*')
      .eq('batch_id', batchId)
      .eq('user_id', userId)
      .order('cell_number')

    if (error) {
      console.error('Error fetching grafts:', error)
    } else if (data) {
      setGrafts(data)
    }
    setLoading(false)
  }, [batchId, userId])

  useEffect(() => {
    fetchGrafts()
  }, [fetchGrafts])

  const generateGrafts = async () => {
    if (!cellCount || cellCount <= 0) {
      toast.error('Set cell count first')
      return
    }

    // Check if grafts already exist
    if (grafts.length > 0) {
      if (!confirm(`This will add ${cellCount} new grafts. Existing grafts will be kept. Continue?`)) {
        return
      }
    }

    const existingNumbers = grafts.map(g => g.cell_number)
    const newGrafts = []
    const nextNumber = Math.max(0, ...existingNumbers) + 1

    for (let i = 0; i < cellCount; i++) {
      newGrafts.push({
        batch_id: batchId,
        cell_number: nextNumber + i,
        status: 'grafted',
        user_id: userId,
      })
    }

    try {
      const { error } = await supabase
        .from('batch_grafts')
        .insert(newGrafts)

      if (error) throw error
      toast.success(`${cellCount} grafts created`)
      fetchGrafts()
    } catch (error) {
      console.error('Error creating grafts:', error)
      toast.error('Failed to create grafts')
    }
  }

  const updateGraftStatus = async (graftId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('batch_grafts')
        .update({ status: newStatus })
        .eq('id', graftId)

      if (error) throw error
      fetchGrafts()
    } catch (error) {
      console.error('Error updating graft:', error)
      toast.error('Failed to update graft')
    }
  }

  const deleteGraft = async (graftId: string) => {
    if (!confirm('Delete this graft?')) return

    try {
      const { error } = await supabase
        .from('batch_grafts')
        .delete()
        .eq('id', graftId)

      if (error) throw error
      toast.success('Graft deleted')
      fetchGrafts()
    } catch (error) {
      console.error('Error deleting graft:', error)
      toast.error('Failed to delete graft')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = GRAFT_STATUSES.find(s => s.value === status)
    return statusConfig?.color || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading grafts...</div>
  }

  // Summary counts
  const statusCounts = GRAFT_STATUSES.reduce((acc, s) => {
    acc[s.value] = grafts.filter(g => g.status === s.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold text-foreground">Individual Cells/Grafts</h4>
        <button
          type="button"
          onClick={generateGrafts}
          className="px-3 py-1.5 text-sm bg-forest-600 text-white rounded hover:bg-forest-700 flex items-center gap-1"
        >
          <Plus size={14} />
          Generate from Cell Count
        </button>
      </div>

      {/* Status Summary */}
      {grafts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {GRAFT_STATUSES.filter(s => statusCounts[s.value] > 0).map(s => (
            <span key={s.value} className={`px-2 py-1 rounded text-xs font-medium ${s.color}`}>
              {s.label}: {statusCounts[s.value]}
            </span>
          ))}
        </div>
      )}

      {/* Grafts Grid */}
      {grafts.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          No grafts yet. Click &quot;Generate from Cell Count&quot; to create grafts based on your cell count.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {grafts.map(graft => (
            <div
              key={graft.id}
              className="bg-surface-elevated dark:bg-surface-elevated border border-border rounded-lg p-2 text-center"
            >
              <div className="font-medium text-foreground text-sm">#{graft.cell_number}</div>
              <select
                value={graft.status}
                onChange={(e) => updateGraftStatus(graft.id, e.target.value)}
                className={`w-full mt-1 px-1 py-0.5 text-xs rounded border-0 ${getStatusBadge(graft.status)}`}
              >
                {GRAFT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => deleteGraft(graft.id)}
                className="mt-1 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {grafts.length > 0 && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => fetchGrafts()}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      )}
    </div>
  )
}
