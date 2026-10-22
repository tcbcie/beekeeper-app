import { supabase } from '@/lib/supabase'
import type { DropdownValue } from '@/types/records'

/**
 * Active values of one dropdown category, in display order. One query with a join filter
 * instead of looking up the category id first and then its values.
 */
export async function fetchDropdownValues(
  categoryKey: string
): Promise<{ data: DropdownValue[]; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('dropdown_values')
    .select('id, value, dropdown_categories!inner(category_key)')
    .eq('dropdown_categories.category_key', categoryKey)
    .eq('is_active', true)
    .order('display_order')

  if (error) return { data: [], error }
  return { data: (data || []).map(({ id, value }) => ({ id, value })), error: null }
}
