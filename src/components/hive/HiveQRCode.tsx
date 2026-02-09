'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Printer } from 'lucide-react'

interface HiveQRCodeProps {
  hiveId: string
  hiveNumber: string
}

export default function HiveQRCode({ hiveId, hiveNumber }: HiveQRCodeProps) {
  const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/hive-scan/${hiveId}`

  // Load logo as base64 so it embeds into the SVG for download/print
  const [logoBase64, setLogoBase64] = useState<string>('')
  useEffect(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      setLogoBase64(canvas.toDataURL('image/png'))
    }
    img.src = '/logo_trans.png'
  }, [])

  const downloadQrCode = () => {
    const svg = document.getElementById('hive-qr-code-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new window.Image()

    img.onload = () => {
      const textHeight = 28
      canvas.width = img.width
      canvas.height = img.height + textHeight
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        ctx.fillStyle = '#666666'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('www.hivecraic.com', canvas.width / 2, img.height + 18)
      }
      const pngUrl = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = pngUrl
      downloadLink.download = `hive-${hiveNumber}-qr.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const printQrCode = () => {
    const svg = document.getElementById('hive-qr-code-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const escaped = hiveNumber.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    printWindow.document.write(`
      <html>
        <head><title>Hive ${escaped} QR Code</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;">
          <h2>Hive ${escaped}</h2>
          ${svgData}
          <p style="color:#666;font-size:14px;margin-top:8px;">www.hivecraic.com</p>
          <script>window.onload=function(){window.print();window.close();}</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-text-tertiary">Hive {hiveNumber}</p>
      <QRCodeSVG
        id="hive-qr-code-svg"
        value={qrUrl}
        size={200}
        level="H"
        includeMargin
        imageSettings={logoBase64 ? {
          src: logoBase64,
          height: 40,
          width: 40,
          excavate: true,
        } : undefined}
      />
      <p className="text-sm text-text-tertiary font-medium">www.hivecraic.com</p>
      <div className="flex gap-3">
        <button
          onClick={downloadQrCode}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Download size={16} />
          Download PNG
        </button>
        <button
          onClick={printQrCode}
          className="flex items-center gap-2 px-4 py-2 bg-sage-200 dark:bg-slate-700 text-foreground rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 text-sm border border-border"
        >
          <Printer size={16} />
          Print
        </button>
      </div>
    </div>
  )
}
