"use server"

import { sdk } from "@lib/config"
import { compareShippingOptions, findShippingOptionDescriptor } from "@lib/constants"
import medusaError from "@lib/util/medusa-error"
import type { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag, getCartId } from "./cookies"

/**
 * Express checkout takes the address from a wallet while the wallet's window
 * stays open and waits for each answer. These actions never revalidate the
 * cart, because a revalidation renders the whole checkout again inside the
 * action's response. `revalidateExpressCheckout` refreshes the page once the
 * window has closed.
 */

/** The part of the address a wallet shares before the customer pays. */
export type ExpressAddress = {
  country_code: string
  province?: string | null
  city?: string | null
  postal_code?: string | null
}

/** The contact and address a wallet shares once the customer has paid. */
export type ExpressContact = {
  email?: string | null
  phone?: string | null
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
    country_code?: string | null
  } | null
}

export type ExpressQuote =
  | { ok: true; total: number; currency_code: string; shipping_option_id: string }
  | { ok: false; reason: "noShipping" }

export type ExpressContactResult =
  | { ok: true; total: number; currency_code: string }
  | { ok: false; reason: "missingContact" | "noShipping" }
  | { ok: false; reason: "totalChanged"; total: number; currency_code: string }

async function context() {
  const cartId = await getCartId()
  if (!cartId) {
    throw new Error("No existing cart found for the express checkout")
  }
  return { cartId, headers: { ...(await getAuthHeaders()) } }
}

/**
 * Puts the cart on a shipping option for its current address: the one the
 * checkout has selected when it still fits, otherwise the first in the order the
 * checkout offers them. Pickup and options that cannot be priced without a
 * choice from the customer are left out, since a wallet cannot make that choice.
 */
async function applyShipping(
  cartId: string,
  headers: Record<string, string>,
  shippingOptionId?: string | null
) {
  const { shipping_options } = await sdk.client.fetch<HttpTypes.StoreShippingOptionListResponse>(
    "/store/shipping-options",
    {
      method: "GET",
      query: { cart_id: cartId, fields: "+metadata" },
      headers,
      cache: "no-store",
    }
  )
  const options = shipping_options.filter(
    (option) =>
      (option as { service_zone?: { fulfillment_set?: { type?: string } } })
        .service_zone?.fulfillment_set?.type !== "pickup" &&
      !findShippingOptionDescriptor(option)?.pricedByChoice
  )
  const option =
    options.find((o) => o.id === shippingOptionId) ??
    [...options].sort(compareShippingOptions)[0]
  if (!option) {
    return null
  }

  const { cart } = await sdk.store.cart.addShippingMethod(
    cartId,
    { option_id: option.id },
    { fields: "id,total,currency_code" },
    headers
  )
  return {
    total: cart.total ?? 0,
    currency_code: cart.currency_code,
    shipping_option_id: option.id,
  }
}

/** Shipping and the new total for the address the customer picked in the wallet. */
export async function quoteExpressShipping(
  address: ExpressAddress,
  shippingOptionId?: string | null
): Promise<ExpressQuote> {
  const { cartId, headers } = await context()
  try {
    const { cart } = await sdk.store.cart.retrieve(
      cartId,
      { fields: "id,*region.countries" },
      headers
    )
    const countryCode = address.country_code.toLowerCase()
    const shipsThere = (cart.region?.countries ?? []).some(
      (country) => country.iso_2?.toLowerCase() === countryCode
    )
    if (!shipsThere) {
      return { ok: false, reason: "noShipping" }
    }

    await sdk.store.cart.update(
      cartId,
      {
        shipping_address: {
          country_code: countryCode,
          province: address.province ?? "",
          city: address.city ?? "",
          postal_code: address.postal_code ?? "",
        },
      },
      {},
      headers
    )
    const applied = await applyShipping(cartId, headers, shippingOptionId)
    return applied ? { ok: true, ...applied } : { ok: false, reason: "noShipping" }
  } catch (error) {
    return medusaError(error)
  }
}

/**
 * Saves the contact and address the wallet shared and puts the cart on its
 * shipping. With `approvedTotal`, a total above what the customer approved in
 * the wallet is refused, because the wallet would otherwise be charged an amount
 * the customer never saw. Some wallets share the address only after approval,
 * so the shipping for it can raise the total.
 */
export async function saveExpressContact(
  contact: ExpressContact,
  shippingOptionId?: string | null,
  approvedTotal?: number
): Promise<ExpressContactResult> {
  const address = contact.shipping_address
  if (!contact.email || !address?.address_1 || !address.country_code) {
    return { ok: false, reason: "missingContact" }
  }

  const { cartId, headers } = await context()
  try {
    const cartAddress = {
      first_name: address.first_name ?? "",
      last_name: address.last_name ?? "",
      address_1: address.address_1,
      address_2: address.address_2 ?? "",
      city: address.city ?? "",
      province: address.province ?? "",
      postal_code: address.postal_code ?? "",
      country_code: address.country_code.toLowerCase(),
      phone: contact.phone ?? "",
    }
    await sdk.store.cart.update(
      cartId,
      { email: contact.email, shipping_address: cartAddress, billing_address: cartAddress },
      {},
      headers
    )
    const applied = await applyShipping(cartId, headers, shippingOptionId)
    if (!applied) {
      return { ok: false, reason: "noShipping" }
    }
    if (approvedTotal !== undefined && applied.total > approvedTotal + 0.001) {
      return {
        ok: false,
        reason: "totalChanged",
        total: applied.total,
        currency_code: applied.currency_code,
      }
    }
    return { ok: true, total: applied.total, currency_code: applied.currency_code }
  } catch (error) {
    return medusaError(error)
  }
}

/**
 * Starts the payment session a wallet pays and returns its data. A new cart
 * total makes Medusa drop the session, so a wallet calls this again with the
 * payment it is already collecting. With `reuseKey`, a pending session of the
 * provider whose data already holds the same value is kept instead.
 */
export async function startExpressPayment(
  providerId: string,
  data: Record<string, unknown>,
  reuseKey?: string
): Promise<Record<string, unknown>> {
  const { cartId, headers } = await context()
  try {
    const { cart } = await sdk.store.cart.retrieve(
      cartId,
      { fields: "id,*payment_collection,*payment_collection.payment_sessions" },
      headers
    )
    const pending = (collection?: HttpTypes.StorePaymentCollection | null) =>
      collection?.payment_sessions?.find(
        (session) => session.provider_id === providerId && session.status === "pending"
      )

    const current = pending(cart.payment_collection)
    if (reuseKey && current && data[reuseKey] !== undefined && current.data?.[reuseKey] === data[reuseKey]) {
      return current.data ?? {}
    }

    const { payment_collection } = await sdk.store.payment.initiatePaymentSession(
      cart,
      { provider_id: providerId, data },
      {},
      headers
    )
    const session = pending(payment_collection)
    if (!session) {
      throw new Error("The payment provider did not start a payment session")
    }
    return session.data ?? {}
  } catch (error) {
    return medusaError(error)
  }
}

/** After the wallet's window has closed, renders the checkout with the cart as it is now. */
export async function revalidateExpressCheckout() {
  revalidateTag(await getCacheTag("carts"))
  revalidateTag(await getCacheTag("fulfillment"))
}
