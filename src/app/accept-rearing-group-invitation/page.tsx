'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { InvitationLoadingShell, InvitationResponseShell } from '@/components/invitations/InvitationResponseShell'
import Button from '@/components/ui/Button'

function AcceptRearingGroupInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'success' | 'error' | 'expired' | 'already-accepted' | 'needs-signup'>('success')
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [invitedEmail, setInvitedEmail] = useState<string>('')
  const [groupName, setGroupName] = useState<string>('')

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
    if (!checkedAuth) return

    const acceptInvitation = async () => {
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
        // Fetch invitation details
        const { data: invitation, error: invitationError } = await supabase
          .from('rearing_group_invitations')
          .select('*, rearing_groups(name)')
          .eq('id', invitationId)
          .maybeSingle()

        if (invitationError) {
          console.error('Error fetching invitation:', invitationError)
          setStatus('error')
          setMessage(`Error loading invitation: ${invitationError?.message || 'Unknown error'}. Please check the console for details.`)
          setLoading(false)
          return
        }

        if (!invitation) {
          setStatus('error')
          setMessage('This invitation does not exist or has been removed. Please contact the person who sent you the invitation.')
          setLoading(false)
          return
        }

        // Extract group name (handle both object and array responses from Supabase)
        const extractedGroupName = Array.isArray(invitation.rearing_groups)
          ? invitation.rearing_groups[0]?.name
          : invitation.rearing_groups?.name

        setGroupName(extractedGroupName || 'the rearing group')

        // Check if invitation has expired
        const expiresAt = new Date(invitation.expires_at)
        if (expiresAt < new Date()) {
          setStatus('expired')
          setMessage('This invitation has expired')
          setLoading(false)
          return
        }

        // Check if invitation is declined
        if (invitation.status === 'declined') {
          setStatus('error')
          setMessage('This invitation was previously declined')
          setLoading(false)
          return
        }

        // Check if invitation is already accepted
        if (invitation.status === 'accepted') {
          setStatus('already-accepted')
          setMessage(`You have already accepted the invitation to join ${extractedGroupName || 'this rearing group'}`)
          setLoading(false)
          return
        }

        // If no user logged in, direct them to create an account
        if (!userId) {
          setInvitedEmail(invitation.email)
          setStatus('needs-signup')
          setLoading(false)
          return
        }

        // Verify the logged-in user's email matches the invitation
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser?.email !== invitation.email) {
          setStatus('error')
          setMessage(`This invitation was sent to ${invitation.email}. Please log in with that email address or sign out and create a new account.`)
          setLoading(false)
          return
        }

        // Add user to rearing group FIRST
        const { error: memberError } = await supabase
          .from('rearing_group_members')
          .insert({
            group_id: invitation.group_id,
            user_id: userId,
            role: 'member',
          })

        if (memberError) {
          if (memberError.code === '23505') {
            setStatus('already-accepted')
            setMessage(`You are already a member of ${extractedGroupName || 'this rearing group'}`)
          } else {
            throw memberError
          }
        } else {
          // Update invitation status AFTER successfully adding to group
          const { error: updateError } = await supabase
            .from('rearing_group_invitations')
            .update({ status: 'accepted', accepted_at: new Date().toISOString() })
            .eq('id', invitationId)

          if (updateError) {
            console.error('Warning: Failed to update invitation status:', updateError)
          }

          setStatus('success')
          setMessage(`Successfully joined ${extractedGroupName || 'the rearing group'}!`)
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
    return <InvitationLoadingShell text="Processing invitation..." />
  }

  return (
    <InvitationResponseShell title="Rearing Group Invitation" subtitle="Accept Invitation">
      <div className="text-center">
          {status === 'success' && (
            <>
              <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Success!</h1>
              <p className="text-text-secondary mb-4">{message}</p>
              <p className="text-sm text-text-tertiary">Redirecting to dashboard...</p>
            </>
          )}

          {status === 'already-accepted' && (
            <>
              <AlertCircle size={64} className="mx-auto text-blue-500 mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Already a Member</h1>
              <p className="text-text-secondary mb-4">{message}</p>
              <Button
                onClick={() => router.push('/dashboard')}
                tone="blue"
              >
                Go to Dashboard
              </Button>
            </>
          )}

          {status === 'needs-signup' && (
            <>
              <AlertCircle size={64} className="mx-auto text-blue-500 mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Sign Up Required</h1>
              <p className="text-text-secondary mb-4">
                You&apos;ve been invited to join <strong>{groupName}</strong>!
              </p>
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-left text-sm dark:border-blue-900 dark:bg-blue-950/20">
                <p className="font-medium text-blue-900 mb-2">To accept this invitation:</p>
                <ol className="list-inside list-decimal space-y-1 text-blue-800 dark:text-blue-200">
                  <li>Sign up for an account using: <strong>{invitedEmail}</strong></li>
                  <li>Check your email and confirm your account</li>
                  <li>Return to this invitation link to join the group</li>
                </ol>
              </div>
              <p className="text-xs text-text-tertiary mb-4">
                Important: You must use the email address <strong>{invitedEmail}</strong> when signing up.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push(`/login?signup=true&email=${encodeURIComponent(invitedEmail)}&redirect=${encodeURIComponent(window.location.href)}`)}
                  tone="blue"
                  fullWidth
                >
                  Sign Up
                </Button>
                <Button
                  onClick={() => router.push(`/login?email=${encodeURIComponent(invitedEmail)}&redirect=${encodeURIComponent(window.location.href)}`)}
                  tone="neutral"
                  fullWidth
                >
                  Already have an account? Sign In
                </Button>
              </div>
            </>
          )}

          {status === 'expired' && (
            <>
              <XCircle size={64} className="mx-auto text-orange-500 mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Invitation Expired</h1>
              <p className="text-text-secondary mb-4">{message}</p>
              <p className="text-sm text-text-tertiary mb-4">
                Please contact the group owner to send you a new invitation.
              </p>
              <Button
                onClick={() => router.push('/dashboard')}
                tone="blue"
              >
                Go to Dashboard
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={64} className="mx-auto text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Error</h1>
              <p className="text-text-secondary mb-4">{message}</p>
              <Button
                onClick={() => router.push('/dashboard')}
                tone="blue"
              >
                Go to Dashboard
              </Button>
            </>
          )}
      </div>
    </InvitationResponseShell>
  )
}

export default function AcceptRearingGroupInvitationPage() {
  return (
    <Suspense fallback={<InvitationLoadingShell text="Loading invitation..." />}>
      <AcceptRearingGroupInvitationContent />
    </Suspense>
  )
}
