// Shared "print a captured image" helper for the apiary map views.
// Opens a minimal same-origin window with the image and triggers the browser
// print dialogue (which includes Save as PDF). All text is inserted via
// textContent — user data (apiary names) can never inject markup.

const PRINT_STYLE = `
  body { font-family: system-ui, sans-serif; margin: 24px; text-align: center; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { font-size: 12px; color: #555; margin: 0 0 16px; }
  img { max-width: 100%; height: auto; border: 1px solid #ccc; border-radius: 8px; }
  h2 { font-size: 15px; margin: 18px 0 6px; text-align: left; }
  ul { margin: 0; padding-left: 18px; text-align: left; font-size: 13px; columns: 2; }
  li { margin: 0 0 3px; break-inside: avoid; }
  @media print {
    body { margin: 0; }
    img { border: none; border-radius: 0; }
  }
`

/** A titled list printed under the image (a legend, a hive list). Text only. */
export interface PrintSection {
  heading: string
  items: string[]
}

/**
 * Open a print window for the given image. Returns false when the pop-up was
 * blocked so the caller can fall back to a download.
 */
export function printImageDataUrl(dataUrl: string, title: string, subtitle: string, sections: PrintSection[] = []): boolean {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return false

  const doc = win.document
  doc.title = title

  const style = doc.createElement('style')
  style.textContent = PRINT_STYLE
  doc.head.appendChild(style)

  const heading = doc.createElement('h1')
  heading.textContent = title
  const meta = doc.createElement('p')
  meta.textContent = subtitle
  const img = doc.createElement('img')
  img.alt = title
  img.onload = () => {
    win.focus()
    win.print()
  }
  img.onerror = () => {
    // Never leave a blank window sitting there if the image cannot render.
    console.error('Print image failed to load')
    win.close()
  }
  img.src = dataUrl

  doc.body.append(heading, meta, img)
  for (const section of sections) {
    if (section.items.length === 0) continue
    const sectionHeading = doc.createElement('h2')
    sectionHeading.textContent = section.heading
    const list = doc.createElement('ul')
    for (const item of section.items) {
      const row = doc.createElement('li')
      row.textContent = item
      list.appendChild(row)
    }
    doc.body.append(sectionHeading, list)
  }
  return true
}

/** Download fallback for when the print pop-up is blocked. */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  // Apiary names feed the filename — strip characters that are invalid on
  // common filesystems so the download never fails or mangles.
  link.download = filename.replace(/[\\/:*?"<>|]/g, '-')
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/** "Printed 3 July 2026" subtitle in British format. */
export function printedOnLabel(): string {
  return `Printed ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

/** html-to-image filter: skip anything marked data-noprint. */
export function excludeNoPrint(el: unknown): boolean {
  if (!(el instanceof HTMLElement)) return true
  return el.dataset.noprint === undefined
}
