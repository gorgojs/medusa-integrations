import { container } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { PayPalCart } from "../utils/cart-items"

// The totals are computed by Query. Requesting `shipping_methods.*` would make Medusa compute the
// shipping from a partial selection and drop it from the totals, so the shipping methods stay out.
const CART_FIELDS = [
  "id",
  "item_subtotal",
  "shipping_subtotal",
  "tax_total",
  "discount_subtotal",
  "items.title",
  "items.variant_title",
  "items.variant_sku",
  "items.quantity",
  "items.subtotal",
]

/**
 * The cart a payment collection pays for, with the totals PayPal's items need, or `null` for a
 * collection that belongs to no cart, such as an order edit. Read through Query in the global
 * container, which the payment module's own container does not have.
 */
export async function getPayPalCart(collectionId: string): Promise<PayPalCart | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: links } = await query.graph({
    entity: "cart_payment_collection",
    fields: ["cart_id"],
    filters: { payment_collection_id: collectionId },
  })
  const cartId = (links as Array<{ cart_id?: string }>)[0]?.cart_id
  if (!cartId) {
    return null
  }
  const { data: carts } = await query.graph({ entity: "cart", fields: CART_FIELDS, filters: { id: cartId } })
  return ((carts as PayPalCart[])[0] ?? null) as PayPalCart | null
}
