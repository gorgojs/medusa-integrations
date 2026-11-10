import { container } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { CartAddressLike } from "../utils/address"

/** The part of a Medusa cart a Mollie payment needs: the buyer's email and both addresses. */
export type MollieCart = {
  id: string
  email?: string | null
  billing_address?: CartAddressLike | null
  shipping_address?: CartAddressLike | null
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

const CART_FIELDS = [
  "id",
  "email",
  ...ADDRESS_FIELDS.map((field) => `billing_address.${field}`),
  ...ADDRESS_FIELDS.map((field) => `shipping_address.${field}`),
]

/**
 * The cart a payment collection pays for, or `null` for a collection that belongs to no cart, such
 * as an order edit. Read through Query in the global container, which the payment module's own
 * container does not have. The addresses never come from the session data: the storefront writes
 * it.
 */
export async function getMollieCart(collectionId: string): Promise<MollieCart | null> {
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
  return ((carts as MollieCart[])[0] ?? null) as MollieCart | null
}
