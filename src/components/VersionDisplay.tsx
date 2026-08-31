'use client'

import { getAppVersion } from '@/lib/update-manager'

export default function VersionDisplay() {
  const version = getAppVersion()

  // No text-size utility here: .fj-badge sets font-size and, being a plain class
  // later in the utilities layer, beats any text-* passed alongside it. The
  // text-[11px] that used to sit here never took effect.
  return (
    <div className="fj-badge fj-badge-neutral font-mono tracking-wide">
      v{version}
    </div>
  )
}
