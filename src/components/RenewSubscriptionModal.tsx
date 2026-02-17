'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ActivateSubscriptionResponse } from '@/types/subscription'
import { X, Check, AlertCircle, CreditCard, Tag, Loader2 } from 'lucide-react'

interface RenewSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userId: string
}

type PaymentMethod = 'code' | 'card' | 'association_code'

interface Association {
  id: string
  name: string
  jurisdiction: string
  county_area: string
}

export default function RenewSubscriptionModal({ isOpen, onClose, onSuccess, userId }: RenewSubscriptionModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('code')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<ActivateSubscriptionResponse | null>(null)

  // Association code payment state
  const [associationCode, setAssociationCode] = useState('')
  const [associations, setAssociations] = useState<Association[]>([])

  // Load associations when modal opens and association code payment is selected
  useEffect(() => {
    if (isOpen && paymentMethod === 'association_code' && associations.length === 0) {
      loadAssociations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAssociations is stable, associations.length is intentionally excluded to only load once
  }, [isOpen, paymentMethod])

  const loadAssociations = async () => {
    try {
      const { data, error } = await supabase
        .from('beekeeping_associations')
        .select('id, name, jurisdiction, county_area')
        .eq('is_active', true)
        .order('jurisdiction')
        .order('name')

      if (error) throw error
      setAssociations(data || [])
    } catch (err) {
      console.error('Error loading associations:', err)
      setError('Failed to load associations')
    }
  }

  if (!isOpen) return null

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      // Step 1: Validate the code type before activation
      const { data: codeData, error: codeError } = await supabase
        .from('registration_codes')
        .select('id, code, code_type, is_active')
        .eq('code', code.trim().toUpperCase())
        .maybeSingle()

      if (codeError) {
        console.error('Error validating code:', codeError)
        setError('Error validating code. Please try again.')
        setLoading(false)
        return
      }

      if (!codeData) {
        setError('Invalid subscription code. Code not found.')
        setLoading(false)
        return
      }

      // Check if it's an association code (wrong tab!)
      if (codeData.code_type === 'association') {
        setError('This is an association member code. Please use the "Association Code" payment option (€12) instead.')
        setLoading(false)
        return
      }

      // Step 2: Activate the subscription
      const { data, error: rpcError } = await supabase
        .rpc('activate_subscription', { sub_code: code.trim() })

      if (rpcError) throw rpcError

      const result = data && typeof data === 'object' && 'success' in data
        ? (data as ActivateSubscriptionResponse)
        : { success: false, message: 'Unexpected response from server' } as ActivateSubscriptionResponse

      if (!result.success) {
        setError(result.message)
        setLoading(false)
        return
      }

      setSuccess(result)
      setCode('')

      // Wait a moment to show success message, then close and refresh
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)

      setLoading(false)
    } catch (err) {
      console.error('Error activating subscription:', err)
      setError('Failed to activate subscription. Please try again.')
      setLoading(false)
    }
  }

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Create Stripe checkout session for standard €24 payment
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          isAssociationMember: false,
          associationId: null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()

      // Redirect to Stripe checkout
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      console.error('Error creating checkout session:', err)
      setError(err instanceof Error ? err.message : 'Failed to start payment process. Please try again.')
      setLoading(false)
    }
  }

  const handleAssociationCodePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Step 1: Validate the association code
      const { data: codeData, error: codeError } = await supabase
        .from('registration_codes')
        .select('id, code, code_type, association_id, is_active, max_uses, current_uses, subscription_expires_at, beekeeping_associations!registration_codes_association_id_fkey(name)')
        .eq('code', associationCode.trim().toUpperCase())
        .maybeSingle()

      if (codeError) {
        console.error('Error validating association code:', codeError)
        setError('Error validating code. Please try again.')
        setLoading(false)
        return
      }

      if (!codeData) {
        setError('Invalid association code. Code not found in database.')
        setLoading(false)
        return
      }

      // Check if it's actually an association code (not individual)
      if (codeData.code_type !== 'association') {
        setError(`This is an individual code (free). Please use the "Individual Code" payment option instead, or get an association member code from your beekeeping association.`)
        setLoading(false)
        return
      }

      // Check if it has an association linked
      if (!codeData.association_id) {
        setError('This association code is not linked to an association. Please contact support.')
        setLoading(false)
        return
      }

      if (!codeData.is_active) {
        setError('This association code has been disabled.')
        setLoading(false)
        return
      }

      if (codeData.max_uses && codeData.current_uses >= codeData.max_uses) {
        setError('This code has reached its maximum number of uses.')
        setLoading(false)
        return
      }

      // Step 2: Create Stripe checkout session for €12 with association code
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          isAssociationMember: true,
          associationId: codeData.association_id,
          associationCode: associationCode.trim().toUpperCase(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()

      // Redirect to Stripe checkout
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      console.error('Error creating checkout session:', err)
      setError(err instanceof Error ? err.message : 'Failed to start payment process. Please try again.')
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCode('')
    setAssociationCode('')
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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">Renew Subscription</h3>
            <p className="text-sm text-text-secondary mt-1">
              Choose your payment method
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-text-tertiary hover:text-foreground transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-200">
                  Subscription activated successfully!
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Your subscription has been extended
                </p>
              </div>
            </div>

            <div className="bg-sage-50 dark:bg-slate-800/50 rounded-md p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">New expiration date:</span>
                <span className="font-medium text-foreground">
                  {success.expires_at && formatDate(success.expires_at)}
                </span>
              </div>
            </div>

            <p className="text-xs text-center text-text-tertiary">
              Refreshing subscription status...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('code')}
                className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg border-2 transition-all ${
                  paymentMethod === 'code'
                    ? 'border-forest-500 dark:border-forest-400 bg-forest-50 dark:bg-forest-950/30 text-forest-700 dark:text-forest-300'
                    : 'border-border bg-surface dark:bg-surface text-text-secondary hover:border-forest-300 dark:hover:border-forest-600'
                }`}
              >
                <Tag className="w-5 h-5" />
                <span className="font-medium text-xs">Individual Code</span>
                <span className="text-xs text-text-tertiary">Free</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg border-2 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                    : 'border-border bg-surface dark:bg-surface text-text-secondary hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="font-medium text-xs">Card Payment</span>
                <span className="text-xs text-text-tertiary">€24</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('association_code')}
                className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg border-2 transition-all ${
                  paymentMethod === 'association_code'
                    ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300'
                    : 'border-border bg-surface dark:bg-surface text-text-secondary hover:border-purple-300 dark:hover:border-purple-600'
                }`}
              >
                <Tag className="w-5 h-5" />
                <span className="font-medium text-xs text-center">Association Code</span>
                <span className="text-xs text-text-tertiary">€12</span>
              </button>
            </div>

            {/* Code Payment Form */}
            {paymentMethod === 'code' && (
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Subscription Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-border bg-surface dark:bg-surface text-foreground rounded-md font-mono text-lg focus:ring-2 focus:ring-forest-500 dark:focus:ring-forest-400 focus:border-forest-500 dark:focus:border-forest-400"
                    placeholder="Enter code"
                    autoComplete="off"
                    autoFocus
                    required
                    disabled={loading}
                  />
                  <p className="mt-2 text-xs text-text-tertiary">
                    Don&apos;t have a renewal code? Contact an admin to get one.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md p-3">
                  <p className="text-xs text-blue-900 dark:text-blue-200">
                    <strong>Tip:</strong> If your subscription is still active, the new code will extend from your current expiration date. If expired, it will start from today.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2 px-4 bg-sage-100 dark:bg-slate-700 text-foreground rounded-md hover:bg-sage-200 dark:hover:bg-slate-600 transition-colors font-medium"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="flex-1 py-2 px-4 bg-forest-600 dark:bg-forest-500 text-white rounded-md hover:bg-forest-700 dark:hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
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
                {/* Pricing Display */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Annual Subscription</p>
                      <p className="text-xs text-text-secondary mt-0.5">12 months of access</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">€24</p>
                      <p className="text-xs text-text-secondary">per year</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md p-3">
                  <p className="text-xs text-blue-900 dark:text-blue-200">
                    <strong>Secure Payment:</strong> You&apos;ll be redirected to Stripe for secure card payment processing.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2 px-4 bg-sage-100 dark:bg-slate-700 text-foreground rounded-md hover:bg-sage-200 dark:hover:bg-slate-600 transition-colors font-medium"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 px-4 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Redirecting...
                      </span>
                    ) : (
                      'Pay €24 with Card'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Association Code Payment Form */}
            {paymentMethod === 'association_code' && (
              <form onSubmit={handleAssociationCodePayment} className="space-y-4">
                {/* Pricing Display */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/40 dark:to-pink-900/40 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Association Member Rate</p>
                      <p className="text-xs text-text-secondary mt-0.5">12 months of access + code required</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">€12</p>
                      <p className="text-xs text-text-secondary">per year</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Association Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={associationCode}
                    onChange={(e) => setAssociationCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-border bg-surface dark:bg-surface text-foreground rounded-md font-mono text-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400"
                    placeholder="Enter association code"
                    autoComplete="off"
                    required
                    disabled={loading}
                  />
                  <p className="mt-2 text-xs text-text-tertiary">
                    Enter the code provided by your beekeeping association
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                  </div>
                )}

                <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-md p-3">
                  <p className="text-xs text-purple-900 dark:text-purple-200">
                    <strong>Association Member Benefit:</strong> After validating your code, you&apos;ll pay €12 (50% off) instead of the standard €24 rate.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2 px-4 bg-sage-100 dark:bg-slate-700 text-foreground rounded-md hover:bg-sage-200 dark:hover:bg-slate-600 transition-colors font-medium"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !associationCode.trim()}
                    className="flex-1 py-2 px-4 bg-purple-600 dark:bg-purple-500 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validating...
                      </span>
                    ) : (
                      'Validate & Pay €12'
                    )}
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
