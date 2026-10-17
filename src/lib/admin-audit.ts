import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Append one row to `admin_audit_log` (append-only; admins can read it, nobody can edit it).
 * Returns false when the row could not be written, so sensitive actions (impersonation, full
 * export) can refuse to go ahead without a record. `supabaseAdmin` must be a secret-key client.
 */
export async function logAdminAction(
  supabaseAdmin: SupabaseClient,
  entry: {
    adminId: string
    action: string
    targetUserId?: string | null
    details?: Record<string, unknown>
  },
): Promise<boolean> {
  const { error } = await supabaseAdmin.from('admin_audit_log').insert({
    admin_id: entry.adminId,
    action: entry.action,
    target_user_id: entry.targetUserId ?? null,
    details: entry.details ?? {},
  })
  if (error) {
    console.error(`[AUDIT] Failed to record admin action ${entry.action}:`, error.message)
    return false
  }
  return true
}
