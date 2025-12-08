'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

function DeclineInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'success' | 'error' | 'expired' | 'already-declined'>('success')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const declineInvitation = async () => {
      let invitationId = searchParams.get('id')

      if (!invitationId) {
        setStatus('error')
        setMessage('Invalid invitation link')
        setLoading(false)
        return
      }

      // Clean the invitation ID - remove any trailing # or other URL fragments
      invitationId = invitationId.trim().replace(/#$/, '')

      try {
        // Get current user (optional for declining)
        const userId = await getCurrentUserId()

        // Fetch invitation details
        const { data: invitation, error: invitationError } = await supabase
          .from('team_invitations')
          .select('*, teams(name)')
          .eq('id', invitationId)
          .single()

        if (invitationError || !invitation) {
          setStatus('error')
          setMessage('Invitation not found')
          setLoading(false)
          return
        }

        // Check if invitation is already declined
        if (invitation.status === 'declined') {
          setStatus('already-declined')
          setMessage(`You have already declined the invitation to join ${invitation.teams?.name}`)
          setLoading(false)
          return
        }

        // Check if invitation is already accepted
        if (invitation.status === 'accepted') {
          setStatus('error')
          setMessage('This invitation has already been accepted and cannot be declined')
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

        // Decline the invitation
        const { error: updateError } = await supabase
          .from('team_invitations')
          .update({ status: 'declined', declined_at: new Date().toISOString() })
          .eq('id', invitationId)

        if (updateError) throw updateError

        setStatus('success')
        setMessage(`You have declined the invitation to join ${invitation.teams?.name}`)
        setLoading(false)

        // Redirect to dashboard or home after 3 seconds
        setTimeout(() => {
          if (userId) {
            router.push('/dashboard')
          } else {
            router.push('/')
          }
        }, 3000)

      } catch (error) {
        console.error('Error declining invitation:', error)
        setStatus('error')
        setMessage('Failed to decline invitation. Please try again.')
        setLoading(false)
      }
    }

    declineInvitation()
  }, [searchParams, router])

  if (loading) {
    return <LoadingSpinner text="Processing your response..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-surface dark:bg-surface rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'success' && (
            <>
              <CheckCircle size={64} className="mx-auto text-blue-500 mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Invitation Declined</h1>
              <p className="text-text-secondary mb-4">{message}</p>
              <p className="text-sm text-text-tertiary mb-4">
                If you change your mind, you can ask the team owner to send you another invitation.
              </p>
              <p className="text-sm text-text-tertiary">Redirecting...</p>
            </>
          )}

          {status === 'already-declined' && (
            <>
              <AlertCircle size={64} className="mx-auto text-blue-500 mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Already Declined</h1>
              <p className="text-text-secondary mb-4">{message}</p>
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
              <h1 className="text-2xl font-bold text-foreground mb-2">Invitation Expired</h1>
              <p className="text-text-secondary mb-4">{message}</p>
              <p className="text-sm text-text-tertiary mb-4">
                This invitation is no longer valid.
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
              <h1 className="text-2xl font-bold text-foreground mb-2">Error</h1>
              <p className="text-text-secondary mb-4">{message}</p>
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

export default function DeclineInvitationPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading..." />}>
      <DeclineInvitationContent />
    </Suspense>
  )
}
