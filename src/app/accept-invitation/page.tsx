'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'success' | 'error' | 'expired' | 'already-accepted' | 'magic-link-sent'>('success')
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [invitedEmail, setInvitedEmail] = useState<string>('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [teamName, setTeamName] = useState<string>('')

  // First useEffect: Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const id = await getCurrentUserId()
      setUserId(id)
      setCheckedAuth(true)
    }
    checkAuth()
  }, [])

  // Second useEffect: Handle invitation acceptance once we know auth status
  useEffect(() => {
    if (!checkedAuth) return // Wait until we've checked authentication

    const acceptInvitation = async () => {
      let invitationId = searchParams.get('id')

      if (!invitationId) {
        setStatus('error')
        setMessage('Invalid invitation link')
        setLoading(false)
        return
      }

      // Clean the invitation ID - remove any trailing # or other URL fragments
      invitationId = invitationId.trim().replace(/#$/, '')

      console.log('Processing invitation ID:', invitationId)

      try {
        // Fetch invitation details first (before checking auth)
        console.log('🔍 Fetching invitation with ID:', invitationId)

        // Use service role or admin context to fetch invitation
        // We need to fetch this before auth check to get the invited email
        const { data: invitation, error: invitationError } = await supabase
          .from('team_invitations')
          .select(`
            *,
            teams!inner(name)
          `)
          .eq('id', invitationId)
          .single()

        console.log('📦 Invitation data:', invitation)
        console.log('❌ Invitation error:', invitationError)

        if (invitationError) {
          console.error('Error fetching invitation:', invitationError)
          console.error('Invitation ID:', invitationId)
          console.error('Error code:', invitationError?.code)
          console.error('Error message:', invitationError?.message)
          console.error('Error details:', invitationError?.details)
          console.error('Error hint:', invitationError?.hint)
          setStatus('error')
          setMessage(`Error loading invitation: ${invitationError?.message || 'Unknown error'}. Please check the console for details.`)
          setLoading(false)
          return
        }

        if (!invitation) {
          console.error('❌ Invitation not found in database')
          console.error('Invitation ID:', invitationId)
          console.error('This could be due to RLS policies or the invitation was deleted')
          setStatus('error')
          setMessage('This invitation does not exist or has been removed. Please contact the person who sent you the invitation.')
          setLoading(false)
          return
        }

        console.log('✅ Invitation found:', invitation.id, 'Status:', invitation.status)

        // Extract team name (handle both object and array responses from Supabase)
        const extractedTeamName = Array.isArray(invitation.teams)
          ? invitation.teams[0]?.name
          : invitation.teams?.name

        setTeamName(extractedTeamName || 'the team')

        // Check if invitation has expired
        const expiresAt = new Date(invitation.expires_at)
        if (expiresAt < new Date()) {
          setStatus('expired')
          setMessage('This invitation has expired')
          setLoading(false)
          return
        }

        // Check if invitation is for declined status
        if (invitation.status === 'declined') {
          setStatus('error')
          setMessage('This invitation was previously declined')
          setLoading(false)
          return
        }

        // Check if invitation is already accepted
        if (invitation.status === 'accepted') {
          setStatus('already-accepted')
          setMessage(`You have already accepted the invitation to join ${extractedTeamName || 'this team'}`)
          setLoading(false)
          return
        }

        // If no user, send magic link for auto-registration/login
        if (!userId) {
          console.log('👤 No user logged in, sending magic link to:', invitation.email)
          setInvitedEmail(invitation.email)

          // Send magic link that will redirect back to this invitation
          const redirectUrl = `${window.location.origin}/accept-invitation?id=${invitationId}`
          const { error: magicLinkError } = await supabase.auth.signInWithOtp({
            email: invitation.email,
            options: {
              emailRedirectTo: redirectUrl,
            }
          })

          if (magicLinkError) {
            console.error('Error sending magic link:', magicLinkError)
            setStatus('error')
            setMessage('Failed to send verification email. Please try again.')
          } else {
            setStatus('magic-link-sent')
            setMessage(`We've sent a verification link to ${invitation.email}. Click the link in the email to join ${extractedTeamName || 'the team'}.`)
          }

          setLoading(false)
          return
        }

        console.log('👤 Current user ID:', userId)

        // Check if user just authenticated via magic link and needs to set password
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        const hasPassword = currentUser?.app_metadata?.provider === 'email' &&
                           currentUser?.user_metadata?.email_verified

        // If user was created via magic link, they need to set a password
        if (!hasPassword && currentUser?.email === invitation.email) {
          console.log('🔐 User needs to set password')
          setInvitedEmail(invitation.email)
          setNeedsPassword(true)
          setLoading(false)
          return
        }

        // Add user to team FIRST (before updating invitation status)
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: invitation.team_id,
            user_id: userId,
            role: 'member',
          })

        if (memberError) {
          // Check if user is already a member
          if (memberError.code === '23505') {
            setStatus('already-accepted')
            setMessage(`You are already a member of ${extractedTeamName || 'this team'}`)
          } else {
            throw memberError
          }
        } else {
          // Only update invitation status AFTER successfully adding to team
          const { error: updateError } = await supabase
            .from('team_invitations')
            .update({ status: 'accepted', accepted_at: new Date().toISOString() })
            .eq('id', invitationId)

          if (updateError) {
            console.error('Warning: Failed to update invitation status:', updateError)
            // Don't throw - user is already added to team, this is just audit trail
          }

          setStatus('success')
          setMessage(`Successfully joined ${extractedTeamName || 'the team'}!`)
        }

        setLoading(false)

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)

      } catch (error) {
        console.error('Error accepting invitation:', error)
        setStatus('error')
        setMessage('Failed to accept invitation. Please try again.')
        setLoading(false)
      }
    }

    acceptInvitation()
  }, [checkedAuth, userId, searchParams, router])

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    if (password.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }

    try {
      // Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError

      // Now complete the invitation acceptance
      const invitationId = searchParams.get('id')
      if (!invitationId) return

      // Fetch invitation again
      const { data: invitation } = await supabase
        .from('team_invitations')
        .select('*, teams!inner(name)')
        .eq('id', invitationId)
        .single()

      if (!invitation) return

      // Add user to team
      await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: userId!,
          role: 'member',
        })

      // Update invitation status
      await supabase
        .from('team_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitationId)

      setStatus('success')
      const extractedTeamName = Array.isArray(invitation.teams)
        ? invitation.teams[0]?.name
        : invitation.teams?.name
      setMessage(`Password set! Successfully joined ${extractedTeamName || 'the team'}!`)
      setNeedsPassword(false)

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
      console.error('Error setting password:', error)
      alert('Failed to set password. Please try again.')
    }
  }

  if (loading) {
    return <LoadingSpinner text="Processing invitation..." />
  }

  // Show password setup form if needed
  if (needsPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <AlertCircle size={64} className="mx-auto text-blue-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Set Your Password</h1>
            <p className="text-gray-600">
              Welcome to {teamName}! Please set a password to secure your account.
            </p>
          </div>

          <form onSubmit={handlePasswordSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={invitedEmail}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Re-enter your password"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Set Password & Join Team
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'success' && (
            <>
              <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </>
          )}

          {status === 'already-accepted' && (
            <>
              <AlertCircle size={64} className="mx-auto text-blue-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Already a Member</h1>
              <p className="text-gray-600 mb-4">{message}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Go to Dashboard
              </button>
            </>
          )}

          {status === 'magic-link-sent' && (
            <>
              <AlertCircle size={64} className="mx-auto text-blue-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-left mb-4">
                <p className="font-medium text-blue-900 mb-2">What happens next:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Check your email inbox ({invitedEmail})</li>
                  <li>Click the verification link in the email</li>
                  <li>You&apos;ll be automatically logged in and added to the team</li>
                </ol>
              </div>
              <p className="text-xs text-gray-500">
                Didn&apos;t receive the email? Check your spam folder or contact the team owner.
              </p>
            </>
          )}

          {status === 'expired' && (
            <>
              <XCircle size={64} className="mx-auto text-orange-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Expired</h1>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500 mb-4">
                Please contact the team owner to send you a new invitation.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Go to Dashboard
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={64} className="mx-auto text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
              <p className="text-gray-600 mb-4">{message}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Go to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading..." />}>
      <AcceptInvitationContent />
    </Suspense>
  )
}
