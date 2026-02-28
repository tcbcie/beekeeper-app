export const DATABASE_EXPORT_TABLES = [
  'apiaries',
  'batch_containers',
  'batch_feedback',
  'batch_grafts',
  'batch_runs',
  'beekeeping_associations',
  'bulk_containers',
  'changelog',
  'colonies',
  'colony_movements',
  'conservation_areas',
  'container_harvests',
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
  'varroa_checks',
  'varroa_treatment_products',
  'varroa_treatments',
  'vegetation_info',
  'wild_colonies',
  'wild_colony_inspections'
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

