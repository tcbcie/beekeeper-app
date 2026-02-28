import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildInsertSql, DATABASE_EXPORT_TABLES, sqlIdentifier, sqlValue } from '@/lib/database-export'

const PUBLIC_SCHEMA = 'public'

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

interface MetadataColumnRow {
  table_name: string
  column_name: string
  ordinal_position: number | string
  data_type: string
  not_null: boolean | string
  default_expr: string | null
  identity_kind: string | null
  generated_kind: string | null
}

interface MetadataConstraintRow {
  table_name: string
  constraint_name: string
  constraint_type: string
  constraint_def: string
  ref_schema: string | null
  ref_table: string | null
}

interface MetadataIndexRow {
  table_name: string
  index_name: string
  index_def: string
}

interface MetadataSequenceRow {
  sequence_schema: string
  sequence_name: string
  table_name: string
  column_name: string
}

interface MetadataEnumRow {
  schema_name: string
  type_name: string
  enum_label: string
  enum_sort_order: number | string
}

interface MetadataRlsTableRow {
  table_name: string
  rls_enabled: boolean | string
  rls_forced: boolean | string
}

interface MetadataPolicyRow {
  table_name: string
  policy_name: string
  policy_permissive: boolean | string
  policy_command_key: string
  policy_roles: string | null
  using_expr: string | null
  with_check_expr: string | null
}

type SqlRow = Record<string, unknown>

interface AuthUserSeedRow extends SqlRow {
  id: string
}

interface AuthIdentitySeedRow extends SqlRow {
  id: string
  user_id: string
}

const AUTH_USER_EMPTY_STRING_FIELDS = [
  'confirmation_token',
  'recovery_token',
  'email_change_token_new',
  'email_change',
  'phone_change',
  'phone_change_token',
  'email_change_token_current',
  'reauthentication_token'
] as const

function normaliseAuthUserSeedRow(row: SqlRow): AuthUserSeedRow {
  const normalisedRow: SqlRow = { ...row }
  for (const field of AUTH_USER_EMPTY_STRING_FIELDS) {
    if (normalisedRow[field] === null || normalisedRow[field] === undefined) {
      normalisedRow[field] = ''
    }
  }
  return normalisedRow as AuthUserSeedRow
}

async function fetchAuthUserSeedRows(): Promise<AuthUserSeedRow[]> {
  const rows = await runSafeSelect<AuthUserSeedRow>(`
    SELECT
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      COALESCE(confirmation_token, '') AS confirmation_token,
      confirmation_sent_at,
      COALESCE(recovery_token, '') AS recovery_token,
      recovery_sent_at,
      COALESCE(email_change_token_new, '') AS email_change_token_new,
      COALESCE(email_change, '') AS email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      phone,
      phone_confirmed_at,
      COALESCE(phone_change, '') AS phone_change,
      COALESCE(phone_change_token, '') AS phone_change_token,
      phone_change_sent_at,
      COALESCE(email_change_token_current, '') AS email_change_token_current,
      email_change_confirm_status,
      banned_until,
      COALESCE(reauthentication_token, '') AS reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      is_anonymous
    FROM auth.users
    ORDER BY id
  `)

  return rows.map(row => normaliseAuthUserSeedRow(row as SqlRow))
}

async function fetchAuthIdentitySeedRows(): Promise<AuthIdentitySeedRow[]> {
  return runSafeSelect<AuthIdentitySeedRow>(`
    SELECT
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at
    FROM auth.identities
    ORDER BY user_id, id
  `)
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''")
}

async function runSafeSelect<T>(query: string): Promise<T[]> {
  const { data, error } = await supabaseAdmin.rpc('execute_safe_query', { query_text: query.trim() })

  if (error) {
    throw new Error(`Failed metadata query: ${error.message}`)
  }

  if (!Array.isArray(data)) {
    return []
  }

  return data as T[]
}

function buildCreateExtensionsBlock(): string {
  return `-- Ensure required extensions exist for default expressions and column types\nDO $$\nBEGIN\n  BEGIN\n    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n  EXCEPTION\n    WHEN insufficient_privilege THEN\n      RAISE NOTICE 'Skipping uuid-ossp extension create due to insufficient privileges';\n  END;\n\n  BEGIN\n    CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n  EXCEPTION\n    WHEN insufficient_privilege THEN\n      RAISE NOTICE 'Skipping pgcrypto extension create due to insufficient privileges';\n  END;\n\n  BEGIN\n    CREATE EXTENSION IF NOT EXISTS "vector";\n  EXCEPTION\n    WHEN insufficient_privilege THEN\n      RAISE NOTICE 'Skipping vector extension create due to insufficient privileges';\n  END;\nEND $$;\n`
}

function buildCreateTableStatement(table: string, columns: MetadataColumnRow[]): string {
  const columnLines = columns.map(column => {
    const pieces: string[] = [`${sqlIdentifier(column.column_name)} ${column.data_type}`]
    const identityKind = (column.identity_kind || '').trim()
    const generatedKind = (column.generated_kind || '').trim()
    const defaultExpr = column.default_expr?.trim() || null
    const notNull = column.not_null === true || column.not_null === 'true'

    if (generatedKind === 's' && defaultExpr) {
      pieces.push(`GENERATED ALWAYS AS (${defaultExpr}) STORED`)
    } else if (identityKind === 'a') {
      pieces.push('GENERATED ALWAYS AS IDENTITY')
    } else if (identityKind === 'd') {
      pieces.push('GENERATED BY DEFAULT AS IDENTITY')
    } else if (defaultExpr) {
      pieces.push(`DEFAULT ${defaultExpr}`)
    }

    if (notNull) {
      pieces.push('NOT NULL')
    }

    return `  ${pieces.join(' ')}`
  })

  return `CREATE TABLE IF NOT EXISTS ${sqlIdentifier(PUBLIC_SCHEMA)}.${sqlIdentifier(table)} (\n${columnLines.join(',\n')}\n);\n`
}

function buildAddConstraintBlock(
  tableName: string,
  constraintName: string,
  constraintDefinition: string,
  referencedSchema?: string | null,
  referencedTable?: string | null
): string {
  const escapedDefinition = escapeSqlLiteral(constraintDefinition)
  const alterSql = `ALTER TABLE ${sqlIdentifier(PUBLIC_SCHEMA)}.${sqlIdentifier(tableName)} ADD CONSTRAINT ${sqlIdentifier(constraintName)} ${escapedDefinition};`
  const existsSql = `SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = '${escapeSqlLiteral(PUBLIC_SCHEMA)}' AND t.relname = '${escapeSqlLiteral(tableName)}' AND c.conname = '${escapeSqlLiteral(constraintName)}'`

  if (referencedSchema && referencedTable) {
    const referencedRelation = `${escapeSqlLiteral(referencedSchema)}.${escapeSqlLiteral(referencedTable)}`
    return `DO $$\nBEGIN\n  IF NOT EXISTS (${existsSql}) THEN\n    IF to_regclass('${referencedRelation}') IS NULL THEN\n      RAISE NOTICE 'Skipping FK ${escapeSqlLiteral(constraintName)} because ${referencedSchema}.${referencedTable} is unavailable';\n    ELSE\n      EXECUTE '${alterSql}';\n    END IF;\n  END IF;\nEND $$;\n`
  }

  return `DO $$\nBEGIN\n  IF NOT EXISTS (${existsSql}) THEN\n    EXECUTE '${alterSql}';\n  END IF;\nEND $$;\n`
}

function buildCreateIndexStatement(indexDef: string): string {
  const trimmed = indexDef.trim().replace(/;$/, '')
  const withIfNotExists = trimmed
    .replace(/^CREATE UNIQUE INDEX /i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
    .replace(/^CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS ')

  return `${withIfNotExists};\n`
}

function buildSequenceResetStatement(sequence: MetadataSequenceRow): string {
  return `SELECT setval('${escapeSqlLiteral(`${sequence.sequence_schema}.${sequence.sequence_name}`)}'::regclass, GREATEST(COALESCE((SELECT MAX(${sqlIdentifier(sequence.column_name)}) FROM ${sqlIdentifier(PUBLIC_SCHEMA)}.${sqlIdentifier(sequence.table_name)}), 0) + 1, 1), false);\n`
}

function buildCreateEnumTypeBlock(typeName: string, labels: string[]): string {
  const labelsSql = labels.map(label => `'${escapeSqlLiteral(label)}'`).join(', ')
  return `DO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1\n    FROM pg_type t\n    JOIN pg_namespace n ON n.oid = t.typnamespace\n    WHERE n.nspname = '${escapeSqlLiteral(PUBLIC_SCHEMA)}'\n      AND t.typname = '${escapeSqlLiteral(typeName)}'\n  ) THEN\n    CREATE TYPE ${sqlIdentifier(PUBLIC_SCHEMA)}.${sqlIdentifier(typeName)} AS ENUM (${labelsSql});\n  END IF;\nEND $$;\n`
}

function toBoolean(value: boolean | string | null | undefined): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (value === null || value === undefined) {
    return false
  }

  const normalised = String(value).toLowerCase().trim()
  return normalised === 'true' || normalised === 't' || normalised === '1'
}

function mapPolicyCommand(commandKey: string): string {
  switch (commandKey) {
    case 'r':
      return 'SELECT'
    case 'a':
      return 'INSERT'
    case 'w':
      return 'UPDATE'
    case 'd':
      return 'DELETE'
    default:
      return 'ALL'
  }
}

function buildCreatePolicyBlock(policy: MetadataPolicyRow): string {
  const policyMode = toBoolean(policy.policy_permissive) ? 'PERMISSIVE' : 'RESTRICTIVE'
  const policyCommand = mapPolicyCommand(policy.policy_command_key)
  const rolesClause = policy.policy_roles?.trim() ? ` TO ${policy.policy_roles.trim()}` : ''
  const usingClause = policy.using_expr?.trim() ? ` USING (${policy.using_expr.trim()})` : ''
  const withCheckClause = policy.with_check_expr?.trim() ? ` WITH CHECK (${policy.with_check_expr.trim()})` : ''

  const createSql = `CREATE POLICY ${sqlIdentifier(policy.policy_name)} ON ${sqlIdentifier(PUBLIC_SCHEMA)}.${sqlIdentifier(policy.table_name)} AS ${policyMode} FOR ${policyCommand}${rolesClause}${usingClause}${withCheckClause};`
  const existsSql = `SELECT 1 FROM pg_policy pol JOIN pg_class tbl ON tbl.oid = pol.polrelid JOIN pg_namespace ns ON ns.oid = tbl.relnamespace WHERE ns.nspname = '${escapeSqlLiteral(PUBLIC_SCHEMA)}' AND tbl.relname = '${escapeSqlLiteral(policy.table_name)}' AND pol.polname = '${escapeSqlLiteral(policy.policy_name)}'`

  return `DO $$\nBEGIN\n  IF NOT EXISTS (${existsSql}) THEN\n    EXECUTE '${escapeSqlLiteral(createSql)}';\n  END IF;\nEND $$;\n`
}

function buildTableRlsStateBlock(tableName: string, rlsEnabled: boolean, rlsForced: boolean): string {
  const rlsStateSql = rlsEnabled ? 'ENABLE' : 'DISABLE'
  const forceStateSql = rlsForced ? 'FORCE' : 'NO FORCE'
  return `ALTER TABLE ${sqlIdentifier(PUBLIC_SCHEMA)}.${sqlIdentifier(tableName)} ${rlsStateSql} ROW LEVEL SECURITY;\nALTER TABLE ${sqlIdentifier(PUBLIC_SCHEMA)}.${sqlIdentifier(tableName)} ${forceStateSql} ROW LEVEL SECURITY;\n`
}

function buildInsertOnConflictDoNothingSql(
  schema: string,
  table: string,
  row: SqlRow,
  conflictColumns: string[]
): string {
  const columns = Object.keys(row)
  const columnSql = columns.map(sqlIdentifier).join(', ')
  const valuesSql = columns.map(column => sqlValue(row[column])).join(', ')
  const conflictSql = conflictColumns.map(sqlIdentifier).join(', ')

  return `INSERT INTO ${sqlIdentifier(schema)}.${sqlIdentifier(table)} (${columnSql}) VALUES (${valuesSql}) ON CONFLICT (${conflictSql}) DO NOTHING;`
}

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

    const tables: string[] = [...DATABASE_EXPORT_TABLES]
    const tableOrder = new Map<string, number>(tables.map((table, index) => [table, index]))
    const tableSet = new Set<string>(tables)

    const columnMetadata = await runSafeSelect<MetadataColumnRow>(`
      SELECT
        c.relname AS table_name,
        a.attname AS column_name,
        a.attnum AS ordinal_position,
        format_type(a.atttypid, a.atttypmod) AS data_type,
        a.attnotnull AS not_null,
        pg_get_expr(ad.adbin, ad.adrelid) AS default_expr,
        a.attidentity AS identity_kind,
        a.attgenerated AS generated_kind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
      WHERE n.nspname = '${PUBLIC_SCHEMA}'
        AND c.relkind = 'r'
        AND a.attnum > 0
        AND a.atttypid <> 0
      ORDER BY c.relname, a.attnum
    `)

    const constraintMetadata = await runSafeSelect<MetadataConstraintRow>(`
      SELECT
        tbl.relname AS table_name,
        con.conname AS constraint_name,
        con.contype AS constraint_type,
        pg_get_constraintdef(con.oid, true) AS constraint_def,
        ref_ns.nspname AS ref_schema,
        ref_tbl.relname AS ref_table
      FROM pg_constraint con
      JOIN pg_class tbl ON tbl.oid = con.conrelid
      JOIN pg_namespace tbl_ns ON tbl_ns.oid = tbl.relnamespace
      LEFT JOIN pg_class ref_tbl ON ref_tbl.oid = con.confrelid
      LEFT JOIN pg_namespace ref_ns ON ref_ns.oid = ref_tbl.relnamespace
      WHERE tbl_ns.nspname = '${PUBLIC_SCHEMA}'
        AND con.contype IN ('p', 'u', 'c', 'f', 'x')
      ORDER BY tbl.relname, con.contype, con.conname
    `)

    const indexMetadata = await runSafeSelect<MetadataIndexRow>(`
      SELECT
        tbl.relname AS table_name,
        idx.relname AS index_name,
        pg_get_indexdef(idx.oid) AS index_def
      FROM pg_class tbl
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      JOIN pg_index i ON i.indrelid = tbl.oid
      JOIN pg_class idx ON idx.oid = i.indexrelid
      WHERE ns.nspname = '${PUBLIC_SCHEMA}'
        AND NOT i.indisprimary
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
          WHERE c.conindid = i.indexrelid
        )
      ORDER BY tbl.relname, idx.relname
    `)

    const sequenceMetadata = await runSafeSelect<MetadataSequenceRow>(`
      SELECT
        seq_ns.nspname AS sequence_schema,
        seq.relname AS sequence_name,
        tbl.relname AS table_name,
        col.attname AS column_name
      FROM pg_class seq
      JOIN pg_namespace seq_ns ON seq_ns.oid = seq.relnamespace
      JOIN pg_depend dep ON dep.objid = seq.oid AND dep.deptype IN ('a', 'i')
      JOIN pg_class tbl ON tbl.oid = dep.refobjid
      JOIN pg_namespace tbl_ns ON tbl_ns.oid = tbl.relnamespace
      JOIN pg_attribute col ON col.attrelid = tbl.oid AND col.attnum = dep.refobjsubid
      WHERE seq.relkind = 'S'
        AND tbl_ns.nspname = '${PUBLIC_SCHEMA}'
      ORDER BY tbl.relname, seq.relname
    `)

    const enumMetadata = await runSafeSelect<MetadataEnumRow>(`
      SELECT
        n.nspname AS schema_name,
        t.typname AS type_name,
        e.enumlabel AS enum_label,
        e.enumsortorder AS enum_sort_order
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = '${PUBLIC_SCHEMA}'
      ORDER BY t.typname, e.enumsortorder
    `)

    const rlsTableMetadata = await runSafeSelect<MetadataRlsTableRow>(`
      SELECT
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        c.relforcerowsecurity AS rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = '${PUBLIC_SCHEMA}'
        AND c.relkind = 'r'
      ORDER BY c.relname
    `)

    const policyMetadata = await runSafeSelect<MetadataPolicyRow>(`
      SELECT
        tbl.relname AS table_name,
        pol.polname AS policy_name,
        pol.polpermissive AS policy_permissive,
        pol.polcmd AS policy_command_key,
        (
          SELECT string_agg(
            CASE
              WHEN role_oid = 0 THEN 'PUBLIC'
              ELSE quote_ident(pg_get_userbyid(role_oid))
            END,
            ', '
            ORDER BY CASE
              WHEN role_oid = 0 THEN 'PUBLIC'
              ELSE quote_ident(pg_get_userbyid(role_oid))
            END
          )
          FROM unnest(pol.polroles) AS role_oid
        ) AS policy_roles,
        pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
        pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr
      FROM pg_policy pol
      JOIN pg_class tbl ON tbl.oid = pol.polrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      WHERE ns.nspname = '${PUBLIC_SCHEMA}'
      ORDER BY tbl.relname, pol.polname
    `)

    let authUsers: AuthUserSeedRow[] = []
    let authUsersExportError: string | null = null
    let authIdentities: AuthIdentitySeedRow[] = []
    let authIdentitiesExportError: string | null = null
    try {
      authUsers = await fetchAuthUserSeedRows()
    } catch (authError) {
      authUsersExportError = authError instanceof Error ? authError.message : 'Unknown auth.users export error'
      console.error('Error exporting auth.users:', authError)
    }

    try {
      authIdentities = await fetchAuthIdentitySeedRows()
    } catch (authIdentityError) {
      authIdentitiesExportError = authIdentityError instanceof Error ? authIdentityError.message : 'Unknown auth.identities export error'
      console.error('Error exporting auth.identities:', authIdentityError)
    }

    const filteredColumnMetadata = columnMetadata.filter(column => tableSet.has(column.table_name))
    const filteredConstraintMetadata = constraintMetadata.filter(constraint => tableSet.has(constraint.table_name))
    const filteredIndexMetadata = indexMetadata.filter(index => tableSet.has(index.table_name))
    const filteredSequenceMetadata = sequenceMetadata.filter(sequence => tableSet.has(sequence.table_name))
    const filteredEnumMetadata = enumMetadata.filter(enumType => enumType.schema_name === PUBLIC_SCHEMA)
    const filteredRlsTableMetadata = rlsTableMetadata.filter(tableMeta => tableSet.has(tableMeta.table_name))
    const filteredPolicyMetadata = policyMetadata.filter(policy => tableSet.has(policy.table_name))

    filteredConstraintMetadata.sort((a, b) => {
      const tableSort = (tableOrder.get(a.table_name) ?? Number.MAX_SAFE_INTEGER) - (tableOrder.get(b.table_name) ?? Number.MAX_SAFE_INTEGER)
      if (tableSort !== 0) return tableSort
      if (a.constraint_type !== b.constraint_type) return a.constraint_type.localeCompare(b.constraint_type)
      return a.constraint_name.localeCompare(b.constraint_name)
    })

    filteredIndexMetadata.sort((a, b) => {
      const tableSort = (tableOrder.get(a.table_name) ?? Number.MAX_SAFE_INTEGER) - (tableOrder.get(b.table_name) ?? Number.MAX_SAFE_INTEGER)
      if (tableSort !== 0) return tableSort
      return a.index_name.localeCompare(b.index_name)
    })

    filteredSequenceMetadata.sort((a, b) => {
      const tableSort = (tableOrder.get(a.table_name) ?? Number.MAX_SAFE_INTEGER) - (tableOrder.get(b.table_name) ?? Number.MAX_SAFE_INTEGER)
      if (tableSort !== 0) return tableSort
      const schemaSort = a.sequence_schema.localeCompare(b.sequence_schema)
      if (schemaSort !== 0) return schemaSort
      return a.sequence_name.localeCompare(b.sequence_name)
    })

    filteredEnumMetadata.sort((a, b) => {
      const typeSort = a.type_name.localeCompare(b.type_name)
      if (typeSort !== 0) return typeSort
      return Number(a.enum_sort_order) - Number(b.enum_sort_order)
    })

    filteredRlsTableMetadata.sort((a, b) => {
      const tableSort = (tableOrder.get(a.table_name) ?? Number.MAX_SAFE_INTEGER) - (tableOrder.get(b.table_name) ?? Number.MAX_SAFE_INTEGER)
      if (tableSort !== 0) return tableSort
      return a.table_name.localeCompare(b.table_name)
    })

    filteredPolicyMetadata.sort((a, b) => {
      const tableSort = (tableOrder.get(a.table_name) ?? Number.MAX_SAFE_INTEGER) - (tableOrder.get(b.table_name) ?? Number.MAX_SAFE_INTEGER)
      if (tableSort !== 0) return tableSort
      return a.policy_name.localeCompare(b.policy_name)
    })

    const columnsByTable = new Map<string, MetadataColumnRow[]>()
    for (const column of filteredColumnMetadata) {
      const existing = columnsByTable.get(column.table_name) || []
      existing.push(column)
      columnsByTable.set(column.table_name, existing)
    }

    const insertableColumnsByTable = new Map<string, string[]>()
    for (const [tableName, columns] of columnsByTable.entries()) {
      const insertableColumns = columns
        .filter(column => (column.generated_kind || '').trim() !== 's')
        .map(column => column.column_name)
      insertableColumnsByTable.set(tableName, insertableColumns)
    }

    const nonForeignKeyConstraints = filteredConstraintMetadata.filter(constraint => constraint.constraint_type !== 'f')
    const foreignKeyConstraints = filteredConstraintMetadata.filter(constraint => constraint.constraint_type === 'f')

    // Build SQL export content
    let sqlContent = `-- =====================================================\n`
    sqlContent += `-- HiveCraic COMPLETE Database Export (ALL USERS)\n`
    sqlContent += `-- Generated on: ${new Date().toISOString()}\n`
    sqlContent += `-- Exported by Admin: ${user.email}\n`
    sqlContent += `-- =====================================================\n\n`
    sqlContent += `-- This export includes ALL data from ALL users\n`
    sqlContent += `-- This export includes schema recreation for public tables, then data\n`
    sqlContent += `-- Auth dependency note: foreign keys to auth.users are emitted with guarded checks\n`
    sqlContent += `-- If auth.users does not exist in target, those FKs are skipped with NOTICE\n\n`

    sqlContent += `-- =====================================================\n`
    sqlContent += `-- SCHEMA RECREATION (PUBLIC)\n`
    sqlContent += `-- =====================================================\n\n`
    sqlContent += `CREATE SCHEMA IF NOT EXISTS ${sqlIdentifier(PUBLIC_SCHEMA)};\n\n`
    sqlContent += buildCreateExtensionsBlock()
    sqlContent += '\n'

    if (filteredEnumMetadata.length > 0) {
      sqlContent += `-- Custom enum types\n`
      const labelsByType = new Map<string, string[]>()
      for (const enumRow of filteredEnumMetadata) {
        const existing = labelsByType.get(enumRow.type_name) || []
        existing.push(enumRow.enum_label)
        labelsByType.set(enumRow.type_name, existing)
      }

      for (const [typeName, labels] of labelsByType.entries()) {
        sqlContent += buildCreateEnumTypeBlock(typeName, labels)
      }
      sqlContent += '\n'
    }

    sqlContent += `-- Auth users seed data (login-capable)\n`
    if (authUsersExportError) {
      sqlContent += `-- Skipping auth.users export due to source query error: ${authUsersExportError.replace(/\n/g, ' ')}\n\n`
    } else if (authUsers.length > 0) {
      const authInsertStatements = authUsers.map(userRow =>
        buildInsertOnConflictDoNothingSql('auth', 'users', userRow, ['id'])
      )
      sqlContent += `DO $$\nBEGIN\n  IF to_regclass('auth.users') IS NULL THEN\n    RAISE NOTICE 'Skipping auth.users seed data because auth.users is unavailable in target';\n  ELSE\n`
      for (const statement of authInsertStatements) {
        sqlContent += `    EXECUTE '${escapeSqlLiteral(statement)}';\n`
      }
      sqlContent += `  END IF;\nEND $$;\n\n`
    } else {
      sqlContent += `-- No auth.users rows found in source export\n\n`
    }

    sqlContent += `-- Auth identities seed data (required for password and OAuth login)\n`
    if (authUsersExportError) {
      sqlContent += `-- Skipping auth.identities export because auth.users export failed\n\n`
    } else if (authIdentitiesExportError) {
      sqlContent += `-- Skipping auth.identities export due to source query error: ${authIdentitiesExportError.replace(/\n/g, ' ')}\n\n`
    } else if (authIdentities.length > 0) {
      const authIdentityInsertStatements = authIdentities.map(identityRow =>
        buildInsertOnConflictDoNothingSql('auth', 'identities', identityRow, ['id'])
      )
      sqlContent += `DO $$\nBEGIN\n  IF to_regclass('auth.identities') IS NULL THEN\n    RAISE NOTICE 'Skipping auth.identities seed data because auth.identities is unavailable in target';\n  ELSIF to_regclass('auth.users') IS NULL THEN\n    RAISE NOTICE 'Skipping auth.identities seed data because auth.users is unavailable in target';\n  ELSE\n`
      for (const statement of authIdentityInsertStatements) {
        sqlContent += `    EXECUTE '${escapeSqlLiteral(statement)}';\n`
      }
      sqlContent += `  END IF;\nEND $$;\n\n`
    } else {
      sqlContent += `-- No auth.identities rows found in source export\n\n`
    }

    if (filteredSequenceMetadata.length > 0) {
      sqlContent += `-- Sequences\n`
      const seenSequences = new Set<string>()
      for (const sequence of filteredSequenceMetadata) {
        const key = `${sequence.sequence_schema}.${sequence.sequence_name}`
        if (seenSequences.has(key)) {
          continue
        }
        seenSequences.add(key)
        sqlContent += `CREATE SEQUENCE IF NOT EXISTS ${sqlIdentifier(sequence.sequence_schema)}.${sqlIdentifier(sequence.sequence_name)};\n`
      }
      sqlContent += '\n'
    }

    sqlContent += `-- Tables\n`
    for (const table of tables) {
      const tableColumns = columnsByTable.get(table) || []
      if (tableColumns.length === 0) {
        sqlContent += `-- Skipping ${table}: no column metadata found\n`
        continue
      }

      sqlContent += buildCreateTableStatement(table, tableColumns)
      sqlContent += '\n'
    }

    if (filteredSequenceMetadata.length > 0) {
      sqlContent += `-- Sequence ownership\n`
      const seenOwnership = new Set<string>()
      for (const sequence of filteredSequenceMetadata) {
        const key = `${sequence.sequence_schema}.${sequence.sequence_name}:${sequence.table_name}.${sequence.column_name}`
        if (seenOwnership.has(key)) {
          continue
        }
        seenOwnership.add(key)
        sqlContent += `ALTER SEQUENCE ${sqlIdentifier(sequence.sequence_schema)}.${sqlIdentifier(sequence.sequence_name)} OWNED BY ${sqlIdentifier(PUBLIC_SCHEMA)}.${sqlIdentifier(sequence.table_name)}.${sqlIdentifier(sequence.column_name)};\n`
      }
      sqlContent += '\n'
    }

    if (nonForeignKeyConstraints.length > 0) {
      sqlContent += `-- Non-foreign-key constraints\n`
      for (const constraint of nonForeignKeyConstraints) {
        sqlContent += buildAddConstraintBlock(
          constraint.table_name,
          constraint.constraint_name,
          constraint.constraint_def
        )
      }
      sqlContent += '\n'
    }

    if (filteredIndexMetadata.length > 0) {
      sqlContent += `-- Secondary indexes\n`
      for (const index of filteredIndexMetadata) {
        sqlContent += buildCreateIndexStatement(index.index_def)
      }
      sqlContent += '\n'
    }

    sqlContent += `-- =====================================================\n`
    sqlContent += `-- DATA EXPORT (PUBLIC)\n`
    sqlContent += `-- =====================================================\n\n`
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

          const insertableColumns = insertableColumnsByTable.get(table) || []

          for (const row of data) {
            const sourceRow = row as Record<string, unknown>
            const exportRow: Record<string, unknown> = {}
            for (const columnName of insertableColumns) {
              if (columnName in sourceRow) {
                exportRow[columnName] = sourceRow[columnName]
              }
            }

            if (Object.keys(exportRow).length === 0) {
              continue
            }

            sqlContent += `${buildInsertSql(PUBLIC_SCHEMA, table, exportRow)}\n`
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
    sqlContent += `-- POST-DATA FOREIGN KEYS\n`
    sqlContent += `-- =====================================================\n`
    for (const constraint of foreignKeyConstraints) {
      const isAuthUsersDependency = constraint.ref_schema === 'auth' && constraint.ref_table === 'users'
      sqlContent += buildAddConstraintBlock(
        constraint.table_name,
        constraint.constraint_name,
        constraint.constraint_def,
        isAuthUsersDependency ? constraint.ref_schema : null,
        isAuthUsersDependency ? constraint.ref_table : null
      )
    }
    sqlContent += '\n'

    if (filteredPolicyMetadata.length > 0 || filteredRlsTableMetadata.length > 0) {
      sqlContent += `-- =====================================================\n`
      sqlContent += `-- POST-DATA ROW LEVEL SECURITY\n`
      sqlContent += `-- =====================================================\n`

      if (filteredPolicyMetadata.length > 0) {
        sqlContent += `-- Policies\n`
        for (const policy of filteredPolicyMetadata) {
          sqlContent += buildCreatePolicyBlock(policy)
        }
        sqlContent += '\n'
      }

      if (filteredRlsTableMetadata.length > 0) {
        sqlContent += `-- Table RLS state\n`
        for (const tableRls of filteredRlsTableMetadata) {
          sqlContent += buildTableRlsStateBlock(
            tableRls.table_name,
            toBoolean(tableRls.rls_enabled),
            toBoolean(tableRls.rls_forced)
          )
        }
        sqlContent += '\n'
      }
    }

    if (filteredSequenceMetadata.length > 0) {
      sqlContent += `-- =====================================================\n`
      sqlContent += `-- SEQUENCE ALIGNMENT\n`
      sqlContent += `-- =====================================================\n`
      const seenSequenceResets = new Set<string>()
      for (const sequence of filteredSequenceMetadata) {
        const key = `${sequence.sequence_schema}.${sequence.sequence_name}`
        if (seenSequenceResets.has(key)) {
          continue
        }
        seenSequenceResets.add(key)
        sqlContent += buildSequenceResetStatement(sequence)
      }
      sqlContent += '\n'
    }

    sqlContent += `-- =====================================================\n`
    sqlContent += `-- EXPORT SUMMARY\n`
    sqlContent += `-- =====================================================\n`
    sqlContent += `-- Metadata: columns=${filteredColumnMetadata.length}, constraints=${filteredConstraintMetadata.length}, indexes=${filteredIndexMetadata.length}, sequences=${filteredSequenceMetadata.length}, enum_rows=${filteredEnumMetadata.length}, rls_tables=${filteredRlsTableMetadata.length}, rls_policies=${filteredPolicyMetadata.length}\n`
    sqlContent += `-- auth.users rows exported: ${authUsers.length}\n`
    if (authUsersExportError) {
      sqlContent += `-- auth.users export error: ${authUsersExportError.replace(/\n/g, ' ')}\n`
    }
    sqlContent += `-- auth.identities rows exported: ${authIdentities.length}\n`
    if (authIdentitiesExportError) {
      sqlContent += `-- auth.identities export error: ${authIdentitiesExportError.replace(/\n/g, ' ')}\n`
    }
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
