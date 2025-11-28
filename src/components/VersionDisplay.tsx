'use client'

import { getAppVersion } from '@/lib/update-manager'

export default function VersionDisplay() {
  const version = getAppVersion()

  return (
    <div className="text-xs text-gray-500 dark:text-gray-400">
      v{version}
    </div>
  )
}
