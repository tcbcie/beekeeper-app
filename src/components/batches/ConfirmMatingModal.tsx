'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'

interface Apiary {
  id: string
  name: string
}

interface ConfirmMatingModalProps {
  cellNumber: number
  recipientUserId: string | null
  currentMatingLocation: string | null
  currentMatingDate: string | null
  isConfirmed: boolean
  onConfirm: (matingDate: string, matingLocation: string) => Promise<boolean>
  onClear: () => Promise<boolean>
  onClose: () => void
}

export default function ConfirmMatingModal({
  cellNumber,
  recipientUserId,
  currentMatingLocation,
  currentMatingDate,
  isConfirmed,
  onConfirm,
  onClear,
  onClose,
}: ConfirmMatingModalProps) {
  const isExternal = !recipientUserId
  const today = new Date().toISOString().split('T')[0]

  // Form state
  const [matingDate, setMatingDate] = useState(currentMatingDate || today)
  const [selectedApiaryId, setSelectedApiaryId] = useState('')
  const [customLocation, setCustomLocation] = useState(currentMatingLocation || '')
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [loadingApiaries, setLoadingApiaries] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Keyboard escape handler for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, saving])

  // Fetch recipient's apiaries for app users
  useEffect(() => {
    if (isExternal || !recipientUserId) return

    let isCancelled = false
    setLoadingApiaries(true)

    const fetchApiaries = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .rpc('get_recipient_apiaries', { recipient_uuid: recipientUserId })

        if (isCancelled) return
        if (fetchError) throw fetchError

        setApiaries((data || []) as Apiary[])

        // If there's a current mating location, try to match it to an apiary
        if (currentMatingLocation) {
          const matchingApiary = (data || []).find(
            (a: Apiary) => a.name === currentMatingLocation
          )
          if (matchingApiary) {
            setSelectedApiaryId(matchingApiary.id)
            setCustomLocation('')
          } else {
            setCustomLocation(currentMatingLocation)
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching apiaries:', err)
        }
      } finally {
        if (!isCancelled) {
          setLoadingApiaries(false)
        }
      }
    }

    fetchApiaries()

    return () => {
      isCancelled = true
    }
  }, [recipientUserId, isExternal, currentMatingLocation])

  const handleApiaryChange = (apiaryId: string) => {
    setSelectedApiaryId(apiaryId)
    if (apiaryId) {
      const apiary = apiaries.find((a) => a.id === apiaryId)
      if (apiary) {
        setCustomLocation(apiary.name)
      }
    }
    setError('')
  }

  const handleCustomLocationChange = (value: string) => {
    setCustomLocation(value)
    // Clear apiary selection if user types custom location
    if (value && selectedApiaryId) {
      const selectedApiary = apiaries.find((a) => a.id === selectedApiaryId)
      if (selectedApiary && value !== selectedApiary.name) {
        setSelectedApiaryId('')
      }
    }
    setError('')
  }

  const validateForm = useCallback((): boolean => {
    if (!matingDate) {
      setError('Mating date is required')
      return false
    }
    // Validate date format and ensure not in future
    const dateObj = new Date(matingDate + 'T00:00:00')
    if (isNaN(dateObj.getTime())) {
      setError('Invalid date format')
      return false
    }
    const todayDate = new Date(today + 'T00:00:00')
    if (dateObj > todayDate) {
      setError('Mating date cannot be in the future')
      return false
    }
    if (!customLocation.trim()) {
      setError('Mating location is required')
      return false
    }
    return true
  }, [matingDate, customLocation, today])

  const handleConfirm = useCallback(async () => {
    if (!validateForm()) return

    setSaving(true)
    setError('')

    try {
      const success = await onConfirm(matingDate, customLocation.trim())
      if (success) {
        onClose()
      } else {
        setError('Failed to confirm mating')
      }
    } catch (err) {
      console.error('Error confirming mating:', err)
      setError('An error occurred')
    } finally {
      setSaving(false)
    }
  }, [validateForm, matingDate, customLocation, onConfirm, onClose])

  const handleClear = useCallback(async () => {
    setSaving(true)
    setError('')

    try {
      const success = await onClear()
      if (success) {
        onClose()
      } else {
        setError('Failed to clear mating confirmation')
      }
    } catch (err) {
      console.error('Error clearing mating:', err)
      setError('An error occurred')
    } finally {
      setSaving(false)
    }
  }, [onClear, onClose])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface dark:bg-surface rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {isConfirmed ? 'Update Mating Details' : 'Confirm Mating'}
            </h3>
            <p className="text-sm text-text-secondary">Cell #{cellNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-foreground rounded-lg hover:bg-surface-secondary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Mating Date */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Mating Date *
            </label>
            <input
              type="date"
              value={matingDate}
              onChange={(e) => setMatingDate(e.target.value)}
              max={today}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
            />
          </div>

          {/* Mating Location */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              <MapPin size={14} className="inline mr-1" />
              Mating Location *
            </label>

            {/* Apiary dropdown for app users */}
            {!isExternal && (loadingApiaries || apiaries.length > 0) && (
              <select
                value={selectedApiaryId}
                onChange={(e) => handleApiaryChange(e.target.value)}
                disabled={loadingApiaries}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground mb-2 disabled:opacity-50"
              >
                <option value="">{loadingApiaries ? 'Loading apiaries...' : 'Select apiary...'}</option>
                {apiaries.map((apiary) => (
                  <option key={apiary.id} value={apiary.id}>
                    {apiary.name}
                  </option>
                ))}
              </select>
            )}

            {/* Custom location text field */}
            <input
              type="text"
              value={customLocation}
              onChange={(e) => handleCustomLocationChange(e.target.value)}
              placeholder={isExternal ? 'Enter mating location' : 'Or enter custom location'}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
            />

            {!isExternal && (
              <p className="text-xs text-text-tertiary mt-1">
                Select from recipient&apos;s apiaries or enter a custom location
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border gap-3">
          <div>
            {isConfirmed && (
              <Button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                Clear Mating
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-surface-secondary text-foreground rounded-lg hover:bg-surface-elevated"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {saving ? 'Saving...' : isConfirmed ? 'Update' : 'Confirm Mating'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
