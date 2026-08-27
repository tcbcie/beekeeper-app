// Download a rendered QR code (a <svg> already in the DOM, found by element id).
//
// Two formats, for two different jobs:
//   PNG — quick previews, email, sticking into a mock-up.
//   SVG — what a commercial printer wants. Vector, so the same file prints at
//         any label size without the resampling fringes that make a bitmapped
//         QR harder for a phone to read.
//
// Both resolve to false rather than throwing, and neither resolves true until
// the download has actually been handed to the browser — rasterising is async,
// so returning early would report a success the caller cannot rely on.

function serialiseQrSvg(elementId: string): string | null {
  const el = document.getElementById(elementId)
  if (!el) return null
  return new XMLSerializer().serializeToString(el)
}

function triggerDownload(href: string, filename: string): void {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/** Rasterise the QR to PNG at its rendered size. */
export function downloadQrPng(elementId: string, filename: string): Promise<boolean> {
  const svgData = serialiseQrSvg(elementId)
  if (!svgData) return Promise.resolve(false)

  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new window.Image()

    img.onload = () => {
      // An SVG with no intrinsic size decodes to a zero-dimension image, and
      // toDataURL on a zero-size canvas yields an unusable file.
      if (!ctx || !img.width || !img.height) {
        resolve(false)
        return
      }
      canvas.width = img.width
      canvas.height = img.height
      try {
        ctx.drawImage(img, 0, 0)
        triggerDownload(canvas.toDataURL('image/png'), filename)
        resolve(true)
      } catch {
        resolve(false)
      }
    }
    img.onerror = () => resolve(false)

    try {
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
    } catch {
      resolve(false)
    }
  })
}

/** Save the QR as vector SVG, for handing to a label printer. */
export function downloadQrSvg(elementId: string, filename: string): Promise<boolean> {
  const svgData = serialiseQrSvg(elementId)
  if (!svgData) return Promise.resolve(false)

  try {
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, filename)
    // Revoking immediately can race the click on some browsers; a tick is enough.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return Promise.resolve(true)
  } catch {
    return Promise.resolve(false)
  }
}
