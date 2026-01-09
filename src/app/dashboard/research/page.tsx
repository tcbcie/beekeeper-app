'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUserId, isPowerUserOrAdmin } from '@/lib/auth'
import { FlaskConical, TreeDeciduous } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import WildColoniesTab from '@/components/research/WildColoniesTab'

type ResearchSection = 'wild-colonies'

export default function ResearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [activeSection, setActiveSection] = useState<ResearchSection>('wild-colonies')

  useEffect(() => {
    const section = searchParams.get('section')
    if (section && ['wild-colonies'].includes(section)) {
      setActiveSection(section as ResearchSection)
    }
  }, [searchParams])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }

      const access = await isPowerUserOrAdmin()
      if (!access) {
        router.push('/dashboard')
        return
      }

      setHasAccess(true)
      setUserId(id)
      setLoading(false)
    }
    initUser()
  }, [router])

  if (loading) return <LoadingSpinner text="Loading research..." />

  if (!hasAccess) {
    return (
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-12 text-center text-text-secondary border border-border">
        Access restricted to Power Users and Administrators.
      </div>
    )
  }

  const sections = [
    { id: 'wild-colonies' as const, label: 'Wild Colonies', icon: TreeDeciduous },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FlaskConical size={32} className="text-text-secondary" />
        <h1 className="text-3xl font-bold text-foreground">Research</h1>
      </div>

      {/* Tab Navigation */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow">
        <div className="border-b border-border">
          <nav className="flex flex-wrap -mb-px">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeSection === section.id
                      ? 'border-amber-600 text-amber-600'
                      : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
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

      {/* Wild Colonies Section */}
      {activeSection === 'wild-colonies' && userId && (
        <WildColoniesTab userId={userId} />
      )}
    </div>
  )
}
