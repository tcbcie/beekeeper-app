'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Info, Newspaper, FileEdit, AlertTriangle, Shield, MessageCircle, Plus, Edit2, X, Lightbulb, Clock, CheckCircle, XCircle } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface SupportTicket {
  id: string
  ticket_type: 'problem' | 'suggestion'
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  admin_notes: string | null
  created_at: string
  updated_at: string
}

interface FormData {
  ticket_type: 'problem' | 'suggestion'
  subject: string
  description: string
}

export default function AboutPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'about' | 'news' | 'changes' | 'disclaimer' | 'privacy' | 'support'>('about')
  const router = useRouter()

  // Check URL for section parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const section = urlParams.get('section')
    if (section && ['about', 'news', 'changes', 'disclaimer', 'privacy', 'support'].includes(section)) {
      setActiveSection(section as 'about' | 'news' | 'changes' | 'disclaimer' | 'privacy' | 'support')
    }
  }, [])

  // Support ticket states
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null)
  const [formData, setFormData] = useState<FormData>({
    ticket_type: 'problem',
    subject: '',
    description: '',
  })

  const fetchTickets = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tickets:', error)
    } else if (data) {
      setTickets(data)
    }
  }, [userId])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
      fetchTickets(id)
      setLoading(false)
    }
    initUser()
  }, [router, fetchTickets])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      const submitData = {
        ...formData,
        user_id: userId,
      }

      if (editingTicket) {
        const { error } = await supabase
          .from('support_tickets')
          .update({
            subject: formData.subject,
            description: formData.description,
          })
          .eq('id', editingTicket.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('support_tickets')
          .insert([submitData])

        if (error) throw error
      }

      fetchTickets()
      resetForm()
    } catch (error) {
      console.error('Error submitting ticket:', error)
      alert(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleEdit = (ticket: SupportTicket) => {
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      alert('Cannot edit resolved or closed tickets')
      return
    }

    setEditingTicket(ticket)
    setFormData({
      ticket_type: ticket.ticket_type,
      subject: ticket.subject,
      description: ticket.description,
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingTicket(null)
    setFormData({
      ticket_type: 'problem',
      subject: '',
      description: '',
    })
  }

  const handleCloseTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to close this ticket? You will not be able to edit it after closing.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'closed' })
        .eq('id', ticketId)
        .eq('user_id', userId)

      if (error) throw error

      fetchTickets()
    } catch (error) {
      console.error('Error closing ticket:', error)
      alert(error instanceof Error ? error.message : 'Failed to close ticket')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    }
    return badges[status as keyof typeof badges] || badges.open
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock size={16} />
      case 'in_progress':
        return <AlertTriangle size={16} />
      case 'resolved':
        return <CheckCircle size={16} />
      case 'closed':
        return <XCircle size={16} />
      default:
        return <Clock size={16} />
    }
  }

  const getPriorityBadge = (priority: string) => {
    const badges = {
      low: 'bg-gray-100 text-gray-600',
      normal: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600',
    }
    return badges[priority as keyof typeof badges] || badges.normal
  }

  if (loading) return <LoadingSpinner text="Loading..." />

  const sections = [
    { id: 'about' as const, label: 'About', icon: Info },
    { id: 'news' as const, label: 'News', icon: Newspaper },
    { id: 'changes' as const, label: 'Changes', icon: FileEdit },
    { id: 'support' as const, label: 'Support', icon: MessageCircle },
    { id: 'disclaimer' as const, label: 'Disclaimer', icon: AlertTriangle },
    { id: 'privacy' as const, label: 'Privacy Notice', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Info size={32} className="text-gray-700" />
        <h1 className="text-3xl font-bold text-gray-900">About HiveCraic</h1>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap -mb-px">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeSection === section.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {section.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* About Section */}
      {activeSection === 'about' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About HiveCraic</h2>

          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              HiveCraic is a comprehensive beekeeping management application designed to help beekeepers
              of all experience levels track and manage their apiaries, hives, queens, and beekeeping activities.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Features</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Complete apiary and hive management</li>
              <li>Apiaries Team Management</li>
              <li>Queen tracking with age calculation and lineage records</li>
              <li>Detailed inspection logging with weather data</li>
              <li>Varroa mite monitoring and treatment tracking</li>
              <li>Queen rearing batch management</li>
              <li>Harvest and feeding records</li>
              <li>Multi-user support with role-based access control</li>
              <li>Data export capabilities</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Version</h3>
            <p className="text-gray-700">
              <strong>Current Version:</strong> 1.0.0 (October 2025)
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Credits</h3>
            <p className="text-gray-700 leading-relaxed">
              Crafted with honeyed hearts by <strong>tcbc.ie</strong>, alongside the buzzing minds of
              <strong> Tribes Beekeepers Association</strong> and <strong>Tribes QRBG</strong>.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Technology</h3>
            <p className="text-gray-700 leading-relaxed">
              Built with modern web technologies including Next.js, React, TypeScript, Tailwind CSS,
              and Supabase for secure data storage and authentication.
            </p>
          </div>
        </div>
      )}

      {/* News Section */}
      {activeSection === 'news' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Latest News</h2>

          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">HiveCraic Launch</h3>
              <p className="text-sm text-gray-500 mb-2">October 2025</p>
              <p className="text-gray-700">
                We&apos;re excited to announce the official launch of HiveCraic! Our comprehensive
                beekeeping management platform is now available to help beekeepers manage their operations
                more efficiently.
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">QueenCraft Feature Added</h3>
              <p className="text-sm text-gray-500 mb-2">October 2025</p>
              <p className="text-gray-700">
                New queen rearing management feature with Planning and Selection sections to help you
                track your queen breeding programs.
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">Multi-User Support</h3>
              <p className="text-sm text-gray-500 mb-2">October 2025</p>
              <p className="text-gray-700">
                Role-based access control with Admin and User roles enables collaborative beekeeping
                management for clubs and associations.
              </p>
            </div>

            <div className="border-l-4 border-amber-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">Right-Sized Broodbox Feature</h3>
              <p className="text-sm text-gray-500 mb-2">October 2025</p>
              <p className="text-gray-700">
                Track right-sized broodbox configurations for your hives with frame count monitoring
                during inspections.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Changes Section */}
      {activeSection === 'changes' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Change Log</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded font-semibold">v1.0.19</span>
                November 4, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Navigation Buttons:</strong> Added navigation buttons to records page header when accessed from hive detail page - includes &quot;Hive Detail&quot; and &quot;Hives&quot; buttons for easy navigation back to source</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Branding Update:</strong> Changed application name from &quot;Hive Craic&quot; (two words) to &quot;HiveCraic&quot; (one word) throughout the application including page titles, navbar, and all user-facing text</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded font-semibold">v1.0.18</span>
                November 3, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">★</span>
                  <span><strong>Full & Half Brood Boxes:</strong> Enhanced hive configuration to support both full-size and half-size brood boxes with proper visualization - half-size boxes rendered same height as honey supers for accurate representation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Hive Detail Page:</strong> Added comprehensive hive detail view with &quot;Select & New Record&quot; button - displays all hive information, configuration diagram, and all associated records (inspections, varroa checks, treatments, feedings, harvests) in one place</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Quick Record Creation:</strong> Added 5 quick action buttons on hive detail page for creating new inspections, varroa checks, treatments, feedings, and harvests directly for the selected hive</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Filter Persistence:</strong> Hives page now remembers apiary and ownership filter settings throughout the browser session with automatic validation to prevent invalid saved filters</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Data Export Improvements:</strong> Renamed backup files to hivecraic-backup format with full timestamp (date + time) for better organization and identification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Dashboard UI Updates:</strong> Reorganized dashboard layout - moved My Teams section below Recent Activity and merged &quot;No Shared Apiaries&quot; message into My Teams section for better flow</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">🔧</span>
                  <span><strong>Bug Fixes:</strong> Fixed 404 errors from user_profiles table references (updated to profiles), resolved queens relationship errors on hive detail page, validated saved apiary filters to prevent &quot;No hives found&quot; messages</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded font-semibold">v1.0.17</span>
                November 3, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">★</span>
                  <span><strong>Critical Performance Improvements:</strong> Major optimization of Dashboard, Hives, and Records pages - eliminated N+1 query problems and parallelized database queries resulting in 2-10x faster page load times</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Hives Page Optimization:</strong> Reduced from 60-80+ sequential queries to just 4 total queries using batch fetching for queens, inspections, and team data with in-memory calculations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Records Page Optimization:</strong> Parallelized 10 fetch functions with Promise.all, optimized inspections query from 4 sequential to 1 query with joins, added server-side filtering and query limits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Dashboard Page Optimization:</strong> Fixed N+1 queries in team member counts (reduced from 6+ to 3 queries) and parallelized team statistics queries for faster dashboard loads</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Feed Type Dropdown:</strong> Converted feed type to database-managed dropdown with 9 default options (Sugar Syrup 1:1/2:1, Fondant, Candy Board, Pollen Patty, etc.) plus &quot;Other&quot; option for custom entries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Hive Card Sorting:</strong> Hives now display in physical order - sorted by apiary, then row number, then order within row for easy identification of hive locations</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-semibold">v1.0.16</span>
                November 2, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">★</span>
                  <span><strong>Unified Records Page:</strong> Completely redesigned records system - all 5 activity types (Inspections, Varroa Treatments, Varroa Checks, Feeding, Harvests) now unified in single view at /dashboard/records with comprehensive filtering and color-coded badges</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">★</span>
                  <span><strong>Complete CRUD System:</strong> Implemented full create, read, update, delete functionality for all non-inspection record types with forms, edit buttons, delete confirmations, and automatic data refresh</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">★</span>
                  <span><strong>Admin Role System:</strong> Restored admin functionality with role migration from old user_profiles table - admin users can now access Settings page with user management, support tickets, and system configuration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">★</span>
                  <span><strong>Hive Physical Organization:</strong> Added row_in_apiary and order_in_apiary fields to track physical hive layout within apiaries with combined uniqueness constraint allowing multiple hives per row and per order number</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Order Direction Feature:</strong> Added order_direction field (entrances/backs) with radio button selection to specify perspective when numbering hives left-to-right in rows</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Hive Position UI:</strong> Added intuitive +/- increment buttons for row and order fields with validation to prevent duplicate row+order combinations within same apiary</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Hive Card Display:</strong> Position information now shows as &quot;(Row 1, Hive 4)&quot; on hive cards for easy identification of physical location</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Code Consolidation:</strong> Removed ~2,338 lines of duplicate code by eliminating individual activity pages (feeding, harvest, varroa-check, varroa-treatment) - everything now in unified Records system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Multi-Type Filtering:</strong> Records page supports filtering by record type, apiary, hive, and time period - see all your beekeeping activities sorted by date across all types</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Database Migration Tools:</strong> Created comprehensive SQL migration scripts with diagnostics for role migration, normalization, admin user setup, and hive organization fields</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Creator Tracking:</strong> All activity records (inspections, varroa treatments/checks, feedings, harvests) now show who created each entry with &quot;Recorded by&quot; field displaying name or email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Team Collaboration Enhancement:</strong> Team owners can now see inspection and activity records created by team members for shared hives - full visibility across team</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Database Security:</strong> Implemented comprehensive RLS policies with can_access_hive() security definer function to properly control access to shared hive records</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Foreign Key Relationships:</strong> Added foreign key constraints linking all activity tables to profiles table enabling automatic joins for creator information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>TypeScript role compliance: All role values normalized to &apos;User&apos; | &apos;Admin&apos; with check constraints and indexes for performance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Navigation updated: &quot;Inspections&quot; renamed to &quot;Records&quot; in main menu to reflect unified system</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded font-semibold">v1.0.11</span>
                November 1, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Team Invitation History:</strong> Team owners can now view complete invitation history including accepted and declined invitations with timestamps</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Declined Invitation Tracking:</strong> Added declined_at column to team_invitations table to properly track when invitations are declined</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Reinvite Declined Users:</strong> Fixed issue where reinviting users who previously declined would show incorrect error message</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Invitation Display:</strong> Color-coded invitation cards (Green for accepted, Red for declined, Orange for pending) with formatted timestamps</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Auto-cleanup Old Invitations:</strong> Declined invitations are automatically removed when sending new invitations to the same email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Fixed 406 Not Acceptable error when declining team invitations with schema cache reload</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Improved invitation validation and error messages for better user experience</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded font-semibold">v1.0.10</span>
                October 31, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Varroa Treatment Products:</strong> Created reference table for approved varroa treatment products in Ireland with detailed information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Treatment Type Dropdown:</strong> Enhanced with organized sections (Thymol, Formic Acid, Oxalic Acid) showing product name and active ingredients</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Auto Weather Data:</strong> Varroa treatment records now auto-populate temperature and weather conditions based on hive Eircode</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>IPM Tips Popup:</strong> Added integrated pest management tips popup on varroa treatment page for best practices</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Settings Reorganization:</strong> Settings page now uses tabs (Profile, Users, Tickets, Treatments, Dropdowns) for better organization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Editable Treatment Table:</strong> Varroa treatment products can be managed via inline-editable table in Settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Removed Product Name column from Settings table, now shown in Treatment Type dropdown instead</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded font-semibold">v1.0.9</span>
                October 31, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Inspection Weight Field:</strong> Added optional weight field (kg) to record hive weight during inspections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Hive Order Field:</strong> Added optional hive order field with +/- buttons to track physical position at apiary</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Team Beekeeping Sections:</strong> Split team data into &quot;Shared by Me&quot; and &quot;Shared with Me&quot; for clarity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Team Members Detail View:</strong> Added &quot;Show Details&quot; button to see all members with access to shared apiaries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Fixed Invitation Links:</strong> Corrected email invitation accept/decline URLs to use proper domain</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Invitation Pages:</strong> Created accept-invitation and decline-invitation pages with full validation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Fixed TypeScript errors and improved type safety across dashboard and invitation pages</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded font-semibold">v1.0.8</span>
                October 30, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Team Invitations:</strong> Email invitation system for inviting users to teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Beautiful HTML email templates with team details and accept/decline buttons</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Auto-accept pending invitations when users sign up with invited email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Team owners can rename their teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Fixed critical security issue: Team members now only see shared apiary data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Admin delete user functionality with comprehensive data cleanup</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Fixed infinite recursion bug when leaving teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Improved error messages with helpful setup guidance</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded font-semibold">v1.0.7</span>
                October 30, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Mobile Responsiveness:</strong> Fixed Team Management section for mobile screens</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Team management buttons (Invite, Share Apiary) now wrap and use shortened text on mobile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Fixed Inspections Given/Taken section to fit mobile screens without overflow</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>All 6 frame fields (Foundation, Brood, Drawn, Supers, Drone, Store) now have compact mobile layout</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Reduced button sizes, gaps, and font sizes on mobile while maintaining touch-friendly 44px targets</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Fixed TypeScript error: Replaced &apos;any&apos; type with proper TeamApiaryResponse interface</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-semibold">v1.0.6</span>
                October 28, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Apiary Sharing UI:</strong> Team owners can now share entire apiaries with teams (all hives included)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Share Apiary button in Team Management with dropdown showing &quot;Name - Eircode&quot;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Shared Apiaries section displays all apiaries shared with each team</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Team members automatically gain read-only access to ALL hives, queens, and inspections in shared apiaries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Dashboard Team Beekeeping section now shows actual team data (queens, hives, inspections)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Ownership filters on Hives and Inspections pages: My/Team/All views</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Profile section layout optimized for better space usage (compact account info display)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Fixed profile update using upsert to handle new user profiles correctly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Team collaboration system confirmed using apiary-level sharing (not individual hives)</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">v1.0.5</span>
                October 27, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span><strong>Team Collaboration:</strong> Create teams to collaborate with other beekeepers on managing apiaries and hives</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Team Management in Profile: Create teams, invite members via email, manage roles (owner/admin/member)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Dashboard Teams section: View owned teams and teams you&apos;re a member of with member counts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Invitation system with 7-day expiration, duplicate checking, and pending invitation tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Member management: Add/remove members, view team member list, leave teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Full database schema with RLS policies for secure team-based data access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">⚡</span>
                  <span><em>Coming soon:</em> Email notifications for invitations and shared apiary management</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">v1.0.4</span>
                October 27, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Inspection image optimization with compact 64px badge layout on cards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Double-click modal for full-size image viewing on inspection cards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Form preview thumbnail (80px) with double-click modal before saving</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Space efficiency improvements saving ~320px per form, ~200px per card</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded">v1.0.3</span>
                October 26, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Disease tracking overhaul with 6 specific disease types (AFB, EFB, Chalkbrood, Nosemosis, DWV, IAPV/CBPV)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>1-5 star severity rating system replacing boolean checkboxes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Educational tooltips for each disease with symptoms and management guidance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Collapsible Disease section with teal theme for better organization</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded">v1.0.2</span>
                October 25, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Hygienic Behaviour section with Recapping, VSH, and SMR tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Star rating system (1-5) with &quot;Not Recorded&quot; default option</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Collapsible teal-themed section for varroa resistance trait monitoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Helpful tooltips explaining each hygienic behaviour metric</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">v1.0.1</span>
                October 24, 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Given/Taken section for tracking frames and supers added or removed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>6 trackable fields: Foundation Frames, Brood Frames, Drawn Frames, Honey Supers, Drone Frames, Store Frames</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Plus/Minus increment buttons for quick field updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Collapsible orange-themed section with clear visual organization</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">v1.0.0</span>
                October 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Initial release of HiveCraic</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Apiary and hive management system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Queen tracking with mating location (Eircode) support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Inspection logging with weather integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Varroa check and treatment tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>QueenCraft - Queen rearing batch management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Harvest and feeding record keeping</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Multi-user support with RBAC</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Database export functionality</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Right-sized broodbox tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Responsive design for mobile and desktop</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Features</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span>QueenCraft Selection tools for tracking performance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span>Advanced reporting and analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span>Mobile app for iOS and Android</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span>Calendar integration for scheduling</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span>Enhanced data visualization</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Support Section */}
      {activeSection === 'support' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Support</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? 'Cancel' : 'New Ticket'}
            </button>
          </div>

          <p className="text-gray-600">
            Have a problem or suggestion? Submit a support ticket and our team will get back to you.
          </p>

          {/* New/Edit Ticket Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">
                {editingTicket ? 'Edit Ticket' : 'Create New Ticket'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ticket Type *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, ticket_type: 'problem' })}
                      className={`p-4 border-2 rounded-lg transition-colors flex items-center gap-3 ${
                        formData.ticket_type === 'problem'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={!!editingTicket}
                    >
                      <AlertTriangle size={20} className="text-red-600" />
                      <div className="text-left">
                        <div className="font-semibold">Problem</div>
                        <div className="text-xs text-gray-500">Report an issue</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, ticket_type: 'suggestion' })}
                      className={`p-4 border-2 rounded-lg transition-colors flex items-center gap-3 ${
                        formData.ticket_type === 'suggestion'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={!!editingTicket}
                    >
                      <Lightbulb size={20} className="text-blue-600" />
                      <div className="text-left">
                        <div className="font-semibold">Suggestion</div>
                        <div className="text-xs text-gray-500">Share an idea</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Brief summary of your issue or suggestion"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Please provide as much detail as possible..."
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingTicket ? 'Update Ticket' : 'Submit Ticket'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tickets List */}
          <div className="bg-white rounded-lg shadow">
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No support tickets yet. Create your first ticket above!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        {ticket.ticket_type === 'problem' ? (
                          <AlertTriangle size={20} className="text-red-600" />
                        ) : (
                          <Lightbulb size={20} className="text-blue-600" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-900">{ticket.subject}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                          <button
                            onClick={() => handleEdit(ticket)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <Edit2 size={16} />
                            <span className="text-sm">Edit</span>
                          </button>
                        )}
                        {ticket.status !== 'closed' && (
                          <button
                            onClick={() => handleCloseTicket(ticket.id)}
                            className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
                          >
                            <XCircle size={16} />
                            <span className="text-sm">Close</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusBadge(
                          ticket.status
                        )}`}
                      >
                        {getStatusIcon(ticket.status)}
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getPriorityBadge(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority.toUpperCase()} PRIORITY
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-600">
                        {ticket.ticket_type.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{ticket.description}</p>

                    {ticket.admin_notes && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-3">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Admin Response:</p>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">{ticket.admin_notes}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
                      <span>Updated: {new Date(ticket.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer Section */}
      {activeSection === 'disclaimer' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Disclaimer</h2>

          <div className="prose max-w-none space-y-4 text-gray-700">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
              <p className="font-semibold text-amber-900">Important Notice</p>
              <p className="text-amber-800 mt-2">
                Please read this disclaimer carefully before using HiveCraic.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">General Information</h3>
            <p>
              HiveCraic is provided as a tool to assist beekeepers in managing their beekeeping operations.
              The information and features provided are for informational and organizational purposes only.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">No Professional Advice</h3>
            <p>
              The content and functionality provided by HiveCraic does not constitute professional beekeeping,
              veterinary, or agricultural advice. Users should consult with qualified beekeeping experts,
              veterinarians, or agricultural extension services for specific advice regarding their beekeeping operations.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Data Accuracy</h3>
            <p>
              While we strive to provide accurate and reliable features, HiveCraic makes no warranties or
              representations regarding the accuracy, completeness, or reliability of any data entered,
              calculated, or displayed within the application. Users are responsible for verifying the
              accuracy of their own data.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Weather Data</h3>
            <p>
              Weather data provided during inspection logging is sourced from third-party services and may
              not be completely accurate for your specific location. Always use your own judgment when
              assessing weather conditions for beekeeping activities.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Treatment and Health Management</h3>
            <p>
              Varroa treatment tracking and health management features are provided as record-keeping tools only.
              Always follow manufacturer instructions for any treatments, consult with veterinary professionals
              when required, and comply with local regulations regarding bee health management and treatments.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Limitation of Liability</h3>
            <p>
              To the fullest extent permitted by law, HiveCraic, its creators, contributors, and associated
              organizations (tcbc.ie, Tribes Beekeepers Association, Tribes QRBG) shall not be liable for any
              direct, indirect, incidental, special, or consequential damages arising from the use or inability
              to use this application, including but not limited to loss of data, loss of colonies, or any
              other losses related to beekeeping operations.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">User Responsibility</h3>
            <p>
              Users are solely responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>The accuracy of data they enter into the system</li>
              <li>Making informed decisions about their beekeeping practices</li>
              <li>Complying with local laws and regulations regarding beekeeping</li>
              <li>Maintaining appropriate backups of their data</li>
              <li>Securing their account credentials</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">No Guarantee of Service</h3>
            <p>
              HiveCraic is provided &quot;as is&quot; without any guarantee of continuous availability,
              functionality, or service. We reserve the right to modify, suspend, or discontinue any aspect
              of the service at any time without notice.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Changes to Disclaimer</h3>
            <p>
              We reserve the right to update or modify this disclaimer at any time. Continued use of HiveCraic
              after any changes constitutes acceptance of the updated disclaimer.
            </p>
          </div>
        </div>
      )}

      {/* Privacy Notice Section */}
      {activeSection === 'privacy' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy Notice</h2>

          <div className="prose max-w-none space-y-4 text-gray-700">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="font-semibold text-blue-900">Your Privacy Matters</p>
              <p className="text-blue-800 mt-2">
                This privacy notice explains how HiveCraic collects, uses, and protects your personal information.
              </p>
            </div>

            <p className="text-sm text-gray-500">Last Updated: October 2025</p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Information We Collect</h3>
            <p>
              HiveCraic collects and stores the following types of information:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Account Information:</strong> Email address, password (encrypted), and user profile data</li>
              <li><strong>Beekeeping Data:</strong> All data you enter about your apiaries, hives, queens, inspections, and related activities</li>
              <li><strong>Usage Data:</strong> Activity timestamps for online user tracking (visible to administrators)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">How We Use Your Information</h3>
            <p>
              Your information is used solely for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Providing and maintaining the HiveCraic service</li>
              <li>Authenticating your access to the application</li>
              <li>Storing and managing your beekeeping records</li>
              <li>Enabling multi-user collaboration features</li>
              <li>Displaying user activity statistics to administrators</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Data Storage and Security</h3>
            <p>
              Your data is stored securely using Supabase, a secure cloud database platform:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>All passwords are encrypted using industry-standard hashing</li>
              <li>Data is transmitted over secure HTTPS connections</li>
              <li>Row-level security policies ensure users can only access their own data</li>
              <li>Database backups are maintained for disaster recovery</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Data Sharing</h3>
            <p>
              HiveCraic does not sell, trade, or share your personal information with third parties except:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>With your explicit consent</li>
              <li>When required by law or legal process</li>
              <li>To protect the rights, property, or safety of HiveCraic, its users, or the public</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Multi-User Access</h3>
            <p>
              In multi-user environments:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Users can only see and access their own beekeeping data</li>
              <li>Administrators can view system-wide statistics (total users, hives, apiaries)</li>
              <li>Administrators can see which users are currently active</li>
              <li>Administrators cannot access individual user&apos;s detailed beekeeping records</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Third-Party Services</h3>
            <p>
              HiveCraic integrates with the following third-party services:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>Weather Services:</strong> Weather data for inspection logging</li>
            </ul>
            <p className="mt-2">
              These services have their own privacy policies and terms of service.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Your Rights</h3>
            <p>
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Access your personal data stored in HiveCraic</li>
              <li>Export your data using the database export feature</li>
              <li>Request correction of inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Withdraw consent for data processing</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Data Retention</h3>
            <p>
              Your data is retained as long as your account is active. If you delete your account,
              all associated data will be permanently removed from our systems within 30 days.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Cookies and Tracking</h3>
            <p>
              HiveCraic uses essential cookies for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Maintaining your logged-in session</li>
              <li>Remembering your preferences</li>
            </ul>
            <p className="mt-2">
              We do not use tracking cookies or analytics for advertising purposes.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Children&apos;s Privacy</h3>
            <p>
              HiveCraic is not intended for use by individuals under the age of 16. We do not knowingly
              collect personal information from children under 16.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Changes to Privacy Notice</h3>
            <p>
              We may update this privacy notice from time to time. We will notify users of any material
              changes by updating the &quot;Last Updated&quot; date and, where appropriate, providing
              additional notice.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Contact Information</h3>
            <p>
              If you have questions or concerns about this privacy notice or how your data is handled,
              please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-2">
              <p className="font-semibold">HiveCraic Support</p>
              <p>Email: support@tcbc.ie</p>
              <p>Website: tcbc.ie</p>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">GDPR Compliance</h3>
            <p>
              For users in the European Union, HiveCraic is committed to compliance with the General
              Data Protection Regulation (GDPR). You have additional rights under GDPR including the
              right to data portability and the right to lodge a complaint with a supervisory authority.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
