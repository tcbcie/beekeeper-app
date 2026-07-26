'use client'
import { useEffect, useState, useCallback, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Info, Newspaper, FileEdit, AlertTriangle, Shield, MessageCircle, Plus, Edit2, X, Lightbulb, Clock, CheckCircle, XCircle, CreditCard, Users, MapPin, Hexagon, Globe, ExternalLink, Search, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ChangelogDisplay from '@/components/ChangelogDisplay'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import NavTabButton from '@/components/ui/NavTabButton'
import TextLink from '@/components/ui/TextLink'
import TextInput from '@/components/ui/TextInput'
import TextAreaField from '@/components/ui/TextAreaField'

interface SupportTicket {
 id: string
 ticket_type: 'problem' | 'suggestion' | 'subscription'
 subject: string
 description: string
 status: 'open' | 'in_progress' | 'resolved' | 'closed'
 priority: 'low' | 'normal' | 'high' | 'urgent'
 admin_notes: string | null
 created_at: string
 updated_at: string
}

interface FormData {
 ticket_type: 'problem' | 'suggestion' | 'subscription'
 subject: string
 description: string
}

interface AppStatistics {
 totalUsers: number
 subscribedUsers: number
 totalApiaries: number
 totalHives: number
 sharedApiaries: number
}

interface NewsArticle {
 id: string
 url: string
 title: string
 description: string | null
 image_url: string | null
 site_name: string | null
 published_date: string | null
 author: string | null
 created_at: string
}

function AboutPageContent() {
 const [userId, setUserId] = useState<string | null>(null)
 const [loading, setLoading] = useState(true)
 const [activeSection, setActiveSection] = useState<'about' | 'news' | 'changes' | 'disclaimer' | 'privacy' | 'support'>('about')
 const [mounted, setMounted] = useState(false)
 const [statistics, setStatistics] = useState<AppStatistics | null>(null)

 // News articles state
 const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([])
 const [newsLoading, setNewsLoading] = useState(false)
 const [showAllNews, setShowAllNews] = useState(false)
 const [newsSearch, setNewsSearch] = useState('')
 const [semanticResults, setSemanticResults] = useState<NewsArticle[]>([])
 const [semanticSearching, setSemanticSearching] = useState(false)
 const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
 const router = useRouter()
 const searchParams = useSearchParams()
 const toast = useToast()

 // Wait for client-side mount
 useEffect(() => {
 setMounted(true)
 }, [])

 // Check URL for section parameter on mount
 useEffect(() => {
 if (!mounted) return
 const section = searchParams.get('section')
 if (section && ['about', 'news', 'changes', 'disclaimer', 'privacy', 'support'].includes(section)) {
 setActiveSection(section as 'about' | 'news' | 'changes' | 'disclaimer' | 'privacy' | 'support')
 }
 }, [searchParams, mounted])

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

 const fetchStatistics = useCallback(async () => {
 try {
 // Call RPC function to get app-wide statistics (bypasses RLS)
 const { data, error } = await supabase.rpc('get_app_statistics')

 if (error) throw error

 if (data && data.length > 0) {
 const stats = data[0]
 setStatistics({
 totalUsers: Number(stats.total_users) || 0,
 subscribedUsers: Number(stats.subscribed_users) || 0,
 totalApiaries: Number(stats.total_apiaries) || 0,
 totalHives: Number(stats.total_hives) || 0,
 sharedApiaries: Number(stats.shared_apiaries) || 0,
 })
 }
 } catch (error) {
 console.error('Error fetching statistics:', error)
 }
 }, [])

 const fetchNewsArticles = useCallback(async () => {
 setNewsLoading(true)
 try {
 const { data, error } = await supabase
 .from('news_articles')
 .select('id, url, title, description, image_url, site_name, published_date, author, created_at')
 .eq('is_published', true)
 .order('published_date', { ascending: false, nullsFirst: false })
 .order('created_at', { ascending: false })

 if (error) throw error
 // Sort by published_date, falling back to created_at for articles without published_date
 const sorted = (data || []).sort((a, b) => {
 const dateA = new Date(a.published_date || a.created_at).getTime()
 const dateB = new Date(b.published_date || b.created_at).getTime()
 return dateB - dateA
 })
 setNewsArticles(sorted)
 } catch (error) {
 console.error('Error fetching news articles:', error)
 } finally {
 setNewsLoading(false)
 }
 }, [])

 // Debounced semantic search effect
 useEffect(() => {
 // Clear previous timeout
 if (searchTimeoutRef.current) {
 clearTimeout(searchTimeoutRef.current)
 }

 // Only search if query is >= 3 characters
 if (newsSearch.trim().length < 3) {
 setSemanticResults([])
 setSemanticSearching(false)
 return
 }

 setSemanticSearching(true)

 // Debounce the API call by 300ms
 searchTimeoutRef.current = setTimeout(async () => {
 try {
 // /api/news/search now requires Bearer auth (the route calls OpenAI
 // embeddings on every request, so it must not be open).
 const { data: { session } } = await supabase.auth.getSession()
 const token = session?.access_token
 if (!token) {
 setSemanticSearching(false)
 return
 }
 const response = await fetch(`/api/news/search?q=${encodeURIComponent(newsSearch.trim())}&limit=20`, {
 headers: { Authorization: `Bearer ${token}` }
 })
 if (response.ok) {
 const data = await response.json()
 // Map semantic results to NewsArticle format
 const mapped = data.results.map((r: { article_id: string; title: string; description: string | null; url: string; image_url: string | null; site_name: string | null; published_date: string | null; author: string | null; created_at: string }) => ({
 id: r.article_id,
 title: r.title,
 description: r.description,
 url: r.url,
 image_url: r.image_url,
 site_name: r.site_name,
 published_date: r.published_date,
 author: r.author,
 created_at: r.created_at
 }))
 setSemanticResults(mapped)
 }
 } catch (error) {
 console.error('Semantic search error:', error)
 } finally {
 setSemanticSearching(false)
 }
 }, 300)

 return () => {
 if (searchTimeoutRef.current) {
 clearTimeout(searchTimeoutRef.current)
 }
 }
 }, [newsSearch])

 useEffect(() => {
 const initUser = async () => {
 const id = await getCurrentUserId()
 if (!id) {
 router.push('/login')
 return
 }
 setUserId(id)
 fetchTickets(id)
 fetchStatistics()
 fetchNewsArticles()
 setLoading(false)
 }
 initUser()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [router])

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
 toast.error(error instanceof Error ? error.message : 'An error occurred')
 }
 }

 const handleEdit = (ticket: SupportTicket) => {
 if (ticket.status === 'closed' || ticket.status === 'resolved') {
 toast.warning('Cannot edit resolved or closed tickets')
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
 toast.error(error instanceof Error ? error.message : 'Failed to close ticket')
 }
 }

 const getStatusBadge = (status: string) => {
 const badges = {
 open: 'bg-blue-100 dark:bg-blue-950/30 text-foreground dark:text-blue-300',
 in_progress: 'bg-yellow-100 dark:bg-yellow-950/30 text-foreground dark:text-yellow-300',
 resolved: 'bg-green-100 dark:bg-green-950/30 text-foreground dark:text-green-300',
 closed: 'bg-surface-secondary text-text-secondary',
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
 low: 'bg-surface-secondary text-text-secondary',
 normal: 'bg-blue-100 dark:bg-blue-950/30 text-foreground dark:text-blue-300',
 high: 'bg-orange-100 dark:bg-orange-950/30 text-foreground dark:text-orange-300',
 urgent: 'bg-red-100 dark:bg-red-950/30 text-foreground dark:text-red-300',
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

 const ticketTypeButtonBaseClassName = 'h-auto w-full flex-col items-center rounded-lg border-2 px-4 py-4'

 return (
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <Info size={32} className="text-text-secondary" />
 <h1 className="text-3xl font-bold text-foreground">About HiveCraic</h1>
 </div>

 {/* Tab Navigation */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow">
 <div className="border-b border-border">
 <nav className="flex flex-wrap -mb-px">
 {sections.map((section) => {
 const Icon = section.icon
 return (
 <NavTabButton
 key={section.id}
 onClick={() => setActiveSection(section.id)}
 size="lg"
 tone="blue"
 active={activeSection === section.id}
 >
 <Icon size={16} />
 {section.label}
 </NavTabButton>
 )
 })}
 </nav>
 </div>
 </div>

 {/* About Section */}
 {activeSection === 'about' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 space-y-4">
 <h2 className="text-2xl font-bold text-foreground mb-4">About HiveCraic</h2>

 <div className="prose max-w-none">
 <p className="text-text-secondary leading-relaxed">
 HiveCraic is a comprehensive beekeeping management application designed to help beekeepers
 of all experience levels track and manage their apiaries, hives, queens, and beekeeping activities.
 </p>

 <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Features</h3>
 <ul className="list-disc list-inside text-text-secondary space-y-2">
 <li>Complete apiary and hive management</li>
 <li>Apiaries Team Management</li>
 <li>Queen tracking with age calculation and lineage records</li>
 <li>Detailed inspection logging with weather data</li>
 <li>Varroa mite monitoring and treatment tracking</li>
 <li>Queen rearing batch management</li>
 <li>Harvest and feeding records</li>
 <li>Multi-user support with role-based access control</li>
 <li>Email notifications for tasks, events, and batch reminders</li>
 <li>Data export capabilities</li>
 <li>Installable mobile application (PWA)</li>
 <li>AI Assistant (Mel) with access to your hive data and inspection records</li>
 <li>AI-powered beekeeping knowledge base with literature-sourced answers</li>
 <li>Community Map - view shared apiary locations and connect with nearby beekeepers</li>
 <li>Wild Colony Tracking - record and monitor feral bee colonies with inspection logging</li>
 <li>Beekeeping Tools - frame cell calculator, GDD tracker, and other useful utilities</li>
 </ul>

 <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Version</h3>
 <p className="text-text-secondary">
 <strong>Current Version:</strong> 1.11.2 (26th July 2026)
 </p>

 <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Credits</h3>
 <p className="text-text-secondary leading-relaxed">
 Crafted with honeyed hearts by <strong>tcbc.ie</strong>, alongside the buzzing minds of
 <strong> Tribes Beekeepers Association</strong> and <strong>Tribes QRBG</strong>.
 </p>

 <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Technology</h3>
 <p className="text-text-secondary leading-relaxed mb-3">
 Built with modern web technologies including Next.js, React, TypeScript, Tailwind CSS,
 and Supabase for secure data storage and authentication.
 </p>
 <p className="text-text-secondary leading-relaxed font-semibold">AI &amp; Machine Learning:</p>
 <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
 <li>AI Assistant (Mel) - Powered by GPT-4o-mini (OpenAI)</li>
 <li>Knowledge Base RAG - OpenAI embeddings with pgvector semantic search</li>
 <li>Varroa Mite Detection - YOLOv8 computer vision</li>
 <li>PDF OCR - GPT-4o Vision &amp; Gemini 2.0 Flash</li>
 </ul>

 <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">App Statistics</h3>
 {statistics ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
 <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
 <div className="flex items-center gap-3 mb-2">
 <Users size={24} className="text-blue-600 dark:text-blue-400" />
 <h4 className="text-sm font-medium text-text-secondary">Users Registered</h4>
 </div>
 <p className="text-3xl font-bold text-foreground">{statistics.totalUsers}</p>
 </div>

 <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
 <div className="flex items-center gap-3 mb-2">
 <CreditCard size={24} className="text-green-600 dark:text-green-400" />
 <h4 className="text-sm font-medium text-text-secondary">Active Subscriptions</h4>
 </div>
 <p className="text-3xl font-bold text-foreground">{statistics.subscribedUsers}</p>
 </div>

 <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
 <div className="flex items-center gap-3 mb-2">
 <MapPin size={24} className="text-purple-600 dark:text-purple-400" />
 <h4 className="text-sm font-medium text-text-secondary">Apiaries Managed</h4>
 </div>
 <p className="text-3xl font-bold text-foreground">{statistics.totalApiaries}</p>
 </div>

 <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
 <div className="flex items-center gap-3 mb-2">
 <Hexagon size={24} className="text-amber-600 dark:text-amber-400" />
 <h4 className="text-sm font-medium text-text-secondary">Hives Managed</h4>
 </div>
 <p className="text-3xl font-bold text-foreground">{statistics.totalHives}</p>
 </div>

 <div className="bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
 <div className="flex items-center gap-3 mb-2">
 <Globe size={24} className="text-teal-600 dark:text-teal-400" />
 <h4 className="text-sm font-medium text-text-secondary">Shared Apiaries</h4>
 </div>
 <p className="text-3xl font-bold text-foreground">{statistics.sharedApiaries}</p>
 </div>
 </div>
 ) : (
 <p className="text-text-secondary">Loading statistics...</p>
 )}
 </div>
 </div>
 )}

 {/* News Section */}
 {activeSection === 'news' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-2xl font-bold text-foreground">Latest News</h2>
 {newsArticles.length > 5 && (
 <Button
 onClick={() => setShowAllNews(!showAllNews)}
 tone="neutral"
 size="sm"
 className="text-blue-600 hover:text-blue-700"
 >
 {showAllNews ? (
 <>Show Less <ChevronUp size={16} /></>
 ) : (
 <>View All ({newsArticles.length}) <ChevronDown size={16} /></>
 )}
 </Button>
 )}
 </div>

 {/* Search (only when showing all) */}
 {showAllNews && newsArticles.length > 5 && (
 <div className="relative">
 {semanticSearching ? (
 <Sparkles size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 animate-pulse" />
 ) : newsSearch.trim().length >= 3 ? (
 <Sparkles size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
 ) : (
 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
 )}
 <TextInput
 type="text"
 value={newsSearch}
 onChange={(e) => setNewsSearch(e.target.value)}
 placeholder="Search articles (AI-powered with 3+ characters)..."
 className="w-full pl-10 pr-4 bg-surface-elevated focus:ring-blue-500"
 />
 {newsSearch.trim().length >= 3 && (
 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600 dark:text-amber-400">
 AI Search
 </span>
 )}
 </div>
 )}

 {newsLoading ? (
 <div className="py-8 text-center">
 <LoadingSpinner size="md" />
 </div>
 ) : newsArticles.length === 0 ? (
 <div className="py-8 text-center text-text-tertiary">
 <Newspaper size={48} className="mx-auto mb-4 opacity-50" />
 <p>No news articles yet.</p>
 </div>
 ) : (
 <div className="space-y-4">
 {(() => {
 // Use semantic results when query >= 3 chars, otherwise client-side filter
 const useSemanticSearch = newsSearch.trim().length >= 3
 const filtered = useSemanticSearch
 ? semanticResults
 : newsSearch
 ? newsArticles.filter(a =>
 a.title.toLowerCase().includes(newsSearch.toLowerCase()) ||
 a.description?.toLowerCase().includes(newsSearch.toLowerCase())
 )
 : newsArticles
 const displayed = showAllNews ? filtered : filtered.slice(0, 5)

 return displayed.map((article, index) => {
 const borderColors = ['border-blue-500', 'border-green-500', 'border-purple-500', 'border-amber-500', 'border-teal-500']
 const borderColor = borderColors[index % borderColors.length]

 return (
 <div key={article.id} className="flex gap-3 sm:gap-4 group overflow-hidden">
 {/* Image thumbnail */}
 {article.image_url && (
 <div className="w-16 h-16 sm:w-24 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-surface-secondary">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={article.image_url}
 alt=""
 className="w-full h-full object-cover"
 onError={(e) => {
 (e.target as HTMLImageElement).style.display = 'none'
 }}
 />
 </div>
 )}
 {/* Content */}
 <div className={`flex-1 min-w-0 border-l-4 ${borderColor} pl-3 sm:pl-4`}>
 <a
 href={article.url}
 target="_blank"
 rel="noopener noreferrer"
 className="text-base sm:text-lg font-semibold text-foreground hover:text-blue-600 flex items-start gap-2 group-hover:underline"
 >
 <span className="line-clamp-2">{article.title}</span>
 <ExternalLink size={14} className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
 </a>
 <p className="text-xs sm:text-sm text-text-tertiary mb-1 truncate">
 {article.site_name || new URL(article.url).hostname}
 {' • '}
 {article.published_date
 ? new Date(article.published_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
 : new Date(article.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
 }
 </p>
 {article.description && (
 <p className="text-sm text-text-secondary line-clamp-2 hidden sm:block">
 {article.description}
 </p>
 )}
 </div>
 </div>
 )
 })
 })()}

 {showAllNews && newsSearch && (
 newsSearch.trim().length >= 3
 ? semanticResults.length === 0 && !semanticSearching && (
 <div className="py-4 text-center text-text-tertiary">
 No articles match your semantic search.
 </div>
 )
 : newsArticles.filter(a =>
 a.title.toLowerCase().includes(newsSearch.toLowerCase()) ||
 a.description?.toLowerCase().includes(newsSearch.toLowerCase())
 ).length === 0 && (
 <div className="py-4 text-center text-text-tertiary">
 No articles match your search.
 </div>
 )
 )}
 </div>
 )}
 </div>
 )}

 {/* Changes Section */}
 {activeSection === 'changes' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6">
 <h2 className="text-2xl font-bold text-foreground mb-4">Change Log</h2>
 <p className="text-text-secondary mb-6">Latest updates and improvements to HiveCraic</p>

 <ChangelogDisplay versionLimit={5} />
 </div>
 )}

 {/* Support Section */}
 {activeSection === 'support' && (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h2 className="text-2xl font-bold text-foreground">Support</h2>
 <Button
 onClick={() => setShowForm(!showForm)}
 tone="blue"
 className="font-medium"
 >
 {showForm ? <X size={16} /> : <Plus size={16} />}
 {showForm ? 'Cancel' : 'New Ticket'}
 </Button>
 </div>

 <p className="text-text-secondary">
 Have a problem or suggestion? Submit a support ticket and our team will get back to you.
 </p>

 {/* New/Edit Ticket Form */}
 {showForm && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6">
 <h3 className="text-xl font-semibold mb-4">
 {editingTicket ? 'Edit Ticket' : 'Create New Ticket'}
 </h3>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Ticket Type *
 </label>
 <div className="grid grid-cols-3 gap-3">
 <Button
 type="button"
 onClick={() => setFormData({ ...formData, ticket_type: 'problem' })}
 className={`${ticketTypeButtonBaseClassName} ${
 formData.ticket_type === 'problem'
 ? 'border-red-500 bg-surface dark:bg-surface-elevated'
 : 'border-border hover:border border-border'
 }`}
 disabled={!!editingTicket}
 >
 <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
 <div className="text-center">
 <div className="font-semibold">Problem</div>
 <div className="text-xs text-text-tertiary">Report an issue</div>
 </div>
 </Button>
 <Button
 type="button"
 onClick={() => setFormData({ ...formData, ticket_type: 'suggestion' })}
 className={`${ticketTypeButtonBaseClassName} ${
 formData.ticket_type === 'suggestion'
 ? 'border-blue-500 bg-surface dark:bg-surface-elevated'
 : 'border-border hover:border border-border'
 }`}
 disabled={!!editingTicket}
 >
 <Lightbulb size={24} className="text-blue-600 dark:text-blue-400" />
 <div className="text-center">
 <div className="font-semibold">Suggestion</div>
 <div className="text-xs text-text-tertiary">Share an idea</div>
 </div>
 </Button>
 <Button
 type="button"
 onClick={() => setFormData({ ...formData, ticket_type: 'subscription' })}
 className={`${ticketTypeButtonBaseClassName} ${
 formData.ticket_type === 'subscription'
 ? 'border-amber-500 bg-surface dark:bg-surface-elevated'
 : 'border-border hover:border border-border'
 }`}
 disabled={!!editingTicket}
 >
 <CreditCard size={24} className="text-amber-600 dark:text-amber-400" />
 <div className="text-center">
 <div className="font-semibold">Subscription</div>
 <div className="text-xs text-text-tertiary">Billing/subscription</div>
 </div>
 </Button>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Subject *
 </label>
 <TextInput
 type="text"
 value={formData.subject}
 onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
 className="w-full"
 placeholder="Brief summary of your issue or suggestion"
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Description *
 </label>
 <TextAreaField
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 rows={6}
 className="w-full"
 placeholder="Please provide as much detail as possible..."
 required
 />
 </div>

 <div className="flex gap-3">
 <Button
 type="submit"
 tone="blue"
 >
 {editingTicket ? 'Update Ticket' : 'Submit Ticket'}
 </Button>
 <Button
 type="button"
 onClick={resetForm}
 tone="neutral"
 >
 Cancel
 </Button>
 </div>
 </form>
 </div>
 )}

 {/* Tickets List */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow">
 {tickets.length === 0 ? (
 <div className="text-center py-12 text-text-tertiary">
 <MessageCircle size={48} className="mx-auto mb-4 text-text-tertiary" />
 <p>No support tickets yet. Create your first ticket above!</p>
 </div>
 ) : (
 <div className="divide-y divide-border">
 {tickets.map((ticket) => (
 <div key={ticket.id} className="p-6 hover:bg-surface-elevated dark:hover:bg-surface-elevated transition-colors">
 <div className="flex justify-between items-start mb-3">
 <div className="flex items-center gap-3">
 {ticket.ticket_type === 'problem' ? (
 <AlertTriangle size={20} className="text-red-600" />
 ) : ticket.ticket_type === 'subscription' ? (
 <CreditCard size={20} className="text-amber-600" />
 ) : (
 <Lightbulb size={20} className="text-blue-600" />
 )}
 <h3 className="text-lg font-semibold text-foreground">{ticket.subject}</h3>
 </div>
 <div className="flex items-center gap-3">
 {(ticket.status === 'open' || ticket.status === 'in_progress') && (
 <Button
 onClick={() => handleEdit(ticket)}
 tone="neutral"
 size="xs"
 className="text-blue-600 hover:text-blue-700 dark:hover:text-blue-200"
 >
 <Edit2 size={16} />
 <span className="text-sm">Edit</span>
 </Button>
 )}
 {ticket.status !== 'closed' && (
 <Button
 onClick={() => handleCloseTicket(ticket.id)}
 tone="neutral"
 size="xs"
 >
 <XCircle size={16} />
 <span className="text-sm">Close</span>
 </Button>
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
 <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-900">
 {ticket.ticket_type.toUpperCase()}
 </span>
 </div>

 <p className="text-text-secondary mb-3 whitespace-pre-wrap">{ticket.description}</p>

 {ticket.admin_notes && (
 <div className="bg-surface dark:bg-surface-elevated border-l-4 border-blue-500 p-3 mb-3">
 <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Admin Response:</p>
 <p className="text-sm text-blue-800 dark:text-blue-400 whitespace-pre-wrap">{ticket.admin_notes}</p>
 </div>
 )}

 <div className="flex justify-between items-center text-xs text-text-tertiary">
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
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6">
 <h2 className="text-2xl font-bold text-foreground mb-4">Disclaimer</h2>

 <div className="prose max-w-none space-y-4 text-text-secondary">
 <div className="bg-surface dark:bg-surface-elevated border-l-4 border-amber-500 p-4 mb-4">
 <p className="font-semibold text-amber-900 dark:text-amber-300">Important Notice</p>
 <p className="text-amber-800 dark:text-amber-400 mt-2">
 Please read this disclaimer carefully before using HiveCraic.
 </p>
 </div>

 <h3 className="text-lg font-semibold text-foreground mt-6">General Information</h3>
 <p>
 HiveCraic is provided as a tool to assist beekeepers in managing their beekeeping operations.
 The information and features provided are for informational and organizational purposes only.
 </p>

 <h3 className="text-lg font-semibold text-foreground mt-6">No Professional Advice</h3>
 <p>
 The content and functionality provided by HiveCraic does not constitute professional beekeeping,
 veterinary, or agricultural advice. Users should consult with qualified beekeeping experts,
 veterinarians, or agricultural extension services for specific advice regarding their beekeeping operations.
 </p>

 <h3 className="text-lg font-semibold text-foreground mt-6">Data Accuracy</h3>
 <p>
 While we strive to provide accurate and reliable features, HiveCraic makes no warranties or
 representations regarding the accuracy, completeness, or reliability of any data entered,
 calculated, or displayed within the application. Users are responsible for verifying the
 accuracy of their own data.
 </p>

 <h3 className="text-lg font-semibold text-foreground mt-6">Weather Data</h3>
 <p>
 Weather data provided during inspection logging is sourced from third-party services and may
 not be completely accurate for your specific location. Always use your own judgment when
 assessing weather conditions for beekeeping activities.
 </p>

 <h3 className="text-lg font-semibold text-foreground mt-6">Treatment and Health Management</h3>
 <p>
 Varroa treatment tracking and health management features are provided as record-keeping tools only.
 Always follow manufacturer instructions for any treatments, consult with veterinary professionals
 when required, and comply with local regulations regarding bee health management and treatments.
 </p>

 <h3 className="text-lg font-semibold text-foreground mt-6">Subscription and Payment Terms</h3>
 <p>
 Subscription services are provided on a recurring billing basis:
 </p>
 <ul className="list-disc list-inside space-y-1 ml-4">
 <li>All subscriptions are non-refundable unless required by law</li>
 <li>You may cancel your subscription at any time through your profile settings</li>
 <li>Cancellation will take effect at the end of your current billing period</li>
 <li>Payment processing is handled by Stripe; HiveCraic is not responsible for payment processing errors or issues</li>
 <li>Subscription fees are subject to change with advance notice</li>
 <li>Access to subscription features may be restricted or removed if payment fails</li>
 </ul>

 <h3 className="text-lg font-semibold text-foreground mt-6">Data Backup and Loss</h3>
 <p>
 Users are solely responsible for maintaining backups of their data:
 </p>
 <ul className="list-disc list-inside space-y-1 ml-4">
 <li>HiveCraic is not responsible for any data loss, corruption, or deletion for any reason</li>
 <li>While we maintain database backups for disaster recovery, we do not guarantee data recovery</li>
 <li>Users should regularly export their data using the database export feature</li>
 <li>Data loss may occur due to technical issues, user error, account deletion, or service interruptions</li>
 </ul>

 <h3 className="text-lg font-semibold text-foreground mt-6">Third-Party Service Dependencies</h3>
 <p>
 HiveCraic relies on third-party services for certain functionality:
 </p>
 <ul className="list-disc list-inside space-y-1 ml-4">
 <li>Service interruptions, outages, or errors from third-party providers (Supabase, Stripe, Weather APIs) may affect HiveCraic functionality</li>
 <li>We are not responsible for issues, delays, or data loss caused by third-party service providers</li>
 <li>Third-party services have their own terms of service and limitations</li>
 <li>Weather data accuracy is dependent on third-party API providers and may be incomplete or incorrect</li>
 </ul>

 <h3 className="text-lg font-semibold text-foreground mt-6">Limitation of Liability</h3>
 <p>
 To the fullest extent permitted by law, HiveCraic, its creators, contributors, and associated
 organizations (tcbc.ie, Tribes Beekeepers Association, Tribes QRBG) shall not be liable for any
 direct, indirect, incidental, special, or consequential damages arising from the use or inability
 to use this application, including but not limited to loss of data, loss of colonies, or any
 other losses related to beekeeping operations.
 </p>

 <h3 className="text-lg font-semibold text-foreground mt-6">User Responsibility</h3>
 <p>
 Users are solely responsible for:
 </p>
 <ul className="list-disc list-inside space-y-1 ml-4">
 <li>The accuracy of data they enter into the system</li>
 <li>Making informed decisions about their beekeeping practices</li>
 <li>Complying with local laws and regulations regarding beekeeping</li>
 <li>Regularly exporting and maintaining backups of their data</li>
 <li>Securing their account credentials and payment information</li>
 <li>Managing their subscription and ensuring payment methods remain valid</li>
 </ul>

 <h3 className="text-lg font-semibold text-foreground mt-6">No Guarantee of Service</h3>
 <p>
 HiveCraic is provided &quot;as is&quot; without any guarantee of continuous availability,
 functionality, or service. We reserve the right to modify, suspend, or discontinue any aspect
 of the service at any time without notice.
 </p>

 <h3 className="text-lg font-semibold text-foreground mt-6">Changes to Disclaimer</h3>
 <p>
 We reserve the right to update or modify this disclaimer at any time. Continued use of HiveCraic
 after any changes constitutes acceptance of the updated disclaimer.
 </p>
 </div>
 </div>
 )}

 {/* Privacy Notice Section */}
 {activeSection === 'privacy' && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6">
 <h2 className="text-2xl font-bold text-foreground mb-4">Privacy Notice</h2>

 <div className="prose max-w-none space-y-4 text-text-secondary">
 <div className="bg-surface dark:bg-surface-elevated border-l-4 border-blue-500 p-4 mb-4">
 <p className="font-semibold text-blue-900 dark:text-blue-300">Your Privacy Matters</p>
 <p className="text-blue-800 dark:text-blue-400 mt-2">
 This privacy notice explains how HiveCraic collects, uses, and protects your personal information.
 </p>
 </div>

 <p className="text-sm text-text-tertiary">Last Updated: December 2025</p>

 <h3 className="text-lg font-semibold text-foreground mt-6">Information We Collect</h3>
 <p>
 HiveCraic collects and stores the following types of information:
 </p>
 <ul className="list-disc list-inside space-y-1 ml-4">
 <li><strong>Account Information:</strong> Email address, password (encrypted), and user profile data</li>
 <li><strong>Beekeeping Data:</strong> All data you enter about your apiaries, hives, queens, inspections, and related activities</li>
 <li><strong>Usage Data:</strong> Activity timestamps for online user tracking (visible to administrators)</li>
 <li><strong>Subscription Information:</strong> Subscription status, payment dates, and subscription tier information</li>
 </ul>

 <h3 className="text-lg font-semibold text-foreground mt-6">How We Use Your Information</h3>
 <p>
 Your information is used solely for:
 </p>
 <ul className="list-disc list-inside space-y-1 ml-4">
 <li>Providing and maintaining the HiveCraic service</li>
 <li>Authenticating your access to the application</li>
 <li>Storing and managing your beekeeping records</li>
 <li>Enabling multi-user collaboration features</li>
 <li>Displaying user activity statistics to administrators</li>
 <li>Processing subscription payments and managing billing</li>
 <li>Providing access to subscription-based features</li>
 </ul>

 <h3 className="text-lg font-semibold text-foreground mt-6">Data Storage and Security</h3>
 <p>
 Your data is stored securely using Supabase, a secure cloud database platform:
 </p>
 <ul className="list-disc list-inside space-y-1 ml-4">
 <li>All passwords are encrypted using industry-standard hashing</li>
 <li>Data is transmitted over secure HTTPS connections</li>
 <li>Row-level security policies ensure users can only access their own data</li>
 <li>Database backups are maintained for disaster recovery</li>
 </ul>

 <h3 className="text-lg font-semibold text-foreground mt-6">Data Sharing</h3>
 <p>
 HiveCraic does not sell, trade, or share your personal information with third parties except:
 </p>
 <ul className="list-disc list-inside space-y-1 ml-4">
 <li>With your explicit consent</li>
 <li>When required by law or legal process</li>
 <li>To protect the rights, property, or safety of HiveCraic, its users, or the public</li>
 </ul>

 <h3 className="text-lg font-semibold text-foreground mt-6">Multi-User Access</h3>
 <p>
 In multi-user environments:
 </p>
 <ul className="list-disc list-inside space-y-1 ml-4">
 <li>Users can only see and access their own beekeeping data</li>
 <li>Administrators can view system-wide statistics (total users, hives, apiaries)</li>
 <li>Administrators can see which users are currently active</li>
 <li>Administrators cannot access individual user&apos;s detailed beekeeping records</li>
 </ul>

 <h3 className="text-lg font-semibold text-foreground mt-6">Third-Party Services</h3>
 <p>
 HiveCraic integrates with the following third-party services:
 </p>
 <ul className="list-disc list-inside space-y-1 ml-4">
 <li><strong>Supabase:</strong> Database and authentication services</li>
 <li><strong>Stripe:</strong> Payment processing for subscriptions</li>
 <li><strong>Weather Services:</strong> Weather data for inspection logging</li>
 </ul>
 <p className="mt-2">
 These services have their own privacy policies and terms of service.
 </p>

 <h3 className="text-lg font-semibold text-foreground mt-6">Payment Processing</h3>
 <p>
 Subscription payments are processed securely through Stripe, a PCI-compliant payment processor:
 </p>
 <ul className="list-disc list-inside space-y-1 ml-4">
 <li>HiveCraic does not store or have access to your full credit card details</li>
 <li>Payment information is encrypted and processed directly by Stripe</li>
 <li>We only store subscription status and payment confirmation details</li>
 <li>Stripe may collect billing address and payment method information according to their privacy policy</li>
 <li>You can manage your payment methods and billing information through your profile settings</li>
 </ul>
 <p className="mt-2">
 For more information about how Stripe handles your payment data, please visit{' '}
 <TextLink href="https://stripe.com/privacy" external tone="info">
 Stripe&apos;s Privacy Policy
 </TextLink>.
 </p>

 <h3 className="text-lg font-semibold text-foreground mt-6">Your Rights</h3>
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

 <h3 className="text-lg font-semibold text-foreground mt-6">Data Retention</h3>
 <p>
 Your data is retained as long as your account is active. If you delete your account,
 all associated data will be permanently removed from our systems within 30 days.
 </p>

 <h3 className="text-lg font-semibold text-foreground mt-6">Cookies and Tracking</h3>
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

 <h3 className="text-lg font-semibold text-foreground mt-6">Children&apos;s Privacy</h3>
 <p>
 HiveCraic is not intended for use by individuals under the age of 16. We do not knowingly
 collect personal information from children under 16.
 </p>

 <h3 className="text-lg font-semibold text-foreground mt-6">Changes to Privacy Notice</h3>
 <p>
 We may update this privacy notice from time to time. We will notify users of any material
 changes by updating the &quot;Last Updated&quot; date and, where appropriate, providing
 additional notice.
 </p>

 <h3 className="text-lg font-semibold text-foreground mt-6">Contact Information</h3>
 <p>
 If you have questions or concerns about this privacy notice or how your data is handled,
 please contact us at:
 </p>
 <div className="bg-surface dark:bg-surface-elevated p-4 rounded-lg mt-2 border border-border">
 <p className="font-semibold">HiveCraic Support</p>
 <p>Email: support@tcbc.ie</p>
 <p>Website: tcbc.ie</p>
 </div>

 <h3 className="text-lg font-semibold text-foreground mt-6">GDPR Compliance</h3>
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

export default function AboutPage() {
 return (
 <Suspense fallback={<LoadingSpinner text="Loading..." />}>
 <AboutPageContent />
 </Suspense>
 )
}
