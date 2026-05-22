'use client'

import type { LabelDatum, LabelPreset } from './types'
import { QUEEN_YEAR_COLOUR_HEX } from './types'

interface LabelProps {
  datum: LabelDatum
  preset: LabelPreset
}

export default function Label({ datum, preset }: LabelProps) {
  const isQueen = preset.id === 'brother_dk22251_queen'
  const colourSwatch = datum.yearColour ? QUEEN_YEAR_COLOUR_HEX[datum.yearColour] : null

  return (
    <div
      className="hc-label"
      style={{
        width: `${preset.widthMm}mm`,
        height: `${preset.heightMm}mm`,
        boxSizing: 'border-box',
        padding: isQueen ? '2mm 3mm' : '4mm 4mm',
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        color: '#000',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isQueen ? 'space-between' : 'flex-start',
        overflow: 'hidden',
        border: '1px solid #d1d5db',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
        <span
          style={{
            fontWeight: 700,
            fontSize: isQueen ? '11pt' : '14pt',
            lineHeight: 1.1,
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {datum.primaryText}
        </span>
        {colourSwatch && (
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: '5mm',
              height: '5mm',
              borderRadius: '50%',
              background: colourSwatch.fill,
              border: `0.4mm solid ${colourSwatch.border}`,
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {datum.secondaryLines && datum.secondaryLines.length > 0 && (
        <div
          style={{
            marginTop: isQueen ? '1mm' : '3mm',
            fontSize: isQueen ? '8pt' : '11pt',
            lineHeight: 1.25,
          }}
        >
          {datum.secondaryLines.map((line, i) => (
            <div
              key={i}
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
