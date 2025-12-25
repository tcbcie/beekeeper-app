import { createBrowserClient } from '@supabase/ssr'

// Validate environment variables at startup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
    'Please add it to your .env.local file.'
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
    'Please add it to your .env.local file.'
  )
}

// Create browser client with proper configuration to ensure JWT tokens are sent
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ensure tokens are persisted and automatically refreshed
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
  // Note: Removed global Content-Type header as it was overriding image uploads
  // The Supabase client automatically sets correct Content-Type for each request type
})