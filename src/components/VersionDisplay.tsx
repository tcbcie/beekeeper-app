'use client'

import { getAppVersion } from '@/lib/update-manager'

export default function VersionDisplay() {
  const version = getAppVersion()

  return (
    <div className="fj-badge fj-badge-neutral font-mono text-[11px] tracking-wide">
      v{version}
    </div>
  )
}
