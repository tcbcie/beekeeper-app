'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUserId, isPowerUserOrAdmin } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { FlaskConical, TreeDeciduous, Camera, Scale, Thermometer, Sun } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import NavTabButton from '@/components/ui/NavTabButton'

// Panels load on demand: only the one on screen is downloaded, so heavy libraries
// (chart.js, QR codes) and large tabs stay out of the first load.
const WildColoniesTab = dynamic(() => import('@/components/research/WildColoniesTab'), {
  loading: () => <LoadingSpinner text="Loading wild colonies..." />,
  ssr: false,
})
const DiagnosisImagesTab = dynamic(() => import('@/components/research/DiagnosisImagesTab'), {
  loading: () => <LoadingSpinner text="Loading diagnosis images..." />,
  ssr: false,
})
const ScaleOverviewTab = dynamic(() => import('@/components/research/ScaleOverviewTab'), {
  loading: () => <LoadingSpinner text="Loading scales..." />,
  ssr: false,
})
const GDDDataTab = dynamic(() => import('@/components/research/GDDDataTab'), {
  loading: () => <LoadingSpinner text="Loading GDD data..." />,
  ssr: false,
})
const ForagingHoursTab = dynamic(() => import('@/components/research/ForagingHoursTab'), {
  loading: () => <LoadingSpinner text="Loading foraging hours..." />,
  ssr: false,
})

type ResearchSection = 'wild-colonies' | 'diagnosis-images' | 'scale-overview' | 'gdd-data' | 'foraging-hours'

export default function ResearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasScales, setHasScales] = useState(false)
  const [isPowerUser, setIsPowerUser] = useState(false)
  const [activeSection, setActiveSection] = useState<ResearchSection>('gdd-data')
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    const section = searchParams.get('section')
    if (section && ['wild-colonies', 'diagnosis-images', 'scale-overview', 'gdd-data', 'foraging-hours'].includes(section)) {
      setActiveSection(section as ResearchSection)
    }
  }, [searchParams])

  useEffect(() => {
    const initUser = async () => {
      // try/finally: a thrown sign-in or role lookup used to leave the spinner up for good (C7b-14)
      try {
        const id = await getCurrentUserId()
        if (!id) {
          router.push('/login')
          return
        }

        // Check if user is power user or admin
        const powerUser = await isPowerUserOrAdmin()
        setIsPowerUser(powerUser)

        // Check if user has any hives with scales
        const { count } = await supabase
          .from('hives')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', id)
          .is('archived_at', null)
          .or('beep_device_id.not.is.null,wolf_scale_id.not.is.null')

        setHasScales((count ?? 0) > 0)
        setUserId(id)
      } catch (err) {
        console.error('Error loading research page:', err)
        setLoadFailed(true)
      } finally {
        setLoading(false)
      }
    }
    initUser()
  }, [router])

  if (loading) return <LoadingSpinner text="Loading research..." />
  if (loadFailed && !userId) {
    return <p role="alert" className="py-12 text-center text-red-700 dark:text-red-300">Couldn&apos;t load Research. Check your connection and refresh the page.</p>
  }

  const sections = [
    ...(hasScales ? [{ id: 'scale-overview' as const, label: 'Scale Overview', icon: Scale }] : []),
    { id: 'gdd-data' as const, label: 'GDD Data', icon: Thermometer },
    { id: 'foraging-hours' as const, label: 'Foraging Hours', icon: Sun },
    ...(isPowerUser ? [{ id: 'diagnosis-images' as const, label: 'Diagnosis Images', icon: Camera }] : []),
    ...(isPowerUser ? [{ id: 'wild-colonies' as const, label: 'Wild Colonies', icon: TreeDeciduous }] : []),
  ]
  // A ?section= link to a section this user can't see showed no tab and no content: fall back to
  // GDD Data instead (C7b-14)
  const visibleSection: ResearchSection = sections.some(s => s.id === activeSection) ? activeSection : 'gdd-data'

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
                <NavTabButton
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  active={visibleSection === section.id}
                  tone="blue"
                  className="px-6 py-3"
                >
                  <Icon size={16} />
                  {section.label}
                </NavTabButton>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Wild Colonies Section (Power Users only) */}
      {visibleSection === 'wild-colonies' && userId && isPowerUser && (
        <WildColoniesTab userId={userId} />
      )}

      {/* Diagnosis Images Section (Power Users only) */}
      {visibleSection === 'diagnosis-images' && userId && isPowerUser && (
        <DiagnosisImagesTab userId={userId} />
      )}

      {/* Scale Overview Section */}
      {visibleSection === 'scale-overview' && userId && (
        <ScaleOverviewTab userId={userId} />
      )}

      {/* GDD Data Section */}
      {visibleSection === 'gdd-data' && userId && (
        <GDDDataTab userId={userId} />
      )}

      {/* Foraging Hours Section */}
      {visibleSection === 'foraging-hours' && userId && (
        <ForagingHoursTab userId={userId} />
      )}
    </div>
  )
}
