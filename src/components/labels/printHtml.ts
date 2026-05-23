import type { LabelDatum, LabelPreset } from './types'
import { QUEEN_YEAR_COLOUR_HEX } from './types'

function escapeHtml(value: unknown): string {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderBalkaniHtml(datum: LabelDatum, preset: LabelPreset): string {
  const e = datum.balkaniExtras
  if (!e) return ''

  const traceRow = (label: string, value?: string): string => {
    if (!value) return ''
    return `<span style="letter-spacing:0.5pt;color:#374151;text-transform:uppercase;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(label)}</span>
            <span style="font-weight:600;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(value)}</span>`
  }

  const floralHtml = e.floralSource
    ? `<div style="font-size:9.5pt;font-style:italic;color:#374151;margin-top:0.6mm">${escapeHtml(e.floralSource)}</div>`
    : ''

  const netWeightHtml = e.netWeight
    ? `<div style="margin-top:3mm;display:flex;align-items:baseline;justify-content:space-between;gap:3mm">
        <span style="font-size:8pt;letter-spacing:0.6pt;color:#374151;text-transform:uppercase">Net Weight</span>
        <span style="font-weight:700;font-size:14pt;line-height:1.05">${escapeHtml(e.netWeight)}</span>
      </div>`
    : ''

  const producerNameHtml = e.producerName
    ? `<div style="font-size:9.5pt;font-weight:700;line-height:1.15">${escapeHtml(e.producerName)}</div>`
    : ''

  const producerAddressHtml = e.producerAddress
    ? `<div style="font-size:8.5pt;color:#374151;line-height:1.2;margin-top:0.5mm">${escapeHtml(e.producerAddress)}</div>`
    : ''

  return `
    <div class="hc-label" style="
      width:${preset.widthMm}mm;
      height:${preset.heightMm}mm;
      box-sizing:border-box;
      padding:4mm;
      font-family:'Helvetica Neue',Arial,sans-serif;
      color:#000;
      background:#fff;
      display:flex;
      flex-direction:column;
      overflow:hidden;
      page-break-after:always;
    ">
      <div style="font-size:7pt;font-weight:700;letter-spacing:1.1pt;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:0.3mm solid #000;padding-bottom:1.2mm">HiveCraic · Traceable Honey</div>

      <div style="margin-top:3mm">
        <div style="font-size:16pt;font-weight:700;letter-spacing:0.4pt;line-height:1.05;text-transform:uppercase">${escapeHtml(e.salesName)}</div>
        ${floralHtml}
      </div>

      ${netWeightHtml}

      <div style="border-top:0.2mm solid #9ca3af;margin:3mm 0"></div>

      <div style="display:grid;grid-template-columns:25mm 1fr;column-gap:2mm;row-gap:0.8mm;font-size:8.5pt">
        ${traceRow('LOT', e.lotCode)}
        ${traceRow('EXTRACTED', e.extractedDate)}
        ${traceRow('BEST BEFORE', e.bestBeforeDate)}
        ${traceRow('ORIGIN', e.origin)}
      </div>

      <div style="border-top:0.2mm solid #9ca3af;margin:3mm 0"></div>

      ${producerNameHtml}
      ${producerAddressHtml}

      <div style="margin-top:auto;padding-top:2.5mm;font-size:7pt;color:#374151;line-height:1.3">
        Store in a cool, dry place.<br />
        Do not feed to infants under 12 months.
      </div>
    </div>
  `
}

function renderQueenHtml(datum: LabelDatum, preset: LabelPreset): string {
  const swatch = datum.yearColour ? QUEEN_YEAR_COLOUR_HEX[datum.yearColour] : null
  const stripeFill = swatch?.fill ?? '#e5e7eb'
  const extras = datum.queenExtras
  const hasLineage = !!(extras?.motherNumber || extras?.fatherNumber)

  const yearHtml = extras?.birthYear
    ? `<span style="font-weight:600;font-size:10pt;line-height:1.05;color:#374151;flex-shrink:0;white-space:nowrap">&#39;${escapeHtml(extras.birthYear)}</span>`
    : ''

  const lineageHtml = hasLineage
    ? `<div style="font-size:10pt;line-height:1.15;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${[
        extras?.motherNumber
          ? `<span style="font-weight:700">♀</span> ${escapeHtml(extras.motherNumber)}`
          : '',
        extras?.motherNumber && extras?.fatherNumber
          ? '<span style="display:inline-block;width:4mm"></span>'
          : '',
        extras?.fatherNumber
          ? `<span style="font-weight:700">♂</span> ${escapeHtml(extras.fatherNumber)}`
          : '',
      ].join('')}</div>`
    : ''

  const matedHtml = extras?.matedDate
    ? `<div style="font-size:7pt;color:#374151;letter-spacing:0.5pt;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0">Mated ${escapeHtml(extras.matedDate)}</div>`
    : ''

  const eircodeHtml = extras?.eircode
    ? `<div style="font-size:8pt;color:#374151;white-space:nowrap;flex-shrink:0">${escapeHtml(extras.eircode)}</div>`
    : ''

  return `
    <div class="hc-label" style="
      width:${preset.widthMm}mm;
      height:${preset.heightMm}mm;
      box-sizing:border-box;
      padding:0;
      font-family:'Helvetica Neue',Arial,sans-serif;
      color:#000;
      background:#fff;
      display:flex;
      flex-direction:row;
      overflow:hidden;
      page-break-after:always;
    ">
      <div style="width:5mm;flex-shrink:0;background:${stripeFill};border-right:0.2mm solid #9ca3af"></div>
      <div style="flex:1;padding:3mm 4mm;min-width:0;display:flex;flex-direction:column;justify-content:space-between">
        <div style="display:flex;align-items:baseline;gap:4mm">
          <span style="font-weight:700;font-size:13pt;line-height:1.05;flex-shrink:0;white-space:nowrap">${escapeHtml(datum.primaryText)}</span>
          ${yearHtml}
          ${lineageHtml}
        </div>
        <div style="border-top:0.2mm solid #d1d5db"></div>
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:3mm">
          ${matedHtml}
          ${eircodeHtml}
        </div>
      </div>
    </div>
  `
}

function renderLabelHtml(datum: LabelDatum, preset: LabelPreset): string {
  if (preset.id === 'balkani_label') return renderBalkaniHtml(datum, preset)
  return renderQueenHtml(datum, preset)
}

export function buildPrintDocument(data: LabelDatum[], preset: LabelPreset): string {
  const labelsHtml = data.map(d => renderLabelHtml(d, preset)).join('')

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<title>HiveCraic labels</title>
<style>
  @page { size: ${preset.widthMm}mm ${preset.heightMm}mm; margin: 0 }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .hc-label, .hc-label * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .hc-label:last-child { page-break-after: auto }
  @media screen {
    body { padding: 12px; background: #f3f4f6 }
    .hc-label { border: 1px solid #d1d5db; margin: 6px }
  }
</style>
</head>
<body>
${labelsHtml}
<script>window.onload = function () { window.print() }<\/script>
</body>
</html>`
}
