import { supabase } from '@/lib/supabase'

export interface RecipientLabel {
  recipientName: string | null
  apiaryName: string | null
}

/**
 * Recipient name and apiary name for distributions to app users.
 *
 * Full recipient details (email, location) come through the normal embeds, but only
 * when the recipient shares a team or rearing group with the caller. For anyone else
 * the database returns just these two labels, so screens use this as the fallback.
 */
export async function fetchRecipientLabels(distributionIds: string[]): Promise<Map<string, RecipientLabel>> {
  const labels = new Map<string, RecipientLabel>()
  const ids = [...new Set(distributionIds.filter(Boolean))]
  if (ids.length === 0) return labels

  const { data, error } = await supabase.rpc('get_distribution_recipient_labels', { p_distribution_ids: ids })
  if (error) {
    console.error('Error loading distribution recipient labels:', error)
    return labels
  }
  for (const row of (data ?? []) as { distribution_id: string; recipient_name: string | null; apiary_name: string | null }[]) {
    labels.set(row.distribution_id, { recipientName: row.recipient_name, apiaryName: row.apiary_name })
  }
  return labels
}

interface RecipientLabelTarget {
  id: string
  recipient_user_id: string | null
  recipient_name: string | null
  recipient_apiary_name: string | null
}

/**
 * Fill in name and apiary name, in place, for app-user recipients the embeds could
 * not resolve. Rows that already have a name are left untouched.
 */
export async function fillMissingRecipientLabels(rows: RecipientLabelTarget[]): Promise<void> {
  const unresolved = rows.filter(row => row.recipient_user_id && !row.recipient_name)
  if (unresolved.length === 0) return

  const labels = await fetchRecipientLabels(unresolved.map(row => row.id))
  for (const row of unresolved) {
    const label = labels.get(row.id)
    if (!label) continue
    row.recipient_name = label.recipientName
    row.recipient_apiary_name = row.recipient_apiary_name ?? label.apiaryName
  }
}
