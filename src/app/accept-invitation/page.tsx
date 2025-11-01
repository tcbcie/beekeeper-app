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
  const [status, setStatus] = useState<'success' | 'error' | 'expired' | 'already-accepted'>('success')
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [checkedAuth, setCheckedAuth] = useState(false)

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
      const invitationId = searchParams.get('id')

      if (!invitationId) {
        setStatus('error')
        setMessage('Invalid invitation link')
        setLoading(false)
        return
      }

      try {
        // If no user, redirect to login
        if (!userId) {
          setLoading(false)
          router.push(`/login?redirect=/accept-invitation?id=${invitationId}`)
          return
        }

        // Fetch invitation details
        const { data: invitation, error: invitationError } = await supabase
          .from('team_invitations')
          .select('*, teams(name)')
          .eq('id', invitationId)
          .maybeSingle()

        if (invitationError) {
          console.error('Error fetching invitation:', invitationError)
          console.error('Invitation ID:', invitationId)
          console.error('Error code:', invitationError?.code)
          console.error('Error message:', invitationError?.message)
          setStatus('error')
          setMessage(`Error loading invitation: ${invitationError?.message || 'Unknown error'}`)
          setLoading(false)
          return
        }

        if (!invitation) {
          console.error('Invitation not found in database')
          console.error('Invitation ID:', invitationId)
          setStatus('error')
          setMessage('This invitation does not exist or has been removed. Please contact the person who sent you the invitation.')
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
