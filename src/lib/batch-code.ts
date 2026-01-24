// Batch code generation for EU-compliant lot numbers
// Format: L-YYYY-MM-NNN (e.g., L-2026-01-001)

import { supabase } from './supabase'

/**
 * Generate the next batch code for a given month
 * Format: L-YYYY-MM-NNN where NNN is sequential per month (globally unique)
 * Uses database function to ensure uniqueness across all users
 */
export async function generateBatchCode(_userId: string, batchDate: Date): Promise<string> {
  const dateStr = batchDate.toISOString().split('T')[0]

  const { data, error } = await supabase.rpc('generate_unique_batch_code', {
    p_batch_date: dateStr
  })

  if (error) {
    console.error('Error generating batch code:', error)
    // Fallback to timestamp-based code if RPC fails
    const year = batchDate.getFullYear()
    const month = String(batchDate.getMonth() + 1).padStart(2, '0')
    const fallback = String(Date.now()).slice(-3)
    return `L-${year}-${month}-${fallback}`
  }

  return data as string
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
