import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { formatMoney } from '@/lib/crm-currency'
import { formatCrmDate } from '@/lib/crm-format'
import { PRODUCT_TYPE_LABELS, type ProductType } from '@/types/crm'

// Server-rendered invoice PDF. Uses @react-pdf/renderer's own primitives (not
// the app's DOM components / Tailwind) and the built-in Helvetica font so there
// is no font registration or network dependency at render time.

export interface InvoicePdfData {
  isUkNi: boolean
  order: {
    order_number: string
    order_date: string
    due_date: string | null
    status: string
    payment_status: string
    total_amount: number
    amount_paid: number
    notes: string | null
  }
  seller: {
    name: string
    address: string | null
    email: string | null
    phone: string | null
    breederCode: string | null
  }
  customer: {
    name: string
    company: string | null
    email: string | null
    phone: string | null
    address: string | null
  }
  items: {
    product_type: ProductType
    description: string | null
    quantity: number
    unit_price: number
  }[]
}

const styles = StyleSheet.create({
  page: { paddingVertical: 40, paddingHorizontal: 44, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a', lineHeight: 1.4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', lineHeight: 1 },
  orderNumber: { color: '#555', fontSize: 11, marginTop: 6 },
  metaLabel: { color: '#777' },
  metaValue: { fontFamily: 'Helvetica-Bold' },
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  party: { width: '48%' },
  partyHeading: { color: '#777', fontSize: 9, marginBottom: 4, textTransform: 'uppercase' },
  partyName: { fontFamily: 'Helvetica-Bold' },
  muted: { color: '#555' },
  tableHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#bbb', paddingBottom: 6, marginBottom: 2 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 6 },
  colItem: { flex: 1, paddingRight: 8 },
  colQty: { width: 45, textAlign: 'right' },
  colUnit: { width: 75, textAlign: 'right' },
  colAmount: { width: 80, textAlign: 'right' },
  colHead: { color: '#777', fontSize: 9 },
  totalsWrap: { marginTop: 14, alignItems: 'flex-end' },
  totalsBox: { width: 220 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalsRowTop: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#bbb', paddingTop: 6, marginTop: 2 },
  totalsLabelBold: { fontFamily: 'Helvetica-Bold' },
  notes: { marginTop: 24 },
  footer: { marginTop: 36, color: '#777', fontSize: 9 },
})

function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const { order, seller, customer, items, isUkNi } = data
  const paid = Number(order.amount_paid) || 0
  const total = Number(order.total_amount) || 0
  const balance = Math.max(0, total - paid)
  const showSplit = paid > 0 && balance > 0

  return (
    <Document title={`Invoice ${order.order_number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
          </View>
          <View>
            <Text><Text style={styles.metaLabel}>Date: </Text><Text style={styles.metaValue}>{formatCrmDate(order.order_date)}</Text></Text>
            {order.due_date ? <Text><Text style={styles.metaLabel}>Due: </Text><Text style={styles.metaValue}>{formatCrmDate(order.due_date)}</Text></Text> : null}
            <Text><Text style={styles.metaLabel}>Status: </Text><Text style={styles.metaValue}>{order.status}</Text></Text>
            <Text><Text style={styles.metaLabel}>Payment: </Text><Text style={styles.metaValue}>{order.payment_status}</Text></Text>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.party}>
            <Text style={styles.partyHeading}>From</Text>
            <Text style={styles.partyName}>{seller.name}</Text>
            {seller.address ? <Text style={styles.muted}>{seller.address}</Text> : null}
            {seller.email ? <Text style={styles.muted}>{seller.email}</Text> : null}
            {seller.phone ? <Text style={styles.muted}>{seller.phone}</Text> : null}
            {seller.breederCode ? <Text style={styles.muted}>Breeder code: {seller.breederCode}</Text> : null}
          </View>
          <View style={styles.party}>
            <Text style={styles.partyHeading}>Bill to</Text>
            <Text style={styles.partyName}>{customer.name}</Text>
            {customer.company ? <Text style={styles.muted}>{customer.company}</Text> : null}
            {customer.address ? <Text style={styles.muted}>{customer.address}</Text> : null}
            {customer.email ? <Text style={styles.muted}>{customer.email}</Text> : null}
            {customer.phone ? <Text style={styles.muted}>{customer.phone}</Text> : null}
          </View>
        </View>

        <View style={styles.tableHead}>
          <Text style={[styles.colItem, styles.colHead]}>Item</Text>
          <Text style={[styles.colQty, styles.colHead]}>Qty</Text>
          <Text style={[styles.colUnit, styles.colHead]}>Unit price</Text>
          <Text style={[styles.colAmount, styles.colHead]}>Amount</Text>
        </View>
        {items.map((i, idx) => {
          const qty = Number(i.quantity) || 0
          const unit = Number(i.unit_price) || 0
          return (
            <View style={styles.row} key={idx}>
              <Text style={styles.colItem}>
                {PRODUCT_TYPE_LABELS[i.product_type]}
                {i.description ? ` — ${i.description}` : ''}
              </Text>
              <Text style={styles.colQty}>{qty}</Text>
              <Text style={styles.colUnit}>{formatMoney(unit, isUkNi)}</Text>
              <Text style={styles.colAmount}>{formatMoney(qty * unit, isUkNi)}</Text>
            </View>
          )
        })}

        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRowTop}>
              <Text style={styles.totalsLabelBold}>Total</Text>
              <Text style={styles.totalsLabelBold}>{formatMoney(total, isUkNi)}</Text>
            </View>
            {showSplit ? (
              <>
                <View style={styles.totalsRow}>
                  <Text style={styles.muted}>Paid</Text>
                  <Text style={styles.muted}>{formatMoney(paid, isUkNi)}</Text>
                </View>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabelBold}>Balance due</Text>
                  <Text style={styles.totalsLabelBold}>{formatMoney(balance, isUkNi)}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {order.notes ? (
          <View style={styles.notes}>
            <Text style={styles.partyHeading}>Notes</Text>
            <Text style={styles.muted}>{order.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          {order.payment_status === 'paid'
            ? 'Paid — thank you for your business.'
            : 'Thank you for your business.'}
        </Text>
      </Page>
    </Document>
  )
}

export function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />)
}
