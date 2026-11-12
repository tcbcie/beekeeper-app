'use client'
import { Users } from 'lucide-react'
import { useCrmEnabled } from '@/hooks/useCrmEnabled'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'

/**
 * Gates the entire CRM module to active subscribers who have opted in via their
 * profile. The nav links are already hidden otherwise; this is defence in depth
 * for direct URL access. A user who is shut out is told why and sent to their
 * profile, where both the subscription and the setting live, rather than being
 * moved to the dashboard without a word.
 */
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const { crmEnabled, loading } = useCrmEnabled()

  if (loading) return <LoadingSpinner text="Loading..." />
  if (!crmEnabled) {
    return (
      <EmptyState
        icon={Users}
        title="Customers and orders are not available"
        description="This part of HiveCraic needs an active subscription and Sales / CRM switched on under Features. You can check both in your profile."
        actionLabel="Go to my profile"
        actionHref="/dashboard/profile"
      />
    )
  }

  return <>{children}</>
}
