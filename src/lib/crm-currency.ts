/**
 * Formats a money amount using the same EUR/GBP rule as the finance module:
 * UK/NI residents see GBP, everyone else EUR.
 */
export function formatMoney(amount: number, isUkNi: boolean): string {
  return new Intl.NumberFormat(isUkNi ? 'en-GB' : 'en-IE', {
    style: 'currency',
    currency: isUkNi ? 'GBP' : 'EUR',
  }).format(amount)
}

export function currencyCode(isUkNi: boolean): string {
  return isUkNi ? 'GBP' : 'EUR'
}
