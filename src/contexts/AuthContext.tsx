'use client'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clearPersistedFilters } from '@/hooks/usePersistentState'
import { clearLocalUserData } from '@/lib/sign-out-cleanup'
import { isOfflineAuthError, readLastUser, rememberLastUser } from '@/lib/last-user'

interface AuthContextType {
  user: User | null
  userId: string | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userId: null,
  loading: true,
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshingRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  const refreshUser = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true

    // Offline, a session that needs renewing can't be checked; the renewal keeps retrying for
    // about 25 seconds before it gives up. Keep the last user on this device instead of a
    // spinner and then a trip to the login page (C1-03). This only picks the screens: data
    // still needs a valid session, and a real sign-out still signs them out.
    const keepLastUser = (): boolean => {
      const last = readLastUser()
      if (!last) return false
      // Only the dashboard layout reads `user`, and only to see whether someone is signed in
      setUser((current) => current ?? ({ id: last.id, email: last.email ?? undefined } as unknown as User))
      setUserId((current) => current ?? last.id)
      return true
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false && keepLastUser()) {
      setLoading(false)
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error getting session:', error)
        // A network error is "can't check right now", not "signed out"
        if (isOfflineAuthError(error) && keepLastUser()) return
        setUser(null)
        setUserId(null)
        return
      }

      if (session?.user) {
        setUser(session.user)
        setUserId(session.user.id)
        rememberLastUser(session.user)
      } else {
        setUser(null)
        setUserId(null)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      if (isOfflineAuthError(error) && keepLastUser()) return
      setUser(null)
      setUserId(null)
    } finally {
      setLoading(false)
      refreshingRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    // Await initial session check before subscribing to auth changes
    const init = async () => {
      await refreshUser()

      if (cancelled) return

      // Listen for auth changes only after initial check completes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (cancelled) return
        if (session?.user) {
          setUser(session.user)
          setUserId(session.user.id)
          rememberLastUser(session.user)
        } else if (event === 'SIGNED_OUT') {
          // Explicit sign-out is authoritative regardless of connectivity. Also
          // clear persisted filter/selection state so a different account
          // signing in on this device cannot inherit this user's apiary/hive
          // selections (e.g. switching between demo and real accounts).
          clearPersistedFilters()
          // Same reason: drop leftover impersonation tokens and the worker's runtime cache.
          clearLocalUserData()
          setUser(null)
          setUserId(null)
        } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          // A null session while offline (e.g. a token refresh that couldn't
          // reach the server) is almost always transient -- keep the existing
          // user rather than forcing a logout.
        } else {
          setUser(null)
          setUserId(null)
        }
        setLoading(false)
      })

      // Store unsubscribe for cleanup
      cleanupRef.current = () => subscription.unsubscribe()
    }

    init()

    // Re-validate the session the moment connectivity returns so a session that
    // was kept through an offline blip is confirmed (or properly cleared).
    const handleOnline = () => { refreshUser() }
    window.addEventListener('online', handleOnline)

    return () => {
      cancelled = true
      cleanupRef.current?.()
      window.removeEventListener('online', handleOnline)
    }
  }, [refreshUser])

  return (
    <AuthContext.Provider value={{ user, userId, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
