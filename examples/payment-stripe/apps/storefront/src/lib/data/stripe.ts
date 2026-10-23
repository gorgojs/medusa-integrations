"use server"

import { sdk } from "@lib/config"

/** What the storefront needs to load Stripe.js and create the Elements, from `GET /store/stripe/config`. */
export type StripeConfig = {
  provider_id: string
  publishable_key: string
  /** The capture method of the PaymentIntents the backend creates. The Elements must use the same. */
  capture_method: "manual" | "automatic_async"
  payment_method_configuration: string | null
}

/**
 * The public Stripe settings of the only Stripe integration, or null while it is not configured.
 * The keys and the capture method change only in the Admin, so the answer is cached for a minute.
 */
export async function getStripeConfig(): Promise<StripeConfig | null> {
  return sdk.client
    .fetch<{ config: StripeConfig }>("/store/stripe/config", {
      method: "GET",
      next: { revalidate: 60 },
    })
    .then(({ config }) => config)
    .catch(() => null)
}
