// Generates the Apple home-screen icon and iOS launch images from public/icon-512x512.png.
// iOS ignores the manifest for both. Run by hand when the icon changes: node scripts/generate-pwa-assets.mjs
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const SOURCE = 'public/icon-512x512.png'
const BACKGROUND = '#faf8f5'

// Portrait pixel sizes of current iPhones; src/lib/ios-splash.ts must list the same set.
const SPLASH_SIZES = [
  [750, 1334], [828, 1792], [1125, 2436], [1170, 2532], [1179, 2556],
  [1206, 2622], [1242, 2688], [1284, 2778], [1290, 2796], [1320, 2868],
]

await mkdir('public/splash', { recursive: true })

await sharp(SOURCE)
  .resize(180, 180)
  .flatten({ background: BACKGROUND })
  .png()
  .toFile('public/apple-touch-icon.png')

for (const [width, height] of SPLASH_SIZES) {
  const logoSize = Math.round(width * 0.3)
  const logo = await sharp(SOURCE).resize(logoSize, logoSize).toBuffer()
  await sharp({ create: { width, height, channels: 3, background: BACKGROUND } })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(`public/splash/${width}x${height}.png`)
}
