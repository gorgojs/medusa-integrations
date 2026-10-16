import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { resolvePayPalOptions } from "../../lib/integration"
import type { StorePayPalConfig } from "../../types/http"

export type GetPayPalConfigStepInput = {
  provider_id?: string
}

/**
 * The public settings the storefront needs to load the PayPal JS SDK. Only values that are safe in a
 * browser leave the step: the secret stays on the server.
 */
export const getPayPalConfigStep = createStep(
  "get-paypal-config-step",
  async ({ provider_id }: GetPayPalConfigStepInput, { container }) => {
    const { providerId, options } = await resolvePayPalOptions(container, provider_id)
    const config: StorePayPalConfig = {
      provider_id: providerId,
      client_id: options.clientId,
      environment: options.environment,
      intent: options.intent,
    }
    return new StepResponse(config)
  }
)
