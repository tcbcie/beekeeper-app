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

  const refreshUser = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    // Try to restore session from localStorage when offline
    const tryOfflineFallback = (): boolean => {
      if (navigator.onLine) return false
      try {
        const cachedSession = localStorage.getItem('supabase.auth.token')
        if (cachedSession) {
          const parsed = JSON.parse(cachedSession)
          if (parsed?.currentSession?.user) {
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
    // Initial session check
    refreshUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        setUserId(session.user.id)
        setLoading(false)
      } else {
        setUser(null)
        setUserId(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
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
