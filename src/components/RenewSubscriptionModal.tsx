'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ActivateSubscriptionResponse } from '@/types/subscription'
import { Check, AlertCircle, CreditCard, Tag, Loader2 } from 'lucide-react'
import ModalShell from '@/components/ui/ModalShell'
import InfoPanel from '@/components/ui/InfoPanel'
import { RadioChoiceGroup, RadioChoiceOption } from '@/components/ui/RadioChoiceGroup'
import AlertPanel from '@/components/ui/AlertPanel'
import FieldLabel from '@/components/ui/FieldLabel'
import TextInput from '@/components/ui/TextInput'
import FormActionRow from '@/components/ui/FormActionRow'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

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
      // The checkout endpoint now requires the caller's Bearer token so it
      // can verify the session belongs to the authenticated user. Without
      // it the endpoint returns 401.
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const token = authSession?.access_token
      if (!token) {
        setError('You need to be signed in to renew your subscription.')
        setLoading(false)
        return
      }

      // Create Stripe checkout session for standard €24 payment
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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

      // Step 2: Create Stripe checkout session for €12 with association code.
      // Server now re-validates the code and derives the price independently;
      // body.isAssociationMember and body.associationId are ignored. We still
      // send them for backward compatibility but they have no effect.
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const token = authSession?.access_token
      if (!token) {
        setError('You need to be signed in to renew your subscription.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
    <ModalShell
      title="Renew Subscription"
      onClose={handleClose}
      closeDisabled={loading}
      overlayClassName="dark:bg-black/70"
    >
        <p className="text-sm text-text-secondary mb-4">
          Choose your payment method
        </p>

        {success ? (
          <div className="space-y-4">
            <AlertPanel
              tone="success"
              icon={<Check className="w-6 h-6 text-green-600 dark:text-green-400" />}
              title="Subscription activated successfully!"
              bodyClassName="text-xs"
            >
              <p>Your subscription has been extended</p>
            </AlertPanel>

            <Card padding="sm" className="bg-surface-secondary/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">New expiration date:</span>
                <span className="font-medium text-foreground">
                  {success.expires_at && formatDate(success.expires_at)}
                </span>
              </div>
            </Card>

            <p className="text-xs text-center text-text-tertiary">
              Refreshing subscription status...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Payment Method Selector */}
            <RadioChoiceGroup className="sm:grid-cols-3 gap-2">
              <RadioChoiceOption
                name="payment_method"
                value="code"
                tone="green"
                checked={paymentMethod === 'code'}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                icon={<Tag className="w-4 h-4 text-current" />}
                title="Individual Code"
                description="Free"
                className="min-h-[72px]"
              />
              <RadioChoiceOption
                name="payment_method"
                value="card"
                tone="blue"
                checked={paymentMethod === 'card'}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                icon={<CreditCard className="w-4 h-4 text-current" />}
                title="Card Payment"
                description="EUR 24"
                className="min-h-[72px]"
              />
              <RadioChoiceOption
                name="payment_method"
                value="association_code"
                tone="purple"
                checked={paymentMethod === 'association_code'}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                icon={<Tag className="w-4 h-4 text-current" />}
                title="Association Code"
                description="EUR 12"
                className="min-h-[72px]"
              />
            </RadioChoiceGroup>

            {/* Code Payment Form */}
            {paymentMethod === 'code' && (
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div>
                  <FieldLabel className="mb-2 text-foreground">
                    Subscription Code
                  </FieldLabel>
                  <TextInput
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono text-lg"
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
                  <AlertPanel
                    tone="error"
                    icon={<AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                  >
                    <p className="text-sm">{error}</p>
                  </AlertPanel>
                )}

                <InfoPanel tone="blue" title="Tip:" className="p-3" contentClassName="text-xs">
                  <p>
                    If your subscription is still active, the new code will extend from your current expiration date. If expired, it will start from today.
                  </p>
                </InfoPanel>

                <FormActionRow className="pt-2">
                  <Button
                    onClick={handleClose}
                    tone="neutral"
                    fullWidth
                    disabled={loading}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !code.trim()}
                    tone="success"
                    fullWidth
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Activating...
                      </span>
                    ) : (
                      'Activate Subscription'
                    )}
                  </Button>
                </FormActionRow>
              </form>
            )}

            {/* Credit Card Payment Form */}
            {paymentMethod === 'card' && (
              <form onSubmit={handleCardPayment} className="space-y-4">
                {/* Pricing Display */}
                <InfoPanel tone="blue" className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Annual Subscription</p>
                      <p className="text-xs text-text-secondary mt-0.5">12 months of access</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold fj-text-info">EUR 24</p>
                      <p className="text-xs text-text-secondary">per year</p>
                    </div>
                  </div>
                </InfoPanel>

                {error && (
                  <AlertPanel
                    tone="error"
                    icon={<AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                  >
                    <p className="text-sm">{error}</p>
                  </AlertPanel>
                )}

                <InfoPanel tone="blue" title="Secure Payment:" className="p-3" contentClassName="text-xs">
                  <p>You&apos;ll be redirected to Stripe for secure card payment processing.</p>
                </InfoPanel>

                <FormActionRow className="pt-2">
                  <Button
                    onClick={handleClose}
                    tone="neutral"
                    fullWidth
                    disabled={loading}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    tone="blue"
                    fullWidth
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Redirecting...
                      </span>
                    ) : (
                      'Pay €24 with Card'
                    )}
                  </Button>
                </FormActionRow>
              </form>
            )}

            {/* Association Code Payment Form */}
            {paymentMethod === 'association_code' && (
              <form onSubmit={handleAssociationCodePayment} className="space-y-4">
                {/* Pricing Display */}
                <InfoPanel tone="purple" className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Association Member Rate</p>
                      <p className="text-xs text-text-secondary mt-0.5">12 months of access + code required</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">EUR 12</p>
                      <p className="text-xs text-text-secondary">per year</p>
                    </div>
                  </div>
                </InfoPanel>

                <div>
                  <FieldLabel required className="mb-2 text-foreground">
                    Association Code
                  </FieldLabel>
                  <TextInput
                    type="text"
                    value={associationCode}
                    onChange={(e) => setAssociationCode(e.target.value.toUpperCase())}
                    className="font-mono text-lg"
                    tone="purple"
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
                  <AlertPanel
                    tone="error"
                    icon={<AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                  >
                    <p className="text-sm">{error}</p>
                  </AlertPanel>
                )}

                <InfoPanel tone="purple" title="Association Member Benefit:" className="p-3" contentClassName="text-xs">
                  <p>After validating your code, you&apos;ll pay EUR 12 (50% off) instead of the standard EUR 24 rate.</p>
                </InfoPanel>

                <FormActionRow className="pt-2">
                  <Button
                    onClick={handleClose}
                    tone="neutral"
                    fullWidth
                    disabled={loading}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !associationCode.trim()}
                    tone="purple"
                    fullWidth
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validating...
                      </span>
                    ) : (
                      'Validate & Pay €12'
                    )}
                  </Button>
                </FormActionRow>
              </form>
            )}
          </div>
        )}
    </ModalShell>
  )
}
