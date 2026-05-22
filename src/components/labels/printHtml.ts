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
  const caption = datum.secondaryLines?.[0]
  const captionHtml = caption
    ? `<div style="margin-top:2.2mm;font-size:7.5pt;color:#4b5563;letter-spacing:0.5pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(caption)}</div>`
    : ''

  const chipHtml = datum.accentText
    ? `<div style="border:0.4mm solid #b91c1c;border-radius:1mm;padding:1.4mm 2.6mm;color:#b91c1c;font-weight:700;font-size:12.5pt;line-height:1.05;flex-shrink:0;white-space:nowrap">${escapeHtml(datum.accentText)}</div>`
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
      flex-direction:column;
      overflow:hidden;
      page-break-after:always;
    ">
      <div style="background:#b91c1c;color:#fff;font-size:6.5pt;letter-spacing:0.9pt;font-weight:700;padding:1.3mm 4mm;text-align:center;text-transform:uppercase;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact">HiveCraic · Traceable Honey</div>
      <div style="flex:1;padding:3mm 4mm;display:flex;align-items:center;gap:3mm;min-height:0">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13pt;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(datum.primaryText)}</div>
          ${captionHtml}
        </div>
        ${chipHtml}
      </div>
    </div>
  `
}

function renderQueenHtml(datum: LabelDatum, preset: LabelPreset): string {
  const swatch = datum.yearColour ? QUEEN_YEAR_COLOUR_HEX[datum.yearColour] : null
  const stripeFill = swatch?.fill ?? '#e5e7eb'
  const extras = datum.queenExtras
  const hasLineage = !!(extras?.motherNumber || extras?.fatherNumber)

  const lineageHtml = hasLineage
    ? `<div style="font-size:9pt;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${[
        extras?.motherNumber
          ? `<span style="color:#b91c1c;font-weight:700">♀</span> ${escapeHtml(extras.motherNumber)}`
          : '',
        extras?.motherNumber && extras?.fatherNumber ? '   ' : '',
        extras?.fatherNumber
          ? `<span style="color:#b91c1c;font-weight:700">♂</span> ${escapeHtml(extras.fatherNumber)}`
          : '',
      ].join('')}</div>`
    : ''

  const matedHtml = extras?.matedDate
    ? `<div style="font-size:7pt;color:#4b5563;letter-spacing:0.5pt;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Mated ${escapeHtml(extras.matedDate)}</div>`
    : ''

  const eircodeHtml = extras?.eircode
    ? `<div style="font-size:8pt;color:#4b5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(extras.eircode)}</div>`
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
      <div style="flex:1;padding:2.5mm 3mm;min-width:0;display:flex;flex-direction:column;gap:1.2mm">
        <div style="font-weight:700;font-size:13pt;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(datum.primaryText)}</div>
        <div style="border-top:0.2mm solid #d1d5db"></div>
        ${lineageHtml}
        ${matedHtml}
        ${eircodeHtml}
      </div>
    </div>
  `
}

function renderLabelHtml(datum: LabelDatum, preset: LabelPreset): string {
  if (preset.id === 'brother_dk22251_balkani') return renderBalkaniHtml(datum, preset)
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
