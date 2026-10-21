import { BigNumberInput } from "@medusajs/framework/types"
import { MathBN } from "@medusajs/framework/utils"
import { formatAmount, getCurrencyExponent } from "./amounts"

/** The part of a Medusa cart, read through Query with its computed totals, that PayPal's items need. */
export type PayPalCart = {
  item_subtotal?: BigNumberInput | null
  shipping_subtotal?: BigNumberInput | null
  tax_total?: BigNumberInput | null
  discount_subtotal?: BigNumberInput | null
  items?: Array<{
    title?: string | null
    variant_title?: string | null
    variant_sku?: string | null
    quantity?: BigNumberInput | null
    subtotal?: BigNumberInput | null
  } | null> | null
}

type Money = { currency_code: string; value: string }

export type PayPalItem = {
  name: string
  quantity: string
  unit_amount: Money
  sku?: string
}

export type PayPalBreakdown = {
  item_total: Money
  shipping?: Money
  tax_total?: Money
  discount?: Money
}

export type PayPalCartLines = { items: PayPalItem[]; breakdown: PayPalBreakdown }

const NAME_MAX = 127
const SKU_MAX = 127

const truncate = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value)

/**
 * The cart's items, shipping, tax and discount as PayPal's `items` and `amount.breakdown`.
 *
 * PayPal rejects an order whose breakdown does not add up to its amount (`AMOUNT_MISMATCH`) or whose
 * items do not add up to `item_total` (`ITEM_TOTAL_MISMATCH`). So a line whose subtotal does not split
 * into equal unit prices goes as one unit named with its quantity, and anything that leaves a gap,
 * such as a gift card or a payment for part of the total, returns `null`: the order then carries the
 * amount alone, as it would without items.
 */
export function buildPayPalCartLines(
  cart: PayPalCart | null | undefined,
  currency: string,
  amount: string
): PayPalCartLines | null {
  const lines = (cart?.items ?? []).filter((item): item is NonNullable<typeof item> => !!item)
  if (!cart || !lines.length) {
    return null
  }

  const exponent = getCurrencyExponent(currency)
  const money = (value: BigNumberInput): Money => ({ currency_code: currency, value: formatAmount(value, currency) })

  const items: PayPalItem[] = []
  let itemTotal = MathBN.convert(0)
  for (const line of lines) {
    const quantity = MathBN.convert(line.quantity ?? 0)
    const subtotal = MathBN.convert(line.subtotal ?? 0)
    if (!quantity.isInteger() || quantity.lte(0) || subtotal.isNegative()) {
      return null
    }
    const title = [line.title, line.variant_title].filter(Boolean).join(" · ") || "Item"
    const unit = subtotal.div(quantity)
    const splits = unit.decimalPlaces() !== null && (unit.decimalPlaces() as number) <= exponent
    items.push({
      name: truncate(splits ? title : `${title} × ${quantity.toString()}`, NAME_MAX),
      quantity: splits ? quantity.toString() : "1",
      unit_amount: money(splits ? unit : subtotal),
      ...(line.variant_sku ? { sku: truncate(line.variant_sku, SKU_MAX) } : {}),
    })
    itemTotal = itemTotal.plus(MathBN.convert(items[items.length - 1].unit_amount.value).times(items[items.length - 1].quantity))
  }

  const shipping = MathBN.convert(cart.shipping_subtotal ?? 0)
  const tax = MathBN.convert(cart.tax_total ?? 0)
  const discount = MathBN.convert(cart.discount_subtotal ?? 0)
  if (shipping.isNegative() || tax.isNegative() || discount.isNegative()) {
    return null
  }

  const breakdown: PayPalBreakdown = {
    item_total: money(itemTotal),
    ...(shipping.gt(0) ? { shipping: money(shipping) } : {}),
    ...(tax.gt(0) ? { tax_total: money(tax) } : {}),
    ...(discount.gt(0) ? { discount: money(discount) } : {}),
  }

  // PayPal adds up the rounded values it receives, so the check does the same.
  const sum = [breakdown.item_total, breakdown.shipping, breakdown.tax_total]
    .reduce((total, part) => (part ? total.plus(part.value) : total), MathBN.convert(0))
    .minus(breakdown.discount?.value ?? 0)
  if (!sum.eq(amount)) {
    return null
  }
  return { items, breakdown }
}
