'use client'

import type { LabelDatum, LabelPreset } from './types'
import { QUEEN_YEAR_COLOUR_HEX } from './types'

interface LabelProps {
  datum: LabelDatum
  preset: LabelPreset
}

export default function Label({ datum, preset }: LabelProps) {
  if (preset.id === 'brother_dk22251_balkani') {
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
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          background: '#b91c1c',
          color: '#fff',
          fontSize: '6.5pt',
          letterSpacing: '0.9pt',
          fontWeight: 700,
          padding: '1.3mm 4mm',
          textAlign: 'center',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        HiveCraic · Traceable Honey
      </div>

      <div
        style={{
          flex: 1,
          padding: '3mm 4mm',
          display: 'flex',
          alignItems: 'center',
          gap: '3mm',
          minHeight: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: '13pt',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {datum.primaryText}
          </div>
          {caption && (
            <div
              style={{
                marginTop: '2.2mm',
                fontSize: '7.5pt',
                color: '#4b5563',
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

        {datum.accentText && (
          <div
            style={{
              border: '0.4mm solid #b91c1c',
              borderRadius: '1mm',
              padding: '1.4mm 2.6mm',
              color: '#b91c1c',
              fontWeight: 700,
              fontSize: '12.5pt',
              lineHeight: 1.05,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {datum.accentText}
          </div>
        )}
      </div>
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
          padding: '2.5mm 3mm',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2mm',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: '13pt',
            lineHeight: 1.05,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {datum.primaryText}
        </div>

        <div style={{ borderTop: '0.2mm solid #d1d5db' }} />

        {hasLineage && (
          <div
            style={{
              fontSize: '9pt',
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {extras?.motherNumber && (
              <>
                <span style={{ color: '#b91c1c', fontWeight: 700 }}>♀</span>{' '}
                {extras.motherNumber}
              </>
            )}
            {extras?.motherNumber && extras?.fatherNumber && '   '}
            {extras?.fatherNumber && (
              <>
                <span style={{ color: '#b91c1c', fontWeight: 700 }}>♂</span>{' '}
                {extras.fatherNumber}
              </>
            )}
          </div>
        )}

        {extras?.matedDate && (
          <div
            style={{
              fontSize: '7pt',
              color: '#4b5563',
              letterSpacing: '0.5pt',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Mated {extras.matedDate}
          </div>
        )}

        {extras?.eircode && (
          <div
            style={{
              fontSize: '8pt',
              color: '#4b5563',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {extras.eircode}
          </div>
        )}
      </div>
    </div>
  )
}
