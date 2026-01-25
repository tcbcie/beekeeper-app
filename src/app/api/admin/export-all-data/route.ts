import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Get all table names from database
    const { data: tablesData, error: tablesError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `
    })

    let tables: string[]
    if (tablesError) {
      console.error('Cannot fetch schema via RPC, using fallback list')
      // Fallback: comprehensive list of all known tables
      tables = [
        'apiaries',
        'batch_containers',
        'batch_grafts',
        'batch_runs',
        'beekeeping_associations',
        'bulk_containers',
        'changelog',
        'colonies',
        'colony_movements',
        'container_harvests',
        'del_user_profiles',
        'dropdown_categories',
        'dropdown_values',
        'feedings',
        'financial_records',
        'frame_standards',
        'gdd_records',
        'harvests',
        'hive_configuration_history',
        'hives',
        'inspections',
        'knowledge_base',
        'knowledge_sources',
        'mating_nuc_inspections',
        'mating_nucs',
        'news_articles',
        'profiles',
        'purchase_items',
        'push_subscriptions',
        'queens',
        'reactivation_requests',
        'rearing_batches',
        'registration_codes',
        'subscription_history',
        'support_tickets',
        'tasks_events',
        'team_apiaries',
        'team_invitations',
        'team_members',
        'teams',
        'terminology',
        'tool_suggestions',
        'varroa_checks',
        'varroa_treatment_products',
        'varroa_treatments',
        'wild_colonies',
        'wild_colony_inspections'
      ]
    } else {
      tables = tablesData.map((t: { table_name: string }) => t.table_name)
    }

    // Build SQL export content
    let sqlContent = `-- =====================================================\n`
    sqlContent += `-- HiveCraic COMPLETE Database Export (ALL USERS)\n`
    sqlContent += `-- Generated on: ${new Date().toISOString()}\n`
    sqlContent += `-- Exported by Admin: ${user.email}\n`
    sqlContent += `-- =====================================================\n\n`
    sqlContent += `-- This export includes ALL data from ALL users\n`
    sqlContent += `-- Use this for complete database backups and disaster recovery\n\n`

    // Export data from each table using service role (bypasses RLS)
    const exportResults: Record<string, number> = {}

    for (const table of tables) {
      try {
        // Use service role client to bypass RLS and get ALL records
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')

        if (error) {
          console.error(`Error fetching ${table}:`, error)
          exportResults[table] = 0
          continue
        }

        exportResults[table] = data?.length || 0

        if (data && data.length > 0) {
          sqlContent += `\n-- =====================================================\n`
          sqlContent += `-- Table: ${table}\n`
          sqlContent += `-- Records: ${data.length}\n`
          sqlContent += `-- =====================================================\n\n`

          // Get column names from first record
          const columns = Object.keys(data[0])

          for (const row of data) {
            const values = columns.map(col => {
              const value = row[col]
              if (value === null) return 'NULL'
              if (typeof value === 'boolean') return value ? 'true' : 'false'
              if (typeof value === 'number') return value.toString()
              if (typeof value === 'string') {
                // Escape single quotes
                return `'${value.replace(/'/g, "''")}'`
              }
              if (typeof value === 'object') {
                // Handle JSON/JSONB columns
                return `'${JSON.stringify(value).replace(/'/g, "''")}'`
              }
              return `'${value}'`
            }).join(', ')

            sqlContent += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values});\n`
          }

          sqlContent += '\n'
        }
      } catch (tableError) {
        console.error(`Error exporting table ${table}:`, tableError)
        exportResults[table] = 0
      }
    }

    sqlContent += `\n-- =====================================================\n`
    sqlContent += `-- EXPORT SUMMARY\n`
    sqlContent += `-- =====================================================\n`
    sqlContent += `-- Total tables: ${tables.length}\n`
    for (const [table, count] of Object.entries(exportResults)) {
      sqlContent += `-- ${table}: ${count} records\n`
    }
    sqlContent += `-- =====================================================\n`
    sqlContent += `-- END OF EXPORT\n`
    sqlContent += `-- =====================================================\n`

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
