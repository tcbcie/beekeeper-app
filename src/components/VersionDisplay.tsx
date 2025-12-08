'use client'

import { getAppVersion } from '@/lib/update-manager'

export default function VersionDisplay() {
  const version = getAppVersion()

  return (
    <div className="text-xs text-text-tertiary">
      v{version}
    </div>
  )
}
