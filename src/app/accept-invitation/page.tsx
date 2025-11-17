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
          .select('*, teams(name)')
          .eq('id', invitationId)
          .maybeSingle()

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
          setMessage(`You have already accepted the invitation to join ${invitation.teams?.name}`)
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
            setMessage(`We've sent a verification link to ${invitation.email}. Click the link in the email to join ${invitation.teams?.name}.`)
          }

          setLoading(false)
          return
        }

        console.log('👤 Current user ID:', userId)

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
            setMessage(`You are already a member of ${invitation.teams?.name}`)
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
          setMessage(`Successfully joined ${invitation.teams?.name}!`)
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

  if (loading) {
    return <LoadingSpinner text="Processing invitation..." />
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
