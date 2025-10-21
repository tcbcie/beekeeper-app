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

/**
 * User role type definition
 */
export type UserRole = 'User' | 'Admin'

/**
 * User profile interface
 */
export interface UserProfile {
  id: string
  role: UserRole
  created_at: string
  updated_at: string
}

/**
 * Get the current user's role
 * @returns User role or 'User' as default
 */
export async function getUserRole(): Promise<UserRole> {
  const userId = await getCurrentUserId()

  if (!userId) {
    return 'User'
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('Error fetching user role:', error)
    return 'User'
  }

  return data.role as UserRole
}

/**
 * Get the current user's complete profile
 * @returns User profile or null if not found
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const userId = await getCurrentUserId()

  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data as UserProfile
}

/**
 * Check if the current user is an admin
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'Admin'
}

/**
 * Require the current user to be an admin, throw error if not
 * @throws Error if user is not an admin
 */
export async function requireAdmin(): Promise<void> {
  const admin = await isAdmin()

  if (!admin) {
    throw new Error('Admin access required')
  }
}
