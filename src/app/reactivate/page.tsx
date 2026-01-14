'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle, Mail } from 'lucide-react'
import Image from 'next/image'

function ReactivateForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  // Pre-fill email from URL parameter
  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const { data, error } = await supabase.rpc('request_account_reactivation', {
        p_email: email
      })

      if (error) throw error

      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          setStatus('success')
          setMessage(data.message || 'Reactivation request submitted successfully')
          setEmail('')
        } else {
          setStatus('error')
          setMessage(data.message || 'Failed to submit reactivation request')
        }
      } else {
        setStatus('error')
        setMessage('Unexpected response from server')
      }
    } catch (error) {
      console.error('Error requesting reactivation:', error)
      setStatus('error')
      setMessage('An error occurred. Please try again later.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2 flex items-center justify-center gap-2">
            <Image src="/logo.png" alt="HiveCraic" width={48} height={48} className="w-12 h-12" />
            HiveCraic
          </h1>
          <p className="text-text-secondary">Account Reactivation</p>
        </div>

        {/* Main Card */}
        <div className="bg-surface dark:bg-surface rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <Mail className="text-forest-600 dark:text-amber-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Request Account Reactivation</h2>
              <p className="text-sm text-text-tertiary">Restore your deleted account</p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              If your account was deleted, you can request to have it reactivated.
              Enter the email address associated with your account, and an administrator
              will review your request.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                required
                disabled={status === 'loading'}
              />
            </div>

            {/* Status Messages */}
            {status === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 mb-1">Request Submitted</p>
                  <p className="text-sm text-green-800">{message}</p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-1">Error</p>
                  <p className="text-sm text-red-800">{message}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className="w-full py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:bg-sage-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'loading' ? 'Submitting...' : 'Submit Reactivation Request'}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-text-tertiary text-center">
              Once your request is submitted, an administrator will review it and contact you via email.
              This process typically takes 1-2 business days.
            </p>
          </div>

          {/* Back to Login */}
          <div className="mt-4 text-center">
            <a
              href="/login"
              className="text-sm text-forest-600 dark:text-amber-600 hover:text-amber-700 font-medium"
            >
              ← Back to Login
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-text-tertiary">
            Need help? Contact{' '}
            <a href="mailto:support@tcbc.ie" className="text-forest-600 dark:text-amber-600 hover:text-amber-700">
              support@tcbc.ie
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ReactivateAccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="text-xl">Loading...</div>
      </div>
    }>
      <ReactivateForm />
    </Suspense>
  )
}
