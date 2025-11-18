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
  const [status, setStatus] = useState<'success' | 'error' | 'expired' | 'already-accepted' | 'needs-signup'>('success')
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [invitedEmail, setInvitedEmail] = useState<string>('')
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
            teams(name)
          `)
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

        // If no user logged in, direct them to create an account
        if (!userId) {
          console.log('👤 No user logged in, directing to signup')
          setInvitedEmail(invitation.email)
          setStatus('needs-signup')
          setLoading(false)
          return
        }

        console.log('👤 Current user ID:', userId)

        // Verify the logged-in user's email matches the invitation
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser?.email !== invitation.email) {
          setStatus('error')
          setMessage(`This invitation was sent to ${invitation.email}. Please log in with that email address or sign out and create a new account.`)
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

          {status === 'needs-signup' && (
            <>
              <AlertCircle size={64} className="mx-auto text-blue-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign Up Required</h1>
              <p className="text-gray-600 mb-4">
                You&apos;ve been invited to join <strong>{teamName}</strong>!
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-left mb-4">
                <p className="font-medium text-blue-900 mb-2">To accept this invitation:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Sign up for an account using: <strong>{invitedEmail}</strong></li>
                  <li>Check your email and confirm your account</li>
                  <li>Return to this invitation link to join the team</li>
                </ol>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Important: You must use the email address <strong>{invitedEmail}</strong> when signing up.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/login?signup=true&email=${encodeURIComponent(invitedEmail)}&redirect=${encodeURIComponent(window.location.href)}`)}
                  className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => router.push(`/login?email=${encodeURIComponent(invitedEmail)}&redirect=${encodeURIComponent(window.location.href)}`)}
                  className="w-full px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Already have an account? Sign In
                </button>
              </div>
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
