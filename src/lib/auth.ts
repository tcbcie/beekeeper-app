import { supabase } from './supabase'

/**
 * Get the current authenticated user's ID
 * @returns User ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Error getting session:', error)
    return null
  }

  return session?.user?.id || null
}

/**
 * Get the current authenticated user's ID or throw an error
 * Use this when user must be authenticated
 * @returns User ID
 * @throws Error if not authenticated
 */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId()

  if (!userId) {
    throw new Error('User must be authenticated')
  }

  return userId
}

/**
 * Check if a user is currently authenticated
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserId()
  return userId !== null
}
