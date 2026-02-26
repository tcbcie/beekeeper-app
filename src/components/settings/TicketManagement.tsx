'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import FieldLabel from '@/components/ui/FieldLabel'
import SelectField from '@/components/ui/SelectField'
import TextAreaField from '@/components/ui/TextAreaField'
import InfoPanel from '@/components/ui/InfoPanel'

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
              className={`fj-btn fj-btn-sm ${
                ticketFilter === filter
                  ? 'fj-btn-blue'
                  : 'fj-btn-neutral'
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
                        <span className="fj-badge fj-badge-blue">
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
                        <FieldLabel>
                          Status
                        </FieldLabel>
                        <SelectField
                          value={editingTicket.status}
                          onChange={(e) =>
                            setEditingTicket({ ...editingTicket, status: e.target.value as 'open' | 'in_progress' | 'resolved' | 'closed' })
                          }
                          tone="purple"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </SelectField>
                      </div>
                      <div>
                        <FieldLabel>
                          Priority
                        </FieldLabel>
                        <SelectField
                          value={editingTicket.priority}
                          onChange={(e) =>
                            setEditingTicket({ ...editingTicket, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })
                          }
                          tone="purple"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </SelectField>
                      </div>
                    </div>

                    <div>
                      <FieldLabel>
                        Admin Notes (visible to user)
                      </FieldLabel>
                      <TextAreaField
                        value={editingTicket.admin_notes || ''}
                        onChange={(e) =>
                          setEditingTicket({ ...editingTicket, admin_notes: e.target.value })
                        }
                        rows={3}
                        tone="purple"
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
                        className="fj-btn fj-btn-blue"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingTicket(null)}
                        className="fj-btn fj-btn-neutral"
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
                          className="fj-btn fj-btn-blue fj-btn-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="fj-btn fj-btn-danger fj-btn-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span
                        className={`fj-badge ${
                          ticket.status === 'open'
                            ? 'fj-badge-blue'
                            : ticket.status === 'in_progress'
                            ? 'fj-badge-amber'
                            : ticket.status === 'resolved'
                            ? 'fj-badge-green'
                            : 'fj-badge-neutral'
                        }`}
                      >
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span
                        className={`fj-badge ${
                          ticket.priority === 'urgent'
                            ? 'fj-badge-red'
                            : ticket.priority === 'high'
                            ? 'fj-badge-amber'
                            : ticket.priority === 'normal'
                            ? 'fj-badge-blue'
                            : 'fj-badge-neutral'
                        }`}
                      >
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span
                        className={`fj-badge ${
                          ticket.ticket_type === 'problem'
                            ? 'fj-badge-red'
                            : 'fj-badge-blue'
                        }`}
                      >
                        {ticket.ticket_type.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-text-secondary mb-3 whitespace-pre-wrap">
                      {ticket.description}
                    </p>

                    {ticket.admin_notes && (
                      <InfoPanel tone="blue" title="Your Response:" className="mb-2 p-3" contentClassName="text-sm">
                        <p className="whitespace-pre-wrap">
                          {ticket.admin_notes}
                        </p>
                      </InfoPanel>
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
              <span className="fj-text-info">Open:</span>
              <span className="ml-2 font-bold">
                {tickets.filter((t) => t.status === 'open').length}
              </span>
            </div>
            <div>
              <span className="fj-text-warning">In Progress:</span>
              <span className="ml-2 font-bold">
                {tickets.filter((t) => t.status === 'in_progress').length}
              </span>
            </div>
            <div>
              <span className="fj-text-success">Resolved:</span>
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
