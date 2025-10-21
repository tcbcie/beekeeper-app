'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: email.split('@')[0] }
          }
        })
        if (error) throw error
        setMessage('Account created! Please check your email to confirm.')
        setIsSignUp(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">🐝 Beekeeper App</h2>
          <p className="mt-2 text-sm text-gray-600">Queen Rearing Management</p>
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
      </div>
    </div>
  )
}