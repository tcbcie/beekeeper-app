import type { SupabaseClient } from '@supabase/supabase-js'

export const DATABASE_EXPORT_TABLES = [
  'apiaries',
  'batch_breeder_queens',
  'batch_containers',
  'batch_feedback',
  'batch_grafts',
  'batch_jars',
  'batch_runs',
  'beekeeping_associations',
  'bulk_containers',
  'changelog',
  'colonies',
  'colony_movements',
  'conservation_areas',
  'container_harvests',
  'crm_customer_credit',
  'crm_customers',
  'crm_order_items',
  'crm_orders',
  'dca_confirmations',
  'del_user_profiles',
  'diagnosis_image_comments',
  'diagnosis_images',
  'dropdown_categories',
  'dropdown_values',
  'feedings',
  'financial_records',
  'frame_standards',
  'gdd_records',
  'graft_distributions',
  'key_events',
  'harvests',
  'hive_configuration_history',
  'hives',
  'inspections',
  'knowledge_base',
  'knowledge_sources',
  'logbook_entries',
  'mating_nuc_batches',
  'mating_nuc_inspections',
  'mating_nucs',
  'news_articles',
  'nihbs_monthly_returns',
  'profiles',
  'purchase_items',
  'push_subscriptions',
  'qr_tags',
  'queen_assignments',
  'queen_weights',
  'queens',
  'reactivation_requests',
  'rearing_batches',
  'rearing_group_invitations',
  'rearing_group_members',
  'rearing_groups',
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
  'trace_labels',
  'varroa_checks',
  'varroa_treatment_products',
  'varroa_treatments',
  'vegetation_info',
  'wild_colonies',
  'wild_colony_inspections',
  'yard_benches'
] as const

export type ExportTableName = (typeof DATABASE_EXPORT_TABLES)[number]

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''")
}

export function sqlIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`
}

export function sqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return value.toString()
  }

  if (value instanceof Date) {
    return `'${value.toISOString()}'`
  }

  if (typeof value === 'string') {
    return `'${escapeSqlString(value)}'`
  }

  if (typeof value === 'object') {
    return `'${escapeSqlString(JSON.stringify(value))}'`
  }

  return `'${escapeSqlString(String(value))}'`
}

export function buildInsertSql(
  schema: string,
  table: string,
  row: Record<string, unknown>
): string {
  const columns = Object.keys(row)
  const columnSql = columns.map(sqlIdentifier).join(', ')
  const valuesSql = columns.map(column => sqlValue(row[column])).join(', ')

  return `INSERT INTO ${sqlIdentifier(schema)}.${sqlIdentifier(table)} (${columnSql}) VALUES (${valuesSql});`
}


// Supabase returns at most this many rows per request, so exports read every table in pages.
export const EXPORT_PAGE_SIZE = 1000

// Paging needs a stable order. Every export table has an `id` except these.
const EXPORT_ORDER_COLUMNS: Record<string, string[]> = {
  batch_breeder_queens: ['batch_id', 'queen_id'],
}

/**
 * Read every row of a table (optionally `column = value`), page by page. A plain
 * `select('*')` stops silently at 1,000 rows, which cut large tables short in exports.
 * Returns the first error, if any, in the usual `{ data, error }` shape.
 */
export async function fetchAllRows(
  client: SupabaseClient,
  table: string,
  filter?: { column: string; value: string }
): Promise<{ data: Record<string, unknown>[]; error: { message: string } | null }> {
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    let query = client.from(table).select('*')
    if (filter) query = query.eq(filter.column, filter.value)
    for (const column of EXPORT_ORDER_COLUMNS[table] ?? ['id']) {
      query = query.order(column, { ascending: true })
    }
    const { data, error } = await query.range(from, from + EXPORT_PAGE_SIZE - 1)
    if (error) return { data: [], error }
    const page = (data as Record<string, unknown>[] | null) ?? []
    rows.push(...page)
    if (page.length < EXPORT_PAGE_SIZE) return { data: rows, error: null }
  }
}

/**
 * User-scoped tables included in a member's own data export (Profile page).
 * `label` is the section heading used by the CSV export. Both the JSON and
 * CSV exports derive from this single list, so adding a new user-scoped
 * table here covers both formats at once.
 */
export const USER_EXPORT_TABLES: ReadonlyArray<{ table: string; label: string }> = [
  { table: 'apiaries', label: 'Apiaries' },
  { table: 'hives', label: 'Hives' },
  { table: 'queens', label: 'Queens' },
  { table: 'inspections', label: 'Inspections' },
  { table: 'varroa_checks', label: 'Varroa Checks' },
  { table: 'varroa_treatments', label: 'Varroa Treatments' },
  { table: 'feedings', label: 'Feedings' },
  { table: 'harvests', label: 'Harvests' },
  { table: 'rearing_batches', label: 'Rearing Batches' },
  { table: 'tasks_events', label: 'Tasks and Events' },
  { table: 'colonies', label: 'Colonies' },
  { table: 'colony_movements', label: 'Colony Movements' },
  { table: 'gdd_records', label: 'GDD Records' },
  { table: 'financial_records', label: 'Financial Records' },
  { table: 'batch_grafts', label: 'Batch Grafts' },
  { table: 'graft_distributions', label: 'Graft Distributions' },
  { table: 'mating_nucs', label: 'Mating Nucs' },
  { table: 'mating_nuc_inspections', label: 'Mating Nuc Inspections' },
  { table: 'mating_nuc_batches', label: 'Mating Nuc Batches' },
  { table: 'wild_colonies', label: 'Wild Colonies' },
  { table: 'wild_colony_inspections', label: 'Wild Colony Inspections' },
  { table: 'diagnosis_images', label: 'Diagnosis Images' },
  { table: 'diagnosis_image_comments', label: 'Diagnosis Image Comments' },
  { table: 'qr_tags', label: 'QR Tags' },
  { table: 'logbook_entries', label: 'Logbook Entries' },
  { table: 'conservation_areas', label: 'Conservation Areas' },
  { table: 'bulk_containers', label: 'Bulk Containers' },
  { table: 'purchase_items', label: 'Purchase Items' },
  { table: 'batch_runs', label: 'Batch Runs' },
  { table: 'trace_labels', label: 'Jar Trace Labels' },
  { table: 'push_subscriptions', label: 'Push Subscriptions' },
  { table: 'support_tickets', label: 'Support Tickets' },
  { table: 'reactivation_requests', label: 'Reactivation Requests' },
  { table: 'subscription_history', label: 'Subscription History' },
  { table: 'rearing_group_members', label: 'Rearing Group Members' },
  { table: 'team_members', label: 'Team Members' },
  { table: 'batch_breeder_queens', label: 'Batch Breeder Queens' },
  { table: 'dca_confirmations', label: 'DCA Confirmations' },
  { table: 'key_events', label: 'Key Events' },
  { table: 'queen_assignments', label: 'Queen Assignments' },
  { table: 'queen_weights', label: 'Queen Weights' },
  { table: 'tool_suggestions', label: 'Tool Suggestions' },
  { table: 'yard_benches', label: 'Apiary Map Benches' },
  { table: 'crm_customers', label: 'CRM Customers' },
  { table: 'crm_orders', label: 'CRM Orders' },
  { table: 'crm_order_items', label: 'CRM Order Items' },
  { table: 'crm_customer_credit', label: 'CRM Customer Credit' },
]

/**
 * Fetch every user-scoped table for the signed-in member's data export.
 * The Supabase client is passed in so this module stays usable from both
 * browser code and (potentially) server routes without pulling either
 * client into the other's bundle. A failing table aborts the export rather
 * than silently producing an incomplete backup.
 */
export async function fetchUserExportData(
  client: SupabaseClient,
  userId: string
): Promise<Record<string, Record<string, unknown>[]>> {
  const results = await Promise.all(
    USER_EXPORT_TABLES.map(({ table }) =>
      fetchAllRows(client, table, { column: 'user_id', value: userId })
    )
  )

  const byTable: Record<string, Record<string, unknown>[]> = {}
  USER_EXPORT_TABLES.forEach(({ table }, i) => {
    const { data, error } = results[i]
    if (error) {
      throw new Error(`Export failed for ${table}: ${error.message}`)
    }
    byTable[table] = data
  })
  return byTable
}
