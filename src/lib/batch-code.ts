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

  // Find the highest sequence number globally for this month
  // Note: batch_code has a global UNIQUE constraint, so we check all users
  const { data, error } = await supabase
    .from('batch_runs')
    .select('batch_code')
    .like('batch_code', `${prefix}%`)
    .order('batch_code', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error fetching batch codes:', error)
    return `${prefix}001`
  }

  let nextSequence = 1

  if (data && data.length > 0) {
    const lastCode = data[0].batch_code
    const lastSequence = parseInt(lastCode.split('-').pop() || '0', 10)
    nextSequence = lastSequence + 1
  }

  const sequenceStr = String(nextSequence).padStart(3, '0')
  return `${prefix}${sequenceStr}`
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
