import { BigNumberInput } from "@medusajs/framework/types"
import { MathBN, MedusaError } from "@medusajs/framework/utils"

/** Currencies Stripe charges in whole units (https://docs.stripe.com/currencies). */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
])

/**
 * Stripe's special cases: zero-decimal currencies that the API still takes as two-decimal values
 * with `00` in the decimal part, so 5 ISK is sent as 500. Medusa's core provider treated UGX as
 * zero-decimal and charged a hundredth of the amount.
 */
const WHOLE_TWO_DECIMAL_CURRENCIES = new Set(["ISK", "UGX"])

/**
 * Three-decimal currencies. Stripe takes them in thousandths, and the last digit has to be 0, so
 * the amount is rounded to the nearest hundredth. The core provider rounded up, charging up to
 * 0.009 more than the order.
 */
const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "JOD", "KWD", "OMR", "TND"])

/** bignumber.js ROUND_HALF_UP. */
const ROUND_HALF_UP = 4

type Rule = { multiplier: number; precision: number }

function ruleFor(currencyCode: string): Rule {
  const code = currencyCode.toUpperCase()
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return { multiplier: 1, precision: 0 }
  }
  if (WHOLE_TWO_DECIMAL_CURRENCIES.has(code)) {
    return { multiplier: 100, precision: 0 }
  }
  if (THREE_DECIMAL_CURRENCIES.has(code)) {
    return { multiplier: 1000, precision: 2 }
  }
  return { multiplier: 100, precision: 2 }
}

/**
 * Converts a Medusa amount, in major units, to the integer Stripe expects for the currency.
 */
export function toStripeAmount(amount: BigNumberInput, currencyCode: string): number {
  const value = MathBN.convert(amount)
  if (!value.isFinite() || value.isNegative()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid Stripe amount: ${String(amount)} ${currencyCode.toUpperCase()}`
    )
  }
  const { multiplier, precision } = ruleFor(currencyCode)
  const rounded = value.decimalPlaces(precision, ROUND_HALF_UP)
  return MathBN.mult(rounded, multiplier).integerValue(ROUND_HALF_UP).toNumber()
}

/**
 * Converts an integer amount from Stripe back to major units for Medusa.
 */
export function fromStripeAmount(amount: number, currencyCode: string): number {
  return MathBN.div(amount, ruleFor(currencyCode).multiplier).toNumber()
}
