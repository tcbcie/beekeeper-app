'use client'

import type { LabelDatum, LabelPreset } from './types'
import { QUEEN_YEAR_COLOUR_HEX } from './types'

interface LabelProps {
  datum: LabelDatum
  preset: LabelPreset
}

export default function Label({ datum, preset }: LabelProps) {
  if (preset.id === 'balkani_label') {
    return <BalkaniCell datum={datum} preset={preset} />
  }
  return <QueenCell datum={datum} preset={preset} />
}

const labelShellStyle = (preset: LabelPreset): React.CSSProperties => ({
  width: `${preset.widthMm}mm`,
  height: `${preset.heightMm}mm`,
  boxSizing: 'border-box',
  fontFamily: '"Helvetica Neue", Arial, sans-serif',
  color: '#000',
  background: '#fff',
  overflow: 'hidden',
  border: '1px solid #d1d5db',
})

function BalkaniCell({ datum, preset }: LabelProps) {
  const caption = datum.secondaryLines?.[0]

  return (
    <div
      style={{
        ...labelShellStyle(preset),
        padding: '3mm 4mm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          fontSize: '7pt',
          fontWeight: 700,
          letterSpacing: '1.1pt',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          borderBottom: '0.3mm solid #000',
          paddingBottom: '1.2mm',
        }}
      >
        HiveCraic · Traceable Honey
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3mm' }}>
        <span
          style={{
            fontWeight: 700,
            fontSize: '14pt',
            lineHeight: 1.05,
            flex: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {datum.primaryText}
        </span>
        {datum.accentText && (
          <span
            style={{
              fontWeight: 700,
              fontSize: '14pt',
              lineHeight: 1.05,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {datum.accentText}
          </span>
        )}
      </div>

      {caption && (
        <div
          style={{
            fontSize: '7pt',
            color: '#374151',
            letterSpacing: '0.5pt',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  )
}

function QueenCell({ datum, preset }: LabelProps) {
  const swatch = datum.yearColour ? QUEEN_YEAR_COLOUR_HEX[datum.yearColour] : null
  const stripeFill = swatch?.fill ?? '#e5e7eb'
  const extras = datum.queenExtras
  const hasLineage = !!(extras?.motherNumber || extras?.fatherNumber)

  return (
    <div
      style={{
        ...labelShellStyle(preset),
        padding: 0,
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      <div
        aria-hidden
        style={{
          width: '5mm',
          flexShrink: 0,
          background: stripeFill,
          borderRight: '0.2mm solid #9ca3af',
        }}
      />

      <div
        style={{
          flex: 1,
          padding: '3mm 4mm',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4mm' }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: '13pt',
              lineHeight: 1.05,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {datum.primaryText}
          </span>
          {hasLineage && (
            <div
              style={{
                fontSize: '10pt',
                lineHeight: 1.15,
                flex: 1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {extras?.motherNumber && (
                <>
                  <span style={{ fontWeight: 700 }}>♀</span>{' '}
                  {extras.motherNumber}
                </>
              )}
              {extras?.motherNumber && extras?.fatherNumber && '   '}
              {extras?.fatherNumber && (
                <>
                  <span style={{ fontWeight: 700 }}>♂</span>{' '}
                  {extras.fatherNumber}
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ borderTop: '0.2mm solid #d1d5db' }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '3mm',
          }}
        >
          {extras?.matedDate && (
            <div
              style={{
                fontSize: '7pt',
                color: '#374151',
                letterSpacing: '0.5pt',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                minWidth: 0,
              }}
            >
              Mated {extras.matedDate}
            </div>
          )}
          {extras?.eircode && (
            <div
              style={{
                fontSize: '8pt',
                color: '#374151',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {extras.eircode}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
