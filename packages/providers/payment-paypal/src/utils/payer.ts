import type { Order } from "../lib/paypal-orders-client"

/** A Medusa address built from what the buyer chose in PayPal. */
export type PayPalPayerAddress = {
  first_name: string | null
  last_name: string | null
  address_1: string | null
  address_2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  country_code: string | null
  phone: string | null
}

export type PayPalPayer = {
  /** What the buyer approved. A cart total above it needs a new payment. */
  amount: { currency_code: string; value: string } | null
  email: string | null
  phone: string | null
  shipping_address: PayPalPayerAddress | null
}

function splitName(fullName?: string): [string | null, string | null] {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? []
  if (!parts.length) {
    return [null, null]
  }
  return [parts[0], parts.slice(1).join(" ") || null]
}

/**
 * The buyer's contact and the shipping address of an approved order, in Medusa's shape. In an express
 * checkout the storefront fills the cart with it before placing the order.
 */
export function toPayPalPayer(order: Order): PayPalPayer {
  const payer = order.payer
  const shipping = order.purchase_units?.[0]?.shipping
  const phone = payer?.phone?.phone_number?.national_number ?? null

  let shippingAddress: PayPalPayerAddress | null = null
  if (shipping?.address) {
    const [shippingFirst, shippingLast] = splitName(shipping.name?.full_name)
    const address = shipping.address
    shippingAddress = {
      first_name: shippingFirst ?? payer?.name?.given_name ?? null,
      last_name: shippingFirst ? shippingLast : payer?.name?.surname ?? null,
      address_1: address.address_line_1 ?? null,
      address_2: address.address_line_2 ?? null,
      city: address.admin_area_2 ?? null,
      province: address.admin_area_1 ?? null,
      postal_code: address.postal_code ?? null,
      country_code: address.country_code?.toLowerCase() ?? null,
      phone,
    }
  }

  const amount = order.purchase_units?.[0]?.amount
  return {
    amount: amount?.value ? { currency_code: amount.currency_code, value: amount.value } : null,
    email: payer?.email_address ?? null,
    phone,
    shipping_address: shippingAddress,
  }
}
