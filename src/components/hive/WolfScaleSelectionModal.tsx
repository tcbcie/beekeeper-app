'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Scale, Check, AlertCircle, Unlink } from 'lucide-react'
import type { WolfScale } from '@/lib/wolf-waagen-api'

interface EnrichedScale extends WolfScale {
  assigned_to: {
    hiveId: string
    hiveNumber: string
    apiaryName?: string
  } | null
}

interface WolfScaleSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  hiveId: string
  hiveNumber: string
  currentScaleId: string | null
  onScaleSelect: (scaleId: string | null, scaleName: string | null) => Promise<void>
}

export default function WolfScaleSelectionModal({
  isOpen,
  onClose,
  hiveId,
  hiveNumber,
  currentScaleId,
  onScaleSelect,
}: WolfScaleSelectionModalProps) {
  const [scales, setScales] = useState<EnrichedScale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<string | null>(null)

  const fetchScales = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/wolf-waagen/scales', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch scales')
      }

      const data = await response.json()
      setScales(data.scales || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scales')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchScales()
    }
  }, [isOpen, fetchScales])

  const handleSelect = async (scale: EnrichedScale | null) => {
    const scaleId = scale?.scale_id || null
    const scaleName = scale ? `${scale.serial_number} (${scale.scale_id})` : null

    setSelecting(scaleId)
    try {
      await onScaleSelect(scaleId, scaleName)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign scale')
    } finally {
      setSelecting(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface dark:bg-surface rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Scale size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-foreground">
              Select Wolf Scale for Hive {hiveNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-tertiary hover:text-foreground rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-16 bg-sage-200 dark:bg-slate-700 rounded-lg"></div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            </div>
          ) : scales.length === 0 ? (
            <div className="text-center py-8">
              <Scale size={48} className="mx-auto mb-4 text-text-tertiary" />
              <p className="text-text-secondary">No scales found in your Wolf Waagen account</p>
              <p className="text-sm text-text-tertiary mt-2">
                Contact Wolf Waagen support to verify your API token
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Option to remove current assignment */}
              {currentScaleId && (
                <button
                  onClick={() => handleSelect(null)}
                  disabled={selecting !== null}
                  className="w-full p-4 rounded-lg border-2 border-dashed border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <Unlink size={20} className="text-red-500" />
                    <div>
                      <p className="font-medium text-red-700 dark:text-red-300">Remove Scale</p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Disconnect the current Wolf scale from this hive
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* Scale list */}
              {scales.map(scale => {
                const isCurrentScale = scale.scale_id === currentScaleId
                const isAssignedElsewhere = scale.assigned_to && scale.assigned_to.hiveId !== hiveId

                return (
                  <button
                    key={scale.scale_id}
                    onClick={() => handleSelect(scale)}
                    disabled={selecting !== null}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-colors disabled:opacity-50 ${
                      isCurrentScale
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-border hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Scale size={20} className={isCurrentScale ? 'text-blue-600' : 'text-text-tertiary'} />
                        <div>
                          <p className="font-medium text-foreground">{scale.serial_number}</p>
                          <p className="text-sm text-text-tertiary">
                            ID: {scale.scale_id} | {scale.hardware_key}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {scale.latest_transmission_timestamp
                              ? `Last seen: ${new Date(scale.latest_transmission_timestamp).toLocaleString()}`
                              : 'No data yet'
                            }
                          </p>
                          {isAssignedElsewhere && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Currently assigned to Hive {scale.assigned_to?.hiveNumber}
                              {scale.assigned_to?.apiaryName && ` at ${scale.assigned_to.apiaryName}`}
                            </p>
                          )}
                        </div>
                      </div>
                      {isCurrentScale && (
                        <Check size={20} className="text-blue-600" />
                      )}
                      {selecting === scale.scale_id && (
                        <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-sage-50 dark:bg-slate-800/50">
          <p className="text-xs text-text-tertiary text-center">
            Scales are managed by Wolf Waagen
          </p>
        </div>
      </div>
    </div>
  )
}
