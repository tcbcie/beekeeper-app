'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { InvitationLoadingShell, InvitationResponseShell } from '@/components/invitations/InvitationResponseShell'

function DeclineRearingGroupInvitationContent() {
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

      // Clean the invitation ID
      invitationId = invitationId.trim().replace(/#$/, '')

      try {
        const userId = await getCurrentUserId()

        // Fetch invitation details
        const { data: invitation, error: invitationError } = await supabase
          .from('rearing_group_invitations')
          .select('*, rearing_groups(name)')
          .eq('id', invitationId)
          .single()

        if (invitationError || !invitation) {
          setStatus('error')
          setMessage('Invitation not found')
          setLoading(false)
          return
        }

        // Extract group name
        const groupName = Array.isArray(invitation.rearing_groups)
          ? invitation.rearing_groups[0]?.name
          : invitation.rearing_groups?.name

        // Check if invitation is already declined
        if (invitation.status === 'declined') {
          setStatus('already-declined')
          setMessage(`You have already declined the invitation to join ${groupName}`)
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
          .from('rearing_group_invitations')
          .update({ status: 'declined', declined_at: new Date().toISOString() })
          .eq('id', invitationId)

        if (updateError) throw updateError

        setStatus('success')
        setMessage(`You have declined the invitation to join ${groupName}`)
        setLoading(false)

        // Redirect after 3 seconds
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
    return <InvitationLoadingShell text="Processing your response..." />
  }

  return (
    <InvitationResponseShell title="Rearing Group Invitation" subtitle="Decline Invitation">
      <div className="text-center">
          {status === 'success' && (
            <>
              <CheckCircle size={64} className="mx-auto text-blue-500 mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Invitation Declined</h1>
              <p className="text-text-secondary mb-4">{message}</p>
              <p className="text-sm text-text-tertiary mb-4">
                If you change your mind, you can ask the group owner to send you another invitation.
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
                className="fj-btn fj-btn-blue"
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
                className="fj-btn fj-btn-blue"
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
                className="fj-btn fj-btn-blue"
              >
                Go to Dashboard
              </button>
            </>
          )}
      </div>
    </InvitationResponseShell>
  )
}

export default function DeclineRearingGroupInvitationPage() {
  return (
    <Suspense fallback={<InvitationLoadingShell text="Loading invitation..." />}>
      <DeclineRearingGroupInvitationContent />
    </Suspense>
  )
}
