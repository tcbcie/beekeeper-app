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
  const accentHtml = datum.accentText
    ? `<span style="font-weight:700;font-size:14pt;line-height:1.1;color:#b91c1c;white-space:nowrap;flex-shrink:0">${escapeHtml(datum.accentText)}</span>`
    : ''

  const captionHtml = caption
    ? `<div style="border-top:0.25mm solid #d1d5db;margin:1.6mm 0 1.4mm"></div>
       <div style="font-size:8pt;color:#4b5563;letter-spacing:0.4pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(caption)}</div>`
    : ''

  return `
    <div class="hc-label" style="
      width:${preset.widthMm}mm;
      height:${preset.heightMm}mm;
      box-sizing:border-box;
      padding:3mm 4mm;
      font-family:'Helvetica Neue',Arial,sans-serif;
      color:#000;
      background:#fff;
      display:flex;
      flex-direction:column;
      justify-content:center;
      overflow:hidden;
      page-break-after:always;
    ">
      <div style="display:flex;align-items:baseline;gap:3mm">
        <span style="font-weight:700;font-size:14pt;line-height:1.1;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(datum.primaryText)}</span>
        ${accentHtml}
      </div>
      ${captionHtml}
    </div>
  `
}

function renderQueenHtml(datum: LabelDatum, preset: LabelPreset): string {
  const swatch = datum.yearColour ? QUEEN_YEAR_COLOUR_HEX[datum.yearColour] : null
  const swatchHtml = swatch
    ? `<span style="display:inline-block;width:5mm;height:5mm;border-radius:50%;background:${swatch.fill};border:0.4mm solid ${swatch.border};flex-shrink:0"></span>`
    : ''

  const secondaryHtml = datum.secondaryLines && datum.secondaryLines.length > 0
    ? `<div style="margin-top:1mm;font-size:8pt;line-height:1.25">${
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
      padding:2mm 3mm;
      font-family:'Helvetica Neue',Arial,sans-serif;
      color:#000;
      background:#fff;
      display:flex;
      flex-direction:column;
      justify-content:space-between;
      overflow:hidden;
      page-break-after:always;
    ">
      <div style="display:flex;align-items:center;gap:2mm">
        <span style="font-weight:700;font-size:11pt;line-height:1.1;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(datum.primaryText)}</span>
        ${swatchHtml}
      </div>
      ${secondaryHtml}
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
