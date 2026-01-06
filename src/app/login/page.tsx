'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'

  // Handle URL parameters for pre-filling form (from invitation flow)
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

  // Check for pending redirect after email confirmation
  useEffect(() => {
    const checkPendingRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const pendingRedirect = localStorage.getItem('pendingRedirect')
          if (pendingRedirect) {
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
        // FIRST: Check if this email belongs to a deleted account BEFORE attempting signup
        const { data: checkData } = await supabase
          .from('profiles')
          .select('id, deleted_at, original_email')
          .eq('original_email', email)
          .not('deleted_at', 'is', null)
          .maybeSingle()

        if (checkData && checkData.deleted_at) {
          // This email belongs to a deleted account - redirect to reactivation
          setMessage('⚠️ This account has been deactivated. Redirecting to account reactivation page...')
          setLoading(false)
          // Wait a moment then redirect to reactivation page
          setTimeout(() => {
            router.push(`/reactivate?email=${encodeURIComponent(email)}`)
          }, 2000)
          return
        }

        // If not a deleted account, proceed with normal signup
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0]
            },
            emailRedirectTo: `${window.location.origin}${redirectUrl}`
          }
        })

        if (error) {
          // If signup fails, check again if it's because of a deleted account
          // (in case RLS prevented the initial check)
          console.error('Signup error:', error)

          // Check if the error message contains the deleted email pattern
          if (error.message && error.message.includes('deleted_') && error.message.includes('@deleted.local')) {
            setMessage('⚠️ This account has been deactivated. Redirecting to account reactivation page...')
            setLoading(false)
            setTimeout(() => {
              router.push(`/reactivate?email=${encodeURIComponent(email)}`)
            }, 2000)
            return
          }

          throw error
        }

        // If email confirmation is disabled, redirect immediately
        // Otherwise show message to check email
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.push(redirectUrl)
        } else {
          // Store redirect URL in localStorage so we can use it after email confirmation
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
      // Store redirect URL in localStorage for after OAuth callback
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
          }
        }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-sage-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-surface dark:bg-slate-900 rounded-xl shadow-2xl border border-border">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-forest-600 dark:text-emerald-400 flex items-center justify-center gap-2">
            <Image src="/logo.png" alt="HiveCraic" width={40} height={40} className="w-10 h-10" />
            HiveCraic
          </h2>
          <p className="mt-2 text-sm text-text-secondary">Crafted with honeyed hearts by tcbc.ie,</p>
          <p className="text-sm text-text-secondary">alongside the buzzing minds of</p>
          <p className="text-sm text-text-secondary">Tribes Beekeepers Association and Tribes QRBG!</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-surface dark:bg-slate-800 border border-border rounded-lg text-foreground placeholder-slate-500 focus:ring-2 focus:ring-forest-500 dark:focus:ring-emerald-500 focus:border-forest-500 dark:focus:border-emerald-500 min-h-[48px]"
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-text-secondary">Password</label>
              {!isSignUp && (
                <Link href="/forgot-password" className="text-xs text-forest-600 dark:text-emerald-400 hover:text-forest-700 dark:text-emerald-300">
                  Forgot Password?
                </Link>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-surface dark:bg-slate-800 border border-border rounded-lg text-foreground placeholder-slate-500 focus:ring-2 focus:ring-forest-500 dark:focus:ring-emerald-500 focus:border-forest-500 dark:focus:border-emerald-500 min-h-[48px]"
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>
          {message && (
            <div className={`text-sm text-center p-3 rounded-lg ${
              message.includes('created') ? 'bg-emerald-900/50 text-forest-700 dark:text-emerald-300 border border-emerald-700' : 'bg-red-900/50 text-red-300 border border-red-700'
            }`}>
              {message}
            </div>
          )}
          <div className="flex gap-4">
            <button
              type="submit"
              onClick={() => setIsSignUp(false)}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-forest-600 dark:bg-emerald-600 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-emerald-700 disabled:opacity-50 font-medium transition-colors min-h-[48px]"
            >
              {loading && !isSignUp ? 'Loading...' : 'Login'}
            </button>
            <button
              type="submit"
              onClick={() => setIsSignUp(true)}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-sage-100 dark:bg-slate-700 text-foreground rounded-lg hover:bg-sage-200 dark:hover:bg-slate-600 disabled:opacity-50 font-medium transition-colors min-h-[48px]"
            >
              {loading && isSignUp ? 'Loading...' : 'Sign Up'}
            </button>
          </div>
        </form>

        {/* Account Reactivation Link */}
        <div className="text-center text-sm">
          <p className="text-text-secondary">
            Deleted account?{' '}
            <Link href="/reactivate" className="text-forest-600 dark:text-emerald-400 hover:text-forest-700 dark:text-emerald-300 font-medium">
              Request reactivation
            </Link>
          </p>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-surface dark:bg-slate-900 text-text-secondary">Or continue with</span>
          </div>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface dark:bg-slate-800 border border-border rounded-lg hover:bg-sage-100 dark:bg-slate-700 disabled:opacity-50 transition-colors min-h-[48px]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-foreground font-medium">Continue with Google</span>
          </button>
        </div>
        <div className="flex items-center justify-center gap-3 text-xs text-text-tertiary">
          <span className="px-2 py-1 bg-emerald-900/30 text-forest-600 dark:text-emerald-400 rounded font-medium">v1.5.8</span>
          <span>•</span>
          <span>January 6, 2026</span>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-sage-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="text-3xl font-bold text-forest-600 dark:text-emerald-400 flex items-center justify-center gap-2">
            <Image src="/logo.png" alt="HiveCraic" width={40} height={40} className="w-10 h-10" />
            HiveCraic
          </div>
          <p className="mt-4 text-text-secondary">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
