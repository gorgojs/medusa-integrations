/** What the storefront needs to load Stripe.js and create the Elements for a deferred PaymentIntent. */
export type StoreStripeConfig = {
  provider_id: string
  publishable_key: string
  /** The `capture_method` of the PaymentIntent the provider creates. */
  capture_method: "manual" | "automatic_async"
  /** The payment method configuration (`pmc_…`) the provider uses, or `null` for Stripe's default. */
  payment_method_configuration: string | null
}

export type StoreStripeConfigResponse = {
  config: StoreStripeConfig
}
