import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { resolveStripeOptions } from "../../lib/integration"
import type { StoreStripeConfig } from "../../types/http"

export type GetStripeConfigStepInput = {
  provider_id?: string
}

/**
 * The public settings the storefront needs to load Stripe.js and build the deferred-intent Elements.
 * Only values that are safe in a browser leave the step: the secret key and the webhook secret stay
 * on the server.
 */
export const getStripeConfigStep = createStep(
  "stripe-get-config-step",
  async ({ provider_id }: GetStripeConfigStepInput, { container }) => {
    const { providerId, options } = await resolveStripeOptions(container, provider_id)
    const config: StoreStripeConfig = {
      provider_id: providerId,
      publishable_key: options.publishableKey,
      // what the provider sends in `initiatePayment`: Elements must be created with the same value
      capture_method: options.capture === "manual" ? "manual" : "automatic_async",
      payment_method_configuration: options.paymentMethodConfiguration ?? null,
    }
    return new StepResponse(config)
  }
)
