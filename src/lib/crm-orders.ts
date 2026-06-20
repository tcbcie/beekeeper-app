import type { Order } from '@/types/crm'

// Money helpers for orders. PostgREST returns numeric columns as strings, so
// every read is coerced with Number(...) here — callers must not re-implement
// the arithmetic (it is the ledger-facing balance and must stay single-sourced).

/** Outstanding balance on an order: total minus amount paid, never negative. */
export function orderBalance(o: Pick<Order, 'total_amount' | 'amount_paid'>): number {
  return Math.max(0, (Number(o.total_amount) || 0) - (Number(o.amount_paid) || 0))
}

/** True when a deposit/part payment exists but the order is not yet fully paid. */
export function isPartiallyPaid(o: Pick<Order, 'payment_status' | 'amount_paid'>): boolean {
  return o.payment_status !== 'paid' && (Number(o.amount_paid) || 0) > 0
}
