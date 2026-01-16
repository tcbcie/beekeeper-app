import { NextRequest, NextResponse } from 'next/server'

/**
 * Custom verification endpoint for branded auth emails
 *
 * This route forwards verification requests to Supabase's auth endpoint
 * while allowing emails to use hivecraic.com URLs instead of supabase.co
 *
 * Usage in Supabase email templates:
 * https://www.hivecraic.com/auth/verify?token={{ .TokenHash }}&type={{ .Type }}&redirect_to={{ .RedirectTo }}
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Get all verification parameters
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const redirectTo = searchParams.get('redirect_to')

  // Validate required parameters
  if (!token || !type) {
    return NextResponse.redirect(
      new URL('/login?error=invalid_verification_link', request.url)
    )
  }

  // Build the Supabase verification URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL not configured')
    return NextResponse.redirect(
      new URL('/login?error=configuration_error', request.url)
    )
  }

  // Construct verification URL with all parameters
  const verifyUrl = new URL(`${supabaseUrl}/auth/v1/verify`)
  verifyUrl.searchParams.set('token', token)
  verifyUrl.searchParams.set('type', type)

  if (redirectTo) {
    verifyUrl.searchParams.set('redirect_to', redirectTo)
  }

  // Redirect to Supabase verification endpoint
  return NextResponse.redirect(verifyUrl.toString())
}
