'use client'

import Label from './Label'
import type { LabelDatum, LabelPreset } from './types'

interface LabelSheetProps {
  data: LabelDatum[]
  preset: LabelPreset
}

export default function LabelSheet({ data, preset }: LabelSheetProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-text-tertiary text-center py-6">
        No labels to preview.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {data.map(datum => (
        <Label key={datum.id} datum={datum} preset={preset} />
      ))}
    </div>
  )
}
