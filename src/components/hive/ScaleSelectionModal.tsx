'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Scale, Check, AlertCircle, Unlink } from 'lucide-react'
import type { BeepDevice } from '@/lib/beep-api'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'

interface EnrichedDevice extends BeepDevice {
  assigned_to: {
    hiveId: string
    hiveNumber: string
    apiaryName?: string
  } | null
}

interface ScaleSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  hiveId: string
  hiveNumber: string
  currentDeviceId: string | null
  onDeviceSelect: (deviceId: string | null, deviceName: string | null) => Promise<void>
}

export default function ScaleSelectionModal({
  isOpen,
  onClose,
  hiveId,
  hiveNumber,
  currentDeviceId,
  onDeviceSelect,
}: ScaleSelectionModalProps) {
  const [devices, setDevices] = useState<EnrichedDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/beep/devices', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch devices')
      }

      const data = await response.json()
      setDevices(data.devices || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchDevices()
    }
  }, [isOpen, fetchDevices])

  const handleSelect = async (device: EnrichedDevice | null) => {
    const deviceId = device ? String(device.id) : null
    const deviceName = device?.name || null

    setSelecting(deviceId)
    try {
      await onDeviceSelect(deviceId, deviceName)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign device')
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
            <Scale size={20} className="text-amber-600" />
            <h2 className="text-lg font-semibold text-foreground">
              Select Scale for Hive {hiveNumber}
            </h2>
          </div>
          <IconButton
            onClick={onClose}
            size="xs"
            className="text-text-tertiary hover:text-foreground"
          >
            <X size={20} />
          </IconButton>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-16 bg-surface-secondary rounded-lg"></div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8">
              <Scale size={48} className="mx-auto mb-4 text-text-tertiary" />
              <p className="text-text-secondary">No devices found in your BEEP account</p>
              <p className="text-sm text-text-tertiary mt-2">
                Make sure your scales are registered at app.beep.nl
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Option to remove current assignment */}
              {currentDeviceId && (
                <Button
                  onClick={() => handleSelect(null)}
                  disabled={selecting !== null}
                  tone="danger"
                  fullWidth
                  className="h-auto justify-start rounded-lg border-2 border-dashed border-red-300 p-4 text-left transition-colors disabled:opacity-50 dark:border-red-700"
                >
                  <div className="flex items-center gap-3">
                    <Unlink size={20} className="text-red-500" />
                    <div>
                      <p className="font-medium text-red-700 dark:text-red-300">Remove Scale</p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Disconnect the current scale from this hive
                      </p>
                    </div>
                  </div>
                </Button>
              )}

              {/* Device list */}
              {devices.map(device => {
                const isCurrentDevice = String(device.id) === currentDeviceId
                const isAssignedElsewhere = device.assigned_to && device.assigned_to.hiveId !== hiveId

                return (
                  <Button
                    key={device.id}
                    onClick={() => handleSelect(device)}
                    disabled={selecting !== null}
                    tone="neutral"
                    fullWidth
                    className={`h-auto justify-start rounded-lg border-2 p-4 text-left transition-colors disabled:opacity-50 ${
                      isCurrentDevice
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-border hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Scale size={20} className={isCurrentDevice ? 'text-amber-600' : 'text-text-tertiary'} />
                        <div>
                          <p className="font-medium text-foreground">{device.name || `Device ${device.id}`}</p>
                          <p className="text-sm text-text-tertiary">
                            {device.last_message_received
                              ? `Last seen: ${new Date(device.last_message_received).toLocaleString()}`
                              : 'No data yet'
                            }
                          </p>
                          {isAssignedElsewhere && (
                            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                              Currently assigned to Hive {device.assigned_to?.hiveNumber}
                              {device.assigned_to?.apiaryName && ` at ${device.assigned_to.apiaryName}`}
                            </p>
                          )}
                        </div>
                      </div>
                      {isCurrentDevice && (
                        <Check size={20} className="text-amber-600" />
                      )}
                      {selecting === String(device.id) && (
                        <div className="animate-spin h-5 w-5 border-2 border-amber-600 border-t-transparent rounded-full"></div>
                      )}
                    </div>
                  </Button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-secondary/50">
          <p className="text-sm text-text-tertiary text-center">
            Devices are managed in your BEEP account at app.beep.nl
          </p>
        </div>
      </div>
    </div>
  )
}
