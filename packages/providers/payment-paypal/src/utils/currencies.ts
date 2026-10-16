import { MedusaError } from "@medusajs/framework/utils"

/**
 * Currencies PayPal accepts, from
 * https://developer.paypal.com/api/rest/reference/currency-codes/ (checked 2026-10-12).
 */
export const PAYPAL_CURRENCIES = [
  "AUD",
  "BRL",
  "CAD",
  "CHF",
  "CNY",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "ILS",
  "JPY",
  "MXN",
  "MYR",
  "NOK",
  "NZD",
  "PHP",
  "PLN",
  "RUB",
  "SEK",
  "SGD",
  "THB",
  "TWD",
  "USD",
] as const

/**
 * Supported as a payment currency only for PayPal accounts in the same country.
 * A merchant elsewhere gets the payment converted, so this is worth a warning,
 * not a refusal.
 */
export const IN_COUNTRY_ONLY_CURRENCIES = ["BRL", "CNY", "MYR"] as const

const SUPPORTED = new Set<string>(PAYPAL_CURRENCIES)
const IN_COUNTRY_ONLY = new Set<string>(IN_COUNTRY_ONLY_CURRENCIES)

export function isPayPalCurrency(currencyCode: string): boolean {
  return SUPPORTED.has(currencyCode.toUpperCase())
}

export function isInCountryOnlyCurrency(currencyCode: string): boolean {
  return IN_COUNTRY_ONLY.has(currencyCode.toUpperCase())
}

/** Returns the upper-cased code, or throws when PayPal does not accept the currency. */
export function assertPayPalCurrency(currencyCode: string): string {
  const code = currencyCode.toUpperCase()
  if (!SUPPORTED.has(code)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `PayPal does not support the currency ${code}`
    )
  }
  return code
}
