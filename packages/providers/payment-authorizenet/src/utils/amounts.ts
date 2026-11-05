import { BigNumberInput } from "@medusajs/framework/types"
import { MathBN, MedusaError } from "@medusajs/framework/utils"

/**
 * Currencies without a minor unit (ISO 4217). Of the currencies Authorize.net lists, only JPY; the
 * gateway's documentation says nothing about how it takes them, so this follows ISO 4217.
 */
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY"])

/** bignumber.js ROUND_HALF_UP. */
const ROUND_HALF_UP = 4

function precisionFor(currencyCode: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase()) ? 0 : 2
}

/**
 * Formats a Medusa amount, in major units, as the decimal string Authorize.net takes: `"10.00"`.
 * Medusa keeps amounts in major units too, so this rounds, it does not multiply.
 */
export function toAnetAmount(amount: BigNumberInput, currencyCode: string): string {
  const value = MathBN.convert(amount)
  if (!value.isFinite() || value.isNegative()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid Authorize.net amount: ${String(amount)} ${currencyCode.toUpperCase()}`
    )
  }
  const precision = precisionFor(currencyCode)
  return value.decimalPlaces(precision, ROUND_HALF_UP).toFixed(precision)
}

/** Reads an amount Authorize.net reports, as a string or a number, in major units. */
export function fromAnetAmount(amount: string | number | null | undefined): number | undefined {
  if (amount === null || amount === undefined || amount === "") {
    return undefined
  }
  const value = MathBN.convert(amount)
  return value.isFinite() ? value.toNumber() : undefined
}
