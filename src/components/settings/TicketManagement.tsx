'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'

interface SupportTicket {
  id: string
  user_id: string
  ticket_type: 'problem' | 'suggestion'
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  admin_notes: string | null
  resolved_by?: string | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
  user_profiles?: {
    email: string
    first_name?: string
    last_name?: string
  } | null
  resolver?: {
    email: string
    first_name?: string
    last_name?: string
  } | null
}

interface TicketUpdate {
  status?: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  admin_notes?: string
  resolved_by?: string
  resolved_at?: string
}

interface TicketManagementProps {
  userId: string
}

export default function TicketManagement({ userId }: TicketManagementProps) {
  const toast = useToast()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null)
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('open')

  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true)
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          user_profiles:profiles!support_tickets_user_id_fkey(email, first_name, last_name),
          resolver:profiles!support_tickets_resolved_by_fkey(email, first_name, last_name)
        `)
        .order('created_at', { ascending: false })

      if (ticketFilter !== 'all') {
        query = query.eq('status', ticketFilter)
      }

      const { data: ticketsData, error: ticketsError } = await query

      if (ticketsError) {
        if (ticketsError.message?.includes('relation "support_tickets" does not exist') ||
            ticketsError.code === '42P01') {
          console.error('Support tickets table does not exist. Please run the migration.')
          toast.error('Support tickets table not found. Please run the SQL migration.')
          setTickets([])
          return
        }
        console.warn('Join failed, falling back to manual lookup:', ticketsError)

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('support_tickets')
          .select('*')
          .order('created_at', { ascending: false })

        if (fallbackError) throw fallbackError

        if (fallbackData && fallbackData.length > 0) {
          const enrichedTickets = await Promise.all(
            fallbackData.map(async (ticket) => {
              const { data: authUser } = await supabase
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('id', ticket.user_id)
                .maybeSingle()

              let resolverData = null
              if (ticket.resolved_by) {
                const { data: authResolver } = await supabase
                  .from('profiles')
                  .select('email, first_name, last_name')
                  .eq('id', ticket.resolved_by)
                  .maybeSingle()
                resolverData = authResolver
              }

              return {
                ...ticket,
                user_profiles: authUser || null,
                resolver: resolverData || null,
              }
            })
          )
          setTickets(enrichedTickets)
        } else {
          setTickets([])
        }
        return
      }

      setTickets(ticketsData || [])
    } catch (error) {
      console.error('Error fetching tickets:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to fetch tickets: ${errorMessage}`)
      setTickets([])
    } finally {
      setLoadingTickets(false)
    }
  }, [ticketFilter, toast])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const handleTicketUpdate = async (ticketId: string, updates: TicketUpdate) => {
    try {
      const updateData: TicketUpdate & { resolved_by?: string; resolved_at?: string } = { ...updates }

      if (updates.status === 'resolved' || updates.status === 'closed') {
        updateData.resolved_by = userId
        updateData.resolved_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select()

      if (error) {
        console.error('Update error:', error)
        throw error
      }

      toast.success('Ticket updated successfully!')
      fetchTickets()
      setEditingTicket(null)
    } catch (error) {
      console.error('Error updating ticket:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to update ticket: ${errorMessage}`)
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId)

      if (error) throw error

      toast.success('Ticket deleted successfully!')
      fetchTickets()
    } catch (error) {
      console.error('Error deleting ticket:', error)
      toast.error('Failed to delete ticket.')
    }
  }

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground">Support Ticket Management</h2>
        <p className="text-text-tertiary mt-2">Manage and respond to user support tickets</p>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTicketFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                ticketFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface-elevated dark:bg-surface-elevated text-text-secondary hover:bg-surface dark:hover:bg-surface'
              }`}
            >
              {filter.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        {loadingTickets ? (
          <div className="text-center py-8">
            <LoadingSpinner text="Loading tickets..." />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            No tickets found for this filter.
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="border rounded-lg p-4 bg-surface dark:bg-background">
                {editingTicket?.id === ticket.id ? (
                  /* Edit Form */
                  <div className="space-y-3">
                    {/* Ticket Header - Read Only */}
                    <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-text-tertiary mb-2">
                        From: {ticket.user_profiles?.first_name && ticket.user_profiles?.last_name
                          ? `${ticket.user_profiles.first_name} ${ticket.user_profiles.last_name}`
                          : ticket.user_profiles?.email || 'Unknown'} |{' '}
                        {new Date(ticket.created_at).toLocaleString()}
                      </p>
                      <div className="flex gap-2 mb-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-600">
                          {ticket.ticket_type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-text-secondary whitespace-pre-wrap">
                        {ticket.description}
                      </p>
                    </div>

                    {/* Edit Fields */}
                    <h4 className="font-semibold text-foreground mt-2">Update Ticket</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                          Status
                        </label>
                        <select
                          value={editingTicket.status}
                          onChange={(e) =>
                            setEditingTicket({ ...editingTicket, status: e.target.value as 'open' | 'in_progress' | 'resolved' | 'closed' })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                          Priority
                        </label>
                        <select
                          value={editingTicket.priority}
                          onChange={(e) =>
                            setEditingTicket({ ...editingTicket, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Admin Notes (visible to user)
                      </label>
                      <textarea
                        value={editingTicket.admin_notes || ''}
                        onChange={(e) =>
                          setEditingTicket({ ...editingTicket, admin_notes: e.target.value })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-md"
                        placeholder="Response to the user..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleTicketUpdate(ticket.id, {
                            status: editingTicket.status,
                            priority: editingTicket.priority,
                            admin_notes: editingTicket.admin_notes || undefined,
                          })
                        }
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingTicket(null)}
                        className="px-4 py-2 bg-surface-elevated dark:bg-surface-elevated rounded-lg hover:bg-surface dark:hover:bg-surface border border-border"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {ticket.subject}
                        </h3>
                        <p className="text-sm text-text-tertiary">
                          From: {ticket.user_profiles?.first_name && ticket.user_profiles?.last_name
                            ? `${ticket.user_profiles.first_name} ${ticket.user_profiles.last_name}`
                            : ticket.user_profiles?.email || 'Unknown'} |{' '}
                          {new Date(ticket.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTicket(ticket)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          ticket.status === 'open'
                            ? 'bg-blue-100 text-blue-800'
                            : ticket.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : ticket.status === 'resolved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-surface-elevated dark:bg-surface-elevated text-foreground dark:text-foreground'
                        }`}
                      >
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          ticket.priority === 'urgent'
                            ? 'bg-red-100 text-red-600'
                            : ticket.priority === 'high'
                            ? 'bg-orange-100 text-orange-600'
                            : ticket.priority === 'normal'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-surface-elevated dark:bg-surface-elevated text-text-tertiary'
                        }`}
                      >
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          ticket.ticket_type === 'problem'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {ticket.ticket_type.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-text-secondary mb-3 whitespace-pre-wrap">
                      {ticket.description}
                    </p>

                    {ticket.admin_notes && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-2">
                        <p className="text-sm font-semibold text-blue-900 mb-1">
                          Your Response:
                        </p>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">
                          {ticket.admin_notes}
                        </p>
                      </div>
                    )}

                    {ticket.resolved_by && ticket.resolved_at && (
                      <p className="text-xs text-text-tertiary">
                        Resolved by: {ticket.resolver?.email || 'Unknown'} on{' '}
                        {new Date(ticket.resolved_at!).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Statistics */}
        <div className="bg-surface dark:bg-background border border-border rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-foreground mb-2">Ticket Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-text-tertiary">Total:</span>
              <span className="ml-2 font-bold">{tickets.length}</span>
            </div>
            <div>
              <span className="text-blue-600">Open:</span>
              <span className="ml-2 font-bold">
                {tickets.filter((t) => t.status === 'open').length}
              </span>
            </div>
            <div>
              <span className="text-yellow-600">In Progress:</span>
              <span className="ml-2 font-bold">
                {tickets.filter((t) => t.status === 'in_progress').length}
              </span>
            </div>
            <div>
              <span className="text-green-600">Resolved:</span>
              <span className="ml-2 font-bold">
                {tickets.filter((t) => t.status === 'resolved').length}
              </span>
            </div>
            <div>
              <span className="text-text-tertiary">Closed:</span>
              <span className="ml-2 font-bold">
                {tickets.filter((t) => t.status === 'closed').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
