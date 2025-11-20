import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })

    // Exchange the code for a session
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/login?error=auth_error', requestUrl.origin))
    }

    // Check if this user account has been deleted
    if (sessionData?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, deleted_at, original_email, email')
        .eq('id', sessionData.user.id)
        .single()

      console.log('OAuth callback - profile check:', { profile, profileError })

      // If account is deleted, sign them out and redirect to reactivation
      if (profile && profile.deleted_at) {
        console.log('OAuth: Account is deleted, signing out and redirecting to reactivation')

        // Sign out the user
        await supabase.auth.signOut()

        // Redirect to reactivation page with their email
        const email = profile.original_email || profile.email
        return NextResponse.redirect(
          new URL(`/reactivate?email=${encodeURIComponent(email)}&reason=deleted`, requestUrl.origin)
        )
      }
    }

    // Note: Registration code validation for OAuth is handled client-side
    // in the dashboard layout since we can't access localStorage here (server-side)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
}
