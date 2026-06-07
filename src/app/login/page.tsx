'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import PageShell from '@/components/ui/PageShell'
import PageHeader from '@/components/ui/PageHeader'
import Panel from '@/components/ui/Panel'
import Button from '@/components/ui/Button'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirect') || '/dashboard'
  // Reject open-redirect patterns. The previous check only blocked '//evil.com'
  // (protocol-relative), but '/\evil.com' bypassed it -- browsers normalize
  // backslashes to slashes, turning '/\foo' into '//foo'. Also reject anything
  // not starting with '/', and any second-character that isn't a normal path
  // separator-safe character.
  const isSafeRelative = (() => {
    if (!rawRedirect.startsWith('/')) return false
    if (rawRedirect.length === 1) return true
    const second = rawRedirect[1]
    if (second === '/' || second === '\\') return false
    return true
  })()
  const redirectUrl = isSafeRelative ? rawRedirect : '/dashboard'

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const signupParam = searchParams.get('signup')

    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
    if (signupParam === 'true') {
      setIsSignUp(true)
    }
  }, [searchParams])

  useEffect(() => {
    const checkPendingRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const pendingRedirect = localStorage.getItem('pendingRedirect')
          if (pendingRedirect && pendingRedirect.startsWith('/dashboard')) {
            localStorage.removeItem('pendingRedirect')
            router.push(pendingRedirect)
          } else if (!searchParams.get('redirect')) {
            router.push('/dashboard')
          }
        }
      } catch (error) {
        console.error('Error checking pending redirect:', error)
      }
    }
    checkPendingRedirect()
  }, [router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { data: checkData } = await supabase
          .from('profiles')
          .select('id, deleted_at, original_email')
          .eq('original_email', email)
          .not('deleted_at', 'is', null)
          .maybeSingle()

        if (checkData && checkData.deleted_at) {
          setMessage('This account has been deactivated. Redirecting to account reactivation page...')
          setLoading(false)
          setTimeout(() => {
            router.push(`/reactivate?email=${encodeURIComponent(email)}`)
          }, 2000)
          return
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            },
            emailRedirectTo: `${window.location.origin}${redirectUrl}`,
          },
        })

        if (error) {
          console.error('Signup error:', error)

          if (error.message && error.message.includes('deleted_') && error.message.includes('@deleted.local')) {
            setMessage('This account has been deactivated. Redirecting to account reactivation page...')
            setLoading(false)
            setTimeout(() => {
              router.push(`/reactivate?email=${encodeURIComponent(email)}`)
            }, 2000)
            return
          }

          throw error
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.push(redirectUrl)
        } else {
          if (redirectUrl !== '/dashboard') {
            localStorage.setItem('pendingRedirect', redirectUrl)
          }
          setMessage('Account created! Please check your email to confirm your account.')
          setIsSignUp(false)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push(redirectUrl)
      }
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message)
      } else {
        setMessage('An error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setMessage('')

    try {
      if (redirectUrl !== '/dashboard') {
        localStorage.setItem('pendingRedirect', redirectUrl)
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message)
      } else {
        setMessage('An error occurred')
      }
      setLoading(false)
    }
  }

  const messageClasses = message.includes('created')
    ? 'border border-forest-200 bg-forest-50 text-forest-800 dark:border-forest-800 dark:bg-forest-950/30 dark:text-forest-300'
    : message.toLowerCase().includes('deactivated')
    ? 'border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
    : 'border border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300'

  return (
    <PageShell
      centered
      className="px-4"
      innerClassName="px-0"
    >
      <div className="mx-auto w-full max-w-md py-6 sm:py-10">
        <Panel className="overflow-hidden" padding="lg">
          <div className="space-y-7">
            <div className="flex justify-center">
              <span className="inline-flex items-center rounded-full border border-amber-300/70 bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                Field Journal Access
              </span>
            </div>

            <div className="space-y-4 text-center">
              <div className="mx-auto inline-flex items-center justify-center gap-3 rounded-2xl border border-border bg-surface-elevated/70 px-4 py-3 shadow-sm">
                <Image src="/logo.png" alt="HiveCraic" width={40} height={40} className="h-10 w-10" />
                <span className="font-serif text-2xl leading-none text-forest-700 dark:text-forest-300">
                  HiveCraic
                </span>
              </div>

              <PageHeader
                eyebrow={isSignUp ? 'Create Account' : 'Welcome Back'}
                title={isSignUp ? 'Start Your Season Log' : 'Return to Your Apiary Journal'}
                description="Sign in to track hives, inspections, queens, and shared team work in one place."
                className="text-center [&>div]:mx-auto [&>div]:max-w-sm [&>div]:w-full [&_h1]:text-2xl [&_h1]:sm:text-3xl"
              />

              <div className="space-y-1 text-sm text-text-secondary">
                <p>Crafted with honeyed hearts by tcbc.ie</p>
                <p>with Tribes Beekeepers Association and Tribes QRBG</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text-secondary">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block min-h-[48px] w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder:text-text-tertiary focus:border-forest-500 focus:ring-2 focus:ring-forest-500/30 dark:bg-surface-elevated"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-text-secondary">Password</label>
                  <Link
                    href="/forgot-password"
                    className={`text-xs font-medium text-forest-700 hover:text-forest-800 dark:text-forest-300 dark:hover:text-forest-200 ${isSignUp ? 'invisible' : ''}`}
                  >
                    Forgot Password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block min-h-[48px] w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder:text-text-tertiary focus:border-forest-500 focus:ring-2 focus:ring-forest-500/30 dark:bg-surface-elevated"
                  required
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </div>

              <div className={`rounded-lg px-3 py-2 text-center text-sm min-h-[32px] ${message ? messageClasses : 'invisible'}`}>
                {message || '\u00A0'}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="submit"
                  onClick={() => setIsSignUp(false)}
                  disabled={loading}
                  tone="success"
                  className="min-h-[48px] disabled:opacity-50"
                >
                  {loading && !isSignUp ? 'Loading...' : 'Login'}
                </Button>
                <Button
                  type="submit"
                  onClick={() => setIsSignUp(true)}
                  disabled={loading}
                  tone="neutral"
                  className="min-h-[48px] disabled:opacity-50"
                >
                  {loading && isSignUp ? 'Loading...' : 'Sign Up'}
                </Button>
              </div>
            </form>

            <div className="text-center text-sm">
              <p className="text-text-secondary">
                Deleted account?{' '}
                <Link
                  href="/reactivate"
                  className="font-medium text-forest-700 hover:text-forest-800 dark:text-forest-300 dark:hover:text-forest-200"
                >
                  Request reactivation
                </Link>
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="rounded-full border border-border bg-background px-3 py-1 text-text-secondary">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              tone="neutral"
              fullWidth
              className="min-h-[48px] inline-flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="font-medium text-foreground">Continue with Google</span>
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary">
              <span className="rounded-full border border-forest-200 bg-forest-50 px-2 py-1 font-mono text-forest-700 dark:border-forest-900 dark:bg-forest-950/30 dark:text-forest-300">
                v1.9.0
              </span>
              <span aria-hidden="true">-</span>
              <span>June 7, 2026</span>
            </div>
          </div>
        </Panel>
      </div>
    </PageShell>
  )
}

function LoginFallback() {
  return (
    <PageShell centered className="px-4">
      <div className="mx-auto w-full max-w-md py-6 sm:py-10">
        <Panel padding="lg">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
              <Image src="/logo.png" alt="HiveCraic" width={32} height={32} className="h-8 w-8" />
              <span className="font-serif text-xl text-forest-700 dark:text-forest-300">HiveCraic</span>
            </div>
            <LoadingSpinner text="Loading login..." size="sm" className="p-2" />
          </div>
        </Panel>
      </div>
    </PageShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
