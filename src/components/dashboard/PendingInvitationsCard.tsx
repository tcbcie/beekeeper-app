'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AlertPanel from '@/components/ui/AlertPanel'

interface PendingInvitation {
  kind: 'team' | 'rearing_group'
  invitation_id: string
  name: string
  inviter_name: string | null
}

const LINKS: Record<PendingInvitation['kind'], { accept: string; decline: string; label: string }> = {
  team: { accept: '/accept-invitation', decline: '/decline-invitation', label: 'apiary team' },
  rearing_group: { accept: '/accept-rearing-group-invitation', decline: '/decline-rearing-group-invitation', label: 'rearing group' },
}

/**
 * Team and rearing-group invitations addressed to the signed-in user. Joining always
 * needs the invitee's consent, so this is the in-app way to accept when the email
 * did not arrive. Renders nothing when there are none.
 */
export default function PendingInvitationsCard() {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])

  useEffect(() => {
    let cancelled = false
    supabase.rpc('get_my_pending_invitations').then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        console.error('Error loading pending invitations:', error)
        return
      }
      setInvitations((data ?? []) as PendingInvitation[])
    })
    return () => { cancelled = true }
  }, [])

  if (invitations.length === 0) return null

  return (
    <div className="space-y-3">
      {invitations.map((inv) => {
        const links = LINKS[inv.kind]
        return (
          <AlertPanel
            key={inv.invitation_id}
            tone="info"
            icon={<Users size={20} />}
            title={<span className="text-base">You have been invited to join the {links.label} &quot;{inv.name}&quot;</span>}
          >
            {inv.inviter_name && <p className="text-base">Invited by {inv.inviter_name}.</p>}
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href={`${links.accept}?id=${inv.invitation_id}`} className="fj-btn fj-btn-blue px-5 text-base">
                Accept
              </Link>
              <Link href={`${links.decline}?id=${inv.invitation_id}`} className="fj-btn fj-btn-neutral px-5 text-base">
                Decline
              </Link>
            </div>
          </AlertPanel>
        )
      })}
    </div>
  )
}
