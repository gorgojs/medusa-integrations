import { container } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type StripeCartAddress = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
}

/** The part of a Medusa cart a PaymentIntent needs: the buyer's email and the delivery address. */
export type StripeCart = {
  id: string
  email?: string | null
  shipping_address?: StripeCartAddress | null
}

const ADDRESS_FIELDS = [
  "first_name",
  "last_name",
  "company",
  "address_1",
  "address_2",
  "city",
  "province",
  "postal_code",
  "country_code",
  "phone",
]

const CART_FIELDS = ["id", "email", ...ADDRESS_FIELDS.map((field) => `shipping_address.${field}`)]

/**
 * The cart a payment collection pays for, or `null` for a collection that belongs to no cart, such
 * as an order edit. Read through Query in the global container, which the payment module's own
 * container does not have. The storefront's copy of the cart is not used: it comes through the
 * Next cache and can be stale, and the session data it would travel in is not validated.
 */
export async function getStripeCart(collectionId: string): Promise<StripeCart | null> {
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
  return ((carts as StripeCart[])[0] ?? null) as StripeCart | null
}
