import fs from 'fs'
import crypto from 'crypto'
import path from 'path'

// Calculate SHA-256 hash of file
export function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(fileBuffer).digest('hex')
}

export function getPdfFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory not found: ${directoryPath}`)
  }

  const stat = fs.statSync(directoryPath)
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${directoryPath}`)
  }

  return fs.readdirSync(directoryPath)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(directoryPath, f))
}

export function readFileBuffer(filePath) {
  return fs.readFileSync(filePath)
}
