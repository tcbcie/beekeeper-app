'use client'
import dynamic from 'next/dynamic'
import React, { useEffect, useState } from 'react'
import { getCurrentUserId, isAdmin, isPowerUserOrAdmin, hasActiveSubscription } from '@/lib/auth'
import { Shield, Users, User, MessageCircle, Bug, List, Building2, BookOpen, BookText, Ruler, Lightbulb, Newspaper, MapPin, CalendarDays } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ProfileExport from '@/components/settings/ProfileExport'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import NavTabButton from '@/components/ui/NavTabButton'

// Panels load on demand: only the one on screen is downloaded, so heavy libraries
// (chart.js, QR codes) and large tabs stay out of the first load.
const KnowledgeBaseManager = dynamic(() => import('@/components/admin/KnowledgeBaseManager'), {
  loading: () => <LoadingSpinner text="Loading knowledge base..." />,
  ssr: false,
})
const ConservationAreaManager = dynamic(() => import('@/components/admin/ConservationAreaManager'), {
  loading: () => <LoadingSpinner text="Loading conservation areas..." />,
  ssr: false,
})
const NewsArticlesManager = dynamic(() => import('@/components/admin/NewsArticlesManager'), {
  loading: () => <LoadingSpinner text="Loading news articles..." />,
  ssr: false,
})
const ToolSuggestionsManager = dynamic(() => import('@/components/admin/ToolSuggestionsManager'), {
  loading: () => <LoadingSpinner text="Loading tool suggestions..." />,
  ssr: false,
})
const TerminologyTable = dynamic(() => import('@/components/settings/TerminologyTable'), {
  loading: () => <LoadingSpinner text="Loading terminology..." />,
  ssr: false,
})
const FrameStandardsManager = dynamic(() => import('@/components/settings/FrameStandardsManager'), {
  loading: () => <LoadingSpinner text="Loading frame standards..." />,
  ssr: false,
})
const TicketManagement = dynamic(() => import('@/components/settings/TicketManagement'), {
  loading: () => <LoadingSpinner text="Loading tickets..." />,
  ssr: false,
})
const UserManagement = dynamic(() => import('@/components/settings/UserManagement'), {
  loading: () => <LoadingSpinner text="Loading users..." />,
  ssr: false,
})
const TreatmentManagement = dynamic(() => import('@/components/settings/TreatmentManagement'), {
  loading: () => <LoadingSpinner text="Loading treatments..." />,
  ssr: false,
})
const AssociationManagement = dynamic(() => import('@/components/settings/AssociationManagement'), {
  loading: () => <LoadingSpinner text="Loading associations..." />,
  ssr: false,
})
const DropdownManagement = dynamic(() => import('@/components/settings/DropdownManagement'), {
  loading: () => <LoadingSpinner text="Loading dropdowns..." />,
  ssr: false,
})
const MonthlyTasksManagement = dynamic(() => import('@/components/settings/MonthlyTasksManagement'), {
  loading: () => <LoadingSpinner text="Loading monthly tasks..." />,
  ssr: false,
})
const RegistrationCodeManagement = dynamic(() => import('@/components/settings/RegistrationCodeManagement'), {
  loading: () => <LoadingSpinner text="Loading registration codes..." />,
  ssr: false,
})


export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [userIsPowerUserOrAdmin, setUserIsPowerUserOrAdmin] = useState(false)
  const [userHasActiveSubscription, setUserHasActiveSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [activeSection, setActiveSection] = useState<'profile' | 'theme' | 'users' | 'tickets' | 'treatments' | 'associations' | 'dropdowns' | 'monthly_tasks' | 'registration' | 'knowledge' | 'news' | 'terminology' | 'frame_standards' | 'tool_suggestions' | 'conservation_areas'>('profile')


  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)

      // Check if user has admin access
      const adminAccess = await isAdmin()
      setUserIsAdmin(adminAccess)

      // Check if user is power user or admin
      const powerUserAccess = await isPowerUserOrAdmin()
      setUserIsPowerUserOrAdmin(powerUserAccess)

      // Check if user has active subscription
      const hasSubscription = await hasActiveSubscription()
      setUserHasActiveSubscription(hasSubscription)

      if (!powerUserAccess) {
        setAccessDenied(true)
      }
      setLoading(false)
    }
    initUser()
  }, [router])


  if (loading) return <LoadingSpinner text="Loading settings..." />

  // Access denied screen for non-admin users
  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-background">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <Shield size={64} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-text-tertiary mb-6">
            You need Power User or Admin privileges to access the Settings page.
          </p>
          <Button
            onClick={() => router.push('/dashboard')}
            tone="success"
          >
            Return to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  const sections = [
    { id: 'profile' as const, label: 'Profile & Export', icon: User, adminOnly: false, powerUserAllowed: true },
    { id: 'users' as const, label: 'User Management', icon: Users, adminOnly: true, powerUserAllowed: false },
    { id: 'registration' as const, label: 'Subscription Codes', icon: Shield, adminOnly: true, powerUserAllowed: false },
    { id: 'tickets' as const, label: 'Support Tickets', icon: MessageCircle, adminOnly: true, powerUserAllowed: false },
    { id: 'treatments' as const, label: 'Varroa Treatments', icon: Bug, adminOnly: true, powerUserAllowed: false },
    { id: 'associations' as const, label: 'Beekeeping Associations', icon: Building2, adminOnly: true, powerUserAllowed: false },
    { id: 'dropdowns' as const, label: 'Dropdown Values', icon: List, adminOnly: true, powerUserAllowed: false },
    { id: 'monthly_tasks' as const, label: 'Monthly Tasks', icon: CalendarDays, adminOnly: true, powerUserAllowed: false },
    { id: 'knowledge' as const, label: 'AI Knowledge Base', icon: BookOpen, adminOnly: true, powerUserAllowed: false },
    { id: 'news' as const, label: 'News Articles', icon: Newspaper, adminOnly: true, powerUserAllowed: false },
    { id: 'tool_suggestions' as const, label: 'AI Tool Suggestions', icon: Lightbulb, adminOnly: true, powerUserAllowed: false },
    { id: 'terminology' as const, label: 'Terminology', icon: BookText, adminOnly: false, powerUserAllowed: true },
    { id: 'frame_standards' as const, label: 'Frame Standards', icon: Ruler, adminOnly: true, powerUserAllowed: false },
    { id: 'conservation_areas' as const, label: 'Conservation Areas', icon: MapPin, adminOnly: true, powerUserAllowed: true },
  ].filter(section => {
    if (!section.adminOnly) return true
    if (section.powerUserAllowed && userIsPowerUserOrAdmin) return true
    return userIsAdmin
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        {userIsAdmin && (
          <Badge tone="purple" className="inline-flex items-center gap-1 text-sm">
            <Shield size={14} />
            Admin
          </Badge>
        )}
      </div>

      {/* Tab Navigation */}
      <Card padding="none">
        <div className="border-b border-border">
          <nav className="flex flex-wrap -mb-px">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <NavTabButton
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  size="lg"
                  tone="forest"
                  active={activeSection === section.id}
                >
                  <Icon size={16} />
                  {section.label}
                </NavTabButton>
              )
            })}
          </nav>
        </div>
      </Card>

      {/* Profile & Export Section */}
      {activeSection === 'profile' && userId && (
        <ProfileExport isAdmin={userIsAdmin} hasActiveSubscription={userHasActiveSubscription} />
      )}

      {/* Varroa Treatments Section */}
      {activeSection === 'treatments' && (
        <TreatmentManagement />
      )}

      {/* Beekeeping Associations Section */}
      {activeSection === 'associations' && (
        <AssociationManagement />
      )}

      {/* Support Ticket Management Section */}
      {activeSection === 'tickets' && userId && (
        <TicketManagement userId={userId} />
      )}

      {/* User Management Section */}
      {activeSection === 'users' && userIsAdmin && <UserManagement />}

      {/* Subscription Codes Section */}
      {activeSection === 'registration' && userId && (
        <RegistrationCodeManagement userId={userId} />
      )}

      {/* Dropdown Values Section */}
      {activeSection === 'dropdowns' && (
        <DropdownManagement />
      )}

      {/* Monthly Tasks Section */}
      {activeSection === 'monthly_tasks' && userIsAdmin && <MonthlyTasksManagement />}

      {/* AI Knowledge Base Section */}
      {activeSection === 'knowledge' && (
        <Card padding="md">
          <KnowledgeBaseManager />
        </Card>
      )}

      {/* News Articles Section */}
      {activeSection === 'news' && (
        <Card padding="md">
          <NewsArticlesManager />
        </Card>
      )}

      {/* AI Tool Suggestions Section */}
      {activeSection === 'tool_suggestions' && (
        <Card padding="md">
          <ToolSuggestionsManager />
        </Card>
      )}

      {/* Terminology Section */}
      {activeSection === 'terminology' && (
        <Card padding="md">
          <TerminologyTable />
        </Card>
      )}

      {activeSection === 'frame_standards' && (
        <Card padding="md">
          <FrameStandardsManager />
        </Card>
      )}


      {/* Conservation Areas Section */}
      {activeSection === 'conservation_areas' && (
        <Card padding="md">
          <ConservationAreaManager />
        </Card>
      )}
    </div>
  )
}
