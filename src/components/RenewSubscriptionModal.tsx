'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ActivateSubscriptionResponse } from '@/types/subscription'
import { X, Check, AlertCircle } from 'lucide-react'

interface RenewSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function RenewSubscriptionModal({ isOpen, onClose, onSuccess }: RenewSubscriptionModalProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<ActivateSubscriptionResponse | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const { data, error: rpcError } = await supabase
        .rpc('activate_subscription', { sub_code: code.trim() })

      if (rpcError) throw rpcError

      const result = data as ActivateSubscriptionResponse

      if (!result.success) {
        setError(result.message)
        return
      }

      setSuccess(result)
      setCode('')

      // Wait a moment to show success message, then close and refresh
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)
    } catch (err) {
      console.error('Error activating subscription:', err)
      setError('Failed to activate subscription. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCode('')
    setError('')
    setSuccess(null)
    onClose()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Renew Subscription</h3>
            <p className="text-sm text-gray-600 mt-1">
              Enter your renewal code to extend your subscription
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-md">
              <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Subscription activated successfully!
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Your subscription has been extended
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">New expiration date:</span>
                <span className="font-medium text-gray-900">
                  {success.expires_at && formatDate(success.expires_at)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duration added:</span>
                <span className="font-medium text-gray-900">
                  {success.duration_days} days
                </span>
              </div>
            </div>

            <p className="text-xs text-center text-gray-500">
              Refreshing subscription status...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Enter code"
                autoComplete="off"
                autoFocus
                required
                disabled={loading}
              />
              <p className="mt-2 text-xs text-gray-500">
                Don&apos;t have a renewal code? Contact an admin to get one.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> If your subscription is still active, the new code will extend from your current expiration date. If expired, it will start from today.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="flex-1 py-2 px-4 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Activating...
                  </span>
                ) : (
                  'Activate Subscription'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
