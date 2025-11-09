# Automated Backup System

## Daily CSV Export Feature

Add a scheduled job to export all user data daily.

### 1. Create Backup API Route

```typescript
// app/api/admin/backup/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    // Export all tables
    const tables = [
      'apiaries',
      'hives',
      'queens',
      'inspections',
      'varroa_checks',
      'varroa_treatments',
      'profiles',
      'beekeeping_associations'
    ]

    const backup: Record<string, any[]> = {}

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .is('deleted_at', null) // Only backup active records

      if (error) throw error
      backup[table] = data || []
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `backup-${timestamp}.json`

    return NextResponse.json({
      success: true,
      backup,
      filename,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Backup failed:', error)
    return NextResponse.json(
      { error: 'Backup failed' },
      { status: 500 }
    )
  }
}
```

### 2. Add Backup Button to Settings

```typescript
// In Settings page
const handleBackup = async () => {
  try {
    const response = await fetch('/api/admin/backup', {
      method: 'POST',
    })

    const { backup, filename } = await response.json()

    // Download as JSON file
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()

    alert('Backup downloaded successfully!')
  } catch (error) {
    console.error('Backup failed:', error)
    alert('Backup failed')
  }
}
```

### 3. Scheduled Daily Backups (Using Vercel Cron)

```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/daily-backup",
    "schedule": "0 2 * * *"  // 2 AM daily
  }]
}
```

```typescript
// app/api/cron/daily-backup/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for full access
  )

  try {
    // Same backup logic as above
    const tables = ['apiaries', 'hives', 'queens', 'inspections', /* ... */]
    const backup: Record<string, any[]> = {}

    for (const table of tables) {
      const { data } = await supabase.from(table).select('*')
      backup[table] = data || []
    }

    // Store in Supabase Storage
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `daily-backups/backup-${timestamp}.json`

    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(filename, JSON.stringify(backup, null, 2), {
        contentType: 'application/json',
        upsert: true
      })

    if (uploadError) throw uploadError

    return NextResponse.json({
      success: true,
      filename,
      recordCount: Object.values(backup).reduce((sum, arr) => sum + arr.length, 0)
    })
  } catch (error) {
    console.error('Daily backup failed:', error)
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 })
  }
}
```

### 4. Keep Last 30 Days of Backups

```typescript
// Clean up old backups (run weekly)
export async function cleanupOldBackups(supabase: SupabaseClient) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: files } = await supabase.storage
    .from('backups')
    .list('daily-backups')

  const oldFiles = files?.filter(file => {
    const fileDate = new Date(file.created_at)
    return fileDate < thirtyDaysAgo
  })

  for (const file of oldFiles || []) {
    await supabase.storage
      .from('backups')
      .remove([`daily-backups/${file.name}`])
  }
}
```

## Benefits

- **Automatic Protection**: Daily snapshots without manual intervention
- **30-Day History**: Can restore from any point in last month
- **Off-Site Storage**: Backups in Supabase Storage (separate from main DB)
- **Quick Recovery**: JSON format easy to parse and restore
- **Audit Trail**: See what data existed on any given day
