import Badge from '@/components/ui/Badge'
import type { OrderStatus, PaymentStatus } from '@/types/crm'

const STATUS_TONE: Record<OrderStatus, 'amber' | 'green' | 'red'> = {
  pending: 'amber',
  fulfilled: 'green',
  cancelled: 'red',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge tone={status === 'paid' ? 'green' : 'neutral'}>
      {status === 'paid' ? 'Paid' : 'Unpaid'}
    </Badge>
  )
}
