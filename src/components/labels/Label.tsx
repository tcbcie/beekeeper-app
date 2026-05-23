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
  const e = datum.balkaniExtras
  if (!e) return null

  const traceRows: Array<[string, string | undefined]> = [
    ['LOT', e.lotCode],
    ['EXTRACTED', e.extractedDate],
    ['BEST BEFORE', e.bestBeforeDate],
    ['ORIGIN', e.origin],
  ]

  return (
    <div
      style={{
        ...labelShellStyle(preset),
        padding: '4mm',
        display: 'flex',
        flexDirection: 'column',
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

      <div style={{ marginTop: '3mm' }}>
        <div
          style={{
            fontSize: '16pt',
            fontWeight: 700,
            letterSpacing: '0.4pt',
            lineHeight: 1.05,
            textTransform: 'uppercase',
          }}
        >
          {e.salesName}
        </div>
        {e.floralSource && (
          <div
            style={{
              fontSize: '9.5pt',
              fontStyle: 'italic',
              color: '#374151',
              marginTop: '0.6mm',
            }}
          >
            {e.floralSource}
          </div>
        )}
      </div>

      {e.netWeight && (
        <div
          style={{
            marginTop: '3mm',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '3mm',
          }}
        >
          <span
            style={{
              fontSize: '8pt',
              letterSpacing: '0.6pt',
              color: '#374151',
              textTransform: 'uppercase',
            }}
          >
            Net Weight
          </span>
          <span style={{ fontWeight: 700, fontSize: '14pt', lineHeight: 1.05 }}>
            {e.netWeight}
          </span>
        </div>
      )}

      <div style={{ borderTop: '0.2mm solid #9ca3af', margin: '3mm 0' }} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '25mm 1fr',
          columnGap: '2mm',
          rowGap: '0.8mm',
          fontSize: '8.5pt',
        }}
      >
        {traceRows.map(([label, value]) => value ? (
          <FragmentRow key={label} label={label} value={value} />
        ) : null)}
      </div>

      <div style={{ borderTop: '0.2mm solid #9ca3af', margin: '3mm 0' }} />

      {e.producerName && (
        <div style={{ fontSize: '9.5pt', fontWeight: 700, lineHeight: 1.15 }}>
          {e.producerName}
        </div>
      )}
      {e.producerAddress && (
        <div
          style={{
            fontSize: '8.5pt',
            color: '#374151',
            lineHeight: 1.2,
            marginTop: '0.5mm',
          }}
        >
          {e.producerAddress}
        </div>
      )}

      <div
        style={{
          marginTop: 'auto',
          paddingTop: '2.5mm',
          fontSize: '7pt',
          color: '#374151',
          lineHeight: 1.3,
        }}
      >
        Store in a cool, dry place.<br />
        Do not feed to infants under 12 months.
      </div>
    </div>
  )
}

function FragmentRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span
        style={{
          letterSpacing: '0.5pt',
          color: '#374151',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </>
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
          {extras?.birthYear && (
            <span
              style={{
                fontWeight: 600,
                fontSize: '10pt',
                lineHeight: 1.05,
                color: '#374151',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              &apos;{extras.birthYear}
            </span>
          )}
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
              {extras?.motherNumber && extras?.fatherNumber && (
                <span aria-hidden style={{ display: 'inline-block', width: '4mm' }} />
              )}
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
