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
export type UserRole = 'User' | 'Power User' | 'Admin'

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
    .from('profiles')
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
    .from('profiles')
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
 * Check if the current user is a Power User or Admin
 * @returns true if user is Power User or Admin, false otherwise
 */
export async function isPowerUserOrAdmin(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'Power User' || role === 'Admin'
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

// Cache for account active status (5 second TTL)
const accountActiveCache = new Map<string, { value: boolean; timestamp: number }>()
const CACHE_TTL = 5000 // 5 seconds

/**
 * Clear the account active cache (useful for testing)
 * @internal
 */
export function clearAccountActiveCache(): void {
  accountActiveCache.clear()
}

/**
 * Account status result type
 */
export type AccountStatus = 'active' | 'deactivated' | 'error' | 'no_session'

/**
 * Get the current user's account status with specific failure reasons
 * Uses a short-lived cache to avoid repeated database calls
 */
export async function getAccountStatus(): Promise<AccountStatus> {
  const userId = await getCurrentUserId()

  if (!userId) {
    return 'no_session'
  }

  // Check cache
  const cached = accountActiveCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value ? 'active' : 'deactivated'
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('is_active, deleted_at')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching account status:', error)
    return 'error'
  }

  if (!data) {
    console.error('No profile data found for user:', userId)
    return 'error'
  }

  // Account is active if:
  // 1. is_active is not explicitly false AND
  // 2. deleted_at is null or undefined (not soft-deleted)
  const isActive = data.is_active !== false && !data.deleted_at

  // Update cache
  accountActiveCache.set(userId, { value: isActive, timestamp: Date.now() })

  return isActive ? 'active' : 'deactivated'
}

/**
 * Check if the current user's account is active
 * Uses a short-lived cache to avoid repeated database calls
 * @returns true if account is active, false if disabled
 */
export async function isAccountActive(): Promise<boolean> {
  const status = await getAccountStatus()
  return status === 'active'
}

/**
 * Require the current user's account to be active, throw error if disabled
 * @throws Error if account is disabled
 */
export async function requireActiveAccount(): Promise<void> {
  const active = await isAccountActive()

  if (!active) {
    // Sign out the user since their account is disabled - use local scope
    await supabase.auth.signOut({ scope: 'local' })
    throw new Error('Your account has been disabled. Please contact an administrator.')
  }
}

/**
 * Check if the current user has an active subscription
 * @returns true if subscription is active, false otherwise
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const userId = await getCurrentUserId()

  if (!userId) {
    return false
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_expires_at')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('Error fetching subscription status:', error)
    return false
  }

  // Check if subscription_expires_at exists and is in the future
  if (!data.subscription_expires_at) {
    return false
  }

  const expiryDate = new Date(data.subscription_expires_at)
  const now = new Date()

  return expiryDate > now
}
