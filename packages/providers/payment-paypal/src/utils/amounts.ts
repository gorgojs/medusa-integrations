import { BigNumberInput } from "@medusajs/framework/types"
import { MathBN, MedusaError } from "@medusajs/framework/utils"

/**
 * Currencies sent to PayPal as whole numbers. Of the currencies PayPal accepts,
 * HUF, JPY and TWD reject a decimal part
 * (https://developer.paypal.com/api/rest/reference/currency-codes/). The rest of
 * the list keeps the ISO 4217 zero-decimal currencies, so a currency PayPal adds
 * later is formatted correctly without a code change.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "HUF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "TWD",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
])

const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "IQD", "JOD", "KWD", "OMR", "TND"])

/** bignumber.js ROUND_HALF_UP. */
const ROUND_HALF_UP = 4

/** Number of decimal places PayPal expects in `amount.value` for a currency. */
export function getCurrencyExponent(currencyCode: string): 0 | 2 | 3 {
  const code = currencyCode.toUpperCase()
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return 0
  }
  if (THREE_DECIMAL_CURRENCIES.has(code)) {
    return 3
  }
  return 2
}

/**
 * Formats a Medusa amount as a PayPal `amount.value` string.
 *
 * Medusa passes amounts in major units (`10` for €10), and PayPal expects major
 * units as a string (`"10.00"`), so only the precision changes. The arithmetic is
 * decimal through MathBN: `Number.toFixed` would turn 1.005 into "1.00".
 */
export function formatAmount(amount: BigNumberInput, currencyCode: string): string {
  const value = MathBN.convert(amount)
  if (!value.isFinite() || value.isNegative()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid PayPal amount: ${String(amount)} ${currencyCode.toUpperCase()}`
    )
  }
  return value.toFixed(getCurrencyExponent(currencyCode), ROUND_HALF_UP)
}
