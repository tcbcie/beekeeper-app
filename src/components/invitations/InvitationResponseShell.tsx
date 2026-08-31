import type { ReactNode } from 'react'
import Image from 'next/image'
import PageShell from '@/components/ui/PageShell'
import Panel from '@/components/ui/Panel'

interface InvitationResponseShellProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

export function InvitationResponseShell({
  children,
  title = 'HiveCraic Invitations',
  subtitle = 'Invitation Response',
}: InvitationResponseShellProps) {
  return (
    <PageShell centered className="px-4">
      <div className="mx-auto w-full max-w-md py-6 sm:py-10">
        <Panel padding="lg">
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 inline-flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated/70 px-4 py-3">
                <Image src="/logo.png" alt="HiveCraic" width={40} height={40} className="h-10 w-10" />
                <span className="font-serif text-2xl text-forest-700 dark:text-forest-300">HiveCraic</span>
              </div>
              <p className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">{subtitle}</p>
              <h1 className="font-serif text-2xl text-foreground sm:text-3xl">{title}</h1>
            </div>

            {children}
          </div>
        </Panel>
      </div>
    </PageShell>
  )
}

export function InvitationLoadingShell({ text }: { text: string }) {
  return (
    <InvitationResponseShell title="Please Wait" subtitle="Processing">
      <div className="py-4 text-center">
        <p className="text-text-secondary">{text}</p>
      </div>
    </InvitationResponseShell>
  )
}
