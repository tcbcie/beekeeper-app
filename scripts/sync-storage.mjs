#!/usr/bin/env node

/**
 * sync-storage.mjs
 *
 * Downloads all storage images from production Supabase and uploads
 * them to the local Supabase instance.
 *
 * Usage:
 *   PROD_SUPABASE_URL=https://xxx.supabase.co \
 *   PROD_SERVICE_ROLE_KEY=eyJ... \
 *   LOCAL_SUPABASE_URL=http://127.0.0.1:54321 \
 *   node scripts/sync-storage.mjs
 *
 * The local JWT is auto-detected from the Docker container.
 */

import { createHmac } from 'crypto'
import { execSync } from 'child_process'

const PROD_URL = process.env.PROD_SUPABASE_URL || ''
const PROD_KEY = process.env.PROD_SERVICE_ROLE_KEY || ''
const LOCAL_URL = process.env.LOCAL_SUPABASE_URL || 'http://127.0.0.1:54321'

const BUCKETS = ['apiary-images', 'inspection-images']

function generateServiceRoleJWT(jwtSecret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({
    role: 'service_role',
    iss: 'supabase',
    iat: now,
    exp: now + 3600 * 24 * 365,
  })).toString('base64url')
  const signature = createHmac('sha256', jwtSecret)
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${signature}`
}

function getLocalJWT() {
  // Try to read the JWT secret from the local Supabase auth container
  const containerNames = [
    'supabase_auth_beekeeper-app',
    'supabase-auth',
  ]

  for (const name of containerNames) {
    try {
      const secret = execSync(
        `docker exec ${name} printenv GOTRUE_JWT_SECRET`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim()
      if (secret) {
        console.log(`JWT secret found from container: ${name}`)
        return generateServiceRoleJWT(secret)
      }
    } catch {
      // Try next container name
    }
  }

  throw new Error(
    'Could not auto-detect local JWT secret from Docker.\n' +
    'Make sure local Supabase is running (supabase start).'
  )
}

async function listObjects(supabaseUrl, jwt, bucket, prefix = '') {
  const res = await fetch(`${supabaseUrl}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
  })

  if (!res.ok) {
    throw new Error(`Failed to list ${bucket}/${prefix}: ${res.status} ${await res.text()}`)
  }

  const items = await res.json()
  const files = []

  for (const item of items) {
    if (item.id) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      files.push(path)
    } else {
      const folderPrefix = prefix ? `${prefix}/${item.name}` : item.name
      const subFiles = await listObjects(supabaseUrl, jwt, bucket, folderPrefix)
      files.push(...subFiles)
    }
  }

  return files
}

async function downloadFile(supabaseUrl, bucket, filePath) {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
  const res = await fetch(`${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`)

  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`)
  }

  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') || 'application/octet-stream',
  }
}

async function uploadFile(supabaseUrl, jwt, bucket, filePath, buffer, contentType) {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buffer,
  })

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${await res.text()}`)
  }
}

async function ensureBucket(supabaseUrl, jwt, bucketName) {
  // Check if bucket exists
  const check = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucketName}`, {
    headers: { 'Authorization': `Bearer ${jwt}` },
  })
  if (check.ok) return

  // Create it as public
  const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: bucketName, name: bucketName, public: true }),
  })

  if (!res.ok) {
    throw new Error(`Failed to create bucket ${bucketName}: ${res.status} ${await res.text()}`)
  }
  console.log(`  Created bucket: ${bucketName}`)
}

async function main() {
  if (!PROD_URL || !PROD_KEY) {
    console.error('Missing required environment variables: PROD_SUPABASE_URL, PROD_SERVICE_ROLE_KEY')
    console.error('')
    console.error('Usage:')
    console.error('  PROD_SUPABASE_URL=https://xxx.supabase.co \\')
    console.error('  PROD_SERVICE_ROLE_KEY=eyJ... \\')
    console.error('  node scripts/sync-storage.mjs')
    process.exit(1)
  }

  console.log('Detecting local JWT from Docker...')
  const localJWT = getLocalJWT()

  console.log(`Source: ${PROD_URL}`)
  console.log(`Target: ${LOCAL_URL}`)
  console.log(`Buckets: ${BUCKETS.join(', ')}`)
  console.log()

  let totalFiles = 0
  let totalErrors = 0

  for (const bucket of BUCKETS) {
    console.log(`--- ${bucket} ---`)

    try {
      await ensureBucket(LOCAL_URL, localJWT, bucket)
    } catch (err) {
      console.error(`  Failed to ensure bucket: ${err.message}`)
      totalErrors++
      continue
    }

    let files
    try {
      files = await listObjects(PROD_URL, PROD_KEY, bucket)
    } catch (err) {
      console.error(`  Failed to list objects: ${err.message}`)
      totalErrors++
      continue
    }

    console.log(`  Found ${files.length} files`)

    for (const filePath of files) {
      try {
        const { buffer, contentType } = await downloadFile(PROD_URL, bucket, filePath)
        await uploadFile(LOCAL_URL, localJWT, bucket, filePath, buffer, contentType)
        console.log(`  OK ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`)
        totalFiles++
      } catch (err) {
        console.error(`  FAIL ${filePath}: ${err.message}`)
        totalErrors++
      }
    }

    console.log()
  }

  console.log(`Done: ${totalFiles} files synced, ${totalErrors} errors`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
