'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registrationCode, setRegistrationCode] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showGoogleCodeModal, setShowGoogleCodeModal] = useState(false)
  const [googleCodeInput, setGoogleCodeInput] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'

  // Check for pending redirect after email confirmation
  useEffect(() => {
    const checkPendingRedirect = async () => {
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
    }
    checkPendingRedirect()
  }, [router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        // Validate registration code before allowing sign-up
        if (!registrationCode.trim()) {
          throw new Error('Registration code is required')
        }

        // Call RPC function to validate the registration code
        const { data: validationResult, error: validationError } = await supabase
          .rpc('validate_registration_code', { reg_code: registrationCode.trim() })

        if (validationError) {
          console.error('Registration code validation error:', validationError)
          throw new Error('Failed to validate registration code')
        }

        if (!validationResult || !validationResult.valid) {
          throw new Error(validationResult?.message || 'Invalid registration code')
        }

        // Registration code is valid, proceed with sign-up
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
              registration_code_id: validationResult.code_id
            },
            emailRedirectTo: `${window.location.origin}${redirectUrl}`
          }
        })
        if (error) throw error

        // Increment the code usage count
        if (data.user) {
          await supabase.rpc('increment_code_usage', { code_id: validationResult.code_id })
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
          setMessage('Account created! Please check your email to confirm your account. After confirming, you will be automatically redirected to complete your team invitation.')
          setIsSignUp(false)
          setRegistrationCode('')
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

  const handleGoogleSignIn = async (requireCode: boolean = false) => {
    setLoading(true)
    setMessage('')

    try {
      // If sign-up mode, require registration code
      if (requireCode) {
        const code = googleCodeInput.trim()

        if (!code) {
          // Show modal to collect registration code
          setShowGoogleCodeModal(true)
          setLoading(false)
          return
        }

        // Validate registration code before OAuth
        const { data: validationResult, error: validationError } = await supabase
          .rpc('validate_registration_code', { reg_code: code })

        if (validationError) {
          throw new Error(`Registration code validation failed: ${validationError.message}`)
        }

        if (!validationResult || !validationResult.valid) {
          throw new Error(validationResult?.message || 'Invalid registration code')
        }

        // Store validated code for the callback
        localStorage.setItem('oauth_reg_code', code)
        localStorage.setItem('oauth_code_id', validationResult.code_id)
      }

      // Store redirect URL in localStorage for after OAuth callback
      if (redirectUrl !== '/dashboard') {
        localStorage.setItem('pendingRedirect', redirectUrl)
      }

      // Close modal if it was open
      setShowGoogleCodeModal(false)
      setGoogleCodeInput('')

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

  const handleGoogleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (googleCodeInput.trim()) {
      handleGoogleSignIn(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">🐝 HiveCraic</h2>
          <p className="mt-2 text-sm text-gray-600">Crafted with honeyed hearts by tcbc.ie,</p>
          <p className="text-sm text-gray-600">alongside the buzzing minds of</p>
          <p className="text-sm text-gray-600">Tribes Beekeepers Association and Tribes QRBG!</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              {!isSignUp && (
                <Link href="/forgot-password" className="text-xs text-amber-600 hover:text-amber-700">
                  Forgot Password?
                </Link>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              minLength={6}
            />
          </div>
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Registration Code</label>
              <input
                type="text"
                value={registrationCode}
                onChange={(e) => setRegistrationCode(e.target.value.toUpperCase())}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
                required={isSignUp}
                placeholder="Enter registration code"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-gray-500">
                A registration code is required to create an account. Contact an admin if you need one.
              </p>
            </div>
          )}
          {message && (
            <div className={`text-sm text-center p-3 rounded ${
              message.includes('created') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}
          <div className="flex gap-4">
            <button
              type="submit"
              onClick={() => setIsSignUp(false)}
              disabled={loading}
              className="flex-1 py-2 px-4 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
            >
              {loading && !isSignUp ? 'Loading...' : 'Login'}
            </button>
            <button
              type="submit"
              onClick={() => setIsSignUp(true)}
              disabled={loading}
              className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading && isSignUp ? 'Loading...' : 'Sign Up'}
            </button>
          </div>
        </form>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleGoogleSignIn(false)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2 px-4 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-gray-700 font-medium">Sign in with Google</span>
          </button>
          <button
            type="button"
            onClick={() => handleGoogleSignIn(true)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2 px-4 bg-white border-2 border-green-500 rounded-md hover:bg-green-50 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-green-700 font-semibold">Sign up with Google</span>
          </button>
          <p className="text-xs text-center text-gray-500">
            New user? Click &quot;Sign up with Google&quot; and you&apos;ll be asked for a registration code.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
          <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded font-medium">v1.0.26</span>
          <span>•</span>
          <span>January 7, 2025</span>
        </div>
      </div>

      {/* Google OAuth Registration Code Modal */}
      {showGoogleCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Registration Code Required</h3>
                <p className="text-sm text-gray-600 mt-1">Enter your registration code to sign up with Google</p>
              </div>
              <button
                onClick={() => {
                  setShowGoogleCodeModal(false)
                  setGoogleCodeInput('')
                  setLoading(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleGoogleCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration Code</label>
                <input
                  type="text"
                  value={googleCodeInput}
                  onChange={(e) => setGoogleCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-lg"
                  placeholder="Enter code"
                  autoComplete="off"
                  autoFocus
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  Don&apos;t have a code? Contact an admin to get one.
                </p>
              </div>
              {message && (
                <div className="text-sm text-center p-3 rounded bg-red-50 text-red-800">
                  {message}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowGoogleCodeModal(false)
                    setGoogleCodeInput('')
                    setLoading(false)
                    setMessage('')
                  }}
                  className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !googleCodeInput.trim()}
                  className="flex-1 py-2 px-4 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Validating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-100">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">🐝 HiveCraic</div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}