'use client'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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
    // Try to restore session from localStorage when offline. The cached
    // session must still be within its expiry window -- a stale token from
    // days ago must not be restored as if it were live, even offline.
    const tryOfflineFallback = (): boolean => {
      if (navigator.onLine) return false
      try {
        const cachedSession = localStorage.getItem('supabase.auth.token')
        if (cachedSession) {
          const parsed = JSON.parse(cachedSession)
          if (parsed?.currentSession?.user) {
            // Reject expired cached sessions. Supabase stores expires_at as a
            // Unix timestamp in seconds. If absent (older format), refuse to
            // restore rather than fail-open.
            const expiresAt = parsed.currentSession.expires_at
            if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
              return false
            }
            const nowSec = Math.floor(Date.now() / 1000)
            if (nowSec >= expiresAt) {
              return false
            }
            setUser(parsed.currentSession.user)
            setUserId(parsed.currentSession.user.id)
            return true
          }
        }
      } catch (e) {
        console.error('Failed to parse cached session:', e)
      }
      return false
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error getting session:', error)
        if (tryOfflineFallback()) return
        setUser(null)
        setUserId(null)
        return
      }

      if (session?.user) {
        setUser(session.user)
        setUserId(session.user.id)
      } else {
        setUser(null)
        setUserId(null)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      if (tryOfflineFallback()) return
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
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (cancelled) return
        if (session?.user) {
          setUser(session.user)
          setUserId(session.user.id)
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

    return () => {
      cancelled = true
      cleanupRef.current?.()
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
