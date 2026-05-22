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
        padding: '3mm 4mm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3mm' }}>
        <span
          style={{
            fontWeight: 700,
            fontSize: '14pt',
            lineHeight: 1.1,
            flex: 1,
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
              lineHeight: 1.1,
              color: '#b91c1c',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {datum.accentText}
          </span>
        )}
      </div>

      {caption && (
        <>
          <div style={{ borderTop: '0.25mm solid #d1d5db', margin: '1.6mm 0 1.4mm' }} />
          <div
            style={{
              fontSize: '8pt',
              color: '#4b5563',
              letterSpacing: '0.4pt',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {caption}
          </div>
        </>
      )}
    </div>
  )
}

function QueenCell({ datum, preset }: LabelProps) {
  const colourSwatch = datum.yearColour ? QUEEN_YEAR_COLOUR_HEX[datum.yearColour] : null

  return (
    <div
      style={{
        ...labelShellStyle(preset),
        padding: '2mm 3mm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
        <span
          style={{
            fontWeight: 700,
            fontSize: '11pt',
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
        <div style={{ marginTop: '1mm', fontSize: '8pt', lineHeight: 1.25 }}>
          {datum.secondaryLines.map((line, i) => (
            <div
              key={i}
              style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
