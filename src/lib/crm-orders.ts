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

/**
 * True when an order has a balance owed past its due date. `todayStr` is the
 * caller's local calendar date as `YYYY-MM-DD` (compared lexicographically
 * against the ISO `due_date`). Cancelled and fully-paid orders are never overdue.
 */
export function isOverdue(
  o: Pick<Order, 'status' | 'due_date' | 'total_amount' | 'amount_paid'>,
  todayStr: string,
): boolean {
  if (o.status === 'cancelled' || !o.due_date) return false
  if (orderBalance(o) <= 0) return false
  return o.due_date < todayStr
}

/**
 * Rolls a customer's orders into the headline figures shown on the customer
 * detail page and the order detail customer panel. `count` includes every
 * order; `lifetime` and `outstanding` exclude cancelled ones (they carry no
 * recognised revenue and nothing is owed).
 */
export function summariseCustomerOrders(
  orders: Pick<Order, 'status' | 'total_amount' | 'amount_paid'>[],
): { count: number; lifetime: number; outstanding: number } {
  let count = 0, lifetime = 0, outstanding = 0
  for (const o of orders) {
    count += 1
    if (o.status === 'cancelled') continue
    lifetime += Number(o.total_amount) || 0
    outstanding += orderBalance(o)
  }
  return { count, lifetime, outstanding }
}
