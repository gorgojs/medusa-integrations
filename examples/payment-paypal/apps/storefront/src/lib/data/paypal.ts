"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCartId } from "./cookies"

/** What the storefront needs to load the PayPal JS SDK, from `GET /store/paypal/config`. */
export type PayPalConfig = {
  provider_id: string
  client_id: string
  environment: "sandbox" | "live"
  intent: "capture" | "authorize"
}

/** The buyer of an approved PayPal order, from `GET /store/paypal/orders/:id/payer`. */
export type PayPalPayer = {
  amount: { currency_code: string; value: string } | null
  email: string | null
  phone: string | null
  shipping_address: {
    first_name: string | null
    last_name: string | null
    address_1: string | null
    address_2: string | null
    city: string | null
    province: string | null
    postal_code: string | null
    country_code: string | null
    phone: string | null
  } | null
}

/**
 * The public PayPal settings of the only PayPal integration, or null while it is
 * not configured. The client ID and the intent change only in the Admin, so the
 * answer is cached for a minute.
 */
export async function getPayPalConfig(): Promise<PayPalConfig | null> {
  return sdk.client
    .fetch<{ config: PayPalConfig }>("/store/paypal/config", {
      method: "GET",
      next: { revalidate: 60 },
    })
    .then(({ config }) => config)
    .catch(() => null)
}

/**
 * The contact and the shipping address the buyer chose in PayPal, and the amount
 * they approved. The backend answers only for an order created for this cart.
 */
export async function getPayPalPayer(orderId: string): Promise<PayPalPayer> {
  const cartId = await getCartId()
  if (!cartId) {
    throw new Error("No existing cart found for the PayPal order")
  }

  const { payer } = await sdk.client.fetch<{ payer: PayPalPayer }>(
    `/store/paypal/orders/${encodeURIComponent(orderId)}/payer`,
    {
      method: "GET",
      query: { cart_id: cartId },
      headers: { ...(await getAuthHeaders()) },
      cache: "no-store",
    }
  )
  return payer
}
