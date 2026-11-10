import { BigNumberInput } from "@medusajs/framework/types"
import { MathBN, MedusaError } from "@medusajs/framework/utils"

/**
 * Currencies Mollie takes without decimals. Every other currency it supports takes exactly two, HUF
 * included, although Medusa's own currency table gives HUF none (docs: "Multicurrency").
 */
export const MOLLIE_ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "ISK"])

/** bignumber.js ROUND_HALF_UP. */
const ROUND_HALF_UP = 4

function precisionFor(currencyCode: string): number {
  return MOLLIE_ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase()) ? 0 : 2
}

export type MollieAmount = { currency: string; value: string }

/**
 * Formats a Medusa amount, in major units, as the amount Mollie takes: `{ currency: "EUR", value:
 * "10.00" }`. Mollie rejects a value with the wrong number of decimals, so this rounds to the
 * currency's own precision; it never multiplies, Medusa keeps major units too.
 */
export function toMollieAmount(amount: BigNumberInput, currencyCode: string): MollieAmount {
  const value = MathBN.convert(amount)
  if (!value.isFinite() || value.isNegative()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid Mollie amount: ${String(amount)} ${currencyCode.toUpperCase()}`
    )
  }
  const precision = precisionFor(currencyCode)
  return {
    currency: currencyCode.toUpperCase(),
    value: value.decimalPlaces(precision, ROUND_HALF_UP).toFixed(precision),
  }
}

/** Reads an amount Mollie reports, `{ value: "10.00" }` or the bare value, in major units. */
export function fromMollieAmount(
  amount: { value?: string | null } | string | number | null | undefined
): number | undefined {
  const raw = amount !== null && typeof amount === "object" ? amount.value : amount
  if (raw === null || raw === undefined || raw === "") {
    return undefined
  }
  const value = MathBN.convert(raw)
  return value.isFinite() ? value.toNumber() : undefined
}

/** Two amounts in the same currency are equal once both are formatted for Mollie. */
export function sameMollieAmount(a: BigNumberInput, b: BigNumberInput, currencyCode: string): boolean {
  return toMollieAmount(a, currencyCode).value === toMollieAmount(b, currencyCode).value
}
