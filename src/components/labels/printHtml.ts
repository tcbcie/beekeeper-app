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

function renderLabelHtml(datum: LabelDatum, preset: LabelPreset): string {
  const isQueen = preset.id === 'brother_dk22251_queen'
  const padding = isQueen ? '2mm 3mm' : '4mm 4mm'
  const primarySize = isQueen ? '11pt' : '14pt'
  const secondarySize = isQueen ? '8pt' : '11pt'
  const secondaryMarginTop = isQueen ? '1mm' : '3mm'
  const justify = isQueen ? 'space-between' : 'flex-start'

  const swatch = datum.yearColour ? QUEEN_YEAR_COLOUR_HEX[datum.yearColour] : null
  const swatchHtml = swatch
    ? `<span style="display:inline-block;width:5mm;height:5mm;border-radius:50%;background:${swatch.fill};border:0.4mm solid ${swatch.border};flex-shrink:0"></span>`
    : ''

  const secondaryHtml = datum.secondaryLines && datum.secondaryLines.length > 0
    ? `<div style="margin-top:${secondaryMarginTop};font-size:${secondarySize};line-height:1.25">${
        datum.secondaryLines
          .map(line => `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(line)}</div>`)
          .join('')
      }</div>`
    : ''

  return `
    <div class="hc-label" style="
      width:${preset.widthMm}mm;
      height:${preset.heightMm}mm;
      box-sizing:border-box;
      padding:${padding};
      font-family:'Helvetica Neue',Arial,sans-serif;
      color:#000;
      background:#fff;
      display:flex;
      flex-direction:column;
      justify-content:${justify};
      overflow:hidden;
      page-break-after:always;
    ">
      <div style="display:flex;align-items:center;gap:2mm">
        <span style="font-weight:700;font-size:${primarySize};line-height:1.1;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(datum.primaryText)}</span>
        ${swatchHtml}
      </div>
      ${secondaryHtml}
    </div>
  `
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
  html, body { margin: 0; padding: 0; background: #fff; }
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
