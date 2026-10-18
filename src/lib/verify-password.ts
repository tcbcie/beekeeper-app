import { createClient } from '@supabase/supabase-js'

/**
 * Check a signed-in user's current password before a sensitive change (e.g. setting a new
 * password), so an unlocked session alone isn't enough.
 *
 * Uses a throwaway client that keeps nothing in storage, so the user's real session is not
 * touched; the temporary session it creates is revoked straight away.
 */
export async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || !email || !password) return false

  const verifier = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'hivecraic-password-check',
    },
  })

  const { data, error } = await verifier.auth.signInWithPassword({ email, password })
  if (error || !data.session) return false
  await verifier.auth.signOut({ scope: 'local' }).catch(() => undefined)
  return true
}
