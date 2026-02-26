'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PageShell from '@/components/ui/PageShell'
import Panel from '@/components/ui/Panel'
import PageHeader from '@/components/ui/PageHeader'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) throw resetError

      setMessage('Password reset instructions have been sent to your email.')
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell centered className="px-4">
      <div className="mx-auto w-full max-w-md py-6 sm:py-10">
        <Panel padding="lg">
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 inline-flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated/70 px-4 py-3">
                <Image src="/logo.png" alt="HiveCraic" width={40} height={40} className="h-10 w-10" />
                <span className="font-serif text-2xl text-forest-700 dark:text-forest-300">HiveCraic</span>
              </div>

              <PageHeader
                eyebrow="Account Recovery"
                title="Reset Your Password"
                description="Enter your email and we’ll send secure reset instructions."
                className="text-center [&>div]:mx-auto [&>div]:max-w-sm [&_h1]:text-2xl [&_h1]:sm:text-3xl"
              />
            </div>

            <Panel padding="sm" className="border border-blue-200 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/20">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-blue-700 dark:text-blue-300" />
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  Use the email address linked to your HiveCraic account. The reset link will open `Reset Password`.
                </p>
              </div>
            </Panel>

            <form onSubmit={handleResetRequest} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-text-secondary">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="your@email.com"
                  className="block min-h-[48px] w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder:text-text-tertiary focus:border-forest-500 focus:ring-2 focus:ring-forest-500/30 dark:bg-surface-elevated"
                />
              </div>

              {message && (
                <div className="rounded-lg border border-forest-200 bg-forest-50 p-4 dark:border-forest-900 dark:bg-forest-950/30">
                  <p className="text-sm text-forest-800 dark:text-forest-300">{message}</p>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="fj-btn w-full bg-forest-600 text-white hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>

            <div className="text-center">
              <Link
                href="/login"
                className="fj-chip fj-chip-sm fj-chip-neutral"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </PageShell>
  )
}
