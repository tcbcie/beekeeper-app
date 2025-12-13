import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { TicketStatus } from '@/types/dashboard'

interface UseTicketStatusReturn {
  openTicketsCount: number
  userTicketStatus: TicketStatus | null
  fetchOpenTicketsCount: () => Promise<void>
  fetchUserTicketStatus: (userId: string) => Promise<void>
}

export function useTicketStatus(): UseTicketStatusReturn {
  const [openTicketsCount, setOpenTicketsCount] = useState<number>(0)
  const [userTicketStatus, setUserTicketStatus] = useState<TicketStatus | null>(null)

  const fetchOpenTicketsCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')

      if (error) throw error
      setOpenTicketsCount(count || 0)
    } catch (error) {
      console.error('Error fetching open tickets count:', error)
    }
  }, [])

  const fetchUserTicketStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('status, admin_notes')
        .eq('user_id', userId)
        .in('status', ['open', 'in_progress', 'resolved'])

      if (error) throw error

      // Count tickets by status and those with admin responses
      const counts: TicketStatus = { open: 0, in_progress: 0, resolved: 0, has_response: 0 }
      data?.forEach((ticket) => {
        if (ticket.status === 'open') counts.open++
        else if (ticket.status === 'in_progress') counts.in_progress++
        else if (ticket.status === 'resolved') counts.resolved++
        // Count tickets that have an admin response
        if (ticket.admin_notes && ticket.status !== 'resolved' && ticket.status !== 'closed') {
          counts.has_response++
        }
      })

      // Only set if user has any active tickets
      if (counts.open > 0 || counts.in_progress > 0 || counts.resolved > 0 || counts.has_response > 0) {
        setUserTicketStatus(counts)
      }
    } catch (error) {
      console.error('Error fetching user ticket status:', error)
    }
  }, [])

  return {
    openTicketsCount,
    userTicketStatus,
    fetchOpenTicketsCount,
    fetchUserTicketStatus,
  }
}
