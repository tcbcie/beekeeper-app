'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Printer } from 'lucide-react'
import Button from '@/components/ui/Button'

interface HiveQRCodeProps {
  tagCode: string
  hiveNumber: string
}

export default function HiveQRCode({ tagCode, hiveNumber }: HiveQRCodeProps) {
  const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/hive-scan/tag/${tagCode}`

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
      canvas.width = img.width
      canvas.height = img.height + 34
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        ctx.fillStyle = '#666666'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('www.hivecraic.com', canvas.width / 2, img.height + 8)
        ctx.fillStyle = '#333333'
        ctx.font = 'bold 16px sans-serif'
        ctx.fillText(tagCode, canvas.width / 2, img.height + 28)
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
          <p style="color:#333;font-size:16px;font-weight:bold;margin-top:2px;">${tagCode}</p>
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
      <p className="text-sm font-bold text-foreground tracking-wider">{tagCode}</p>
      <div className="flex gap-3">
        <Button
          onClick={downloadQrCode}
          tone="blue"
          size="sm"
          className="inline-flex items-center gap-2"
        >
          <Download size={16} />
          Download PNG
        </Button>
        <Button
          onClick={printQrCode}
          tone="neutral"
          size="sm"
          className="inline-flex items-center gap-2 bg-surface-secondary hover:bg-surface-elevated"
        >
          <Printer size={16} />
          Print
        </Button>
      </div>
    </div>
  )
}
