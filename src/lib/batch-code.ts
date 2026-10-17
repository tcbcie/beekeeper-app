// Batch code generation for EU-compliant lot numbers
// Format: L-YYYY-MM-NNN (e.g., L-2026-01-001)

import { supabase } from './supabase'

/**
 * Generate the next batch code for a given month
 * Format: L-YYYY-MM-NNN where NNN is sequential globally per month
 * @param _userId - Unused, kept for API compatibility
 * @param batchDate - Date to generate code for
 */
export async function generateBatchCode(_userId: string, batchDate: Date): Promise<string> {
  const year = batchDate.getFullYear()
  const month = String(batchDate.getMonth() + 1).padStart(2, '0')
  const prefix = `L-${year}-${month}-`

  // batch_code has a global UNIQUE constraint, but other users' batches aren't readable,
  // so the database works out the next number across all users.
  const { data, error } = await supabase.rpc('next_batch_code', {
    p_batch_date: `${year}-${month}-01`,
  })

  if (error || typeof data !== 'string' || !data.startsWith(prefix)) {
    console.error('Error generating batch code:', error)
    return `${prefix}001`
  }

  return data
}

/**
 * Parse a batch code into its components
 */
export function parseBatchCode(batchCode: string): {
  year: number
  month: number
  sequence: number
} | null {
  const match = batchCode.match(/^L-(\d{4})-(\d{2})-(\d{3})$/)
  if (!match) return null

  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10)
  }
}

/**
 * Validate a batch code format
 */
export function isValidBatchCode(batchCode: string): boolean {
  return /^L-\d{4}-\d{2}-\d{3}$/.test(batchCode)
}
