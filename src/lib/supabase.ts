import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create browser client with proper configuration to ensure JWT tokens are sent
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ensure tokens are persisted and automatically refreshed
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      // Ensure we always send the content type
      'Content-Type': 'application/json'
    }
  }
})