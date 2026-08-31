'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AlertCircle, CheckCircle, Mail, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import PageShell from '@/components/ui/PageShell'
import Panel from '@/components/ui/Panel'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import TextLink from '@/components/ui/TextLink'

function ReactivateForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

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
        p_email: email,
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
    <PageShell centered className="px-4">
      <div className="mx-auto w-full max-w-md py-6 sm:py-10">
        <Panel padding="lg">
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 inline-flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated/70 px-4 py-3">
                <Image src="/logo.png" alt="HiveCraic" width={44} height={44} className="h-11 w-11" />
                <span className="font-serif text-2xl text-forest-700 dark:text-forest-300">HiveCraic</span>
              </div>

              <PageHeader
                eyebrow="Account Recovery"
                title="Request Reactivation"
                description="If your account was deactivated, submit a request and an administrator will review it."
                className="text-center [&>div]:mx-auto [&>div]:max-w-sm [&_h1]:text-2xl [&_h1]:sm:text-3xl"
              />
            </div>

            <Panel padding="sm" className="border border-blue-200 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/20">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-blue-700 dark:text-blue-300" />
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  Enter the email address associated with your deleted account. We’ll send the request to an administrator for review.
                </p>
              </div>
            </Panel>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-text-secondary">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="block min-h-[48px] w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder:text-text-tertiary focus:border-forest-500 focus:ring-2 focus:ring-forest-500/30 dark:bg-surface-elevated"
                  required
                  disabled={status === 'loading'}
                />
              </div>

              {status === 'success' && (
                <div className="rounded-lg border border-forest-200 bg-forest-50 p-4 dark:border-forest-900 dark:bg-forest-950/30">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-forest-700 dark:text-forest-300" />
                    <div>
                      <p className="mb-1 text-sm font-semibold text-forest-900 dark:text-forest-200">Request Submitted</p>
                      <p className="text-sm text-forest-800 dark:text-forest-300">{message}</p>
                    </div>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-700 dark:text-red-300" />
                    <div>
                      <p className="mb-1 text-sm font-semibold text-red-900 dark:text-red-200">Error</p>
                      <p className="text-sm text-red-800 dark:text-red-300">{message}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={status === 'loading' || !email}
                tone="amber"
                fullWidth
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'loading' ? 'Submitting...' : 'Submit Reactivation Request'}
              </Button>
            </form>

            <Panel padding="sm" className="border-border/80 bg-surface/60">
              <p className="text-center text-sm text-text-tertiary">
                Once submitted, an administrator will review your request and contact you by email. This typically takes 1-2 business days.
              </p>
            </Panel>

            <div className="flex flex-col items-center gap-3 text-center">
              <Link href="/login" className="fj-chip fj-chip-sm fj-chip-neutral">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
              <p className="text-sm text-text-tertiary">
                Need help?{' '}
                <TextLink href="mailto:support@tcbc.ie">
                  support@tcbc.ie
                </TextLink>
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </PageShell>
  )
}

function ReactivateFallback() {
  return (
    <PageShell centered className="px-4">
      <div className="mx-auto w-full max-w-md py-6 sm:py-10">
        <Panel padding="lg">
          <LoadingSpinner text="Loading reactivation form..." size="sm" className="p-2" />
        </Panel>
      </div>
    </PageShell>
  )
}

export default function ReactivateAccountPage() {
  return (
    <Suspense fallback={<ReactivateFallback />}>
      <ReactivateForm />
    </Suspense>
  )
}
