import { ShieldCheck } from 'lucide-react'
import { resolvePaymentLink, formatPaymentAmount } from '@/lib/payment-links'
import type { PublicLabelPayment } from '@/types/traceability'

interface PaymentPanelProps {
  payment: PublicLabelPayment
  /**
   * The public product name, resolved the same way the provenance card resolves
   * it. NEVER the jar label's `name` — that is the producer's internal reference
   * ("Summer all Apiary Batch") and is not for customers.
   */
  productName: string
}

/**
 * Payment panel for a jar that has not been paid for yet — an honesty box, a
 * stall with nobody attending it.
 *
 * Sits BELOW the provenance card: most people scanning a jar have already paid
 * for it, and leading with a demand for money reads badly when the thing they
 * actually came for is the story. This is a fallback, not the headline.
 *
 * We show a link and nothing more. No payment field ever appears on a HiveCraic
 * page — Revolut takes the payment on its own domain, which keeps our PCI scope
 * at zero. It also means we never learn whether the customer paid, so this
 * component must never imply confirmation: no tick, no "paid", no receipt.
 */
export default function PaymentPanel({ payment, productName }: PaymentPanelProps) {
  // Re-validated here, not trusted from the database: profiles is writable
  // directly through PostgREST, so a row can carry a URL the form never saw.
  const link = resolvePaymentLink(payment)
  if (!link) return null

  const amount = payment.amount != null ? Number(payment.amount) : null
  const showAmount = amount != null && Number.isFinite(amount) && amount > 0

  return (
    <section className="bg-surface-elevated rounded-2xl border-2 border-amber-300 dark:border-amber-800/60 shadow-lg overflow-hidden">
      <div className="px-6 pt-6 pb-4 text-center">
        <h2 className="text-xl font-bold text-foreground">Pay for this jar</h2>
        <p className="mt-1 text-text-secondary">{productName}</p>

        {showAmount && (
          <>
            <p className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              {formatPaymentAmount(amount, payment.currency)}
            </p>
            {/* Revolut does not carry the amount in the link — the payer enters
                it. Saying so prevents an accidental underpayment. */}
            <p className="mt-2 text-text-secondary">Please enter this amount in Revolut</p>
          </>
        )}
      </div>

      <div className="px-6 pb-5">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex w-full items-center justify-center rounded-xl bg-amber-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        >
          {link.buttonLabel}
        </a>
      </div>

      {payment.note && (
        <p className="px-6 pb-4 text-center text-text-secondary">{payment.note}</p>
      )}

      <div className="border-t border-border bg-surface px-6 py-4">
        <p className="flex items-start justify-center gap-2 text-center text-text-secondary">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            You&rsquo;ll be taken to {link.destinationName} to pay securely. HiveCraic never
            sees your payment details.
          </span>
        </p>
      </div>
    </section>
  )
}
