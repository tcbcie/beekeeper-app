'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ActivateSubscriptionResponse } from '@/types/subscription'
import { X, Check, AlertCircle, CreditCard, Tag } from 'lucide-react'

interface RenewSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type PaymentMethod = 'code' | 'card'

export default function RenewSubscriptionModal({ isOpen, onClose, onSuccess }: RenewSubscriptionModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('code')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<ActivateSubscriptionResponse | null>(null)

  if (!isOpen) return null

  const handleCodeSubmit = async (e: React.FormEvent) => {
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

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    // Placeholder for credit card payment integration
    alert('Credit card payment integration coming soon!')
  }

  const handleClose = () => {
    setCode('')
    setError('')
    setSuccess(null)
    setPaymentMethod('code')
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
              Choose your payment method
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
          <div className="space-y-4">
            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('code')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'code'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <Tag className="w-5 h-5" />
                <span className="font-medium">Code</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="font-medium">Card</span>
              </button>
            </div>

            {/* Code Payment Form */}
            {paymentMethod === 'code' && (
              <form onSubmit={handleCodeSubmit} className="space-y-4">
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

            {/* Credit Card Payment Form */}
            {paymentMethod === 'card' && (
              <form onSubmit={handleCardPayment} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-center">
                  <CreditCard className="w-12 h-12 mx-auto text-blue-600 mb-3" />
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Credit Card Payment
                  </p>
                  <p className="text-xs text-blue-700">
                    Payment integration coming soon! For now, please use a subscription code or contact an administrator.
                  </p>
                </div>

                <div className="space-y-3 opacity-50 pointer-events-none">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="•••• •••• •••• ••••"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="•••"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md opacity-50 cursor-not-allowed font-medium"
                  >
                    Pay with Card
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
