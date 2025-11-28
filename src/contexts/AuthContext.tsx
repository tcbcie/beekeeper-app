'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
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

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error getting session:', error)

        // If offline, try to use cached session from localStorage
        if (!navigator.onLine) {
          console.log('Offline - checking localStorage for cached session')
          const cachedSession = localStorage.getItem('supabase.auth.token')
          if (cachedSession) {
            try {
              const parsed = JSON.parse(cachedSession)
              if (parsed?.currentSession?.user) {
                console.log('Using cached session while offline')
                setUser(parsed.currentSession.user)
                setUserId(parsed.currentSession.user.id)
                setLoading(false)
                return
              }
            } catch (e) {
              console.error('Failed to parse cached session:', e)
            }
          }
        }

        setUser(null)
        setUserId(null)
        return
      }

      console.log('Session check:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        isOnline: navigator.onLine
      })

      if (session?.user) {
        setUser(session.user)
        setUserId(session.user.id)
      } else {
        setUser(null)
        setUserId(null)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)

      // If offline and error occurred, try to use cached session
      if (!navigator.onLine) {
        console.log('Offline error - attempting to use cached session')
        const cachedSession = localStorage.getItem('supabase.auth.token')
        if (cachedSession) {
          try {
            const parsed = JSON.parse(cachedSession)
            if (parsed?.currentSession?.user) {
              console.log('Using cached session after error')
              setUser(parsed.currentSession.user)
              setUserId(parsed.currentSession.user.id)
              setLoading(false)
              return
            }
          } catch (e) {
            console.error('Failed to parse cached session:', e)
          }
        }
      }

      setUser(null)
      setUserId(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial session check
    refreshUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)

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
