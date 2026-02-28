import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildInsertSql, DATABASE_EXPORT_TABLES } from '@/lib/database-export'

// Create admin client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

function buildTriggerToggleBlock(
  tables: readonly string[],
  action: 'DISABLE' | 'ENABLE'
): string {
  const tableArray = tables.map(table => `'${table}'`).join(', ')

  return `DO $$\nDECLARE\n  table_name text;\nBEGIN\n  FOREACH table_name IN ARRAY ARRAY[${tableArray}]::text[] LOOP\n    BEGIN\n      EXECUTE format('ALTER TABLE public.%I ${action} TRIGGER ALL', table_name);\n    EXCEPTION\n      WHEN insufficient_privilege THEN\n        RAISE NOTICE 'Skipping trigger ${action.toLowerCase()} on %, insufficient privileges', table_name;\n      WHEN undefined_table THEN\n        RAISE NOTICE 'Skipping trigger ${action.toLowerCase()} on %, table not found', table_name;\n    END;\n  END LOOP;\nEND $$;\n`
}

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token and check user role
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    console.warn(`[AUDIT] Admin data export: admin=${user.id} status=started timestamp=${new Date().toISOString()}`)

    const tables = [...DATABASE_EXPORT_TABLES]

    // Build SQL export content
    let sqlContent = `-- =====================================================\n`
    sqlContent += `-- HiveCraic COMPLETE Database Export (ALL USERS)\n`
    sqlContent += `-- Generated on: ${new Date().toISOString()}\n`
    sqlContent += `-- Exported by Admin: ${user.email}\n`
    sqlContent += `-- =====================================================\n\n`
    sqlContent += `-- This export includes ALL data from ALL users\n`
    sqlContent += `-- Use this for complete database backups and disaster recovery\n`
    sqlContent += `-- Restore prerequisite: database schema must already exist (run migrations first)\n`
    sqlContent += `-- This export contains data only for public schema tables\n`
    sqlContent += `-- Note: auth.users is not included in this export\n\n`
    sqlContent += `BEGIN;\n\n`
    sqlContent += `-- Best effort: disable triggers so inserts can load regardless of FK ordering\n`
    sqlContent += buildTriggerToggleBlock(tables, 'DISABLE')
    sqlContent += '\n'

    // Export data from each table using service role (bypasses RLS)
    const exportResults: Record<string, number> = {}
    const exportErrors: Record<string, string> = {}

    for (const table of tables) {
      try {
        // Use service role client to bypass RLS and get ALL records
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')

        if (error) {
          console.error(`Error fetching ${table}:`, error)
          exportResults[table] = 0
          exportErrors[table] = error.message
          continue
        }

        exportResults[table] = data?.length || 0

        if (data && data.length > 0) {
          sqlContent += `\n-- =====================================================\n`
          sqlContent += `-- Table: ${table}\n`
          sqlContent += `-- Records: ${data.length}\n`
          sqlContent += `-- =====================================================\n\n`

          for (const row of data) {
            sqlContent += `${buildInsertSql('public', table, row as Record<string, unknown>)}\n`
          }

          sqlContent += '\n'
        }
      } catch (tableError) {
        console.error(`Error exporting table ${table}:`, tableError)
        exportResults[table] = 0
        exportErrors[table] = tableError instanceof Error ? tableError.message : 'Unknown export error'
      }
    }

    sqlContent += `\n-- Best effort: re-enable triggers after data load\n`
    sqlContent += buildTriggerToggleBlock(tables, 'ENABLE')
    sqlContent += `\nCOMMIT;\n`

    sqlContent += `\n-- =====================================================\n`
    sqlContent += `-- EXPORT SUMMARY\n`
    sqlContent += `-- =====================================================\n`
    sqlContent += `-- Total tables: ${tables.length}\n`
    for (const [table, count] of Object.entries(exportResults)) {
      sqlContent += `-- ${table}: ${count} records\n`
    }
    if (Object.keys(exportErrors).length > 0) {
      sqlContent += `-- -----------------------------------------------------\n`
      sqlContent += `-- TABLES WITH EXPORT ERRORS\n`
      sqlContent += `-- -----------------------------------------------------\n`
      for (const [table, message] of Object.entries(exportErrors)) {
        sqlContent += `-- ${table}: ${message.replace(/\n/g, ' ')}\n`
      }
    }
    sqlContent += `-- =====================================================\n`
    sqlContent += `-- END OF EXPORT\n`
    sqlContent += `-- =====================================================\n`

    console.warn(`[AUDIT] Admin data export: admin=${user.id} tables=${tables.length} status=success timestamp=${new Date().toISOString()}`)

    // Return the SQL content with appropriate headers
    return new NextResponse(sqlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="hivecraic-complete-export-${new Date().toISOString().split('T')[0]}.sql"`
      }
    })

  } catch (error) {
    console.error('Error in admin export:', error)
    return NextResponse.json(
      { error: 'Failed to export database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
