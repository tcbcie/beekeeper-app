// CRM module TypeScript interfaces

export type OrderStatus = 'pending' | 'fulfilled' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid'

export type ProductType =
  | 'queens'
  | 'honey'
  | 'nuc'
  | 'wax'
  | 'propolis'
  | 'pollination'
  | 'other'

export interface Customer {
  id: string
  user_id: string
  name: string
  first_name: string
  surname: string | null
  company: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  county: string | null
  postcode: string | null
  country: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

export interface CustomerFormData {
  first_name: string
  surname: string
  company: string
  email: string
  phone: string
  address_line1: string
  address_line2: string
  city: string
  county: string
  postcode: string
  country: string
  notes: string
}

export interface OrderItem {
  id: string
  user_id: string
  order_id: string
  product_type: ProductType
  description: string | null
  quantity: number
  unit_price: number
  created_at?: string
}

export interface OrderItemFormData {
  product_type: ProductType
  description: string
  quantity: number
  unit_price: number
}

export interface Order {
  id: string
  user_id: string
  customer_id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  order_date: string
  fulfilled_date: string | null
  paid_date: string | null
  total_amount: number
  notes: string | null
  created_at?: string
  updated_at?: string
  // Relations
  customer?: Pick<Customer, 'id' | 'name' | 'company'> | null
  items?: OrderItem[]
}

export interface OrderFormData {
  customer_id: string
  order_date: string
  notes: string
  items: OrderItemFormData[]
}

/** Maps an order line's product type to the existing income category name. */
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  queens: 'Queens',
  honey: 'Honey',
  nuc: 'Nuc',
  wax: 'Wax',
  propolis: 'Propolis',
  pollination: 'Pollination',
  other: 'Other',
}

// Note: product type -> income category mapping lives in SQL
// (public.crm_product_income_category) so revenue recognition stays atomic and
// single-sourced. Do not duplicate it here.
