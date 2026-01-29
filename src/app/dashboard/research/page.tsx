'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { FlaskConical, TreeDeciduous, Camera, Scale, Thermometer } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import WildColoniesTab from '@/components/research/WildColoniesTab'
import DiagnosisImagesTab from '@/components/research/DiagnosisImagesTab'
import ScaleOverviewTab from '@/components/research/ScaleOverviewTab'
import GDDDataTab from '@/components/research/GDDDataTab'

type ResearchSection = 'wild-colonies' | 'diagnosis-images' | 'scale-overview' | 'gdd-data'

export default function ResearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasScales, setHasScales] = useState(false)
  const [activeSection, setActiveSection] = useState<ResearchSection>('gdd-data')

  useEffect(() => {
    const section = searchParams.get('section')
    if (section && ['wild-colonies', 'diagnosis-images', 'scale-overview', 'gdd-data'].includes(section)) {
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

      // Check if user has any hives with scales
      const { count } = await supabase
        .from('hives')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', id)
        .is('archived_at', null)
        .or('beep_device_id.not.is.null,wolf_scale_id.not.is.null')

      setHasScales((count ?? 0) > 0)
      setUserId(id)
      setLoading(false)
    }
    initUser()
  }, [router])

  if (loading) return <LoadingSpinner text="Loading research..." />

  const sections = [
    ...(hasScales ? [{ id: 'scale-overview' as const, label: 'Scale Overview', icon: Scale }] : []),
    { id: 'gdd-data' as const, label: 'GDD Data', icon: Thermometer },
    { id: 'diagnosis-images' as const, label: 'Diagnosis Images', icon: Camera },
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

      {/* Diagnosis Images Section */}
      {activeSection === 'diagnosis-images' && userId && (
        <DiagnosisImagesTab userId={userId} />
      )}

      {/* Scale Overview Section */}
      {activeSection === 'scale-overview' && userId && (
        <ScaleOverviewTab userId={userId} />
      )}

      {/* GDD Data Section */}
      {activeSection === 'gdd-data' && userId && (
        <GDDDataTab userId={userId} />
      )}
    </div>
  )
}
